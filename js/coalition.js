/* ============ ПЕСОЧНИЦА КОАЛИЦИЙ ============

   Интерактивный расчёт поверх тех же данных, что и у остальной
   аналитики: без нового источника, без бэкенда и без сохранения.
   Читатель включает и выключает фракции выбранного созыва и видит,
   проходит ли набор порог большинства и какой получается коалиция по
   координатам — где её центр, на скольких партнёрах она держится и
   насколько далеко они друг от друга.

   Формулы не дублируются: центр тяжести, индекс Лааксо — Таагеперы и
   поляризация берутся из PC.charts.groupMetrics, то есть ровно те же,
   что в плитках палаты. При всех включённых фракциях центр и разброс
   коалиции обязаны совпасть с плитками — это закреплено тестом.

   Разметка строится один раз на созыв, а переключение фракции только
   меняет ширину сегментов и числа: так работают CSS-переходы, и полоса
   плавно дорастает до нового значения, а не перерисовывается. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc, fmt = U.fmt;
  var t = PC.t, L = PC.L;

  var host = {};
  var conv = null;        /* созыв, на который собрана разметка */
  var key = null;         /* созыв + тема + язык: при смене — пересборка */
  var on = {};            /* id фракции -> входит ли в коалицию */
  var shown = {};         /* последние показанные числа — для доезда */

  /* Простое большинство — больше половины палаты, две трети — порог
     для конституционных законов и преодоления вето Совета Федерации. */
  function majority(){ return Math.floor(PC.TOTAL_SEATS / 2) + 1; }
  function supermajority(){ return Math.ceil(PC.TOTAL_SEATS * 2 / 3); }

  function factions(c){
    return PC.PARTIES
      .filter(function(p){ return PC.seatsAt(p, c) > 0; })
      .sort(function(a, b){ return PC.seatsAt(b, c) - PC.seatsAt(a, c); });
  }

  /* Чистый расчёт без DOM: набор id -> мандаты, вердикт и метрики.
     Неизвестные id и фракции без мандатов в этом созыве молча
     отбрасываются — ссылка на партию из другого созыва не должна
     давать ни мандатов, ни NaN в метриках. */
  function evaluate(ids, c){
    var members = factions(c).filter(function(p){ return ids.indexOf(p.id) > -1; });
    var seats = members.reduce(function(s, p){ return s + PC.seatsAt(p, c); }, 0);
    var need = majority();
    return {
      members: members,
      seats: seats,
      need: need,
      majority: seats >= need,
      supermajority: seats >= supermajority(),
      margin: seats - need,
      metrics: PC.charts.groupMetrics(members, c)
    };
  }

  function currentIds(){
    return Object.keys(on).filter(function(id){ return on[id]; });
  }
  function isReal(){
    return factions(conv).every(function(p){ return on[p.id]; });
  }

  /* ---------- доезд чисел ---------- */
  function tween(node, name, to, printer){
    var from = shown[name];
    shown[name] = to;
    var reduced = !window.requestAnimationFrame || !PC.motion || PC.motion.reduced();
    if(to === null){ node.textContent = "—"; return; }
    if(reduced || from === undefined || from === null || from === to){
      node.textContent = printer(to); return;
    }
    var t0 = null, DUR = 480;
    var token = node._tw = {};
    function frame(ts){
      if(node._tw !== token) return;           /* поверх уже запущен новый доезд */
      if(t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUR);
      var e = 1 - Math.pow(1 - p, 3);
      node.textContent = printer(from + (to - from) * e);
      if(p < 1) requestAnimationFrame(frame); else node.textContent = printer(to);
    }
    requestAnimationFrame(frame);
  }
  var INT = function(v){ return String(Math.round(v)); };
  var F1 = function(v){ return v.toFixed(1); };
  var F2 = function(v){ return v.toFixed(2); };
  var SIGNED = function(v){ return fmt(Number(v.toFixed(1))); };

  /* ---------- сборка разметки на созыв ---------- */
  function build(){
    var list = factions(conv);
    var color = PC.charts.chartColor;
    on = {};
    list.forEach(function(p){ on[p.id] = true; });
    shown = {};

    host.togs.innerHTML = list.map(function(p){
      return '<button type="button" class="co-tog" data-id="' + esc(p.id) + '" aria-pressed="true">' +
        '<i style="background:' + esc(color(p.color)) + '"></i>' +
        '<span class="n">' + esc(L(p, "short")) + '</span>' +
        '<b>' + PC.seatsAt(p, conv) + '</b></button>';
    }).join("");

    /* сегменты — по экономической оси, как места на дуге палаты */
    var byX = list.slice().sort(function(a, b){ return a.x - b.x; });
    var pct = function(n){ return (n / PC.TOTAL_SEATS * 100).toFixed(3) + "%"; };
    host.bar.innerHTML =
      '<div class="co-track">' +
        byX.map(function(p){
          return '<span class="co-seg" data-id="' + esc(p.id) + '" title="' +
            esc(L(p, "short") + " · " + PC.seatsAt(p, conv)) + '" style="background:' +
            esc(color(p.color)) + ';width:' + pct(PC.seatsAt(p, conv)) + '"></span>';
        }).join("") +
      '</div>' +
      '<span class="co-mark maj" style="left:' + pct(majority()) + '"><em>' +
        esc(t("co.markMaj", { n:majority() })) + '</em></span>' +
      '<span class="co-mark super" style="left:' + pct(supermajority()) + '"><em>' +
        esc(t("co.markSuper", { n:supermajority() })) + '</em></span>';

    host.metrics.innerHTML =
      '<div class="co-metric"><div class="k">' + esc(t("co.centre")) + '</div>' +
        '<div class="co-dual">' +
          '<div><span class="lbl">' + esc(t("side.state")) + '</span><span class="num" data-m="wy">—</span></div>' +
          '<div><span class="lbl">' + esc(t("side.econ")) + '</span><span class="num" data-m="wx">—</span></div>' +
        '</div><div class="d" data-m="centreD"></div></div>' +
      '<div class="co-metric"><div class="k">' + esc(t("co.enp")) + '</div>' +
        '<div class="v" data-m="enp">—</div><div class="d">' + esc(t("co.enpD")) + '</div></div>' +
      '<div class="co-metric"><div class="k">' + esc(t("co.polar")) + '</div>' +
        '<div class="v" data-m="polar">—</div><div class="d" data-m="polarD"></div></div>';

    host.togs.querySelectorAll(".co-tog").forEach(function(b){
      b.addEventListener("click", function(){
        on[b.dataset.id] = !on[b.dataset.id];
        update();
      });
    });
    update();
  }

  /* ---------- пересчёт ---------- */
  function update(){
    var res = evaluate(currentIds(), conv);
    var house = PC.charts.houseMetrics(conv);
    var m = res.metrics, empty = !res.members.length;

    host.togs.querySelectorAll(".co-tog").forEach(function(b){
      b.setAttribute("aria-pressed", String(!!on[b.dataset.id]));
    });
    host.bar.querySelectorAll(".co-seg").forEach(function(s){
      s.classList.toggle("off", !on[s.dataset.id]);
    });
    /* выключенный сегмент схлопывается, и включённые съезжаются к левому
       краю: длина цветной части полосы и есть мандаты коалиции */
    host.bar.querySelectorAll(".co-seg").forEach(function(s){
      var p = PC.partyById(s.dataset.id);
      s.style.width = on[s.dataset.id] ? (PC.seatsAt(p, conv) / PC.TOTAL_SEATS * 100).toFixed(3) + "%" : "0%";
    });

    var q = function(name){ return host.metrics.querySelector('[data-m="' + name + '"]'); };
    tween(host.seats, "seats", res.seats, INT);
    host.total.textContent = " / " + PC.TOTAL_SEATS;

    var verdict = host.verdict;
    verdict.className = "co-verdict " + (empty ? "none" : res.majority ? "yes" : "no");
    verdict.textContent = empty ? t("co.empty")
      : res.supermajority ? t("co.super")
      : res.majority ? t("co.yes", { n:res.margin })
      : t("co.no", { n:-res.margin });

    tween(q("wy"), "wy", empty ? null : m.wy, SIGNED);
    tween(q("wx"), "wx", empty ? null : m.wx, SIGNED);
    tween(q("enp"), "enp", empty ? null : m.enp, F2);
    tween(q("polar"), "polar", empty ? null : m.polar, F1);
    q("centreD").textContent = t("co.vsHouse", { v:fmt(Number(house.wy.toFixed(1))) + " / " + fmt(Number(house.wx.toFixed(1))) });
    q("polarD").textContent = t("co.vsHouse", { v:house.polar.toFixed(1) });

    var real = isReal();
    host.reset.disabled = real;
    host.real.hidden = !real;
    host.clear.disabled = empty;
  }

  function reset(){
    factions(conv).forEach(function(p){ on[p.id] = true; });
    update();
  }
  function clear(){
    Object.keys(on).forEach(function(id){ on[id] = false; });
    update();
  }

  /* Вызывается из PC.charts.render: песочница следует за созывом, как и
     все графики. Своё состояние (набор фракций) при смене созыва
     сбрасывается к реальному составу — фракции другого созыва другие. */
  function render(){
    if(!host.card) return;
    var c = PC.convocationInfo().id;
    var k = c + "|" + document.documentElement.dataset.theme + "|" + PC.i18n.current();
    if(k === key) return;
    key = k;
    conv = c;
    build();
  }
  function invalidate(){ /* разметка от размеров не зависит — пересобирать нечего */ }

  function init(){
    host.card    = document.getElementById("coalition");
    host.togs    = document.getElementById("coTogs");
    host.bar     = document.getElementById("coBar");
    host.seats   = document.getElementById("coSeats");
    host.total   = document.getElementById("coTotal");
    host.verdict = document.getElementById("coVerdict");
    host.metrics = document.getElementById("coMetrics");
    host.reset   = document.getElementById("coReset");
    host.clear   = document.getElementById("coClear");
    host.real    = document.getElementById("coReal");
    if(!host.card) return;
    host.reset.addEventListener("click", reset);
    host.clear.addEventListener("click", clear);
  }

  PC.coalition = { init:init, render:render, invalidate:invalidate, evaluate:evaluate,
                   majority:majority, supermajority:supermajority };
})(window.PC = window.PC || {});
