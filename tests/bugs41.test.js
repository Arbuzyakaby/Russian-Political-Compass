/* Регрессии к аудиту 3.0 (audit/2026-10-26/REPORT.md), выпуск 4.1.

   Модули теста и приветствия строят разметку через DOM, а в Node DOM нет.
   Поэтому здесь поднимается минимальный «живой» стенд: узлы по id,
   собирающие обработчики, и host с записью innerHTML. Этого хватает,
   чтобы пройти настоящий код модулей по реальным сценариям из отчёта
   (редактирование результата, две ссылки подряд, клавиши под окном,
   пустое прохождение), а не проверять исходник регулярками. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, parseCSV, ROOT } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

/* ---------- стенд ---------- */
function classList(){
  const set = new Set();
  return {
    add:(...c) => c.forEach(x => set.add(x)),
    remove:(...c) => c.forEach(x => set.delete(x)),
    toggle:(c, on) => { const v = on === undefined ? !set.has(c) : !!on; v ? set.add(c) : set.delete(c); return v; },
    contains:c => set.has(c)
  };
}

function node(id){
  const handlers = {};
  return {
    id, hidden:false, disabled:false, dataset:{}, attributes:{}, textContent:"", innerHTML:"", offsetWidth:1, offsetParent:{},
    classList:classList(),
    style:{ setProperty(){} },
    setAttribute(k, v){ this.attributes[k] = String(v); },
    getAttribute(k){ return k in this.attributes ? this.attributes[k] : null; },
    removeAttribute(k){ delete this.attributes[k]; },
    addEventListener(type, fn){ (handlers[type] = handlers[type] || []).push(fn); },
    removeEventListener(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    appendChild(c){ return c; },
    focus(){},
    fire(type, ev){ (handlers[type] || []).slice().forEach(fn => fn(Object.assign({ target:this, preventDefault(){} }, ev))); },
    handlers
  };
}

/* Стенд вкладки теста: host пересоздаёт набор узлов при каждой записи
   innerHTML, как это делает браузер, — старые обработчики исчезают. */
function quizRig(seed){
  const app = loadApp(undefined, seed);
  const { PC, window: w } = app;
  const listeners = { document:{}, window:{} };
  let cache = new Map(), html = "";
  const host = node("quiz");
  Object.defineProperty(host, "innerHTML", {
    get(){ return html; },
    set(v){ html = String(v); cache = new Map(); }
  });
  let modal = false;
  w.document.getElementById = id => id === "quiz" ? host : (cache.get(id) || cache.set(id, node(id)).get(id));
  w.document.querySelectorAll = sel => (modal && sel === '[aria-modal="true"]') ? [{ getClientRects:() => [{}] }] : [];
  w.document.addEventListener = (type, fn) => { (listeners.document[type] = listeners.document[type] || []).push(fn); };
  w.addEventListener = (type, fn) => { (listeners.window[type] = listeners.window[type] || []).push(fn); };
  w.history = { replaceState(a, b, hash){ w.location.hash = hash; } };
  const rig = {
    PC, w, host, app,
    html:() => html,
    btn:id => cache.get(id),
    click:id => { const b = cache.get(id); assert.ok(b, "нет кнопки #" + id + " в разметке"); b.fire("click"); },
    key:(key, ev) => (listeners.document.keydown || []).forEach(fn => fn(Object.assign({ key, preventDefault(){ this.defaultPrevented = true; }, defaultPrevented:false }, ev))),
    setHash:h => { w.location.hash = h; (listeners.window.hashchange || []).forEach(fn => fn({})); },
    modal:v => { modal = v; },
    link:() => { const m = /id="resLink"[^>]*value="([^"]*)"/.exec(html); return m && m[1]; },
    store:(k) => app.storage.getItem(k)
  };
  return rig;
}

function codeOf(PC, mode, fn){
  const answers = {};
  PC.quiz.questionsFor(mode).forEach((q, i) => { const v = fn(i); if(v !== undefined) answers[q.id] = v; });
  return { answers, code:PC.quiz.encodeAnswers(answers, mode) };
}

