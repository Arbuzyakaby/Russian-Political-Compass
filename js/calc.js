/* ============ Расчётный слой ============

   Формулы, которые до 2.3 были разбросаны по модулям отрисовки: то же
   евклидово расстояние партия-партия считалось отдельно в js/quiz.js
   (результат теста -> ближайшие партии) и в js/sidebar.js (соседи по
   полю в карточке партии), и они были обязаны совпадать молча, без
   единого источника. Здесь — общие функции без DOM и без побочных
   эффектов: их можно вызвать и проверить тестом, не рисуя страницу.

   Модуль не знает, кто его вызывает: он принимает точки {x, y} (это
   может быть и партия, и результат теста) и отдаёт числа и отсортированные
   списки, а как их показать — решает вызывающий модуль. */
(function(PC){
  "use strict";

  /* Расстояние на компасе между двумя точками с координатами x, y —
     единственное определение «близости» во всём проекте. */
  function distance(a, b){
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* Все партии, отсортированные по удалённости от точки origin.
     excludeId выкидывает из списка саму точку отсчёта, если она тоже
     партия (сравнение с самой собой даёт расстояние 0 и не несёт
     смысла); для результата теста excludeId не нужен — ни одна партия
     не совпадает с его id. */
  function rankParties(origin, excludeId){
    return PC.PARTIES
      .filter(function(p){ return p.id !== excludeId; })
      .map(function(p){ return { p:p, d:distance(origin, p) }; })
      .sort(function(a, b){ return a.d - b.d; });
  }

  /* Разница двух партий по каждой из шести под-осей — общий формат
     для сравнения партий и для любого другого места, которому нужна
     не отдельная координата, а обе рядом с разницей между ними. */
  function subaxisDelta(a, b){
    return PC.SUBAXES.map(function(ax){
      var va = a.sub ? a.sub[ax.id] : null;
      var vb = b.sub ? b.sub[ax.id] : null;
      return {
        axis: ax,
        a: va == null ? null : va,
        b: vb == null ? null : vb,
        delta: (va == null || vb == null) ? null : vb - va
      };
    });
  }

  /* Среднее расстояние от партии p до остальных участников набора —
     строительный блок для «связующего звена» коалиции: чем оно меньше,
     тем ближе партия к геометрическому центру своих союзников. */
  function avgDistanceToOthers(p, members){
    var others = members.filter(function(m){ return m.id !== p.id; });
    if(!others.length) return null;
    var sum = others.reduce(function(s, m){ return s + distance(p, m); }, 0);
    return sum / others.length;
  }

  /* «Связующее звено» коалиции — участник, геометрически ближе всего
     к остальным одновременно по обеим осям. Определение работает от
     трёх участников: у двоих «ближе к остальным» совпадает с любым из
     них и ничего не объясняет. */
  function connectorOf(members){
    if(!members || members.length < 3) return null;
    var scored = members.map(function(p){
      return { p:p, avg:avgDistanceToOthers(p, members) };
    }).sort(function(a, b){ return a.avg - b.avg; });
    return { p:scored[0].p, avg:scored[0].avg };
  }

  /* ---------- сводки по палате и произвольным группам фракций ----------
     До 2.3.1 жили в js/charts.js, хотя ни разу не трогали DOM: график
     их только вызывал, чтобы нарисовать число. Здесь ими пользуются
     и графики палаты, и песочница коалиций (js/coalition.js), и им
     обеим нужна ровно одна и та же арифметика, а не две похожие. */
  function seats(p, c){ return PC.seatsAt(p, c); }

  /* Фракции созыва — партии, у которых в нём есть мандаты. */
  function inDuma(conv){
    return PC.PARTIES.filter(function(p){ return seats(p, conv) > 0; });
  }
  /* Партии, существовавшие в созыве — с мандатами или без них. */
  function existing(conv){
    return PC.PARTIES.filter(function(p){ return seats(p, conv) !== null; });
  }

  /* Три числа, которых на компасе не видно, потому что компас показывает
     партии, а не палату: насколько власть в ней раздроблена (эффективное
     число фракций, индекс Лааксо — Таагеперы), насколько далеко фракции
     разошлись друг от друга (поляризация — среднее расстояние фракции
     до центра тяжести, взвешенное по мандатам) и где сам центр тяжести.
     denom — знаменатель долей в индексе Лааксо — Таагеперы: для палаты
     это 450 мест (депутаты вне фракций тоже «размывают» власть), для
     коалиции — её собственные мандаты, иначе одна «Единая Россия»
     получала бы почти две эффективные фракции вместо одной. */
  function groupMetrics(list, c, denom){
    var duma = list.filter(function(p){ return seats(p, c) > 0; });
    var total = duma.reduce(function(s, p){ return s + seats(p, c); }, 0);
    if(!total) return { total:0, wx:0, wy:0, enp:0, polar:0, topShare:0 };
    denom = denom || total;

    var wx = 0, wy = 0, sumSq = 0;
    duma.forEach(function(p){
      var s = seats(p, c), share = s / denom;
      wx += p.x * s; wy += p.y * s;
      sumSq += share * share;
    });
    wx /= total; wy /= total;

    var polar = 0;
    duma.forEach(function(p){
      var s = seats(p, c);
      var dx = p.x - wx, dy = p.y - wy;
      polar += Math.sqrt(dx * dx + dy * dy) * s;
    });
    polar /= total;

    var top = duma.slice().sort(function(a, b){ return seats(b, c) - seats(a, c); })[0];
    return {
      total: total, wx: wx, wy: wy,
      enp: sumSq ? 1 / sumSq : 0,
      polar: polar,
      topShare: top ? seats(top, c) / PC.TOTAL_SEATS * 100 : 0
    };
  }
  /* Те же три числа для всей палаты созыва разом. */
  function houseMetrics(c){
    return groupMetrics(inDuma(c), c, PC.TOTAL_SEATS);
  }

  PC.calc = {
    distance: distance,
    rankParties: rankParties,
    subaxisDelta: subaxisDelta,
    avgDistanceToOthers: avgDistanceToOthers,
    connectorOf: connectorOf,
    inDuma: inDuma,
    existing: existing,
    groupMetrics: groupMetrics,
    houseMetrics: houseMetrics
  };
})(window.PC = window.PC || {});
