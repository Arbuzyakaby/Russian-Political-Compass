/* ============ Дуэль партий (4.3) ============
   Две партии рядом в одном окне: расстояние на компасе, обе точки на
   мини-карте вместе с заявленными, две оси и шесть под-осей на общих шкалах,
   совпадение голосований фракций и список законопроектов, по которым
   они разошлись. В карточке партии сравнение было только по числам
   под-осей; здесь видно, где именно и в чём партии расходятся.

   compare(a, b) — чистая функция без DOM: ею же пользуются тесты.
   Открывается из карточки партии («Подробная дуэль»), из ячейки матрицы
   совпадений на вкладке голосований и из командной палитры. С 4.4 модуль
   подгружается по требованию (js/lazy.js). ============ */
(function(PC){
  "use strict";
  var t = PC.t, L = PC.L;
  var MAX_DISTANCE = Math.sqrt(20 * 20 + 20 * 20);   /* из угла в угол поля −10…+10 */

  function verdict(d){
    return d < 3 ? "near" : d < 7 ? "close" : d < 12 ? "apart" : "opposite";
  }

  /* Сравнение двух партий. Голосования считаются по тем же правилам, что
     матрица совпадений (PC.voteAgreement): только законопроекты, по
     которым известны позиции обеих фракций. */
  function stances(a, b, conv){
    return PC.VOTES.filter(function(v){ return !conv || v.conv === conv; }).map(function(v){
      return { vote:v, a:PC.voteStance(v, a), b:PC.voteStance(v, b) };
    }).filter(function(r){
      return r.a !== "absent" && r.a !== "unknown" && r.b !== "absent" && r.b !== "unknown";
    });
  }
  function shareOf(list){
    var same = list.filter(function(r){ return r.a === r.b; }).length;
    return { same:same, common:list.length, ratio:list.length ? same / list.length : null };
  }

  /* 5.1: conv — сравнение внутри одного созыва (0 — все); topics — доля
     совпадений по темам голосований; convs — по каждому созыву, где у
     обеих фракций есть общие голосования. Координаты партий в данных
     одни на все созывы, поэтому «сближение по созывам» — это сближение
     в поведении, а не на поле. */
  function compare(a, b, conv){
    var d = PC.calc.distance(a, b);
    var votes = stances(a, b, conv || 0);
    var all = stances(a, b, 0);
    var topics = ["econ", "state", "foreign"].map(function(id){
      var r = shareOf(votes.filter(function(x){ return x.vote.topic === id; }));
      r.id = id;
      return r;
    });
    var convs = [4, 5, 6, 7, 8, 9].map(function(c){
      var r = shareOf(all.filter(function(x){ return x.vote.conv === c; }));
      r.conv = c;
      return r;
    }).filter(function(r){ return r.common > 0; });
    return {
      a:a, b:b, distance:d, share:d / MAX_DISTANCE, verdict:verdict(d), conv:conv || 0,
      axes:PC.calc.subaxisDelta(a, b),
      agreement:conv ? shareOf(votes) : PC.voteAgreement(a, b),
      topics:topics, convs:convs,
      same:votes.filter(function(r){ return r.a === r.b; }),
      differ:votes.filter(function(r){ return r.a !== r.b; }),
      biggest:PC.calc.subaxisDelta(a, b).filter(function(x){ return x.delta != null; })
        .sort(function(x, y){ return Math.abs(y.delta) - Math.abs(x.delta); })[0] || null
    };
  }

  /* Словесная сводка: в какой теме партии совпадали чаще всего и в какой
     реже — по темам, где общих голосований не меньше двух. */
  function summary(r){
    var ok = r.topics.filter(function(x){ return x.common >= 2; })
      .sort(function(x, y){ return y.ratio - x.ratio; });
    if(!ok.length) return "";
    var hi = ok[0], lo = ok[ok.length - 1];
    var name = function(x){ return t("duel.topic." + x.id); };
    if(hi === lo || hi.ratio === lo.ratio) return t("duel.sum.one", { topic:name(hi), p:Math.round(hi.ratio * 100) });
    return t("duel.sum.two", { hi:name(hi), hp:Math.round(hi.ratio * 100), lo:name(lo), lp:Math.round(lo.ratio * 100) });
  }

  /* ---------- окно ---------- */
  var dialog, pickA, pickB, body, lastFocus;
  var state = { a:null, b:null, c:0 };
  var pickC;

  function esc(s){ return PC.utils.esc(s); }
  function fmt(v){ return (v > 0 ? "+" : "") + v.toFixed(1); }
  function el(tag, cls, text){ var n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; }

  /* Список собирается при каждом открытии: подписи следуют за языком. */
  function fill(select){
    var keep = select.value;
    select.textContent = "";
    PC.PARTIES.forEach(function(p){
      var o = el("option", "", L(p, "short"));
      o.value = p.id;
      select.appendChild(o);
    });
    if(keep) select.value = keep;
  }

  function picker(id, label){
    var wrap = el("label", "duel-pick");
    wrap.htmlFor = id;
    var cap = el("span", "duel-pick-cap", label);
    var select = el("select");
    select.id = id;
    select.setAttribute("data-native", "");
    fill(select);
    wrap.append(cap, select);
    return { wrap:wrap, select:select };
  }

  /* ---------- адрес #/duel/<a>-<b> (4.4) ----------
     Окно ведёт на свой адрес, пока открыто: его можно скопировать, а по
     открытию адреса дуэль встаёт на место (разбор — в js/app.js, он нужен
     до загрузки этого модуля). Адрес только заменяется, а не дописывается
     в историю, и по закрытии окна возвращается прежний. */
  var prevHash = "";
  function base(){ return location.pathname + location.search; }
  function isDuelHash(){ return /^#\/duel\//.test(location.hash); }
  function pairHash(){ return "#/duel/" + state.a + "-" + state.b + (state.c ? "?c=" + state.c : ""); }
  function syncHash(){
    if(history.replaceState && state.a && state.b) history.replaceState(null, "", base() + pairHash());
  }
  function share(){
    var url = location.origin + base() + pairHash();
    var note = t("duel.copied");
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(function(){ PC.ui.toast(note); },
        function(){ PC.ui.toast(t("duel.copyFail"), true); });
    }else PC.ui.toast(t("duel.copyFail"), true);
  }

  /* Мини-карта: оси, обе реальные точки, полые заявленные и линия между
     реальными. Координаты переводятся в 0…200 с отступом. */
  function miniMap(r){
    var S = 200, P = 14;
    function px(v){ return P + (v + 10) / 20 * (S - 2 * P); }
    function py(v){ return P + (10 - v) / 20 * (S - 2 * P); }
    function point(p, cls){
      var s = '<circle class="duel-dot ' + cls + '" cx="' + px(p.x).toFixed(1) + '" cy="' + py(p.y).toFixed(1) +
        '" r="7" style="--c:' + esc(p.color) + '"/>';
      if(p.declared) s = '<circle class="duel-decl" cx="' + px(p.declared.x).toFixed(1) + '" cy="' + py(p.declared.y).toFixed(1) +
        '" r="5" style="--c:' + esc(p.color) + '"/>' + s;
      return s;
    }
    return '<svg class="duel-map" viewBox="0 0 ' + S + " " + S + '" role="img" aria-label="' +
      esc(t("duel.mapAria", { a:L(r.a, "short"), b:L(r.b, "short"), d:r.distance.toFixed(1) })) + '">' +
      '<rect class="duel-field" x="' + P + '" y="' + P + '" width="' + (S - 2 * P) + '" height="' + (S - 2 * P) + '" rx="8"/>' +
      '<path class="duel-axis" d="M' + S / 2 + " " + P + "V" + (S - P) + "M" + P + " " + S / 2 + "H" + (S - P) + '"/>' +
      '<line class="duel-link" x1="' + px(r.a.x).toFixed(1) + '" y1="' + py(r.a.y).toFixed(1) + '" x2="' + px(r.b.x).toFixed(1) +
        '" y2="' + py(r.b.y).toFixed(1) + '"/>' +
      point(r.a, "is-a") + point(r.b, "is-b") +
      "</svg>";
  }

  /* Шкала −10…+10 с двумя метками: видно и обе позиции, и разрыв. */
  function track(label, va, vb, r){
    function at(v){ return ((v + 10) / 20 * 100).toFixed(1) + "%"; }
    if(va == null || vb == null) return "";
    var lo = Math.min(va, vb), hi = Math.max(va, vb);
    return '<div class="duel-track"><div class="duel-track-head"><span>' + esc(label) + '</span><b>' +
        fmt(va) + " · " + fmt(vb) + '</b></div>' +
      '<div class="duel-line" aria-hidden="true"><i class="duel-gap" style="left:' + at(lo) + ";width:" +
        ((hi - lo) / 20 * 100).toFixed(1) + '%"></i>' +
        '<i class="duel-mark is-a" style="left:' + at(va) + ";--c:" + esc(r.a.color) + '"></i>' +
        '<i class="duel-mark is-b" style="left:' + at(vb) + ";--c:" + esc(r.b.color) + '"></i></div></div>';
  }

  function stanceChip(s, p){
    var meta = PC.votes && PC.votes.STANCE[s];
    return '<span class="duel-stance st-' + esc(s) + '"><i class="duel-key" style="--c:' + esc(p.color) + '"></i>' +
      esc(L(p, "short")) + ": " + esc(meta ? t(meta.key) : s) + "</span>";
  }

  function render(){
    var a = PC.partyById(state.a), b = PC.partyById(state.b);
    if(!a || !b) return;
    if(a.id === b.id){
      body.innerHTML = '<p class="duel-empty">' + PC.icon("alert") + esc(t("duel.same")) + "</p>";
      return;
    }
    var r = compare(a, b, state.c);
    var pct = r.agreement.ratio == null ? null : Math.round(r.agreement.ratio * 100);
    body.innerHTML =
      '<div class="duel-top">' + miniMap(r) +
        '<div class="duel-sum">' +
          '<p class="duel-verdict is-' + r.verdict + '" role="status">' + esc(t("duel.v." + r.verdict)) + "</p>" +
          '<p class="duel-dist"><b>' + r.distance.toFixed(1) + "</b> " + esc(t("duel.distance", { max:MAX_DISTANCE.toFixed(1) })) + "</p>" +
          (r.biggest ? '<p class="duel-note">' +
            esc(t("duel.biggest", { axis:t("sub." + r.biggest.axis.id), d:Math.abs(r.biggest.delta).toFixed(1) })) + "</p>" : "") +
          '<p class="duel-legend"><span class="duel-key" style="--c:' + esc(a.color) + '"></span>' + esc(L(a, "short")) +
            '<span class="duel-key" style="--c:' + esc(b.color) + '"></span>' + esc(L(b, "short")) +
            '<span class="duel-key is-hollow"></span>' + esc(t("duel.declared")) + "</p>" +
        "</div></div>" +
      '<h3 class="duel-h">' + esc(t("duel.axes")) + "</h3>" +
      '<div class="duel-tracks">' +
        track(t("side.econ"), a.x, b.x, r) + track(t("side.state"), a.y, b.y, r) +
        r.axes.map(function(x){ return track(t("sub." + x.axis.id), x.a, x.b, r); }).join("") +
      "</div>" +
      '<h3 class="duel-h">' + esc(t("duel.votes")) + (state.c ? " · " + esc(convName(state.c)) : "") + "</h3>" +
      (pct == null
        ? '<p class="duel-note">' + esc(t("duel.noCommon")) + "</p>"
        : '<p class="duel-agree"><b>' + pct + "%</b> " + esc(t("duel.agree", { k:r.agreement.same, n:r.agreement.common })) + "</p>" +
          '<div class="duel-agree-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
          (summary(r) ? '<p class="duel-summary">' + esc(summary(r)) + "</p>" : "") +
          topicBars(r) + convChart(r)) +
      (r.differ.length
        ? '<p class="duel-sub">' + esc(t("duel.differ", { n:r.differ.length })) + '</p><ul class="duel-bills">' +
          r.differ.map(function(x){
            return '<li><button type="button" class="duel-bill" data-vote="' + esc(x.vote.id) + '"><span class="duel-bill-t">' +
              esc(L(x.vote, "title")) + "</span><small>" + esc(x.vote.date.slice(0, 4)) + "</small>" +
              '<span class="duel-bill-s">' + stanceChip(x.a, a) + stanceChip(x.b, b) + "</span></button></li>";
          }).join("") + "</ul>"
        : (pct != null ? '<p class="duel-note">' + esc(t("duel.allSame")) + "</p>" : ""));
  }

  function convName(c){
    var x = PC.CONVOCATIONS.filter(function(k){ return k.id === c; })[0];
    return x ? L(x, "label") : String(c);
  }
  function topicBars(r){
    return '<ul class="duel-topics">' + r.topics.map(function(x){
      var p = x.ratio == null ? null : Math.round(x.ratio * 100);
      return '<li><span class="dt-name">' + esc(t("duel.topic." + x.id)) + '</span>' +
        '<span class="dt-bar" aria-hidden="true"><i style="width:' + (p || 0) + '%"></i></span>' +
        '<span class="dt-val">' + (p == null ? "—" : p + "%") + (x.common ? " <small>" + x.same + "/" + x.common + "</small>" : "") + "</span></li>";
    }).join("") + "</ul>";
  }
  /* столбики по созывам: высота — доля совпадений, подпись — номер созыва */
  function convChart(r){
    if(r.convs.length < 2) return "";
    return '<h4 class="duel-h4">' + esc(t("duel.byConv")) + '</h4><div class="duel-convs" role="list">' + r.convs.map(function(x){
      var p = Math.round(x.ratio * 100);
      var name = convName(x.conv);
      return '<div class="dc" role="listitem" aria-label="' + esc(name + ": " + p + "% (" + x.same + "/" + x.common + ")") + '">' +
        '<span class="dc-bar" aria-hidden="true"><i style="height:' + Math.max(4, p) + '%"></i></span>' +
        '<b>' + p + '%</b><small>' + esc(name.split(" ")[0]) + "</small></div>";
    }).join("") + "</div>";
  }

  function build(){
    dialog = el("dialog", "command-palette duel-dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "duelTitle");
    var head = el("div", "duel-head");
    var title = el("h2", "", t("duel.title"));
    title.id = "duelTitle";
    var close = el("button", "duel-close");
    close.type = "button";
    close.setAttribute("aria-label", t("duel.close"));
    close.innerHTML = PC.icon("close");
    close.addEventListener("click", function(){ dialog.close(); });
    var badge = el("span", "duel-badge");
    badge.innerHTML = PC.icon("duel");
    var link = el("button", "duel-close duel-share");
    link.type = "button";
    link.setAttribute("aria-label", t("duel.share"));
    link.title = t("duel.share");
    link.innerHTML = PC.icon("link");
    link.addEventListener("click", share);
    head.append(badge, title, link, close);
    var a = picker("duelA", t("duel.first")), b = picker("duelB", t("duel.second"));
    pickA = a.select; pickB = b.select;
    var swap = el("button", "btn small duel-swap");
    swap.type = "button";
    swap.setAttribute("aria-label", t("duel.swap"));
    swap.title = t("duel.swap");
    swap.innerHTML = PC.icon("shuffle");
    swap.addEventListener("click", function(){ var x = state.a; state.a = state.b; state.b = x; sync(); render(); syncHash(); });
    var picks = el("div", "duel-picks");
    picks.append(a.wrap, swap, b.wrap);
    /* созыв: все или один — сравнение голосований внутри него */
    var cw = el("label", "duel-pick duel-pick-conv");
    cw.htmlFor = "duelC";
    pickC = el("select");
    pickC.id = "duelC";
    pickC.setAttribute("data-native", "");
    var o0 = el("option", "", t("duel.convAll"));
    o0.value = "0";
    pickC.appendChild(o0);
    PC.CONVOCATIONS.filter(function(c){ return !c.draft && PC.VOTES.some(function(v){ return v.conv === c.id; }); })
      .forEach(function(c){ var o = el("option", "", L(c, "label")); o.value = String(c.id); pickC.appendChild(o); });
    cw.append(el("span", "duel-pick-cap", t("duel.conv")), pickC);
    picks.appendChild(cw);
    pickC.addEventListener("change", function(){ state.c = +pickC.value || 0; render(); syncHash(); });
    body = el("div", "duel-body");
    dialog.append(head, picks, body);
    document.body.appendChild(dialog);
    pickA.addEventListener("change", function(){ state.a = pickA.value; render(); syncHash(); });
    pickB.addEventListener("change", function(){ state.b = pickB.value; render(); syncHash(); });
    body.addEventListener("click", function(e){
      var bill = e.target.closest(".duel-bill");
      if(!bill) return;
      prevHash = "#/votes";             /* закрытие вернёт адрес вкладки, на которую ведёт переход */
      dialog.close();
      if(PC.nav) PC.nav.go("votes");
      if(PC.votes && PC.votes.focusVote) setTimeout(function(){ PC.votes.focusVote(bill.dataset.vote); }, 60);
    });
    dialog.addEventListener("click", function(e){
      if(e.target !== dialog) return;
      var rc = dialog.getBoundingClientRect();
      if(e.clientX < rc.left || e.clientX > rc.right || e.clientY < rc.top || e.clientY > rc.bottom) dialog.close();
    });
    dialog.addEventListener("close", function(){
      if(isDuelHash() && history.replaceState) history.replaceState(null, "", base() + prevHash);
      if(lastFocus && lastFocus.focus) lastFocus.focus();
    });
    /* «Назад» из браузера на другой адрес закрывает окно */
    window.addEventListener("hashchange", function(){ if(dialog.open && !isDuelHash()) dialog.close(); });
  }

  function sync(){ pickA.value = state.a; pickB.value = state.b; pickC.value = String(state.c || 0); }

  /* Вторая партия по умолчанию — ближайшая к первой: с неё сравнение
     интереснее, чем с соседом по списку. */
  function open(a, b, c){
    if(!PC.PARTIES || !PC.PARTIES.length) return;
    if(!dialog) build();
    if(PC.utils.modalOpen() && !dialog.open) return;
    fill(pickA); fill(pickB);
    state.a = PC.partyById(a) ? a : PC.PARTIES[0].id;
    state.b = PC.partyById(b) && b !== state.a ? b : PC.calc.rankParties(PC.partyById(state.a), state.a)[0].p.id;
    state.c = PC.VOTES.some(function(v){ return v.conv === +c; }) ? +c : 0;
    sync();
    render();
    if(!dialog.open){
      prevHash = isDuelHash() ? "#/votes" : location.hash;
      lastFocus = document.activeElement;
    }
    syncHash();
    if(!dialog.open) dialog.showModal();
    pickB.focus();
  }

  PC.duel = { compare:compare, summary:summary, open:open, verdict:verdict, MAX_DISTANCE:MAX_DISTANCE };
})(window.PC = window.PC || {});