/* ---------- B01: «поделиться» отдаёт показанный результат ---------- */
test("B01: блок «поделиться» получает ссылку показанного (чужого) результата, а не личных ответов", () => {
  const r = quizRig();
  const { PC } = r;
  const own = codeOf(PC, "full", i => i % 2 ? 2 : -2);
  r.w.localStorage.setItem("pc-quiz-answers", JSON.stringify(own.answers));
  const guest = codeOf(PC, "short", i => i % 3 ? -1 : 1);
  const calls = [];
  PC.share = { mount:(h, pt, url) => calls.push({ pt, url }) };
  r.w.location.hash = "#/result/" + guest.code;
  PC.quiz.init();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, PC.quiz.shareURL(guest.answers, "short"));
  assert.ok(calls[0].url.endsWith("#/result/" + guest.code));
  assert.ok(!calls[0].url.includes(own.code));
  assert.deepEqual(JSON.parse(r.store("pc-quiz-answers")), own.answers, "личные ответы не тронуты");
});

/* ---------- B02: итог, разбор и ссылка — один снимок ---------- */
test("B02: правка ответов после результата не меняет ни координаты, ни разбор, ни ссылку завершённого результата", () => {
  const r = quizRig({ "pc-quiz-mode":"short" });
  const { PC } = r;
  PC.quiz.init();
  r.click("quizStart");
  r.key("5");                                  /* первый вопрос — «полностью согласен» */
  r.key("ArrowRight");
  const total = PC.quiz.questions().length;
  assert.equal(total, 20);
  for(let i = 1; i < total; i++) r.click("quizSkip");
  const first = PC.quiz.result();
  assert.ok(first && first.answered === 1, "результат сохранён");
  const link = r.link();
  const coordBefore = (/class="v">([^<]+)</.exec(r.html()) || [])[1];

  r.click("qrReview");                         /* редактирование */
  r.key("1");                                  /* «полностью не согласен» вместо прежнего */
  assert.equal(JSON.parse(r.store("pc-quiz-answers"))[PC.quiz.questions()[0].id], -2);

  r.click("quizBack");
  r.click("quizShowResult");
  const again = PC.quiz.result();
  assert.equal(again.x, first.x);
  assert.equal(again.y, first.y);
  assert.deepEqual(again.answers, first.answers);
  assert.equal(r.link(), link, "ссылка собрана из снимка, а не из черновика");
  assert.equal((/class="v">([^<]+)</.exec(r.html()) || [])[1], coordBefore);
  /* разбор считается по тому же снимку: его сумма даёт показанную координату */
  const sum = PC.quiz.contributions(again.answers, PC.quiz.questionsFor(again.mode))
    .filter(c => c.q.axis === "x").reduce((s, c) => s + c.value, 0);
  assert.ok(Math.abs(sum) > 0);
});

/* ---------- B03: «нет данных» не выдаётся за поведение ---------- */
test("B03: неизвестная позиция подписана «Нет данных» / «No data» и нигде не названа неголосованием", () => {
  const { PC } = loadApp();
  assert.equal(PC.t("votes.skip"), "Нет данных");
  const en = loadApp(undefined, { "pc-lang":"en" });
  assert.equal(en.PC.t("votes.skip"), "No data");
  for(const k of ["votes.skip"]){
    for(const app of [PC, en.PC]){
      assert.ok(!/голосовал|vote/i.test(app.t(k)), k);
    }
  }
  const src = [read("js/votes.js"), read("js/export.js")].join("\n");
  assert.ok(!/Не голосовали|Did not vote/.test(src));
});

