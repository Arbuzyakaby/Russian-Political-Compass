/* Модель выборов для «Моей партии»: чистые вычисления без DOM.
   Это гипотетический сценарий, а не прогноз: электорат — облако избирателей
   вокруг реальных партий созыва, каждый голосует за ближайшую по компасу
   партию с поправкой на узнаваемость и (по желанию) на случайный шум. */
(function(PC){
  "use strict";
  var THRESHOLD = 5, TOTAL = 450;
  /* узнаваемость новой партии: чем сильнее кампания, тем меньше ей мешает
     отсутствие имени. У реальных партий узнаваемость берётся из мандатов */
  var STRENGTH = { low:.30, mid:.60, high:1.20 };
  var SIGMA = 2.6;        /* разброс избирателей вокруг партии, в единицах компаса */
  var TAU = 2.1;          /* «острота» выбора: чем меньше, тем строже ближайшая партия */
  var NOISE = .38;        /* амплитуда шума по партии в логарифмической шкале */
  var STEP = .5, GRID = (function(){
    var g = [], i, j;
    for(i = -10; i <= 10; i += STEP) for(j = -10; j <= 10; j += STEP) g.push([i, j]);
    return g;
  })();

  /* Детерминированный генератор: один и тот же seed всегда даёт одну и ту же
     последовательность, поэтому прогон можно повторить и проверить. */
  function rng(seed){
    var a = (seed >>> 0) || 1;
    return function(){
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* шум конкретной партии не зависит от того, кто ещё участвует: добавление
     вашей партии не должно «перетряхивать» шум реальных */
  function hash(str){
    var h = 2166136261;
    for(var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function bias(seed, id){
    if(!seed) return 0;
    return (rng(hash(id + "#" + seed))() * 2 - 1) * NOISE;
  }

  /* Участники созыва: реальные партии, которые были в бюллетене. Вес — доля
     мандатов, но не меньше 0,6 %, чтобы малые партии не исчезали совсем. */
  function participants(conv){
    return PC.PARTIES.filter(function(p){ return PC.seatsAt(p, conv) !== null; }).map(function(p){
      var seats = PC.seatsAt(p, conv);
      return { p:p, weight:Math.max(seats / TOTAL, .006), seats:seats };
    });
  }

  /* Доли голосов: масса облака в каждой клетке сетки делится между партиями
     по правилу «ближе и узнаваемее — вероятнее». Результат — вектор долей,
     сумма которого ровно 1 с точностью до ошибки округления. */
  function shares(real, own, seed, strength){
    var field = real.map(function(r){ return { id:r.p.id, x:r.p.x, y:r.p.y, w:Math.pow(r.weight, .65), r:Math.max(.12, Math.pow(r.weight, .45)) }; });
    var rec = STRENGTH[strength] || STRENGTH.mid;
    var cands = field.concat(own.map(function(p){ return { id:p.id, x:p.x, y:p.y, w:0, r:rec }; }));
    cands.forEach(function(c){ c.b = Math.log(c.r) + bias(seed, c.id); });
    var mass = GRID.map(function(g){
      var m = 0;
      field.forEach(function(f){ var dx = g[0] - f.x, dy = g[1] - f.y; m += f.w * Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA)); });
      return m;
    });
    var total = mass.reduce(function(s, m){ return s + m; }, 0), out = cands.map(function(){ return 0; });
    GRID.forEach(function(g, gi){
      var sc = cands.map(function(c){ var dx = g[0] - c.x, dy = g[1] - c.y; return c.b - (dx * dx + dy * dy) / (2 * TAU * TAU); });
      var top = Math.max.apply(null, sc), z = 0, e = sc.map(function(s){ var v = Math.exp(s - top); z += v; return v; });
      for(var i = 0; i < e.length; i++) out[i] += mass[gi] / total * e[i] / z;
    });
    return out;
  }

  /* simulate(conv, own, opts) → результат выборов в созыве conv.
     own — ваши партии (u1…u6), opts.seed — 0 это базовый прогон без шума,
     opts.strength — low | mid | high. Доли в процентах, сумма 100;
     места делятся методом наибольших остатков среди прошедших 5 % барьер. */
  function simulate(conv, own, opts){
    opts = opts || {};
    var seed = opts.seed | 0, strength = STRENGTH[opts.strength] ? opts.strength : "mid";
    own = (own || []).map(function(p){ return PC.partyModel.normalize(p); });
    var real = participants(conv);
    var base = shares(real, [], seed, strength), full = shares(real, own, seed, strength);
    var rows = real.map(function(r, i){ return { p:r.p, user:false, share:full[i] * 100, base:base[i] * 100 }; })
      .concat(own.map(function(p, i){ return { p:p, user:true, share:full[real.length + i] * 100, base:0 }; }));
    rows.sort(function(a, b){ return (b.share - a.share) || (a.p.id < b.p.id ? -1 : 1); });
    rows.forEach(function(r){ r.passed = r.share >= THRESHOLD - 1e-9; });
    if(!rows.some(function(r){ return r.passed; }) && rows.length) rows[0].passed = true;
    var seats = PC.partyModel.apportion(rows.map(function(r){ return r.passed ? r.share : 0; }), TOTAL);
    rows.forEach(function(r, i){ r.seats = seats[i]; r.gap = r.passed ? 0 : THRESHOLD - r.share; });
    var taken = rows.filter(function(r){ return !r.user && r.base - r.share > 1e-9; })
      .map(function(r){ return { p:r.p, pp:r.base - r.share }; }).sort(function(a, b){ return b.pp - a.pp; });
    return { conv:conv, seed:seed, strength:strength, threshold:THRESHOLD, total:TOTAL, rows:rows, taken:taken,
      wasted:rows.reduce(function(s, r){ return r.passed ? s : s + r.share; }, 0),
      own:rows.filter(function(r){ return r.user; }) };
  }

  /* Сравнение по всем созывам с данными — от старого к новому */
  function compare(own, opts){
    return PC.convsAsc().map(function(c){ return simulate(c.id, own, opts); });
  }

  PC.partyElection = { simulate:simulate, compare:compare, participants:participants, rng:rng, hash:hash,
    THRESHOLD:THRESHOLD, TOTAL:TOTAL, STRENGTH:STRENGTH };
})(window.PC = window.PC || {});
