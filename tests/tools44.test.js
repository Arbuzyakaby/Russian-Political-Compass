/* Выпуск 4.4: загрузка по требованию, бюджет (budget.test.js), проверка
   шрифтов, обучение, дуэль по адресу и пасхалки к номеру версии. Код
   проверяется в песочнице harness.js, разметка и стили — по исходникам. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT, DEFAULT_FILES } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const html = read("index.html");
const { PC } = loadApp();

test("загрузка по требованию: перечень в разметке, файлы на месте, на первом экране их нет", () => {
  const lazy = JSON.parse(html.match(/<script type="application\/json" id="pcLazy">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(Object.keys(lazy).sort(), ["duel", "selfvote"]);
  for(const [name, entry] of Object.entries(lazy)){
    for(const f of [entry.js, entry.css]){
      assert.ok(fs.existsSync(path.join(ROOT, f)), `${name}: нет ${f}`);
      assert.ok(!html.includes(`src="${f}"`) && !html.includes(`href="${f}"`), `${name}: ${f} подключён на первом экране`);
    }
  }
  assert.ok(html.indexOf('src="js/lazy.js"') > 0 && html.indexOf('src="js/lazy.js"') < html.indexOf('src="js/app.js"'), "lazy.js подключён до app.js");
  /* кнопки дуэли и палитра ходят через PC.lazy.run, а не через PC.duel напрямую */
  for(const [file, needle] of [["js/app.js", 'PC.lazy.run("duel"'], ["js/sidebar.js", 'PC.lazy.run("duel"'],
    ["js/votes.js", 'PC.lazy.run("duel"'], ["js/palette.js", 'PC.lazy.run("duel"'], ["js/palette.js", "PC.loadSelfVote()"]])
    assert.ok(read(file).includes(needle), `${file}: ${needle}`);
});

test("загрузка по требованию: резервная копия проверяет ответы «Голосую сам» и без загруженного модуля", () => {
  const files = [...DEFAULT_FILES.filter(f => f !== "js/selfvote.js" && f !== "js/duel.js"), "js/settings.js", "js/eggs.js", "js/backup.js", "js/tisza.js"];
  const app = loadApp(files);
  assert.equal(app.PC.selfVote, undefined, "модуль не загружен");
  const ok = { v:1, votes:{ [app.PC.VOTES[0].id]:"for" } };
  app.storage.setItem("pc-selfvote", JSON.stringify(ok));
  const backup = app.PC.tisza.backup();
  assert.equal(app.PC.tisza.validateBackup(backup), true);
  backup.data["pc-selfvote"] = JSON.stringify({ v:1, votes:{ evil:"maybe" } });
  assert.equal(app.PC.tisza.validateBackup(backup), false);
  assert.equal(PC.selfVote.valid, PC.votes.validSelf, "модуль использует ту же проверку");
});

test("«Голосую сам»: рейтинг по теме считает только законопроекты темы", () => {
  const econ = PC.VOTES.filter(v => v.topic === "econ"), state = PC.VOTES.filter(v => v.topic === "state");
  assert.ok(econ.length >= 3 && state.length >= 3);
  const mine = {};
  econ.forEach(v => { mine[v.id] = "for"; });
  state.forEach(v => { mine[v.id] = "against"; });
  const all = PC.selfVote.score(mine), onlyEcon = PC.selfVote.score(mine, econ);
  const sum = rows => rows.reduce((n, r) => n + r.common, 0);
  assert.ok(sum(onlyEcon) < sum(all), "по теме общих голосований меньше");
  for(const r of onlyEcon) assert.ok(r.common <= econ.length);
  assert.deepEqual(PC.selfVote.score(mine, PC.VOTES).map(r => r.p.id), all.map(r => r.p.id), "без темы — все законопроекты");
  assert.ok(PC.votes.TOPICS.some(t => t.id === "foreign"));
});

test("дуэль: своя партия сравнивается по тем же правилам, голоса — из p.votes", () => {
  const er = PC.partyById("er");
  const own = { id:"u1", name:"Своя", short:"Св", color:"#fff", x:2, y:-3, sub:er.sub,
    votes:{ [PC.VOTES[0].id]:"for", [PC.VOTES[1].id]:"against" } };
  const r = PC.duel.compare(own, er);
  assert.equal(r.distance, PC.calc.distance(own, er));
  assert.equal(r.agreement.common, PC.voteAgreement(own, er).common);
  assert.ok(r.agreement.common <= 2, "общих голосований не больше, чем ответов у своей партии");
  assert.equal(r.same.length + r.differ.length, r.agreement.common);
});