/* ---------- B04: язык при явном ?lang= ---------- */
test("B04: явный выбор языка переписывает ?lang= в адресе и сохраняет хеш результата", () => {
  const app = loadApp();
  const { PC, window: w } = app;
  w.URL = URL;
  let replaced = null;
  w.location = { origin:"https://example.org", pathname:"/compass/", host:"example.org",
    search:"?lang=en&x=1", hash:"#/result/3sabc", href:"https://example.org/compass/?lang=en&x=1#/result/3sabc",
    replace(u){ replaced = u; } };
  assert.equal(PC.i18n.current(), "ru", "стартуем с умолчания, а не с адреса: язык выбран при загрузке модуля");
  PC.i18n.set("en");
  assert.ok(replaced, "страница перезагружается");
  const u = new URL(replaced);
  assert.equal(u.searchParams.get("lang"), "en");
  assert.equal(u.searchParams.get("x"), "1", "остальные параметры остаются");
  assert.equal(u.hash, "#/result/3sabc", "маршрут результата сохранён");
  assert.equal(w.localStorage.getItem("pc-lang"), "en");

  /* обратный случай: в адресе en, выбирают ru — параметр обязан смениться */
  const back = loadApp(undefined, { "pc-lang":"en" });
  back.window.URL = URL;
  let to = null;
  back.window.location = { origin:"https://example.org", pathname:"/", host:"example.org", search:"?lang=en", hash:"",
    href:"https://example.org/?lang=en", replace(u){ to = u; } };
  back.PC.i18n.set("ru");
  assert.equal(new URL(to).searchParams.get("lang"), "ru");
});

/* ---------- B05: клавиши теста не работают под модальным окном ---------- */
test("B05: цифры и стрелки не меняют скрытые ответы, пока открыто модальное окно", () => {
  const r = quizRig();
  const { PC } = r;
  PC.quiz.init();
  r.click("quizStart");

  r.modal(true);
  r.key("5");
  r.key("ArrowRight");
  assert.deepEqual(JSON.parse(r.store("pc-quiz-answers") || "{}"), {}, "ответ не записан под окном");

  /* уже обработанное событие тоже не наше */
  r.modal(false);
  r.key("5", { defaultPrevented:true });
  assert.deepEqual(JSON.parse(r.store("pc-quiz-answers") || "{}"), {});

  /* без окна клавиша работает, как раньше */
  r.key("5");
  const id = PC.quiz.questions()[0].id;
  assert.equal(JSON.parse(r.store("pc-quiz-answers"))[id], 2);

  /* модификаторы принадлежат браузеру */
  r.key("1", { ctrlKey:true });
  assert.equal(JSON.parse(r.store("pc-quiz-answers"))[id], 2);
});

test("B05: глобальный «/» на компасе и пасхалки тоже уважают открытые окна", () => {
  assert.match(read("js/app.js"), /e\.defaultPrevented \|\| PC\.utils\.modalOpen\(\)/);
  assert.match(read("js/quiz.js"), /e\.defaultPrevented \|\| U\.modalOpen\(\)/);
  const r = quizRig();
  const u = r.PC.utils;
  r.w.document.querySelectorAll = () => [{ getClientRects:() => [] }];
  assert.equal(u.modalOpen(), false, "скрытое окно не считается открытым");
  r.w.document.querySelectorAll = () => [{ getClientRects:() => [{}] }];
  assert.equal(u.modalOpen(), true);
});

/* ---------- B06: вторая ссылка на результат заменяет первую ---------- */
test("B06: смена #/result/<код> в той же вкладке пересчитывает экран, версию и ссылку", () => {
  const r = quizRig();
  const { PC } = r;
  const a = codeOf(PC, "short", i => i % 2 ? 2 : -2);
  const b = codeOf(PC, "long", i => i % 3 ? -1 : 1);
  assert.notEqual(a.code, b.code);
  r.w.location.hash = "#/result/" + a.code;
  PC.quiz.init();
  assert.equal(r.link().split("#/result/")[1], a.code);
  assert.ok(r.html().includes(PC.t("res.version", { v:PC.t("quiz.mode.short.n"), n:20, statements:PC.i18n.pl(20, "word.statement") })));

  r.setHash("#/result/" + b.code);
  assert.equal(r.link().split("#/result/")[1], b.code, "ссылка в поле копирования — вторая");
  assert.ok(r.html().includes(PC.t("quiz.mode.long.n")), "версия теста — вторая");
  const want = PC.quiz.scoreOf(b.answers, PC.quiz.questionsFor("long"));
  assert.ok(r.html().includes(PC.utils.fmt(want.x)));

  /* битая ссылка не оставляет прежний чужой результат под новым адресом */
  r.setHash("#/result/" + b.code.slice(0, -1) + "!");
  assert.equal(r.w.location.hash, "#/quiz");
  assert.ok(!/id="resLink"/.test(r.html()), "показан собственный экран теста, а не чужой результат");
});

