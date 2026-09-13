/* ============ Расчётный слой теста ============

   До 2.3.1 вся эта арифметика жила прямо в js/quiz.js вперемешку с
   экранами, обработчиками кликов и построением разметки — самый
   длинный файл проекта был длинным наполовину не из-за интерфейса,
   а из-за формул, которые к интерфейсу отношения не имеют. Здесь —
   чистые функции без DOM: по ответам на утверждения и по номеру
   партии они дают числа, а решает, что с этими числами делать на
   экране, уже js/quiz.js.

   Каждая функция принимает то, что ей нужно, явным аргументом — ни
   одна не читает состояние текущего прохождения (какой вопрос сейчас,
   какая выбрана версия). Это то же правило, что и у js/calc.js, и по
   той же причине: такую функцию можно вызвать из теста, не запуская
   само прохождение. */
(function(PC){
  "use strict";
  var clamp = PC.utils.clamp;
  var ALL = PC.QUIZ.QUESTIONS, STD = PC.QUIZ.STD, SHORT = PC.QUIZ.SHORT;

  /* доля от максимума, при которой ось выходит на полюс */
  var REACH = 0.7;
  /* расстояние на компасе, при котором совпадение с партией — ноль */
  var MAX_DIST = 20;

  /* ---------- выборки ----------
     Умолчание — стандартная выборка, а не весь массив: «полный тест»
     в этом проекте исторически означает сорок утверждений, и внешние
     вызовы (экспорт, тесты, старые ссылки) рассчитывают именно на неё. */
  function questionsFor(m){
    return m === "long" ? ALL : m === "short" ? SHORT : STD;
  }
  function modeOfList(list){
    return list === SHORT ? "short" : list === ALL ? "long" : "full";
  }

  /* ---------- максимумы ----------
     Считаются по каждой выборке один раз на загрузку: величины
     постоянные, а пересчитывать их на каждый ответ — лишняя работа
     в обработчике клика. */
  function axisMaxOf(list, axis){
    return list.reduce(function(s, q){ return q.axis === axis ? s + q.w * 2 : s; }, 0);
  }
  function subMaxOf(list){
    var out = {};
    PC.SUBAXES.forEach(function(ax){
      out[ax.id] = list.reduce(function(s, q){ return q.sub === ax.id ? s + q.w * 2 : s; }, 0);
    });
    return out;
  }
  var MAXES = {
    long:  { x:axisMaxOf(ALL, "x"),   y:axisMaxOf(ALL, "y"),   sub:subMaxOf(ALL) },
    full:  { x:axisMaxOf(STD, "x"),   y:axisMaxOf(STD, "y"),   sub:subMaxOf(STD) },
    short: { x:axisMaxOf(SHORT, "x"), y:axisMaxOf(SHORT, "y"), sub:subMaxOf(SHORT) }
  };
  function maxesFor(list){ return MAXES[modeOfList(list)]; }

  /* По набору ответов даёт координаты. Второй аргумент — выборка,
     по которой считать; по умолчанию стандартная, потому что так
     функцию зовут снаружи (тесты, экспорт). */
  function scoreOf(src, list){
    list = list || STD;
    var m = maxesFor(list);
    var sx = 0, sy = 0, answered = 0;
    list.forEach(function(q){
      var a = src[q.id];
      if(a === undefined) return;
      answered++;
      var v = a * q.dir * q.w;
      if(q.axis === "x") sx += v; else sy += v;
    });
    return {
      x: clamp(sx / (m.x * REACH) * 10, -10, 10),
      y: clamp(sy / (m.y * REACH) * 10, -10, 10),
      answered: answered,
      total: list.length,
      mode: modeOfList(list),
      ts: Date.now()
    };
  }

  /* Те же ответы в разрезе шести узких шкал. Нормировка та же, что и
     у главных осей, поэтому значения сравнимы с партийными sub напрямую. */
  function subScoreOf(src, list){
    list = list || STD;
    var m = maxesFor(list);
    var out = {};
    PC.SUBAXES.forEach(function(ax){
      var sum = 0;
      list.forEach(function(q){
        if(q.sub !== ax.id) return;
        var a = src[q.id];
        if(a === undefined) return;
        sum += a * q.dir * q.w;
      });
      var max = m.sub[ax.id] * REACH;
      out[ax.id] = max ? clamp(sum / max * 10, -10, 10) : 0;
    });
    return out;
  }

  /* Вклад каждого утверждения в свою ось — то, из чего сложилась
     координата. Пропущенные утверждения возвращаются с нулём, а не
     выбрасываются: в разборе важно видеть и то, что не сыграло. */
  function contributions(src, list){
    return (list || STD).map(function(q){
      var a = src[q.id];
      var answered = a !== undefined;
      return { q:q, answer: answered ? a : null, value: answered ? a * q.dir * q.w : 0 };
    });
  }

  /* Разбор одной оси целиком: строки-утверждения, их сумма и итоговая
     координата — то, из чего складывается таблица «как посчитано». */
  function axisBreakdown(src, axis, list){
    var rows = contributions(src, list).filter(function(c){ return c.q.axis === axis; });
    var sum = rows.reduce(function(s, c){ return s + c.value; }, 0);
    var max = maxesFor(list)[axis];
    var coord = clamp(sum / (max * REACH) * 10, -10, 10);
    return { rows:rows, sum:sum, max:max, coord:coord };
  }

  /* Партии, отсортированные по близости к точке пользователя.
     Совпадение считается от расстояния: 0 — точное попадание, MAX_DIST и
     дальше — 0%. Диагональ поля длиннее MAX_DIST, поэтому у совсем
     противоположных партий совпадение честно упирается в ноль. */
  function ranking(pt){
    return PC.calc.rankParties(pt).map(function(r){
      return { p:r.p, d:r.d, match: Math.round(clamp(1 - r.d / MAX_DIST, 0, 1) * 100) };
    });
  }

  /* ---------- кодирование результата в ссылку ---------- */
  /* Один символ на утверждение: a…e — ответы от −2 до +2, дефис —
     без ответа. Символ на вопрос вместо base64 от JSON выбран намеренно:
     код читается глазами, не содержит символов, требующих экранирования
     в адресе, и не ломается, если мессенджер обрежет ссылку — короткий
     хвост просто не декодируется, а не даёт неверный результат.

     Ведущая буква — метка версии, и она обязательна по той же причине,
     по которой нужна сама нормировка: код из двадцати ответов и двадцати
     прочерков невозможно отличить от стандартного прохождения, где
     половина вопросов пропущена, а считать их нужно по-разному.
       «s» — короткая версия (тело кода в порядке STD, 40 символов);
       «x» — расширенная (тело в порядке всех 90);
       без метки — стандартная версия, 40 символов.
     Стандартное прохождение метки не получает намеренно: все ссылки,
     выданные версиями 1.x, продолжают открываться и означают ровно то
     же самое. Буквы «s» и «x» в алфавите ответов не встречаются,
     поэтому метку нельзя спутать с первым ответом. */
  var CODE = "abcde";

  /* выборка, в порядке которой пишется и читается тело кода */
  function codeList(m){ return m === "long" ? ALL : STD; }
  function codeTag(m){ return m === "long" ? "x" : m === "short" ? "s" : ""; }

  function encodeAnswers(src, m){
    var body = codeList(m).map(function(q){
      var a = src[q.id];
      return a === undefined ? "-" : CODE.charAt(a + 2);
    }).join("");
    return codeTag(m) + body;
  }
  function decodeMode(code){
    if(typeof code !== "string") return "full";
    var c = code.charAt(0);
    return c === "x" ? "long" : c === "s" ? "short" : "full";
  }
  function decodeAnswers(code){
    if(typeof code !== "string") return null;
    var m = decodeMode(code);
    var list = codeList(m);
    var body = codeTag(m) ? code.slice(1) : code;
    var clean = body.replace(/[^a-e-]/g, "");
    if(clean.length !== list.length) return null;
    var out = {}, any = false;
    list.forEach(function(q, i){
      var v = CODE.indexOf(clean.charAt(i));
      if(v > -1){ out[q.id] = v - 2; any = true; }
    });
    return any ? out : null;
  }
  function shareURL(src, m){
    return location.origin + location.pathname + location.search +
           "#/result/" + encodeAnswers(src, m);
  }

  PC.quizCalc = {
    REACH: REACH, MAX_DIST: MAX_DIST,
    questionsFor: questionsFor, modeOfList: modeOfList, maxesFor: maxesFor,
    scoreOf: scoreOf, subScoreOf: subScoreOf, contributions: contributions,
    axisBreakdown: axisBreakdown, ranking: ranking,
    codeList: codeList, codeTag: codeTag,
    encodeAnswers: encodeAnswers, decodeMode: decodeMode, decodeAnswers: decodeAnswers,
    shareURL: shareURL
  };
})(window.PC = window.PC || {});
