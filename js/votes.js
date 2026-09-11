/* ============ КЛЮЧЕВЫЕ ГОЛОСОВАНИЯ ГОСДУМЫ ============

   Компас держится на утверждении, которое легко объявить и трудно
   проверить: координаты выведены не только из программ, но и из того,
   как фракции голосуют. Этот раздел выкладывает вторую часть основания
   отдельно — двадцать голосований, от самых разводящих до единогласных,
   и матрица совпадений между фракциями.

   Матрица совпадений интереснее самих голосований. Она показывает то,
   что на компасе видно только косвенно: расстояние между точками и
   разница в поведении — не одно и то же. ЛДПР и «Справедливая Россия»
   стоят на поле в 6.7 единицы друг от друга — почти втрое дальше, чем
   ЛДПР от «Единой России», — но совпали во всех общих голосованиях,
   тогда как ближайшая к ЛДПР «Единая Россия» разошлась с ней по
   пенсионному возрасту. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc;
  var t = PC.t, L = PC.L;

  var host, matrixHost;
  var filter = "all";
  var open = {};              /* id голосования -> раскрыт ли разбор */

  var TOPICS = [
    { id:"all",     key:"votes.filterAll" },
    { id:"econ",    key:"votes.filterEcon" },
    { id:"state",   key:"votes.filterState" },
    { id:"foreign", key:"votes.filterForeign" }
  ];

  var STANCE = {
    "for":     { key:"votes.for",     cls:"st-for",     mark:"✓" },
    "against": { key:"votes.against", cls:"st-against", mark:"✕" },
    "abstain": { key:"votes.abstain", cls:"st-abstain", mark:"~" },
    "split":   { key:"votes.split",   cls:"st-split",   mark:"±" },
    "unknown": { key:"votes.skip",    cls:"st-unknown", mark:"?" },
    "absent":  { key:"votes.absent",  cls:"st-absent",  mark:"—" }
  };

  /* Партии в фиксированном порядке слева направо по экономической оси:
     столбцы матрицы тогда читаются как та же шкала, что и компас, и
     блоки одинаковых позиций сразу видны глазом. */
  function partiesInPlay(){
    var ids = {};
    PC.VOTES.forEach(function(v){
      Object.keys(v.pos || {}).forEach(function(id){ ids[id] = true; });
    });
    return PC.PARTIES.filter(function(p){ return ids[p.id]; })
                     .sort(function(a, b){ return a.x - b.x; });
  }

  function visibleVotes(){
    return PC.VOTES.filter(function(v){ return filter === "all" || v.topic === filter; })
                   .slice()
                   .sort(function(a, b){ return a.date < b.date ? 1 : -1; });
  }

  function dateLabel(iso){
    var d = new Date(iso + "T00:00:00Z");
    if(isNaN(d)) return iso;
    return d.toLocaleDateString(PC.i18n.isRu() ? "ru-RU" : "en-GB",
      { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" });
  }

  function convLabel(conv){
    var c = PC.CONVOCATIONS.filter(function(x){ return x.id === conv; })[0];
    return c ? L(c, "label") : String(conv);
  }

  /* ---------- карточка голосования ---------- */
  function voteCard(v, parties){
    var isOpen = !!open[v.id];
    var chips = parties.map(function(p){
      var st = PC.voteStance(v, p);
      var meta = STANCE[st] || STANCE.unknown;
      return '<div class="vchip ' + meta.cls + '" title="' + esc(L(p, "name") + " · " + t(meta.key)) + '">' +
        '<i style="background:' + esc(p.color) + '"></i>' +
        '<span class="vp">' + esc(L(p, "short")) + '</span>' +
        '<span class="vs">' + meta.mark + '</span></div>';
    }).join("");

    return '<article class="card vote-card" data-reveal data-id="' + esc(v.id) + '">' +
      '<header class="vote-head">' +
        '<div class="vote-meta">' +
          '<span class="vdate">' + esc(dateLabel(v.date)) + '</span>' +
          '<span class="vconv">' + esc(convLabel(v.conv)) + '</span>' +
          '<span class="vaxis">' + esc(t(v.axis === "x" ? "res.break.axisX" : "res.break.axisY")) + '</span>' +
        '</div>' +
        '<h3>' + esc(L(v, "title")) + '</h3>' +
        '<p class="vote-sum">' + esc(L(v, "summary")) + '</p>' +
        '<p class="vote-tally"><b>' + esc(t("votes.result")) + ':</b> ' + esc(L(v, "tally")) + '</p>' +
      '</header>' +
      '<div class="vote-chips">' + chips + '</div>' +
      '<button type="button" class="data-toggle vote-toggle" aria-expanded="' + isOpen + '">' +
        esc(t("votes.why")) + '</button>' +
      '<div class="vote-why"' + (isOpen ? "" : " hidden") + '><p>' + esc(L(v, "why")) + '</p></div>' +
    '</article>';
  }

  /* ---------- матрица совпадений ---------- */
  /* Цветовая шкала здесь не декоративная: доля совпадений — величина
     непрерывная, и без заливки читателю пришлось бы сравнивать проценты
     глазами по всей таблице. Число всё равно напечатано в каждой ячейке,
     поэтому цвет остаётся вторым кодом, а не единственным.

     Шкала расходящаяся (diverging), а не «чем темнее — тем больше
     совпадений»: та же логика уже занята зелёным/красным у чипов
     голосования (.st-for/.st-against), и одинаковый смысл обязан
     выглядеть одинаково на одной и той же вкладке. 50% совпадений —
     это отсутствие сигнала, поэтому такая ячейка почти не подсвечена;
     чем ближе к 0% или к 100%, тем гуще цвет. */
  function agreementColor(ratio){
    var RED = [4, 72, 55], AMBER = [40, 78, 50], GREEN = [142, 52, 42];
    var a = ratio <= .5 ? RED : AMBER, b = ratio <= .5 ? AMBER : GREEN;
    var k = ratio <= .5 ? ratio / .5 : (ratio - .5) / .5;
    var h = a[0] + (b[0] - a[0]) * k, s = a[1] + (b[1] - a[1]) * k, l = a[2] + (b[2] - a[2]) * k;
    return "hsl(" + h.toFixed(1) + " " + s.toFixed(1) + "% " + l.toFixed(1) + "%)";
  }

  function agreementCell(a, b){
    if(a.id === b.id) return '<td class="ag-self" data-col="' + esc(b.id) + '" aria-hidden="true"></td>';
    var r = PC.voteAgreement(a, b);
    if(r.ratio === null){
      return '<td class="ag-none" data-col="' + esc(b.id) + '" title="' + esc(t("votes.noCommon")) + '">—</td>';
    }
    var pct = Math.round(r.ratio * 100);
    var dist = Math.abs(r.ratio - .5) * 2;            /* 0 в середине шкалы, 1 на краях */
    var mix = (16 + dist * 32).toFixed(1) + "%";
    /* Мало общих голосований — процент неустойчив: один новый закон
       мог бы сдвинуть 100% на 2 голосованиях до 50%. Пунктирная рамка
       честно показывает это прямо на поле, а не только в подсказке. */
    var thin = r.common <= 3;
    var titleText = L(a, "short") + " · " + L(b, "short") + ": " + t("votes.ofVotes", { k:r.same, n:r.common }) +
      (thin ? " — " + t("votes.thinHint") : "");
    return '<td class="ag' + (thin ? " ag-thin" : "") + '" data-col="' + esc(b.id) +
      '" style="--ag-color:' + agreementColor(r.ratio) + ';--ag-mix:' + mix + '" title="' + esc(titleText) +
      '"><b>' + pct + '%</b><small>' + r.same + "/" + r.common + "</small></td>";
  }

  /* Полное имя фракции в узкой колонке ротировать некрасиво — особенно
     «Единая Россия» и «Новые люди». Для шапки таблицы берём инициалы
     из нескольких слов, а полное название остаётся в title. */
  function headerAbbr(p){
    var s = L(p, "short");
    return /\s/.test(s)
      ? s.split(/\s+/).map(function(w){ return w.charAt(0).toUpperCase(); }).join("")
      : s;
  }

  function renderMatrix(parties){
    if(!matrixHost) return;
    matrixHost.innerHTML =
      '<table class="ag-table"><caption class="sr-only">' + esc(t("votes.agreementAria")) + '</caption>' +
      '<thead><tr><td></td>' +
        parties.map(function(p){
          return '<th scope="col" data-col="' + esc(p.id) + '" title="' + esc(L(p, "short")) + '">' +
            '<span style="--c:' + esc(p.color) + '">' + esc(headerAbbr(p)) + "</span></th>";
        }).join("") +
      '</tr></thead><tbody>' +
      parties.map(function(a){
        return '<tr data-row="' + esc(a.id) + '"><th scope="row"><i style="background:' + esc(a.color) + '"></i>' +
          esc(L(a, "short")) + "</th>" +
          parties.map(function(b){ return agreementCell(a, b); }).join("") + "</tr>";
      }).join("") +
      "</tbody></table>" +
      '<div class="ag-scale">' +
        '<span>' + esc(t("votes.scaleLow")) + '</span><i></i><span>' + esc(t("votes.scaleHigh")) + '</span>' +
      '</div>' +
      '<p class="ag-thin-note">' + esc(t("votes.thinNote")) + '</p>';

    /* Наведение подсвечивает и заголовок строки, и заголовок столбца —
       без этого в таблице 6×6 легко промахнуться взглядом мимо своей
       пары при переходе от ячейки к подписям по краям. */
    var table = matrixHost.querySelector(".ag-table");
    if(!table) return;
    var hiHead = null, hiRow = null;
    function clearHi(){
      if(hiHead) hiHead.classList.remove("hi");
      if(hiRow) hiRow.classList.remove("hi");
      hiHead = hiRow = null;
    }
    table.addEventListener("mouseover", function(e){
      var cell = e.target.closest("td[data-col]");
      if(!cell) return;
      var col = cell.dataset.col, tr = cell.closest("tr");
      clearHi();
      table.querySelectorAll("thead th[data-col]").forEach(function(th){
        if(th.dataset.col === col) hiHead = th;
      });
      hiRow = tr && tr.querySelector("th[scope=row]");
      if(hiHead) hiHead.classList.add("hi");
      if(hiRow) hiRow.classList.add("hi");
    });
    table.addEventListener("mouseleave", clearHi);
  }

  /* ---------- сборка панели ---------- */
  function render(){
    if(!host) return;
    var parties = partiesInPlay();
    var votes = visibleVotes();

    host.innerHTML =
      '<div class="chips votes-filter" role="group" aria-label="' + esc(t("votes.h")) + '">' +
        TOPICS.map(function(tp){
          return '<button type="button" class="chip" data-topic="' + tp.id +
            '" aria-pressed="' + (tp.id === filter) + '">' + esc(t(tp.key)) + "</button>";
        }).join("") +
      '</div>' +
      '<div class="vote-list">' + votes.map(function(v){ return voteCard(v, parties); }).join("") + "</div>" +
      '<p class="votes-hint">' + esc(t("votes.pickHint")) + "</p>";

    host.querySelectorAll(".votes-filter .chip").forEach(function(b){
      b.addEventListener("click", function(){
        if(filter === b.dataset.topic) return;
        filter = b.dataset.topic;
        render();
      });
    });

    host.querySelectorAll(".vote-card").forEach(function(card){
      var btn = card.querySelector(".vote-toggle");
      var why = card.querySelector(".vote-why");
      btn.addEventListener("click", function(){
        var next = why.hasAttribute("hidden");
        open[card.dataset.id] = next;
        if(next) why.removeAttribute("hidden"); else why.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", String(next));
      });
    });

    renderMatrix(parties);
    if(PC.motion) PC.motion.scan(host);
  }

  function init(){
    host = document.getElementById("votesHost");
    matrixHost = document.getElementById("votesMatrix");
    if(!host) return;
    render();
  }

  /* Короткая сводка для карточки партии: те же данные, но плоским
     списком строк «законопроект → позиция», без матрицы и фильтров. */
  function partyBlock(p){
    /* От нового к старому, как и на самой вкладке: в карточке партии
       годы стоят столбиком, и порядок объявления в наборе данных
       читался бы как ошибка — 2019 перед 2018. */
    var rows = PC.VOTES.slice()
      .sort(function(a, b){ return a.date < b.date ? 1 : -1; })
      .map(function(v){
      var st = PC.voteStance(v, p);
      if(st === "absent") return "";
      var meta = STANCE[st] || STANCE.unknown;
      return '<li class="' + meta.cls + '">' +
        '<span class="vt">' + esc(L(v, "title")) + '</span>' +
        '<span class="vy">' + v.date.slice(0, 4) + '</span>' +
        '<span class="vv">' + esc(t(meta.key)) + "</span></li>";
    }).filter(Boolean).join("");
    if(!rows) return "";
    return '<div class="sect votes-sect"><h4>' + esc(t("side.votesHead")) + "</h4>" +
      '<ul class="vote-mini">' + rows + "</ul>" +
      '<div class="hist-note">' + esc(t("side.votesNote")) + "</div></div>";
  }

  PC.votes = { init:init, render:render, partyBlock:partyBlock, STANCE:STANCE };
})(window.PC = window.PC || {});