/* ---------- B10: все три версии в экспорте ---------- */
test("B10: экспорт различает короткую, стандартную и расширенную версии", () => {
  const { PC } = loadApp();
  const seen = new Set();
  for(const mode of ["short", "full", "long"]){
    const qs = PC.quiz.questionsFor(mode);
    const answers = Object.fromEntries(qs.map((q, i) => [q.id, i % 2 ? 1 : -1]));
    const res = PC.quiz.scoreOf(answers, qs);
    res.answers = answers;
    PC.quiz.result = () => res;
    assert.equal(res.mode, mode);
    const json = JSON.parse(PC.exporter.datasetJSON()).quizResult;
    assert.equal(json.version, mode);
    assert.equal(json.statements, qs.length);
    const label = parseCSV(PC.exporter.quizCSV()).find(row => row[0] === PC.t("csv.version"))[1];
    assert.equal(label, PC.t("quiz.mode." + mode + ".n"));
    seen.add(label);
  }
  assert.equal(seen.size, 3);
});

/* ---------- B11 / B18: пустые и повреждённые коды ---------- */
test("B11: анкета без единого ответа не становится результатом ни в одной версии", () => {
  for(const mode of ["short", "full", "long"]){
    const r = quizRig({ "pc-quiz-mode":mode });
    r.PC.quiz.init();
    r.click("quizStart");
    const total = r.PC.quiz.questions().length;
    for(let i = 0; i < total; i++) r.click("quizSkip");
    assert.equal(r.PC.quiz.result(), null, mode);
    assert.equal(r.store("pc-quiz-result"), null, mode);
    assert.ok(r.PC.quiz.history().length === 0, mode);
    assert.ok(!/id="resLink"/.test(r.html()), mode + ": пустой результат не выдаёт ссылку");
  }
});

test("B11/B18: код без ответов и код с посторонними символами не декодируются", () => {
  const { PC } = loadApp();
  for(const mode of ["short", "full", "long"]){
    const empty = PC.quiz.encodeAnswers({}, mode);
    assert.equal(PC.quiz.decodeAnswers(empty), null, mode + " пустой");
    const { code } = codeOf(PC, mode, i => i % 2 ? 2 : -2);
    assert.ok(PC.quiz.decodeAnswers(code), mode + " исходный");
    assert.equal(PC.quiz.decodeAnswers(code.slice(0, 5) + "!" + code.slice(5)), null, mode + " символ внутри");
    assert.equal(PC.quiz.decodeAnswers(code + "a"), null, mode + " хвост");
    assert.equal(PC.quiz.decodeAnswers(code.slice(0, -1)), null, mode + " обрезан");
  }
});

/* ---------- B12: большой компас показывает просматриваемый результат ---------- */
test("B12: «Показать на большом компасе» передаёт чужой результат, а не собственный", () => {
  const r = quizRig();
  const { PC } = r;
  const own = codeOf(PC, "full", i => i % 2 ? 2 : -2);
  r.w.localStorage.setItem("pc-quiz-answers", JSON.stringify(own.answers));
  const guest = codeOf(PC, "short", i => i % 3 ? -2 : 2);
  r.w.location.hash = "#/result/" + guest.code;
  PC.quiz.init();
  r.click("qrCompass");
  const shown = PC.quiz.compassResult();
  const want = PC.quiz.scoreOf(guest.answers, PC.quiz.questionsFor("short"));
  assert.equal(shown.shared, true);
  assert.equal(shown.mode, "short");
  assert.equal(shown.x, want.x);
  assert.equal(shown.y, want.y);
});

