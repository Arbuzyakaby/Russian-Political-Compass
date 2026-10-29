/* ============ Тест: утверждения -> координаты на компасе ============

   Ответ на каждое утверждение — число от −2 до +2. Вклад в ось равен
   answer × dir × w; сумма нормируется так, чтобы полюса шкалы достигались
   не только при идеально «партийных» ответах на все вопросы, а при
   устойчиво выраженной позиции — иначе крайние точки были бы практически
   недостижимы и все результаты сползали бы к центру.

   Версий теста три: расширенная на 90 утверждений, стандартная на 40 и
   короткая на 20. Это не три анкеты, а три вложенных выборки одного
   массива (js/quiz-data.js): короткая целиком входит в стандартную,
   стандартная — в расширенную. Ни одна из них не «первые N вопросов»:
   выборки собраны так, чтобы все три измеряли одно и то же — поровну
   на каждую ось, все шесть под-осей покрыты, ключевые утверждения
   сохранены, перекос по направлению внутри оси совпадает.

   Нормировка всегда считается по той выборке, которую человек проходил,
   а не по всему массиву. Это принципиально: делить сумму двадцати
   ответов на максимум девяноста значило бы систематически поджимать
   короткий результат к центру, и версии перестали бы лежать на одной
   шкале.

   Тот же ответ считается дважды: один раз в общую сумму по оси, второй —
   в свою узкую под-ось. Под-оси ничего не меняют в итоговых координатах,
   они объясняют их: две точки могут совпасть на компасе и разойтись на
   радаре, и это интереснее самой точки.

   Ответы, итог и история прохождений хранятся в localStorage: тест на
   девяносто вопросов не должен пропадать от случайного обновления страницы,
   а взгляды меняются, и направление сдвига говорит больше, чем одна
   точка на поле. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc, fmt = U.fmt, clamp = U.clamp;
  var QC = PC.quizCalc;
  var ALL = PC.QUIZ.QUESTIONS, STD = PC.QUIZ.STD, SHORT = PC.QUIZ.SHORT;
  var SCALE = PC.QUIZ.SCALE;
  var MODES = ["long", "full", "short"];
  var t = PC.t, L = PC.L;

  /* Расчёт (подсчёт координат, кодирование ссылки, разбор ответов) живёт
     в js/quiz-calc.js — здесь только состояние экрана и разметка. */
  var questionsFor = QC.questionsFor;
  var scoreOf = QC.scoreOf, contributions = QC.contributions;
  var ranking = QC.ranking;
  var encodeAnswers = QC.encodeAnswers, decodeMode = QC.decodeMode, decodeAnswers = QC.decodeAnswers;
  var shareURL = QC.shareURL;
  var MAX_DIST = QC.MAX_DIST;
  var B = PC.quizBlocks;
  var econWord = B.econWord, stateWord = B.stateWord, quadrant = B.quadrant, capitalize = B.capitalize,
      modeName = B.modeName, scaleLabel = B.scaleLabel, questionText = B.questionText,
      miniCompass = B.miniCompass, breakdownBlock = B.breakdownBlock, historyBlock = B.historyBlock,
      linkBlock = B.linkBlock, bindLink = B.bindLink, subBlock = B.subBlock;

  var KEY_ANS  = "pc-quiz-answers";
  var KEY_RES  = "pc-quiz-result";
  var KEY_HIST = "pc-quiz-history";
  var KEY_MODE = "pc-quiz-mode";

  /* сколько прошлых прохождений держим: длиннее — уже не история, а лог */
  var HIST_MAX = 12;

  var host;                       /* контейнер вкладки */
  var answers = {};               /* id вопроса -> −2…+2 */
  var result = null;              /* завершённый результат со снимком answers */
  var history = [];               /* прошлые результаты, от старых к новым */
  var idx = 0;                    /* текущий вопрос в активной выборке */
  var view = "intro";             /* intro | run | result */
  var mode = "full";              /* long | full | short */
  var shared = null;              /* результат, открытый по чужой ссылке */
  var compassView = null;
  var autoTimer = null;
  function cancelAuto(){clearTimeout(autoTimer);autoTimer=null;}
  var breakdownOpen = false;
  var focusQ = false;             /* после перехода между вопросами — фокус на текст вопроса */

  function activeQuestions(){ return questionsFor(mode); }
  function score(){ return scoreOf(answers, activeQuestions()); }

  /* Копирует ответы и список вопросов для другого режима. */
  function copyAnswers(src, list){
    var out = {};
    (list || ALL).forEach(function(q){
      var v = src && src[q.id];
      if(typeof v === "number" && v >= -2 && v <= 2) out[q.id] = Math.round(v);
    });
    return out;
  }

  /* Снимок ответов для истории. */
  function snapshot(src, m){
    var saved = copyAnswers(src, questionsFor(m));
    var pt = scoreOf(saved, questionsFor(m));
    pt.answers = saved;
    return pt;
  }

  /* Старые результаты не содержали снимка. Восстанавливаем его из
     истории либо черновика только при совпадении счёта: смешивать
     прежние координаты с уже отредактированными ответами нельзя. */
  function restoreResult(r){
    if(!r || !isFinite(r.x) || !isFinite(r.y) ||
       typeof r.x !== "number" || typeof r.y !== "number") return null;
    var rm = MODES.indexOf(r.mode) > -1 ? r.mode : "full";
    var sources = r.answers ? [r.answers] : history.slice().reverse().filter(function(e){
      return e.mode === rm && e.ts === (r.ts || 0) && e.code;
    }).map(function(e){ return decodeAnswers(e.code); }).concat([answers]);
    for(var i = 0; i < sources.length; i++){
      if(!sources[i]) continue;
      var pt = snapshot(sources[i], rm);
      if(Math.abs(pt.x - r.x) > 1e-6 || Math.abs(pt.y - r.y) > 1e-6 ||
         pt.answered !== (r.answered || 0)) continue;
      pt.ts = r.ts || 0;
      return pt;
    }
    return null;
  }

  /* Те же ответы в разрезе шести узких шкал. Умолчание для list — выборка
     сохранённого результата, а не та, что выбрана в интерфейсе прямо
     сейчас: радар в аналитике показывает профиль уже пройденного теста,
     и переключатель версии на экране описания не должен задним числом
     менять его нормировку. Сам подсчёт — в js/quiz-calc.js; здесь только
     это умолчание, завязанное на состояние текущего прохождения. */
  function subScoreOf(src, list){
    return QC.subScoreOf(src, list || questionsFor(result ? result.mode : mode));
  }

  /* ---------- сохранение ---------- */
  function save(){
    PC.store.setJSON(KEY_ANS, answers);
    PC.store.set(KEY_MODE, mode);
    if(result) PC.store.setJSON(KEY_RES, result); else PC.store.remove(KEY_RES);
  }
  function saveHistory(){ PC.store.setJSON(KEY_HIST, history); }

  /* Читает историю прохождений из storage. */
  function load(){
    var preferred = PC.store.getJSON("pc-settings", {}).quizMode;
    var savedMode = PC.store.get(KEY_MODE, ["short", "full", "long"].indexOf(preferred) > -1 ? preferred : "full");
    mode = MODES.indexOf(savedMode) > -1 ? savedMode : "full";

    answers = copyAnswers(PC.store.getJSON(KEY_ANS, null));
    var r = PC.store.getJSON(KEY_RES, null);
    var h = PC.store.getJSON(KEY_HIST, null);
    if(Array.isArray(h)){
      history = h.filter(function(e){
        return e && typeof e.x === "number" && typeof e.y === "number";
      }).map(function(e){
        return { x:clamp(e.x, -10, 10), y:clamp(e.y, -10, 10),
                 answered:e.answered || 0, ts:e.ts || 0,
                 mode:MODES.indexOf(e.mode) > -1 ? e.mode : "full",
                 code:typeof e.code === "string" ? QC.upgradeCode(e.code) : null };
      }).slice(-HIST_MAX);
    }
    result = restoreResult(r);
    if(result) PC.store.setJSON(KEY_RES, result);
    else if(r) PC.store.remove(KEY_RES);
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
                   code:encodeAnswers(pt.answers, pt.mode) });
    if(history.length > HIST_MAX) history = history.slice(-HIST_MAX);
    saveHistory();
  }

  /* ---------- экран 1: описание ---------- */
  /* Переключатель версии стоит только здесь: менять длину теста посреди
     прохождения значит либо выбросить часть уже данных ответов, либо
     дописать вопросов на ходу — и то и другое выглядит как поломка. */
  function modeSwitch(){
    return '<div class="quiz-modes" role="group" aria-label="' + esc(t("quiz.mode")) + '">' +
      MODES.map(function(m){
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
        (mode === "short" ? '<p class="quiz-note short-note">' + esc(t("quiz.shortNote", { n:SHORT.length, all:STD.length })) + '</p>' : "") +
        (mode === "long" ? '<p class="quiz-note short-note">' + esc(t("quiz.longNote", { n:ALL.length, std:STD.length })) + '</p>' : "") +
        '<ul class="quiz-facts">' +
          '<li data-reveal>' + t("quiz.fact1", { a:list.length / 2, b:list.length / 2 }) + '</li>' +
          '<li data-reveal>' + t(mode === "short" ? "quiz.fact2.short"
                                : mode === "long" ? "quiz.fact2.long" : "quiz.fact2") + '</li>' +
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
      if(idx === list.length - 1) finish(); else { idx++; focusQ = true; render(); }
    });
    document.getElementById("quizBack").addEventListener("click", function(){ view = "intro"; render(); });
    /* Вопрос перестраивается целиком, и фокус с нажатой кнопки пропадает
       в <body>: скринридер молчит, а клавиатурный пользователь начинает
       обход страницы заново. Фокус на тексте вопроса возвращает и то и
       другое; на цифры и стрелки это не влияет — это не поле ввода. */
    if(focusQ){
      focusQ = false;
      var qEl = host.querySelector(".quiz-q");
      if(qEl){ qEl.tabIndex = -1; qEl.focus({ preventScroll:true }); }
    }
  }

  /* Ответ только подсвечивается и включает кнопку «Дальше» — сам переход
     к следующему вопросу происходит по отдельному действию (клик по
     кнопке, Enter, стрелка вправо). Раньше клик по варианту сам кидал
     дальше через мгновение, и кнопка «Дальше» либо ничего не успевала
     сделать, либо просто дублировала то же самое движение — выбор
     нельзя было спокойно передумать. */
  function answer(v){
    cancelAuto(); var answeredIndex=idx,answeredId=activeQuestions()[idx].id;
    answers[activeQuestions()[idx].id] = v;
    save();
    host.querySelectorAll(".qopt").forEach(function(b){
      var on = Number(b.dataset.v) === v;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    var nextBtn = document.getElementById("quizNext");
    if(nextBtn) nextBtn.disabled = false;
    if(PC.settings && PC.settings.get("autoNext") === "on") autoTimer=setTimeout(
      function(){
        autoTimer=null;
        if(
          view==="run"&&idx===answeredIndex&&activeQuestions()[idx].id===answeredId&&answers[answeredId]===v&&(
            !PC.nav||PC.nav.current()==="quiz"
          )
        )next();
      },
      240
    );
  }
  function prev(){ cancelAuto();if(idx > 0){ idx--; focusQ = true; render(); } }
  /* Переход к следующему вопросу или к результату. */
  function next(){
    cancelAuto();
    var list = activeQuestions();
    if(answers[list[idx].id] === undefined) return;
    if(idx === list.length - 1) finish(); else { idx++; focusQ = true; render(); }
  }

  function finish(){
    cancelAuto();
    if(!activeQuestions().some(function(q){ return answers[q.id] !== undefined; })){ if(PC.ui) PC.ui.toast(t("res.empty"), true); return; }
    compassView = null;
    result = snapshot(answers, mode);
    save();
    pushHistory(result);
    view = "result";
    shared = null;
    render();
    /* поздравление от автора (2.2) */
    if(PC.ui && PC.ui.toast) setTimeout(function(){ PC.ui.toast(PC.t("quiz.congrats")); }, 600);
    /* точка пользователя появляется и на большом компасе */
    if(PC.compass) PC.compass.redraw();
    if(PC.eggs && PC.eggs.quiz) PC.eggs.quiz(answers);
  }

  function resetAll(){
    cancelAuto();
    if(PC.settings && PC.settings.get("confirmReset") === "on" && Object.keys(answers).length && !window.confirm(t("quiz.confirm"))) return;
    var previous = { answers:answers, result:result, shared:shared, mode:mode };
    compassView = null;
    answers = {};
    result = null;
    idx = 0;
    view = "intro";
    shared = null;
    PC.store.remove(KEY_ANS);
    PC.store.remove(KEY_RES);
    render();
    if(PC.compass) PC.compass.redraw();
    if(PC.ui) PC.ui.toast(
      t("set.resetDone"),
      false,
      {
        label:t("ui.undo"),
        duration:5000,
        action:function(){
          answers = previous.answers;
          result = previous.result;
          shared = previous.shared;
          mode = previous.mode;
          view = result ? "result" : "intro";
          save();
          render();
          if(PC.compass) PC.compass.redraw();

        }
      }
    );
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
  /* Строка о заявленных позициях (3.0): с кем человек совпадает по тому,
     что партии говорят о себе, и совпадает ли это с тем, кто ближе по
     делам. Совпадение двух ответов — тоже результат, и о нём сказано
     отдельной фразой, а не пропущено. */
  function saidLine(pt, best){
    var said = QC.saidBest(pt);
    if(!said) return "";
    var text = said.p.id === best.p.id
      ? t("res.said.same", { name:esc(L(said.p, "name")), m:said.said })
      : t("res.said.diff", { said:esc(L(said.p, "name")), m:said.said,
                             done:esc(L(best.p, "name")), m2:best.match });
    return '<p class="qr-said">' + text + '</p>';
  }

  function renderResult(){
    var src  = shared ? shared.answers : (result ? result.answers : answers);
    var runMode = shared ? shared.mode : (result ? result.mode : mode);
    var list = questionsFor(runMode);
    var pt   = shared ? shared.pt : (result || score());
    var rank = ranking(pt);
    var best = rank[0];
    var far  = rank[rank.length - 1];
    var answered = pt.answered !== undefined ? pt.answered
                 : list.filter(function(q){ return src[q.id] !== undefined; }).length;
    var skipped = list.length - answered;
    if(!answered){ host.textContent = t("res.empty"); return; }

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
          '<p class="qr-meta">' + esc(t("res.completion", { n:answered, all:list.length })) + '</p>' +
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
          saidLine(pt, best) +
          '<div class="quiz-actions">' +
            '<button type="button" class="btn primary" id="qrCompass">' + esc(t("res.showCompass")) + '</button>' +
            '<button type="button" class="btn" id="qrReview">' + esc(t("res.review")) + '</button>' +
            '<button type="button" class="btn ghost" id="qrAgain">' + esc(t("res.again")) + '</button>' +
          '</div>' +
          '<p class="quiz-note">' + esc(t("res.matchNote", { n:MAX_DIST })) +
            (runMode === "short" ? " " + esc(t("res.shortNote", { n:SHORT.length, all:STD.length })) : "") +
            (runMode === "long" ? " " + esc(t("res.longNote", { n:ALL.length })) : "") + '</p>' +
          subBlock() +
          breakdownBlock(src, list, breakdownOpen) +
          linkBlock(src, runMode) +
          (shared ? "" : historyBlock(history, pt)) +
          '<section class="qr-share" id="qrShareBlock" data-reveal aria-label="' + esc(t("res.shareBlock")) + '"></section>' +
        '</div>' +
        '<div class="qr-side">' + miniCompass(pt) +
          '<div class="qr-rank">' +
            rank.map(function(r){
              return '<button type="button" class="qr-row" data-reveal data-id="' + esc(r.p.id) + '">' +
                '<i style="background:' + esc(r.p.color) + '"></i>' +
                '<span class="n">' + esc(L(r.p, "short")) + '</span>' +
                '<span class="track"><span class="fill" data-w="' + r.match + '" style="background:' +
                  esc(r.p.color) + '"></span>' +
                  (r.said !== undefined ? '<span class="said" style="left:' + r.said + '%;border-color:' +
                    esc(r.p.color) + '" title="' + esc(t("res.saidTick", { m:r.said })) + '"></span>' : "") +
                '</span>' +
                '<span class="m">' + r.match + '%</span></button>';
            }).join("") +
          '</div>' +
        '</div>' +
      '</div>';

    if(PC.share) PC.share.mount(document.getElementById("qrShareBlock"), pt, shareURL(src, runMode));
    mountSubBlock(src, pt, list);

    document.getElementById("qrAgain").addEventListener("click", resetAll);
    document.getElementById("qrReview").addEventListener("click", function(){
      shared = null; idx = 0; view = "run"; render();
    });
    document.getElementById("qrCompass").addEventListener("click", function(){
      compassView = shared ? Object.assign({ shared:true, mode:runMode }, pt) : null;
      if(PC.nav) PC.nav.go("compass");
    });
    var mine = document.getElementById("qrMine");
    if(mine) mine.addEventListener("click", function(){
      shared = null;
      compassView = null;
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
    var m = /^#\/?result\/(.*)$/.exec(location.hash || "");
    return m ? m[1] : null;
  }

  /* Ссылка из 1.x или 2.x (3.0). Молча открыть пустой тест было бы
     хуже всего: человек, которому прислали результат, решил бы, что
     сайт сломан. Поэтому — одна фраза о том, что случилось, и тест,
     который можно пройти самому. Адрес заменяется на #/quiz, чтобы
     перезагрузка страницы не показывала то же сообщение снова. */
  function refuseLegacy(){
    replaceHash("#/quiz");
    setTimeout(function(){
      if(PC.ui) PC.ui.toast(t("res.legacyLink", { v:PC.versionLabel ? PC.versionLabel() : PC.VERSION }), true);
    }, 400);
  }
  /* Сообщение о повреждённых данных и отказ от загрузки. */
  function refuseDamaged(){
    replaceHash("#/quiz");
    setTimeout(function(){ if(PC.ui) PC.ui.toast(t("res.damaged"), true); }, 100);
  }

  /* Счётчик на ярлыке вкладки. В разметке он статичный («40»), потому что
     без скриптов другого числа взяться неоткуда; как только версия выбрана,
     ярлык обязан показывать её длину — иначе на экране одновременно висят
     «Тест · 20 утверждений» и вкладка «Тест 40». */
  function paintTabBadge(){
    var badge = document.querySelector("#tab-quiz .tab-badge");
    if(badge) badge.textContent = String(shared ? questionsFor(shared.mode).length : activeQuestions().length);
  }

  /* Перерисовывает текущий экран квиза. */
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
    if(e.defaultPrevented || U.modalOpen()) return;
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
    if(PC.nav)PC.nav.onChange(function(){cancelAuto();});
    window.addEventListener("hashchange", function(){
      var nextCode = hashCode();
      if(nextCode !== null){
        if(openShared(nextCode, true)) return;
        if(QC.isLegacyCode(nextCode)) refuseLegacy();
        else refuseDamaged();
        shared = null;
        view = result ? "result" : "intro";
        render();
      }else if(shared && /^#\/?quiz$/.test(location.hash)){
        shared = null;
        view = result ? "result" : "intro";
        render();
      }
    });
    var code = hashCode();
    if(code !== null && openShared(code, true)){
      document.addEventListener("keydown", onKey);
      return;
    }
    if(code !== null && QC.isLegacyCode(code)) refuseLegacy();
    else if(code !== null) refuseDamaged();
    if(result) view = "result";
    idx = firstUnanswered();
    render();
    document.addEventListener("keydown", onKey);
  }

  PC.quiz = {
    init: init,
    render: render,
    refreshParties:function(){if(view==="result")render();},
    result: function(){ return result; },
    compassResult:function(){ return compassView || result; },
    clearLocal:function(){ answers = {}; result = null; history = []; shared = null; compassView = null; view = "intro"; idx = 0; render(); },
    mode: function(){ return mode; },
    modes: function(){ return MODES.slice(); },
    questionsFor: questionsFor,
    questions: activeQuestions,
    ranking: ranking,
    quadrant: quadrant,
    scoreOf: scoreOf,
    subScoreOf: subScoreOf,
    contributions: contributions,
    encodeAnswers: encodeAnswers,
    decodeAnswers: decodeAnswers,
    decodeMode: decodeMode,
    isLegacyCode: QC.isLegacyCode,
    shareURL: shareURL,
    openShared: openShared,
    history: function(){ return history.slice(); },
    /* словесные ярлыки нужны карточке для соцсетей — считаются здесь,
       чтобы формулировка на сайте и на картинке не разъезжались */
    words: function(pt){ return { econ:econWord(pt.x), state:stateWord(pt.y) }; }
  };
})(window.PC = window.PC || {});
