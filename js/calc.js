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

  PC.calc = {
    distance: distance,
    rankParties: rankParties,
    subaxisDelta: subaxisDelta,
    avgDistanceToOthers: avgDistanceToOthers,
    connectorOf: connectorOf
  };
})(window.PC = window.PC || {});