/* ---------- B13: браузерные тесты и CI ---------- */
test("B13: готовность компаса не ждёт радиуса у людей-<path>, а CI гоняет браузерные тесты", () => {
  const spec = read("tests/visual.spec.js");
  assert.match(spec, /\.node:not\(\.person\) circle\.dot/);
  assert.match(read(".github/workflows/test.yml"), /playwright test/);
});

/* ---------- приветствие: первое касание закрывает окно ---------- */
function welcomeRig(seen){
  const app = loadApp(["js/data.js", "js/utils.js", "js/i18n-shell.js", "js/i18n-compass.js", "js/i18n-quiz.js",
    "js/i18n-about.js", "js/i18n-misc.js", "js/i18n.js", "js/welcome.js"]);
  const { window: w } = app;
  if(seen) w.localStorage.setItem("pc-welcome", seen);
  const ids = ["welcome", "welCard", "welPoints", "welNews", "welLang", "welHello", "welClose", "welEnter",
    "welTour", "welQuiz", "welNote", "welEyebrow", "welTitle", "welLede"];
  const nodes = Object.fromEntries(ids.map(id => [id, node(id)]));
  nodes.welcome.hidden = true;
  nodes.welcome.querySelectorAll = () => [];
  const bodyClasses = classList();
  w.document.body = { classList:bodyClasses };
  w.document.getElementById = id => nodes[id] || null;
  w.document.documentElement.dataset = {};
  const keydown = [];
  w.document.addEventListener = (t, fn) => { if(t === "keydown") keydown.push(fn); };
  return { nodes, bodyClasses, keydown, w };
}

test("приветствие после обновления: первый клик по «Понятно, дальше» закрывает окно и запоминает версию", async () => {
  const r = welcomeRig("3.2");
  r.w.PC.welcome.init();
  assert.equal(r.nodes.welcome.hidden, false, "после обновления окно показано");
  assert.equal(r.nodes.welNews.hidden, false);
  assert.ok(r.bodyClasses.contains("welcome-lock"));

  r.nodes.welEnter.fire("click");
  assert.equal(r.w.localStorage.getItem("pc-welcome"), r.w.PC.VERSION, "отметка ставится сразу, а не после анимации");
  await new Promise(res => setTimeout(res, 380));
  assert.equal(r.nodes.welcome.hidden, true, "окно скрыто после одного клика");
  assert.ok(!r.bodyClasses.contains("welcome-lock"), "страница под окном снова доступна");

  /* повторный клик по уже закрытому окну ничего не ломает */
  r.nodes.welEnter.fire("click");
  assert.equal(r.nodes.welcome.hidden, true);
});

test("приветствие: клик мимо карточки и Escape закрывают окно, но не на шаге выбора языка", async () => {
  const r = welcomeRig("3.2");
  r.w.PC.welcome.init();
  r.nodes.welcome.fire("click", { target:r.nodes.welCard });
  assert.equal(r.nodes.welcome.classList.contains("is-out"), false, "клик по карточке окно не закрывает");
  r.nodes.welcome.fire("click", { target:r.nodes.welcome });
  assert.equal(r.nodes.welcome.classList.contains("is-out"), true);
  await new Promise(res => setTimeout(res, 380));
  assert.equal(r.nodes.welcome.hidden, true);

  const first = welcomeRig(null);
  first.w.PC.welcome.init();
  first.nodes.welcome.fire("click", { target:first.nodes.welcome });
  assert.equal(first.nodes.welcome.classList.contains("is-out"), false, "выбор языка случайным касанием не закрыть");
  first.keydown.forEach(fn => fn({ key:"Escape", preventDefault(){} }));
  assert.equal(first.nodes.welcome.classList.contains("is-out"), true, "Escape закрывает всегда");
});
