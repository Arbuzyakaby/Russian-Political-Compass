/* «Выборы»: экран симуляции кампании для своих партий. Вся арифметика — в
   js/party-election.js, здесь только разметка и анимация. Пользовательский
   текст вставляется как текстовые узлы. */
(function(PC){
  "use strict";
  var M = PC.partyModel, E = PC.partyElection;
  var S = { ids:null, all:false, conv:PC.CURRENT_CONVOCATION, strength:"mid", seed:0, ran:false };
  var host, token = 0;
  function t(k, vars){ return PC.t(k, vars); }
  function U(){ return PC.partyBuilder.ui; }
  function pct(v){ var s = v.toFixed(1); return PC.i18n && PC.i18n.isRu() ? s.replace(".", ",") : s; }
  function motionOff(){ return document.documentElement.dataset.motion === "off" || (PC.motion && PC.motion.reduced()); }
  function convLabel(c){ return PC.L(c, "label").replace(/ (созыв|convocation)$/, ""); }
  function own(){
    var list = M.list();
    if(S.all) return list;
    var p = list.filter(function(x){ return S.ids && x.id === S.ids; })[0] || list[0];
    return p ? [p] : [];
  }
  /* Число «доезжает» до значения; при отключённой анимации сразу показывает итог */
  function count(el, to, fmt){
    if(motionOff() || !window.requestAnimationFrame){ el.textContent = fmt(to); return; }
    var t0 = null, dur = 900; el.textContent = fmt(0);
    function tick(now){
      if(t0 === null) t0 = now; var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e); if(k < 1 && el.isConnected) requestAnimationFrame(tick); else el.textContent = fmt(to);
    }
    requestAnimationFrame(tick);
  }
  function seg(label, options, value, change){
    var g = U().node("div", "party-segmented"); g.setAttribute("role", "group"); g.setAttribute("aria-label", label);
    options.forEach(function(o){ var b = U().button(o.label, function(){ change(o.value); }, "party-segbtn"); b.setAttribute("aria-pressed", String(o.value === value)); g.appendChild(b); });
    return g;
  }
  function row(label, content){ var r = U().node("div", "party-camp-row"); U().append(r, U().node("div", "party-eyebrow", label), content); return r; }

  function render(root, preselect){
    host = root; var ui = U(), list = M.list(), n = ui.node, a = ui.append;
    if(preselect && list.some(function(p){ return p.id === preselect; })){ S.ids = preselect; }
    if(!list.some(function(p){ return p.id === S.ids; })) S.ids = list[0] && list[0].id;
    if(list.length < 2) S.all = false;
    host.replaceChildren();
    var wrap = n("div", "party-camp"), bar = n("div", "party-appbar");
    a(bar, ui.button(t("party.close"), function(){ ui.routeTo("#/party"); }, "ghost party-back", "back"), n("span", "party-appbar-title", t("party.camp.title")), ui.chip(t("party.camp.badge"), "warn"));
    wrap.appendChild(bar);
    var head = n("header", "party-camp-head"); a(head, n("div", "party-eyebrow", t("party.camp.kicker")), n("h1", "", t("party.camp.heading")), n("p", "party-lead", t("party.camp.lead"))); wrap.appendChild(head);
    if(!list.length){
      var empty = n("div", "party-empty"); a(empty, a(n("span", "party-empty-mark"), ui.icon("flag", 30)), n("h3", "", t("party.camp.empty")), ui.button(t("party.create"), function(){ ui.routeTo("#/party"); }, "primary"));
      wrap.appendChild(empty); host.appendChild(wrap); return;
    }
    var setup = n("section", "party-camp-setup");
    if(list.length > 1) setup.appendChild(row(t("party.camp.who"), seg(t("party.camp.who"), [{ value:false, label:t("party.camp.one") }, { value:true, label:t("party.camp.all") }], S.all, function(v){ S.all = v; changed(); })));
    if(!S.all){
      var chips = n("div", "party-camp-parties"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", t("party.collection"));
      list.forEach(function(p){
        var b = n("button", "party-camp-party"); b.type = "button"; b.setAttribute("aria-pressed", String(p.id === S.ids)); b.style.setProperty("--party-color", p.color);
        a(b, ui.badge(p, 22), n("span", "", p.short || p.name)); b.addEventListener("click", function(){ S.ids = p.id; changed(); }); chips.appendChild(b);
      });
      setup.appendChild(row(t("party.collection"), chips));
    }
    var convs = n("div", "party-filter party-camp-convs"); convs.setAttribute("role", "group"); convs.setAttribute("aria-label", t("party.camp.conv"));
    PC.convsAsc().forEach(function(c){ var b = ui.button(convLabel(c), function(){ S.conv = c.id; changed(); }, "party-pill"); b.setAttribute("aria-pressed", String(c.id === S.conv)); b.title = PC.L(c, "label") + " · " + c.years; convs.appendChild(b); });
    setup.appendChild(row(t("party.camp.conv"), convs));
    setup.appendChild(row(t("party.camp.strength"), seg(t("party.camp.strength"), ["low", "mid", "high"].map(function(k){ return { value:k, label:t("party.camp.s." + k) }; }), S.strength, function(v){ S.strength = v; changed(); })));
    var go = n("div", "party-camp-go");
    a(go, ui.button(S.ran ? t("party.camp.rerun") : t("party.camp.go"), function(){ if(S.ran) S.seed = S.seed + 1; S.ran = true; render(host, S.ids); }, "primary party-camp-run", S.ran ? "dice" : "play"));
    if(S.ran && S.seed > 0) go.appendChild(ui.button(t("party.camp.reset"), function(){ S.seed = 0; render(host, S.ids); }, "ghost"));
    setup.appendChild(go);
    a(setup, a(n("p", "party-camp-model"), ui.icon("spark", 16), document.createTextNode(" " + t("party.camp.model"))));
    wrap.appendChild(setup);
    var out = n("div", "party-camp-results"); out.id = "partyResults"; out.setAttribute("aria-live", "polite"); wrap.appendChild(out);
    host.appendChild(wrap);
    if(S.ran) results(out); else out.appendChild(placeholder());
  }
  /* Экран перестраивается целиком, и фокус уходил на <body>: после
     перерисовки он возвращается на ту же кнопку той же группы. */
  function changed(){
    var el = document.activeElement, group = el && el.closest && el.closest("[aria-label]");
    var key = el && host.contains(el) ? { text:el.textContent, group:group && group.getAttribute("aria-label") } : null;
    render(host, S.ids);
    if(!key) return;
    var same = Array.prototype.filter.call(host.querySelectorAll("button"), function(b){
      var g = b.closest("[aria-label]"); return b.textContent === key.text && (g && g.getAttribute("aria-label")) === key.group;
    })[0];
    if(same) same.focus({ preventScroll:true });
  }
  function placeholder(){
    var ui = U(), p = ui.node("div", "party-camp-placeholder");
    ui.append(p, ui.append(ui.node("span", "party-empty-mark"), ui.icon("flag", 30)), ui.node("p", "", t("party.camp.placeholder")));
    return p;
  }
  /* ---------- результаты ---------- */
  function results(out){
    var ui = U(), n = ui.node, a = ui.append, mine = own(), opts = { seed:S.seed, strength:S.strength };
    var res = E.simulate(S.conv, mine, opts), cmp = E.compare(mine, opts), conv = PC.CONVOCATIONS.filter(function(c){ return c.id === S.conv; })[0];
    var my = res.own, total = my.reduce(function(s, r){ return s + r.share; }, 0), seats = my.reduce(function(s, r){ return s + r.seats; }, 0);
    var sum = n("section", "party-result party-camp-summary");
    a(sum, n("div", "party-eyebrow", PC.L(conv, "label") + " · " + conv.years + " · " + (S.seed ? t("party.camp.noisy", { n:S.seed }) : t("party.camp.base"))));
    my.forEach(function(r){
      var c = n("div", "party-camp-me" + (r.passed ? " ok" : " out")); c.style.setProperty("--party-color", r.p.color);
      var big = n("div", "party-camp-big", pct(0) + "%"); count(big, r.share, function(v){ return pct(v) + "%"; });
      a(c, a(n("div", "party-camp-me-top"), ui.badge(r.p, 30), a(n("div", "party-camp-me-text"), n("h3", "", r.p.name || t("party.noName")), n("p", "", r.passed ? t("party.camp.passed") : t("party.camp.failed", { pp:pct(r.gap) })))),
        a(n("div", "party-camp-me-nums"), big, a(n("div", "party-camp-me-seats"), n("div", "party-camp-seatsn", PC.i18n.n(r.seats, "word.seat")), n("small", "", t("party.camp.of", { n:res.total })))));
      sum.appendChild(c);
    });
    if(my.length > 1){ var tot = n("p", "party-camp-total"); tot.textContent = t("party.camp.total") + ": " + pct(total) + "% · " + PC.i18n.n(seats, "word.seat"); sum.appendChild(tot); }
    out.appendChild(sum);
    out.appendChild(bars(res)); out.appendChild(house(res)); out.appendChild(took(res, my)); out.appendChild(compare(cmp, mine));
    var note = n("p", "party-camp-note"); note.textContent = t("party.camp.hyp") + " " + t("party.camp.model"); out.appendChild(note);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ out.classList.add("is-in"); }); });
  }
  function bars(res){
    var ui = U(), n = ui.node, a = ui.append, sec = n("section", "party-result"), max = Math.max.apply(null, res.rows.map(function(r){ return r.share; })) * ((host.clientWidth || 360) > 700 ? 1.12 : 1.35), thr = res.threshold / max * 100;
    a(sec, n("h3", "party-subhead", t("party.camp.votes.h")));
    var box = n("div", "party-bars"); box.style.setProperty("--thr", thr + "%");
    var head = n("div", "party-bars-head"); a(head, n("span"), a(n("span", "party-bars-scale"), n("span", "party-bars-thr", t("party.camp.threshold", { n:res.threshold })))); box.appendChild(head);
    res.rows.forEach(function(r, i){
      var line = n("div", "party-bar-row" + (r.user ? " is-own" : "") + (r.passed ? "" : " is-out")); line.style.setProperty("--party-color", r.p.color); line.style.setProperty("--i", i); line.style.setProperty("--w", (r.share / max).toFixed(4));
      var fillEl = n("i", "party-fill"), val = n("b", "party-bar-val", pct(0)); count(val, r.share, pct);
      a(line, a(n("span", "party-bar-name"), r.user ? ui.badge(r.p, 16) : n("span", "party-dot"), n("span", "", r.user ? (r.p.short || r.p.name) : PC.L(r.p, "short")), r.user ? n("em", "party-you", t("party.camp.you")) : null), a(n("span", "party-track"), fillEl, val)); box.appendChild(line);
    });
    sec.appendChild(box);
    if(res.wasted > 0.05) sec.appendChild(n("p", "party-meta", t("party.camp.wasted", { p:pct(res.wasted) })));
    return sec;
  }
  function house(res){
    var ui = U(), n = ui.node, a = ui.append, sec = n("section", "party-result"), el = PC.utils.el;
    a(sec, n("h3", "party-subhead", t("party.camp.house.h")));
    var passed = res.rows.filter(function(r){ return r.seats > 0; }).sort(function(x, y){ return (x.p.x - y.p.x) || (x.p.id < y.p.id ? -1 : 1); });
    var W = Math.max(280, Math.min(560, (host.clientWidth || 360) - 8)), H = Math.round(W * .54) + 6, cx = W / 2, cy = H - 4, r1 = Math.min(W / 2 - 6, H - 10), r0 = r1 * .46, rowsN = W < 380 ? 8 : 11;
    var seats = PC.charts.hemiSeats(res.total, rowsN, r0, r1, cx, cy), step = Math.min(seats.gap, Math.PI * r0 / seats.innerCount), dotR = Math.max(1.7, step * .42);
    var owners = [], k = 0; passed.forEach(function(r){ for(var i = 0; i < r.seats; i++) owners[k++] = r; });
    var svg = el("svg", { viewBox:"0 0 " + W + " " + H, "class":"party-hemi", role:"img", "aria-label":t("party.camp.house.aria", { n:res.total }) });
    seats.pts.forEach(function(pt, i){
      var o = owners[i], mine = o && o.user, c = el("circle", { cx:pt.x.toFixed(1), cy:pt.y.toFixed(1), r:(mine ? dotR * 1.12 : dotR).toFixed(2), fill:o ? o.p.color : "var(--chart-empty)", "class":"party-seat" + (mine ? " is-own" : ""), style:"--d:" + Math.round(i * 2.2) + "ms" });
      svg.appendChild(c);
    });
    var box = n("div", "party-hemi-box"), mySeats = res.own.reduce(function(s, r){ return s + r.seats; }, 0), center = n("div", "party-hemi-center");
    var big = n("div", "party-hemi-n", "0"); count(big, mySeats, function(v){ return String(Math.round(v)); });
    a(center, big, n("small", "", res.own.length > 1 ? t("party.camp.yours.many") : t("party.camp.yours")));
    a(box, svg, center); sec.appendChild(box);
    var leg = n("div", "party-hemi-legend");
    passed.forEach(function(r){ var b = n("span", "party-leg" + (r.user ? " is-own" : "")); b.style.setProperty("--party-color", r.p.color); a(b, n("i"), n("span", "", r.user ? (r.p.short || r.p.name) : PC.L(r.p, "short")), r.user ? n("em", "party-you", t("party.camp.you")) : null, n("b", "", String(r.seats))); leg.appendChild(b); });
    sec.appendChild(leg); return sec;
  }
  function took(res, my){
    var ui = U(), n = ui.node, a = ui.append, sec = n("section", "party-result");
    a(sec, n("h3", "party-subhead", t("party.camp.took.h")));
    var list = res.taken.filter(function(x){ return x.pp >= .05; }).slice(0, 6), max = list.length ? list[0].pp : 1;
    if(!list.length) sec.appendChild(n("p", "party-meta", t("party.camp.took.none")));
    var box = n("div", "party-took");
    list.forEach(function(x, i){
      var line = n("div", "party-took-row"); line.style.setProperty("--party-color", x.p.color); line.style.setProperty("--i", i); line.style.setProperty("--w", (x.pp / max).toFixed(3));
      a(line, a(n("span", "party-bar-name"), n("span", "party-dot"), n("span", "", PC.L(x.p, "short"))), a(n("span", "party-track"), n("i", "party-fill")), n("b", "party-took-val", "−" + t("party.camp.pp", { n:pct(x.pp) }))); box.appendChild(line);
    });
    sec.appendChild(box); if(list.length) sec.appendChild(n("p", "party-meta", t("party.camp.took.note"))); return sec;
  }
  function compare(cmp, mine){
    var ui = U(), n = ui.node, a = ui.append, sec = n("section", "party-result");
    a(sec, n("h3", "party-subhead", t("party.camp.cmp.h")), n("p", "party-meta", t("party.camp.cmp.hint")));
    var box = n("div", "party-cmp"), scale = 14;
    cmp.forEach(function(r){
      var c = PC.CONVOCATIONS.filter(function(x){ return x.id === r.conv; })[0], share = r.own.reduce(function(s, x){ return s + x.share; }, 0), seats = r.own.reduce(function(s, x){ return s + x.seats; }, 0), ok = r.own.some(function(x){ return x.passed; });
      var b = n("button", "party-cmp-row" + (r.conv === S.conv ? " current" : "") + (ok ? " ok" : "")); b.type = "button"; b.setAttribute("aria-pressed", String(r.conv === S.conv));
      var track = n("span", "party-cmp-track"), fillEl = n("i"); fillEl.style.width = Math.min(100, share / scale * 100) + "%"; track.style.setProperty("--thr", E.THRESHOLD / scale * 100 + "%"); track.appendChild(fillEl);
      a(b, a(n("span", "party-cmp-conv"), n("b", "", convLabel(c)), n("small", "", c.years)), track, a(n("span", "party-cmp-val"), n("b", "", pct(share) + "%"), n("small", "", ok ? PC.i18n.n(seats, "word.seat") : t("party.camp.out"))));
      b.addEventListener("click", function(){ S.conv = r.conv; changed(); }); box.appendChild(b);
    });
    sec.appendChild(box); return sec;
  }
  PC.partyCampaign = { render:render, state:S };
})(window.PC = window.PC || {});
