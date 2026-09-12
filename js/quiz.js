/* ============ Тест: утверждения -> координаты на компасе ============

   Ответ на каждое утверждение — число от −2 до +2. Вклад в ось равен
   answer × dir × w; сумма нормируется так, чтобы полюса шкалы достигались
   не только при идеально «партийных» ответах на все вопросы, а при
   устойчиво выраженной позиции — иначе крайние точки были бы практически
   недостижимы и все результаты сползали бы к центру.

   Версий теста две: полная на 40 утверждений и короткая на 20. Короткая —
   не «первые двадцать вопросов», а отдельная выборка (поле short в
   js/quiz-data.js), собранная так, чтобы обе версии измеряли одно и то
   же: поровну на каждую ось, все шесть под-осей покрыты, все ключевые
   утверждения сохранены, перекос по направлению внутри оси такой же,
   как в полной.

   Нормировка всегда считается по той выборке, которую человек проходил,
   а не по всем сорока утверждениям. Это принципиально: делить сумму
   двадцати ответов на максимум сорока значило бы систематически
   поджимать короткий результат к центру, и две версии перестали бы
   лежать на одной шкале.

   Тот же ответ считается дважды: один раз в общую сумму по оси, второй —
   в свою узкую под-ось. Под-оси ничего не меняют в итоговых координатах,
   они объясняют их: две точки могут совпасть на компасе и разойтись на
   радаре, и это интереснее самой точки.

   Ответы, итог и история прохождений хранятся в localStorage: тест на
   сорок вопросов не должен пропадать от случайного обновления страницы,
   а взгляды меняются, и направление сдвига говорит больше, чем одна
   точка на поле. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc, fmt = U.fmt, clamp = U.clamp;
  var ALL = PC.QUIZ.QUESTIONS, SHORT = PC.QUIZ.SHORT, SCALE = PC.QUIZ.SCALE;
  var t = PC.t, L = PC.L;

  var KEY_ANS  = "pc-quiz-answers";
  var KEY_RES  = "pc-quiz-result";
  var KEY_HIST = "pc-quiz-history";
  var KEY_MODE = "pc-quiz-mode";

  /* доля от максимума, при которой ось выходит на полюс */
  var REACH = 0.7;
  /* расстояние на компасе, при котором совпадение считается нулевым */
  var MAX_DIST = 20;
  /* сколько прошлых прохождений держим: длиннее — уже не история, а лог */
  var HIST_MAX = 12;

  var host;                       /* контейнер вкладки */
  var answers = {};               /* id вопроса -> −2…+2 */
  var result = null;              /* { x, y, answered, ts, mode } */
  var history = [];               /* прошлые результаты, от старых к новым */
  var idx = 0;                    /* текущий вопрос в активной выборке */
  var view = "intro";             /* intro | run | result */
  var mode = "full";              /* full | short */
  var shared = null;              /* результат, открытый по чужой ссылке */
  var breakdownOpen = false;

  /* ---------- выборки ---------- */
  function questionsFor(m){ return m === "short" ? SHORT : ALL; }
  function activeQuestions(){ return questionsFor(mode); }

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
    full:  { x:axisMaxOf(ALL, "x"),   y:axisMaxOf(ALL, "y"),   sub:subMaxOf(ALL) },
    short: { x:axisMaxOf(SHORT, "x"), y:axisMaxOf(SHORT, "y"), sub:subMaxOf(SHORT) }
  };
  function maxesFor(list){ return list === SHORT ? MAXES.short : MAXES.full; }

  /* Чистая функция: по набору ответов даёт координаты. Второй аргумент —
     выборка, по которой считать; по умолчанию полная, потому что так
     функцию зовут снаружи модуля (тесты, экспорт). */
  function scoreOf(src, list){
    list = list || ALL;
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
      mode: list === SHORT ? "short" : "full",
      ts: Date.now()
    };
  }
  function score(){ return scoreOf(answers, activeQuestions()); }

  /* Те же ответы в разрезе шести узких шкал. Нормировка та же, что и
     у главных осей, поэтому значения сравнимы с партийными sub напрямую. */
  function subScoreOf(src, list){
    /* Умолчание — выборка сохранённого результата, а не та, что выбрана
       в интерфейсе прямо сейчас: радар в аналитике показывает профиль
       уже пройденного теста, и переключатель версии на экране описания
       не должен задним числом менять его нормировку. */
    list = list || questionsFor(result ? result.mode : mode);
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
    return (list || ALL).map(function(q){
      var a = src[q.id];
      var answered = a !== undefined;
      return { q:q, answer: answered ? a : null, value: answered ? a * q.dir * q.w : 0 };
    });
  }

  /* Партии, отсортированные по близости к точке пользователя.
     Совпадение считается от расстояния: 0 — точное попадание, MAX_DIST и
     дальше — 0%. Диагональ поля длиннее MAX_DIST, поэтому у совсем
     противоположных партий совпадение честно упирается в ноль. */
  function ranking(pt){
    return PC.PARTIES.map(function(p){
      var dx = p.x - pt.x, dy = p.y - pt.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      return { p:p, d:d, match: Math.round(clamp(1 - d / MAX_DIST, 0, 1) * 100) };
    }).sort(function(a, b){ return a.d - b.d; });
  }

  /* ---------- кодирование результата в ссылку ---------- */
  /* Один символ на утверждение: a…e — ответы от −2 до +2, дефис —
     без ответа. Сорок символов вместо base64 от JSON выбраны намеренно:
     код читается глазами, не содержит символов, требующих экранирования
     в адресе, и не ломается, если мессенджер обрежет ссылку — короткий
     хвост просто не декодируется, а не даёт неверный результат.

     Короткая версия помечена ведущей «s»: без метки код из двадцати
     ответов и двадцати прочерков невозможно отличить от полного
     прохождения, где половина вопросов пропущена, а нормировать их
     нужно по-разному. Полное прохождение метки не получает — ссылки,
     выданные до появления короткой версии, продолжают работать. */
  var CODE = "abcde";

  function encodeAnswers(src, m){
    var body = ALL.map(function(q){
      var a = src[q.id];
      return a === undefined ? "-" : CODE.charAt(a + 2);
    }).join("");
    return (m === "short" ? "s" : "") + body;
  }
  function decodeMode(code){
    return typeof code === "string" && code.charAt(0) === "s" ? "short" : "full";
  }
  function decodeAnswers(code){
    if(typeof code !== "string") return null;
    var body = code.charAt(0) === "s" ? code.slice(1) : code;
    var clean = body.replace(/[^a-e-]/g, "");
    if(clean.length !== ALL.length) return null;
    var out = {}, any = false;
    ALL.forEach(function(q, i){
      var v = CODE.indexOf(clean.charAt(i));
      if(v > -1){ out[q.id] = v - 2; any = true; }
    });
    return any ? out : null;
  }
  function shareURL(src, m){
    return location.origin + location.pathname + location.search +
           "#/result/" + encodeAnswers(src, m);
  }

  /* ---------- сохранение ---------- */
  function save(){
    PC.store.setJSON(KEY_ANS, answers);
    PC.store.set(KEY_MODE, mode);
    if(result) PC.store.setJSON(KEY_RES, result); else PC.store.remove(KEY_RES);
  }
  function saveHistory(){ PC.store.setJSON(KEY_HIST, history); }

  function load(){
    var savedMode = PC.store.get(KEY_MODE, "full");
    mode = savedMode === "short" ? "short" : "full";

    var a = PC.store.getJSON(KEY_ANS, null);
    if(a && typeof a === "object"){
      ALL.forEach(function(q){
        var v = a[q.id];
        if(typeof v === "number" && v >= -2 && v <= 2) answers[q.id] = Math.round(v);
      });
    }
    var r = PC.store.getJSON(KEY_RES, null);
    if(r && typeof r.x === "number" && typeof r.y === "number"){
      result = { x:clamp(r.x, -10, 10), y:clamp(r.y, -10, 10),
                 answered:r.answered || 0, total:r.total || ALL.length,
                 mode:r.mode === "short" ? "short" : "full", ts:r.ts || 0 };
    }
    var h = PC.store.getJSON(KEY_HIST, null);
    if(Array.isArray(h)){
      history = h.filter(function(e){
        return e && typeof e.x === "number" && typeof e.y === "number";
      }).map(function(e){
        return { x:clamp(e.x, -10, 10), y:clamp(e.y, -10, 10),
                 answered:e.answered || 0, ts:e.ts || 0,
                 mode:e.mode === "short" ? "short" : "full",
                 code:typeof e.code === "string" ? e.code : null };
      }).slice(-HIST_MAX);
    }
  }

  /* Повторное прохождение с теми же ответами историю не засоряет:
     запись добавляется, только если координаты заметно изменились или
     прошло больше минуты — иначе кнопка «Показать результат», нажатая
     дважды, порождала бы две одинаковые точки. */
  function pushHistory(pt){
    var last = history[history.length - 1];
    if(last){
      var same = Math.abs(last.x - pt.x) < .05 && Math.abs(last.y - pt.y) < .05;
      if(same && last.mode === pt.mode && pt.ts - last.ts < 60000) return;
    }
    history.push({ x:pt.x, y:pt.y, answered:pt.answered, ts:pt.ts, mode:pt.mode,
                   code:encodeAnswers(answers, pt.mode) });
    if(history.length > HIST_MAX) history = history.slice(-HIST_MAX);
    saveHistory();
  }

  /* ---------- словесные ярлыки позиции ---------- */
  function econWord(x){
    return t(x <= -6 ? "w.econ.farleft" : x <= -2 ? "w.econ.left"
           : x <   2 ? "w.econ.centre"  : x <   6 ? "w.econ.right" : "w.econ.farright");
  }
  function stateWord(y){
    return t(y <= -6 ? "w.state.lib"    : y <= -2 ? "w.state.freedom"
           : y <   2 ? "w.state.centre" : y <   6 ? "w.state.strong" : "w.state.statist");
  }
  function quadrant(x, y){
    if(x < 0 && y >= 0) return t("q.leftstat");
    if(x >= 0 && y >= 0) return t("q.rightstat");
    if(x < 0) return t("q.leftlib");
    return t("q.rightlib");
  }
  function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
  function modeName(m){ return t(m === "short" ? "quiz.mode.short.n" : "quiz.mode.full.n"); }

  function scaleLabel(s){ return s.key ? t(s.key) : s.label; }
  function questionText(q){ return L(q, "t"); }

  /* ---------- мини-компас с точкой пользователя ---------- */
  function miniCompass(pt){
    var S = 300, P = 26, C = S / 2, K = (S / 2 - P) / 10;
    function X(v){ return C + v * K; }
    function Y(v){ return C - v * K; }

    var parts = [];
    parts.push('<rect x="' + P + '" y="' + P + '" width="' + (S - 2 * P) + '" height="' + (S - 2 * P) + '" rx="10" class="mc-frame"/>');
    for(var v = -10; v <= 10; v += 5){
      if(v === 0) continue;
      parts.push('<line x1="' + X(v) + '" y1="' + P + '" x2="' + X(v) + '" y2="' + (S - P) + '" class="mc-grid"/>');
      parts.push('<line x1="' + P + '" y1="' + Y(v) + '" x2="' + (S - P) + '" y2="' + Y(v) + '" class="mc-grid"/>');
    }
    parts.push('<line x1="' + P + '" y1="' + C + '" x2="' + (S - P) + '" y2="' + C + '" class="mc-axis"/>');
    parts.push('<line x1="' + C + '" y1="' + P + '" x2="' + C + '" y2="' + (S - P) + '" class="mc-axis"/>');

    /* полюса подписаны прямо на поле: без них мини-компас читается
       как абстрактная россыпь точек */
    parts.push('<text x="' + C + '" y="' + (P - 9) + '" class="mc-cap" text-anchor="middle">' + esc(t("cap.mini.top")) + '</text>');
    parts.push('<text x="' + C + '" y="' + (S - P + 17) + '" class="mc-cap" text-anchor="middle">' + esc(t("cap.mini.bottom")) + '</text>');
    parts.push('<text x="' + (P - 8) + '" y="' + C + '" class="mc-cap" text-anchor="middle" transform="rotate(-90 ' +
      (P - 8) + ' ' + C + ')">' + esc(t("cap.mini.left")) + '</text>');
    parts.push('<text x="' + (S - P + 8) + '" y="' + C + '" class="mc-cap" text-anchor="middle" transform="rotate(90 ' +
      (S - P + 8) + ' ' + C + ')">' + esc(t("cap.mini.right")) + '</text>');

    PC.PARTIES.forEach(function(p){
      parts.push('<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="5" class="mc-party" fill="' +
        esc(p.color) + '"><title>' + esc(L(p, "name")) + '</title></circle>');
    });

    var ux = X(pt.x).toFixed(1), uy = Y(pt.y).toFixed(1);
    parts.push('<line x1="' + C + '" y1="' + uy + '" x2="' + ux + '" y2="' + uy + '" class="mc-lead"/>');
    parts.push('<line x1="' + ux + '" y1="' + C + '" x2="' + ux + '" y2="' + uy + '" class="mc-lead"/>');
    parts.push('<circle cx="' + ux + '" cy="' + uy + '" r="11" class="mc-you-halo"/>');
    parts.push('<circle cx="' + ux + '" cy="' + uy + '" r="6" class="mc-you"/>');
    parts.push('<text x="' + ux + '" y="' + (Number(uy) - 16) + '" class="mc-you-label" text-anchor="middle">' +
      esc(t("node.you")) + '</text>');

    return '<svg class="mini-compass" viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="' +
      esc(t("node.youAria", { x:fmt(pt.x), y:fmt(pt.y) })) + '">' + parts.join("") + '</svg>';
  }

  /* ---------- экран 1: описание ---------- */
  /* Переключатель версии стоит только здесь: менять длину теста посреди
     прохождения значит либо выбросить часть уже данных ответов, либо
     дописать вопросов на ходу — и то и другое выглядит как поломка. */
  function modeSwitch(){
    return '<div class="quiz-modes" role="group" aria-label="' + esc(t("quiz.mode")) + '">' +
      ["full", "short"].map(function(m){
        var list = questionsFor(m);
        return '<button type="button" class="qmode" data-mode="' + m + '" aria-pressed="' + (m === mode) + '">' +
          '<span class="qm-n">' + esc(t("quiz.mode." + m, { n:list.length })) + '</span>' +
          '<span class="qm-d">' + esc(t("quiz.mode." + m + "D", { n:list.length })) + '</span>' +
        '</button>';
      }).join("") +
    '</div>';
  }

  function renderIntro(){
    var list = activeQuestions();
    var done = list.filter(function(q){ return answers[q.id] !== undefined; }).length;
    host.innerHTML =
      '<div class="quiz-intro">' +
        '<span class="eyebrow">' + esc(t("quiz.eyebrow", { n:list.length, statements:PC.i18n.pl(list.length, "word.statement") })) + '</span>' +
        '<h2>' + esc(t("quiz.h")) + '</h2>' +
        '<p class="quiz-lede">' + esc(t("quiz.lede", { n:list.length })) + '</p>' +
        modeSwitch() +
        (mode === "short" ? '<p class="quiz-note short-note">' + esc(t("quiz.shortNote", { n:SHORT.length, all:ALL.length })) + '</p>' : "") +
        '<ul class="quiz-facts">' +
          '<li data-reveal>' + t("quiz.fact1", { a:list.length / 2, b:list.length / 2 }) + '</li>' +
          '<li data-reveal>' + t(mode === "short" ? "quiz.fact2.short" : "quiz.fact2") + '</li>' +
          '<li data-reveal>' + t("quiz.fact3") + '</li>' +
        '</ul>' +
        '<div class="quiz-actions">' +
          '<button type="button" class="btn primary" id="quizStart">' +
            esc(done && done < list.length ? t("quiz.continue", { n:firstUnanswered() + 1 }) : t("quiz.start")) + '</button>' +
          (result ? '<button type="button" class="btn" id="quizShowResult">' + esc(t("quiz.showPrev")) + '</button>' : "") +
          (done ? '<button type="button" class="btn ghost" id="quizReset">' + esc(t("quiz.reset")) + '</button>' : "") +
        '</div>' +
        (history.length > 1 ? historyBlock(null) : "") +
        '<p class="quiz-note">' + esc(t("quiz.note")) + '</p>' +
      '</div>';

    host.querySelectorAll(".qmode").forEach(function(b){
      b.addEventListener("click", function(){
        if(mode === b.dataset.mode) return;
        mode = b.dataset.mode;
        PC.store.set(KEY_MODE, mode);
        idx = firstUnanswered();
        render();
      });
    });

    document.getElementById("quizStart").addEventListener("click", function(){
      idx = firstUnanswered();
      view = "run";
      render();
    });
    var showRes = document.getElementById("quizShowResult");
    if(showRes) showRes.addEventListener("click", function(){ view = "result"; render(); });
    var reset = document.getElementById("quizReset");
    if(reset) reset.addEventListener("click", resetAll);
    bindHistory();
  }

  function firstUnanswered(){
    var list = activeQuestions();
    for(var i = 0; i < list.length; i++) if(answers[list[i].id] === undefined) return i;
    return 0;
  }

  /* ---------- экран 2: вопросы ---------- */
  function renderRun(){
    var list = activeQuestions();
    var q = list[idx];
    var done = list.filter(function(x){ return answers[x.id] !== undefined; }).length;
    var cur = answers[q.id];

    host.innerHTML =
      '<div class="quiz-run">' +
        '<div class="quiz-top">' +
          '<button type="button" class="btn ghost small" id="quizBack">' + esc(t("quiz.back")) + '</button>' +
          '<span class="quiz-counter">' + (idx + 1) + ' / ' + list.length + '</span>' +
        '</div>' +
        '<div class="quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + list.length +
          '" aria-valuenow="' + done + '" aria-label="' + esc(t("quiz.answered")) + '">' +
          '<i style="width:' + (done / list.length * 100).toFixed(1) + '%"></i></div>' +
        '<div class="quiz-tagline">' +
          '<span class="qt-axis">' + esc(t(q.axis === "x" ? "quiz.tag.x" : "quiz.tag.y")) + '</span>' +
          '<span class="qt-sub">' + esc(t("quiz.subOf", { name:t("sub." + q.sub) })) + '</span>' +
          (q.w > 1 ? '<span class="qt-weight" title="' + esc(t("quiz.weightHint")) + '">' +
            esc(t("quiz.weight", { w:q.w.toFixed(1) })) + '</span>' : "") +
        '</div>' +
        '<p class="quiz-q">' + esc(questionText(q)) + '</p>' +
        '<div class="quiz-scale" role="group" aria-label="' + esc(t("quiz.answer")) + '">' +
          SCALE.map(function(s, i){
            return '<button type="button" class="qopt' + (cur === s.v ? " on" : "") + '" data-v="' + s.v +
              '" aria-pressed="' + (cur === s.v) + '">' +
              '<span class="dot"></span><span class="lbl">' + esc(scaleLabel(s)) + '</span>' +
              '<kbd>' + (i + 1) + '</kbd></button>';
          }).join("") +
        '</div>' +
        '<div class="quiz-nav">' +
          '<button type="button" class="btn" id="quizPrev"' + (idx === 0 ? " disabled" : "") + '>' + esc(t("quiz.prev")) + '</button>' +
          '<button type="button" class="btn ghost" id="quizSkip">' + esc(t("quiz.skip")) + '</button>' +
          '<button type="button" class="btn primary" id="quizNext"' + (cur === undefined ? " disabled" : "") + '>' +
            esc(idx === list.length - 1 ? t("quiz.finish") : t("quiz.next")) + '</button>' +
        '</div>' +
        '<div class="quiz-hint">' + t("quiz.keys") + '</div>' +
      '</div>';

    host.querySelectorAll(".qopt").forEach(function(b){
      b.addEventListener("click", function(){ answer(Number(b.dataset.v)); });
    });
    document.getElementById("quizPrev").addEventListener("click", prev);
    document.getElementById("quizNext").addEventListener("click", next);
    document.getElementById("quizSkip").addEventListener("click", function(){
      if(idx === list.length - 1) finish(); else { idx++; render(); }
    });
    document.getElementById("quizBack").addEventListener("click", function(){ view = "intro"; render(); });
  }

  /* Ответ только подсвечивается и включает кнопку «Дальше» — сам переход
     к следующему вопросу происходит по отдельному действию (клик по
     кнопке, Enter, стрелка вправо). Раньше клик по варианту сам кидал
     дальше через мгновение, и кнопка «Дальше» либо ничего не успевала
     сделать, либо просто дублировала то же самое движение — выбор
     нельзя было спокойно передумать. */
  function answer(v){
    answers[activeQuestions()[idx].id] = v;
    save();
    host.querySelectorAll(".qopt").forEach(function(b){
      var on = Number(b.dataset.v) === v;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    var nextBtn = document.getElementById("quizNext");
    if(nextBtn) nextBtn.disabled = false;
  }
  function prev(){ if(idx > 0){ idx--; render(); } }
  function next(){
    var list = activeQuestions();
    if(answers[list[idx].id] === undefined) return;
    if(idx === list.length - 1) finish(); else { idx++; render(); }
  }

  function finish(){
    result = score();
    save();
    pushHistory(result);
    view = "result";
    shared = null;
    render();
    /* точка пользователя появляется и на большом компасе */
    if(PC.compass) PC.compass.redraw();
  }

  function resetAll(){
    answers = {};
    result = null;
    idx = 0;
    view = "intro";
    shared = null;
    PC.store.remove(KEY_ANS);
    PC.store.remove(KEY_RES);
    render();
    if(PC.compass) PC.compass.redraw();
  }

  /* ---------- разбор: как ответы сложились в координаты ---------- */
  function axisBreakdown(src, axis, list){
    var rows = contributions(src, list).filter(function(c){ return c.q.axis === axis; });
    var sum = rows.reduce(function(s, c){ return s + c.value; }, 0);
    var max = maxesFor(list)[axis];
    var coord = clamp(sum / (max * REACH) * 10, -10, 10);
    return { rows:rows, sum:sum, max:max, coord:coord };
  }

  function poleName(axis, positive){
    if(axis === "x") return t(positive ? "ch.spec.market" : "ch.spec.planned");
    return t(positive ? "ch.spec.statism" : "ch.spec.liberty");
  }

  function breakdownTable(src, axis, list){
    var b = axisBreakdown(src, axis, list);
    var rows = b.rows.slice().sort(function(a, c){ return Math.abs(c.value) - Math.abs(a.value); });
    return '<div class="bd-axis">' +
      '<h4>' + esc(t(axis === "x" ? "res.break.axisX" : "res.break.axisY")) + '</h4>' +
      '<p class="bd-sum">' + esc(t("res.break.sum", {
        s:(b.sum > 0 ? "+" : "") + b.sum.toFixed(1),
        m:(b.max * REACH).toFixed(1),
        c:fmt(b.coord)
      })) + '</p>' +
      '<table class="data-table bd-table">' +
        '<thead><tr>' +
          '<th scope="col">' + esc(t("res.break.stmt")) + '</th>' +
          '<th scope="col">' + esc(t("res.break.answer")) + '</th>' +
          '<th scope="col">' + esc(t("res.break.weight")) + '</th>' +
          '<th scope="col">' + esc(t("res.break.contrib")) + '</th>' +
        '</tr></thead><tbody>' +
        rows.map(function(c){
          var s = SCALE.filter(function(x){ return x.v === c.answer; })[0];
          var cls = c.value > 0 ? "up" : c.value < 0 ? "down" : "flat";
          return '<tr><th scope="row">' + esc(questionText(c.q)) + "</th>" +
            "<td>" + esc(c.answer === null ? "—" : scaleLabel(s)) + "</td>" +
            "<td>" + c.q.w.toFixed(1) + "</td>" +
            '<td class="' + cls + '">' + (c.value > 0 ? "+" : "") + c.value.toFixed(1) + "</td></tr>";
        }).join("") +
      "</tbody></table></div>";
  }

  function breakdownBlock(src, list){
    var all = contributions(src, list).filter(function(c){ return c.value !== 0; })
      .sort(function(a, b){ return Math.abs(b.value) - Math.abs(a.value); })
      .slice(0, 5);

    return '<section class="qr-block bd-block" data-reveal aria-label="' + esc(t("res.break.h")) + '">' +
      '<h3>' + esc(t("res.break.h")) + '</h3>' +
      '<p class="qr-block-p">' + esc(t("res.break.p")) + '</p>' +
      '<div class="bd-top"><h4>' + esc(t("res.break.top")) + '</h4><ol>' +
        all.map(function(c){
          var pole = poleName(c.q.axis, c.value > 0);
          return "<li><span class=\"bt-q\">" + esc(questionText(c.q)) + "</span>" +
            '<span class="bt-v ' + (c.value > 0 ? "up" : "down") + '">' +
            esc(t("res.break.pull", { pole:pole, v:Math.abs(c.value).toFixed(1) })) + "</span></li>";
        }).join("") +
      "</ol></div>" +
      '<button type="button" class="data-toggle" id="bdToggle" aria-expanded="' + breakdownOpen + '">' +
        esc(breakdownOpen ? t("res.break.hide") : t("res.break.show")) + '</button>' +
      '<div class="data-wrap bd-wrap"' + (breakdownOpen ? "" : " hidden") + '>' +
        breakdownTable(src, "x", list) + breakdownTable(src, "y", list) +
        '<p class="qr-block-p">' + esc(t("res.break.reach", { p:Math.round(REACH * 100) })) + '</p>' +
      '</div>' +
    '</section>';
  }

  /* ---------- история прохождений ---------- */
  /* Две линии на общем поле −10…+10: экономика и отношение к государству
     по номеру прохождения. График намеренно маленький и без осей — он
     отвечает на один вопрос, «куда вы сдвинулись», а точные числа стоят
     подписями рядом. */
  function historyChart(list){
    var W = 460, H = 150, pl = 30, pr = 14, pt = 12, pb = 24;
    var iw = W - pl - pr, ih = H - pt - pb;
    var n = list.length;
    function X(i){ return pl + (n === 1 ? iw / 2 : iw * i / (n - 1)); }
    function Y(v){ return pt + ih - (v + 10) / 20 * ih; }

    function line(key, color){
      var d = list.map(function(e, i){ return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(e[key]).toFixed(1); }).join("");
      var dots = list.map(function(e, i){
        return '<circle class="hc-dot" cx="' + X(i).toFixed(1) + '" cy="' + Y(e[key]).toFixed(1) +
          '" r="3.6" fill="' + color + '"><title>' + esc(fmt(e[key])) + "</title></circle>";
      }).join("");
      return '<path class="hc-line" d="' + d + '" stroke="' + color + '"/>' + dots;
    }

    return '<svg class="hist-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' +
      esc(t("res.hist.aria")) + '">' +
      '<line class="hc-zero" x1="' + pl + '" y1="' + Y(0) + '" x2="' + (W - pr) + '" y2="' + Y(0) + '"/>' +
      '<text class="hc-tick" x="' + (pl - 6) + '" y="' + (Y(10) + 3) + '" text-anchor="end">+10</text>' +
      '<text class="hc-tick" x="' + (pl - 6) + '" y="' + (Y(0) + 3) + '" text-anchor="end">0</text>' +
      '<text class="hc-tick" x="' + (pl - 6) + '" y="' + (Y(-10) + 3) + '" text-anchor="end">−10</text>' +
      line("x", "var(--accent)") + line("y", "var(--accent-2)") +
      list.map(function(e, i){
        var label = i === n - 1 ? t("res.hist.now") : String(i + 1);
        return '<text class="hc-tick" x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' +
          esc(label) + "</text>";
      }).join("") +
    "</svg>";
  }

  function historyBlock(pt){
    var list = history.slice();
    if(pt && (!list.length || list[list.length - 1].ts !== pt.ts)){
      /* показанный результат может быть ещё не записан (открыт из
         сохранённого прошлого прохождения) — рисуем его как последнюю
         точку, не трогая хранилище */
      var last = list[list.length - 1];
      if(!last || Math.abs(last.x - pt.x) > .05 || Math.abs(last.y - pt.y) > .05){
        list = list.concat([{ x:pt.x, y:pt.y, answered:pt.answered, ts:pt.ts,
                              mode:pt.mode || "full", code:null }]);
      }
    }
    if(list.length < 2){
      return '<section class="qr-block hist-block" data-reveal aria-label="' + esc(t("res.hist.h")) + '">' +
        '<h3>' + esc(t("res.hist.h")) + '</h3>' +
        '<p class="qr-block-p">' + esc(t("res.hist.empty")) + '</p></section>';
    }

    var first = list[0], now = list[list.length - 1];
    function delta(v){ return (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(1); }

    return '<section class="qr-block hist-block" data-reveal aria-label="' + esc(t("res.hist.h")) + '">' +
      '<h3>' + esc(t("res.hist.h")) + '</h3>' +
      '<p class="qr-block-p">' + esc(t("res.hist.p", { n:list.length })) + '</p>' +
      historyChart(list) +
      '<div class="rad-legend">' +
        '<span class="rl"><i style="background:var(--accent)"></i>' + esc(t("res.econ")) + "</span>" +
        '<span class="rl"><i style="background:var(--accent-2)"></i>' + esc(t("res.state")) + "</span>" +
      "</div>" +
      '<p class="hist-note">' + esc(t("res.hist.drift", {
        dx:delta(now.x - first.x), dy:delta(now.y - first.y)
      })) + "</p>" +
      /* Пять прохождений — тоже совпадение с номером версии 1.5.5,
         которое не грех отметить строкой, а не только в чейнджлоге. */
      (list.length === 5 ? '<p class="hist-note hist-five">' + esc(t("res.hist.five")) + '</p>' : "") +
      '<div class="hist-runs">' + list.map(function(e, i){
        var when = e.ts ? new Date(e.ts).toLocaleDateString(PC.i18n.isRu() ? "ru-RU" : "en-GB") : "—";
        var tag = 'class="hrun' + (e.mode === "short" ? " short" : "") + '" data-code="' + esc(e.code || "") + '"';
        return "<" + (e.code ? "button type=\"button\" " + tag : "span " + tag) + ">" +
          '<b>' + (i + 1) + "</b><span>" + esc(when) + "</span>" +
          '<em>' + fmt(e.x) + " / " + fmt(e.y) + "</em>" +
          '<u>' + esc(modeName(e.mode)) + "</u>" +
          "</" + (e.code ? "button" : "span") + ">";
      }).join("") + "</div>" +
      '<button type="button" class="btn ghost small" id="histClear">' + esc(t("res.hist.clear")) + "</button>" +
    "</section>";
  }

  function bindHistory(){
    var clear = document.getElementById("histClear");
    if(clear) clear.addEventListener("click", function(){
      history = [];
      PC.store.remove(KEY_HIST);
      if(PC.ui) PC.ui.toast(t("res.hist.cleared"));
      render();
    });
    host.querySelectorAll("button.hrun").forEach(function(b){
      b.title = t("res.hist.open");
      b.addEventListener("click", function(){ openShared(b.dataset.code); });
    });
  }

  /* ---------- ссылка на результат ---------- */
  function linkBlock(src, m){
    var url = shareURL(src, m);
    return '<section class="qr-block link-block" data-reveal aria-label="' + esc(t("res.link.h")) + '">' +
      '<h3>' + esc(t("res.link.h")) + '</h3>' +
      '<p class="qr-block-p">' + esc(t("res.link.p")) + '</p>' +
      '<div class="link-row">' +
        '<input type="text" id="resLink" readonly value="' + esc(url) +
          '" aria-label="' + esc(t("res.link.aria")) + '" spellcheck="false">' +
        '<button type="button" class="btn primary" id="resCopy">' + esc(t("res.link.copy")) + '</button>' +
        '<a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(t("res.link.open")) + '</a>' +
      "</div>" +
    "</section>";
  }

  function bindLink(){
    var input = document.getElementById("resLink");
    var btn = document.getElementById("resCopy");
    if(!input || !btn) return;
    btn.addEventListener("click", function(){
      input.focus();
      input.select();
      var done = function(){ if(PC.ui) PC.ui.toast(t("res.link.copied")); };
      var fail = function(){ if(PC.ui) PC.ui.toast(t("res.link.failed"), true); };
      /* Clipboard API недоступен на http и в части встроенных браузеров —
         старый execCommand остаётся рабочим запасным путём, а не наследием */
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(input.value).then(done, function(){
          try{ document.execCommand("copy") ? done() : fail(); }catch(e){ fail(); }
        });
      }else{
        try{ document.execCommand("copy") ? done() : fail(); }catch(e){ fail(); }
      }
    });
  }

  /* ---------- профиль по под-осям ---------- */
  function subBlock(){
    return '<section class="qr-block sub-block" data-reveal aria-label="' + esc(t("res.sub.h")) + '">' +
      '<h3>' + esc(t("res.sub.h")) + '</h3>' +
      '<p class="qr-block-p">' + esc(t("res.sub.p")) + '</p>' +
      '<div class="radar-wrap" id="qrRadar"></div>' +
      '<p class="rad-summary" id="qrRadarNote"></p>' +
    "</section>";
  }

  function mountSubBlock(src, pt, list){
    var box = document.getElementById("qrRadar");
    if(!box || !PC.radar) return;
    var mine = subScoreOf(src, list);
    var best = ranking(pt)[0];
    PC.radar.render(box, [
      { label:L(best.p, "short"), color:best.p.color, values:best.p.sub },
      { label:t("ch.radar.you"), color:"var(--accent)", values:mine, dashed:true }
    ]);
    var note = document.getElementById("qrRadarNote");
    if(note) note.textContent = PC.radar.summary(best.p.sub, mine);
  }

  /* ---------- экран 3: результат ---------- */
  function renderResult(){
    var src  = shared ? shared.answers : answers;
    var runMode = shared ? shared.mode : (result ? result.mode : mode);
    var list = questionsFor(runMode);
    var pt   = shared ? shared.pt : (result || score());
    var rank = ranking(pt);
    var best = rank[0];
    var far  = rank[rank.length - 1];
    var answered = pt.answered !== undefined ? pt.answered
                 : list.filter(function(q){ return src[q.id] !== undefined; }).length;
    var skipped = list.length - answered;

    function bar(v){
      var w = Math.abs(v) / 10 * 50;
      var left = v < 0 ? 50 - w : 50;
      return '<div class="qr-bar"><i data-w="' + w.toFixed(2) + '" data-left="' + left.toFixed(2) + '"></i></div>';
    }

    host.innerHTML =
      '<div class="quiz-result">' +
        '<div class="qr-main">' +
          '<span class="eyebrow">' + esc(shared ? t("res.shared") : t("res.eyebrow")) + '</span>' +
          '<h2>' + esc(capitalize(quadrant(pt.x, pt.y))) + '</h2>' +
          '<p class="qr-version">' + esc(t("res.version", {
            v:modeName(runMode), n:list.length,
            statements:PC.i18n.pl(list.length, "word.statement") })) + '</p>' +
          (shared ? '<p class="qr-shared-note">' + esc(t("res.sharedNote")) +
            ' <button type="button" class="btn ghost small" id="qrMine">' + esc(t("res.mine")) + '</button></p>' : "") +
          '<div class="qr-coords">' +
            '<div class="qr-coord" data-reveal><div class="k">' + esc(t("res.econ")) + '</div><div class="v">' + fmt(pt.x) + '</div>' +
              '<div class="d">' + esc(t("res.views", { w:econWord(pt.x) })) + '</div>' + bar(pt.x) +
              '<div class="qr-poles"><span>' + esc(t("ch.spec.planned")) + '</span><span>' + esc(t("ch.spec.market")) + '</span></div></div>' +
            '<div class="qr-coord" data-reveal><div class="k">' + esc(t("res.state")) + '</div><div class="v">' + fmt(pt.y) + '</div>' +
              '<div class="d">' + esc(stateWord(pt.y)) + '</div>' + bar(pt.y) +
              '<div class="qr-poles"><span>' + esc(t("ch.spec.liberty")) + '</span><span>' + esc(t("ch.spec.statism")) + '</span></div></div>' +
          '</div>' +
          '<p class="qr-summary">' + t("res.summary", {
              best:esc(L(best.p, "name")), m:best.match, d:best.d.toFixed(1), far:esc(L(far.p, "name"))
            }) +
            (skipped ? esc(t("res.skipped", { n:skipped, statements:PC.i18n.pl(skipped, "word.statement") })) : "") + '</p>' +
          '<div class="quiz-actions">' +
            '<button type="button" class="btn primary" id="qrCompass">' + esc(t("res.showCompass")) + '</button>' +
            '<button type="button" class="btn" id="qrReview">' + esc(t("res.review")) + '</button>' +
            '<button type="button" class="btn ghost" id="qrAgain">' + esc(t("res.again")) + '</button>' +
          '</div>' +
          '<p class="quiz-note">' + esc(t("res.matchNote", { n:MAX_DIST })) +
            (runMode === "short" ? " " + esc(t("res.shortNote", { n:SHORT.length, all:ALL.length })) : "") + '</p>' +
          subBlock() +
          breakdownBlock(src, list) +
          linkBlock(src, runMode) +
          (shared ? "" : historyBlock(pt)) +
          '<section class="qr-share" id="qrShareBlock" data-reveal aria-label="' + esc(t("res.shareBlock")) + '"></section>' +
        '</div>' +
        '<div class="qr-side">' + miniCompass(pt) +
          '<div class="qr-rank">' +
            rank.map(function(r){
              return '<button type="button" class="qr-row" data-reveal data-id="' + esc(r.p.id) + '">' +
                '<i style="background:' + esc(r.p.color) + '"></i>' +
                '<span class="n">' + esc(L(r.p, "short")) + '</span>' +
                '<span class="track"><span class="fill" data-w="' + r.match + '" style="background:' +
                  esc(r.p.color) + '"></span></span>' +
                '<span class="m">' + r.match + '%</span></button>';
            }).join("") +
          '</div>' +
        '</div>' +
      '</div>';

    if(PC.share) PC.share.mount(document.getElementById("qrShareBlock"), pt);
    mountSubBlock(src, pt, list);

    document.getElementById("qrAgain").addEventListener("click", resetAll);
    document.getElementById("qrReview").addEventListener("click", function(){
      shared = null; idx = 0; view = "run"; render();
    });
    document.getElementById("qrCompass").addEventListener("click", function(){
      if(PC.nav) PC.nav.go("compass");
    });
    var mine = document.getElementById("qrMine");
    if(mine) mine.addEventListener("click", function(){
      shared = null;
      if(location.hash.indexOf("#/result/") === 0) replaceHash("#/quiz");
      view = result ? "result" : "intro";
      render();
    });

    var bdToggle = document.getElementById("bdToggle");
    if(bdToggle) bdToggle.addEventListener("click", function(){
      var wrap = host.querySelector(".bd-wrap");
      breakdownOpen = wrap.hasAttribute("hidden");
      if(breakdownOpen) wrap.removeAttribute("hidden"); else wrap.setAttribute("hidden", "");
      bdToggle.setAttribute("aria-expanded", String(breakdownOpen));
      bdToggle.textContent = breakdownOpen ? t("res.break.hide") : t("res.break.show");
    });

    bindLink();
    bindHistory();

    host.querySelectorAll(".qr-row").forEach(function(b){
      b.addEventListener("click", function(){
        PC.select(b.dataset.id);
        if(PC.nav) PC.nav.go("compass");
      });
    });

    /* ширины задаём в следующем кадре, иначе transition не сработает */
    requestAnimationFrame(function(){
      host.querySelectorAll(".qr-bar i").forEach(function(i){
        i.style.left = i.dataset.left + "%";
        i.style.width = Math.max(1.5, Number(i.dataset.w)) + "%";
      });
      host.querySelectorAll(".qr-row .fill").forEach(function(f){
        f.style.width = f.dataset.w + "%";
      });
    });
  }

  /* Локальная переменная history закрывает глобальную, поэтому обращение
     к истории браузера идёт через window явно. */
  function replaceHash(hash){
    if(window.history && window.history.replaceState) window.history.replaceState(null, "", hash);
    else location.hash = hash;
  }

  /* ---------- результат по ссылке ---------- */
  /* Чужой результат не трогает ваши ответы: он живёт в отдельном поле
     shared и исчезает по кнопке «вернуться к моему тесту». Иначе переход
     по ссылке из мессенджера молча затирал бы собственные ответы —
     ровно то, ради сохранности чего они и лежат в localStorage. */
  function openShared(code, silentHash){
    var src = decodeAnswers(code);
    if(!src) return false;
    var m = decodeMode(code);
    var pt = scoreOf(src, questionsFor(m));
    shared = { answers:src, pt:pt, code:code, mode:m };
    view = "result";
    if(!silentHash) replaceHash("#/result/" + code);
    render();
    return true;
  }

  function hashCode(){
    var m = /^#\/?result\/(s?[a-e-]+)/.exec(location.hash || "");
    return m ? m[1] : null;
  }

  /* Счётчик на ярлыке вкладки. В разметке он статичный («40»), потому что
     без скриптов другого числа взяться неоткуда; как только версия выбрана,
     ярлык обязан показывать её длину — иначе на экране одновременно висят
     «Тест · 20 утверждений» и вкладка «Тест 40». */
  function paintTabBadge(){
    var badge = document.querySelector("#tab-quiz .tab-badge");
    if(badge) badge.textContent = String(activeQuestions().length);
  }

  function render(){
    if(!host) return;
    paintTabBadge();
    if(view === "run") renderRun();
    else if(view === "result" && (shared || result || Object.keys(answers).length)) renderResult();
    else renderIntro();
    /* экраны теста строятся заново на каждом шаге — заново регистрируем
       их элементы у наблюдателя появления */
    if(PC.motion) PC.motion.scan(host);
  }

  /* ---------- клавиатура ---------- */
  function onKey(e){
    if(view !== "run") return;
    if(PC.nav && PC.nav.current() !== "quiz") return;
    var tag = document.activeElement && document.activeElement.tagName;
    if(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    /* сочетания с модификаторами принадлежат браузеру и ОС: Ctrl+1 —
       переключение вкладки браузера, а не ответ на утверждение */
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    var n = /^[1-9]$/.test(e.key) ? Number(e.key) : 0;
    if(n >= 1 && n <= SCALE.length){
      e.preventDefault();
      answer(SCALE[n - 1].v);
    }else if(e.key === "ArrowLeft"){ e.preventDefault(); prev(); }
    else if(e.key === "ArrowRight"){ e.preventDefault(); next(); }
  }

  function init(){
    host = document.getElementById("quiz");
    if(!host) return;
    load();
    var code = hashCode();
    if(code && openShared(code, true)){
      document.addEventListener("keydown", onKey);
      return;
    }
    if(result) view = "result";
    idx = firstUnanswered();
    render();
    document.addEventListener("keydown", onKey);
  }

  PC.quiz = {
    init: init,
    render: render,
    result: function(){ return result; },
    mode: function(){ return mode; },
    questions: activeQuestions,
    ranking: ranking,
    quadrant: quadrant,
    scoreOf: scoreOf,
    subScoreOf: subScoreOf,
    contributions: contributions,
    encodeAnswers: encodeAnswers,
    decodeAnswers: decodeAnswers,
    decodeMode: decodeMode,
    shareURL: shareURL,
    openShared: openShared,
    history: function(){ return history.slice(); },
    /* словесные ярлыки нужны карточке для соцсетей — считаются здесь,
       чтобы формулировка на сайте и на картинке не разъезжались */
    words: function(pt){ return { econ:econWord(pt.x), state:stateWord(pt.y) }; }
  };
})(window.PC = window.PC || {});
