/* ============ Тест: 40 утверждений -> координаты на компасе ============

   Ответ на каждое утверждение — число от −2 до +2. Вклад в ось равен
   answer × dir × w; сумма нормируется так, чтобы полюса шкалы достигались
   не только при идеально «партийных» ответах на все вопросы, а при
   устойчиво выраженной позиции — иначе крайние точки были бы практически
   недостижимы и все результаты сползали бы к центру.

   Ответы и итог хранятся в localStorage: тест на 40 вопросов не должен
   пропадать от случайного обновления страницы. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc, fmt = U.fmt, clamp = U.clamp;
  var Q = PC.QUIZ.QUESTIONS, SCALE = PC.QUIZ.SCALE;

  var KEY_ANS = "pc-quiz-answers";
  var KEY_RES = "pc-quiz-result";

  /* доля от максимума, при которой ось выходит на полюс */
  var REACH = 0.7;
  /* расстояние на компасе, при котором совпадение считается нулевым */
  var MAX_DIST = 20;

  var host;                       /* контейнер вкладки */
  var answers = {};               /* id вопроса -> −2…+2 */
  var result = null;              /* { x, y, answered, ts } */
  var idx = 0;                    /* текущий вопрос */
  var view = "intro";             /* intro | run | result */

  /* ---------- счёт ---------- */
  function axisMax(axis){
    return Q.reduce(function(s, q){ return q.axis === axis ? s + q.w * 2 : s; }, 0);
  }
  var MAX_X = axisMax("x"), MAX_Y = axisMax("y");

  function score(){
    var sx = 0, sy = 0, answered = 0;
    Q.forEach(function(q){
      var a = answers[q.id];
      if(a === undefined) return;
      answered++;
      var v = a * q.dir * q.w;
      if(q.axis === "x") sx += v; else sy += v;
    });
    return {
      x: clamp(sx / (MAX_X * REACH) * 10, -10, 10),
      y: clamp(sy / (MAX_Y * REACH) * 10, -10, 10),
      answered: answered,
      ts: Date.now()
    };
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

  /* ---------- сохранение ---------- */
  function save(){
    PC.store.setJSON(KEY_ANS, answers);
    if(result) PC.store.setJSON(KEY_RES, result); else PC.store.remove(KEY_RES);
  }
  function load(){
    var a = PC.store.getJSON(KEY_ANS, null);
    if(a && typeof a === "object"){
      Q.forEach(function(q){
        var v = a[q.id];
        if(typeof v === "number" && v >= -2 && v <= 2) answers[q.id] = Math.round(v);
      });
    }
    var r = PC.store.getJSON(KEY_RES, null);
    if(r && typeof r.x === "number" && typeof r.y === "number"){
      result = { x:clamp(r.x, -10, 10), y:clamp(r.y, -10, 10),
                 answered:r.answered || 0, ts:r.ts || 0 };
    }
  }

  /* ---------- словесные ярлыки позиции ---------- */
  function econWord(x){
    return x <= -6 ? "последовательно левые" : x <= -2 ? "умеренно левые"
         : x <   2 ? "центристские" : x < 6 ? "умеренно правые" : "последовательно правые";
  }
  function stateWord(y){
    return y <= -6 ? "выраженно либертарианские" : y <= -2 ? "скорее за личные свободы"
         : y <   2 ? "центристские" : y < 6 ? "скорее за сильное государство" : "выраженно этатистские";
  }
  function quadrant(x, y){
    if(x < 0 && y >= 0) return "левый этатизм";
    if(x >= 0 && y >= 0) return "правый этатизм";
    if(x < 0) return "левое либертарианство";
    return "правое либертарианство";
  }
  function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

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
    parts.push('<text x="' + C + '" y="' + (P - 9) + '" class="mc-cap" text-anchor="middle">ЭТАТИЗМ</text>');
    parts.push('<text x="' + C + '" y="' + (S - P + 17) + '" class="mc-cap" text-anchor="middle">СВОБОДЫ</text>');
    parts.push('<text x="' + (P - 8) + '" y="' + C + '" class="mc-cap" text-anchor="middle" transform="rotate(-90 ' +
      (P - 8) + ' ' + C + ')">ПЛАН</text>');
    parts.push('<text x="' + (S - P + 8) + '" y="' + C + '" class="mc-cap" text-anchor="middle" transform="rotate(90 ' +
      (S - P + 8) + ' ' + C + ')">РЫНОК</text>');

    PC.PARTIES.forEach(function(p){
      parts.push('<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="5" class="mc-party" fill="' +
        esc(p.color) + '"><title>' + esc(p.name) + '</title></circle>');
    });

    var ux = X(pt.x).toFixed(1), uy = Y(pt.y).toFixed(1);
    parts.push('<line x1="' + C + '" y1="' + uy + '" x2="' + ux + '" y2="' + uy + '" class="mc-lead"/>');
    parts.push('<line x1="' + ux + '" y1="' + C + '" x2="' + ux + '" y2="' + uy + '" class="mc-lead"/>');
    parts.push('<circle cx="' + ux + '" cy="' + uy + '" r="11" class="mc-you-halo"/>');
    parts.push('<circle cx="' + ux + '" cy="' + uy + '" r="6" class="mc-you"/>');
    parts.push('<text x="' + ux + '" y="' + (Number(uy) - 16) + '" class="mc-you-label" text-anchor="middle">Вы</text>');

    return '<svg class="mini-compass" viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="Ваша позиция: экономика ' +
      fmt(pt.x) + ', отношение к государству ' + fmt(pt.y) + '">' + parts.join("") + '</svg>';
  }

  /* ---------- экран 1: описание ---------- */
  function renderIntro(){
    var done = Object.keys(answers).length;
    host.innerHTML =
      '<div class="quiz-intro">' +
        '<span class="eyebrow">Тест · ' + Q.length + " " +
          U.word(Q.length, ["утверждение", "утверждения", "утверждений"]) + '</span>' +
        '<h2>Где вы на компасе?</h2>' +
        '<p class="quiz-lede">Оцените согласие с ' + Q.length + ' утверждениями о российской экономике и ' +
          'устройстве власти. В конце получите две координаты по тем же шкалам, что и у партий, — ' +
          'и увидите, рядом с кем оказались.</p>' +
        '<ul class="quiz-facts">' +
          '<li data-reveal><b>' + (Q.length / 2) + ' + ' + (Q.length / 2) + '</b> утверждений: экономика и роль государства</li>' +
          '<li data-reveal><b>5–7 минут</b> — примерное время прохождения</li>' +
          '<li data-reveal><b>Ничего не отправляется</b> — ответы остаются в вашем браузере</li>' +
        '</ul>' +
        '<div class="quiz-actions">' +
          '<button type="button" class="btn primary" id="quizStart">' +
            (done && done < Q.length ? "Продолжить · вопрос " + (firstUnanswered() + 1) : "Начать тест") + '</button>' +
          (result ? '<button type="button" class="btn" id="quizShowResult">Показать прошлый результат</button>' : "") +
          (done ? '<button type="button" class="btn ghost" id="quizReset">Сбросить ответы</button>' : "") +
        '</div>' +
        '<p class="quiz-note">Две оси — упрощение: они не описывают внешнюю политику, национальный вопрос ' +
          'и личное доверие к политикам. Результат — повод разобраться в позициях, а не диагноз и не агитация.</p>' +
      '</div>';

    document.getElementById("quizStart").addEventListener("click", function(){
      idx = firstUnanswered();
      view = "run";
      render();
    });
    var showRes = document.getElementById("quizShowResult");
    if(showRes) showRes.addEventListener("click", function(){ view = "result"; render(); });
    var reset = document.getElementById("quizReset");
    if(reset) reset.addEventListener("click", resetAll);
  }

  function firstUnanswered(){
    for(var i = 0; i < Q.length; i++) if(answers[Q[i].id] === undefined) return i;
    return 0;
  }

  /* ---------- экран 2: вопросы ---------- */
  function renderRun(){
    var q = Q[idx];
    var done = Object.keys(answers).length;
    var cur = answers[q.id];

    host.innerHTML =
      '<div class="quiz-run">' +
        '<div class="quiz-top">' +
          '<button type="button" class="btn ghost small" id="quizBack">← К описанию</button>' +
          '<span class="quiz-counter">' + (idx + 1) + ' / ' + Q.length + '</span>' +
        '</div>' +
        '<div class="quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + Q.length +
          '" aria-valuenow="' + done + '" aria-label="Отвечено вопросов">' +
          '<i style="width:' + (done / Q.length * 100).toFixed(1) + '%"></i></div>' +
        '<div class="quiz-tagline">' + (q.axis === "x" ? "Экономика" : "Государство и общество") + '</div>' +
        '<p class="quiz-q">' + esc(q.t) + '</p>' +
        '<div class="quiz-scale" role="group" aria-label="Ваш ответ">' +
          SCALE.map(function(s, i){
            return '<button type="button" class="qopt' + (cur === s.v ? " on" : "") + '" data-v="' + s.v +
              '" aria-pressed="' + (cur === s.v) + '">' +
              '<span class="dot"></span><span class="lbl">' + esc(s.label) + '</span>' +
              '<kbd>' + (i + 1) + '</kbd></button>';
          }).join("") +
        '</div>' +
        '<div class="quiz-nav">' +
          '<button type="button" class="btn" id="quizPrev"' + (idx === 0 ? " disabled" : "") + '>← Назад</button>' +
          '<button type="button" class="btn ghost" id="quizSkip">Пропустить</button>' +
          '<button type="button" class="btn primary" id="quizNext"' + (cur === undefined ? " disabled" : "") + '>' +
            (idx === Q.length - 1 ? "Показать результат" : "Дальше →") + '</button>' +
        '</div>' +
        '<div class="quiz-hint">Клавиши <kbd>1</kbd>…<kbd>5</kbd> — ответ, <kbd>←</kbd> <kbd>→</kbd> — переход между вопросами.</div>' +
      '</div>';

    host.querySelectorAll(".qopt").forEach(function(b){
      b.addEventListener("click", function(){ answer(Number(b.dataset.v)); });
    });
    document.getElementById("quizPrev").addEventListener("click", prev);
    document.getElementById("quizNext").addEventListener("click", next);
    document.getElementById("quizSkip").addEventListener("click", function(){
      if(idx === Q.length - 1) finish(); else { idx++; render(); }
    });
    document.getElementById("quizBack").addEventListener("click", function(){ view = "intro"; render(); });
  }

  /* Ответ подсвечивается сразу, а переход к следующему вопросу происходит
     через мгновение — без паузы выбор не успевает считаться глазом. */
  function answer(v){
    answers[Q[idx].id] = v;
    save();
    host.querySelectorAll(".qopt").forEach(function(b){
      var on = Number(b.dataset.v) === v;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    var at = idx;
    setTimeout(function(){
      if(view !== "run" || idx !== at) return;
      if(idx === Q.length - 1) finish(); else { idx++; render(); }
    }, 190);
  }
  function prev(){ if(idx > 0){ idx--; render(); } }
  function next(){
    if(answers[Q[idx].id] === undefined) return;
    if(idx === Q.length - 1) finish(); else { idx++; render(); }
  }

  function finish(){
    result = score();
    save();
    view = "result";
    render();
    /* точка пользователя появляется и на большом компасе */
    if(PC.compass) PC.compass.redraw();
  }

  function resetAll(){
    answers = {};
    result = null;
    idx = 0;
    view = "intro";
    PC.store.remove(KEY_ANS);
    PC.store.remove(KEY_RES);
    render();
    if(PC.compass) PC.compass.redraw();
  }

  /* ---------- экран 3: результат ---------- */
  function renderResult(){
    var pt = result || score();
    var rank = ranking(pt);
    var best = rank[0];
    var far  = rank[rank.length - 1];
    var answered = result ? result.answered : Object.keys(answers).length;
    var skipped = Q.length - answered;

    function bar(v){
      var w = Math.abs(v) / 10 * 50;
      var left = v < 0 ? 50 - w : 50;
      return '<div class="qr-bar"><i data-w="' + w.toFixed(2) + '" data-left="' + left.toFixed(2) + '"></i></div>';
    }

    host.innerHTML =
      '<div class="quiz-result">' +
        '<div class="qr-main">' +
          '<span class="eyebrow">Ваш результат</span>' +
          '<h2>' + esc(capitalize(quadrant(pt.x, pt.y))) + '</h2>' +
          '<div class="qr-coords">' +
            '<div class="qr-coord" data-reveal><div class="k">Экономика</div><div class="v">' + fmt(pt.x) + '</div>' +
              '<div class="d">' + esc(econWord(pt.x)) + ' взгляды</div>' + bar(pt.x) +
              '<div class="qr-poles"><span>плановая</span><span>рыночная</span></div></div>' +
            '<div class="qr-coord" data-reveal><div class="k">Отношение к государству</div><div class="v">' + fmt(pt.y) + '</div>' +
              '<div class="d">' + esc(stateWord(pt.y)) + '</div>' + bar(pt.y) +
              '<div class="qr-poles"><span>свободы</span><span>этатизм</span></div></div>' +
          '</div>' +
          '<p class="qr-summary">Ближе всего — <b>' + esc(best.p.name) + '</b>: ' + best.match +
            '% совпадения, расстояние ' + best.d.toFixed(1) + ' по шкале. Дальше всего — ' + esc(far.p.name) + '.' +
            (skipped ? ' Без ответа ' + skipped + " " +
              U.word(skipped, ["утверждение", "утверждения", "утверждений"]) +
              ' — они не влияют на результат.' : "") + '</p>' +
          '<div class="quiz-actions">' +
            '<button type="button" class="btn primary" id="qrCompass">Показать на большом компасе</button>' +
            '<button type="button" class="btn" id="qrReview">Вернуться к вопросам</button>' +
            '<button type="button" class="btn ghost" id="qrAgain">Пройти заново</button>' +
          '</div>' +
          '<p class="quiz-note">Совпадение считается по расстоянию между точками на двух осях: ' +
            '100% — полное попадание, 0% — ' + MAX_DIST + ' и больше единиц шкалы. Это близость координат, ' +
            'а не рекомендация голосовать.</p>' +
        '</div>' +
        '<div class="qr-side">' + miniCompass(pt) +
          '<div class="qr-rank">' +
            rank.map(function(r){
              return '<button type="button" class="qr-row" data-reveal data-id="' + esc(r.p.id) + '">' +
                '<i style="background:' + esc(r.p.color) + '"></i>' +
                '<span class="n">' + esc(r.p.short) + '</span>' +
                '<span class="track"><span class="fill" data-w="' + r.match + '" style="background:' +
                  esc(r.p.color) + '"></span></span>' +
                '<span class="m">' + r.match + '%</span></button>';
            }).join("") +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById("qrAgain").addEventListener("click", resetAll);
    document.getElementById("qrReview").addEventListener("click", function(){ idx = 0; view = "run"; render(); });
    document.getElementById("qrCompass").addEventListener("click", function(){
      if(PC.nav) PC.nav.go("compass");
    });
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

  function render(){
    if(!host) return;
    if(view === "run") renderRun();
    else if(view === "result" && (result || Object.keys(answers).length)) renderResult();
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
    if(e.key >= "1" && e.key <= String(SCALE.length)){
      e.preventDefault();
      answer(SCALE[Number(e.key) - 1].v);
    }else if(e.key === "ArrowLeft"){ e.preventDefault(); prev(); }
    else if(e.key === "ArrowRight"){ e.preventDefault(); next(); }
  }

  function init(){
    host = document.getElementById("quiz");
    if(!host) return;
    load();
    if(result) view = "result";
    idx = firstUnanswered();
    render();
    document.addEventListener("keydown", onKey);
  }

  PC.quiz = {
    init: init,
    render: render,
    result: function(){ return result; },
    ranking: ranking,
    quadrant: quadrant
  };
})(window.PC = window.PC || {});