test("приветствие не показывается по ссылке на дуэль", () => {
  const welcome = loadApp([...DEFAULT_FILES, "js/welcome.js"]).PC.welcome, V = PC.VERSION;
  for(const hash of ["#/duel/er-kprf", "#duel/u1-er"]){
    assert.equal(welcome.decide({ hash, seen:null, version:V }), null, hash);
    assert.equal(welcome.decide({ hash, seen:"1.0", version:V }), null, hash);
  }
  assert.equal(welcome.decide({ hash:"#/votes", seen:null, version:V }), "lang");
});

test("обучение: число шагов в настройках совпадает с маршрутом, новые шаги переведены", () => {
  const tour = read("js/tour.js");
  const steps = Array.from(tour.matchAll(/\{ key:"(\w+)",\s*tab:"(\w+)",\s*sel:"([^"]+)"/g), m => ({ key:m[1], tab:m[2], sel:m[3] }));
  const words = { 10:["Десять", "Ten"], 11:["Одиннадцать", "Eleven"], 12:["Двенадцать", "Twelve"], 13:["Тринадцать", "Thirteen"], 14:["Четырнадцать", "Fourteen"] };
  assert.ok(words[steps.length], `нет слова для ${steps.length} шагов`);
  const en = loadApp(undefined, { "pc-lang":"en" }).PC;
  assert.ok(PC.t("set.tour.d").startsWith(words[steps.length][0] + " шагов"), PC.t("set.tour.d"));
  assert.ok(en.t("set.tour.d").startsWith(words[steps.length][1] + " steps"), en.t("set.tour.d"));
  for(const key of ["duel", "sv"]){
    const step = steps.find(s => s.key === key);
    assert.ok(step && step.tab === "votes", `шаг ${key} на вкладке голосований`);
    assert.ok(html.includes(`id="${step.sel.slice(1)}"`), step.sel);
    for(const app of [PC, en]) for(const part of ["h", "p"]) assert.notEqual(app.t(`tour.${key}.${part}`), `tour.${key}.${part}`);
  }
  assert.doesNotMatch(en.t("tour.duel.p") + en.t("tour.sv.p"), /[А-Яа-яЁё]/);
  assert.ok(steps.at(-1).key === "settings" && steps.at(-1).tab === "any", "последний шаг — настройки, не привязаны к вкладке");
});

test("check:fonts: команда, эталон и состав проверки", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["check:fonts"], "node scripts/check-fonts.cjs");
  const base = JSON.parse(read("docs/check-fonts-4.4.json"));
  assert.equal(base.width, 320);
  assert.equal(base.textScale, 2);
  const keys = ["en", "ru"].flatMap(l => ["about", "compass", "party", "quiz", "votes"].map(t => `${l}/${t}`)).sort();
  for(const engine of ["chromium", "webkit"]){
    assert.deepEqual(Object.keys(base.widths[engine]).sort(), keys, engine);
    for(const w of Object.values(base.widths[engine])) assert.ok(w >= 320 && w <= 330, `ширина ${w}`);
  }
  const script = read("scripts/check-fonts.cjs");
  for(const needle of ["Verdana", '"--text-k", "2"', "width:WIDTH", "--write"]) assert.ok(script.includes(needle), needle);
});

test("мелочи 4.4: плашка без сети, подскок выбора партий снят, метка новой партии согласована", () => {
  const offline = read("js/offline.js");
  assert.ok(offline.includes('"offline"') && offline.includes('"online"') && offline.includes("navigator.onLine"));
  assert.ok(/\.offline-bar\{[^}]*position:fixed/.test(read("css/ui.css")));
  assert.doesNotMatch(read("css/spring.css"), /\.duel-pick/, "выбор партий в дуэли не подпрыгивает при наведении");
  assert.equal(PC.t("party.newTag"), "НОВ");
  assert.equal(loadApp(undefined, { "pc-lang":"en" }).PC.t("party.newTag"), "NEW");
  /* живые области обновляются только при смене текста */
  const sv = read("js/selfvote.js");
  assert.ok(sv.includes("count.textContent !== countText") && sv.includes("res.dataset.html !== html"));
});

test("пасхалки 4.4: «4.4» в поиске и команда 444 в терминале учтены в списке", () => {
  const eggs = loadApp([...DEFAULT_FILES, "js/settings.js", "js/eggs.js"]).PC.eggs;
  assert.ok(eggs.IDS.includes("44") && eggs.IDS.includes("444"));
  assert.equal(new Set(eggs.IDS).size, eggs.IDS.length);
  const en = loadApp(undefined, { "pc-lang":"en" }).PC;
  for(const key of ["eggs.v44", "eggs.v444"]){
    assert.notEqual(PC.t(key), key); assert.notEqual(en.t(key), key);
    assert.doesNotMatch(en.t(key), /[А-Яа-яЁё]/, key);
  }
});
