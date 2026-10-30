/* Заявленные позиции партий, данные IX созыва, двадцать восемь
   голосований, формат ссылки «3» и отказ от старых ссылок, отсутствие
   траекторий. Всё это появилось в 3.0 «Висла»; до 5.0 файл назывался
   tests/vistula.test.js — по имени выпуска, а не по тому, что проверяет. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, parseCSV, ROOT } = require("./harness.js");

const { PC } = loadApp();
const en = loadApp(undefined, { "pc-lang": "en" }).PC;
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const gap = p => Math.hypot(p.x - p.declared.x, p.y - p.declared.y);

/* ---------- заявленные координаты ---------- */

test("у каждой партии есть заявленная позиция в пределах поля", () => {
  for(const p of PC.PARTIES){
    assert.ok(p.declared, `${p.id}: нет заявленной позиции`);
    for(const k of ["x", "y"]){
      const v = p.declared[k];
      assert.equal(typeof v, "number", `${p.id}.declared.${k} не число`);
      assert.ok(v >= -10 && v <= 10, `${p.id}.declared.${k} = ${v} вне шкалы −10…+10`);
      assert.equal(Math.round(v * 10) / 10, v, `${p.id}.declared.${k}: точность — до десятой`);
    }
  }
});

test("пояснение к разрыву есть на обоих языках и не пустое", () => {
  for(const p of PC.PARTIES){
    const ru = PC.L(p.declared, "note"), eng = en.L(p.declared, "note");
    assert.ok(ru && ru.length > 40, `${p.id}: пояснение к заявленной позиции слишком короткое`);
    assert.ok(eng && eng.length > 40, `${p.id}: нет английского пояснения`);
    assert.ok(!/[а-яё]/i.test(eng), `${p.id}: в английском пояснении кириллица`);
  }
});

test("разрыв у «Яблока» самый короткий, у ЛДПР — самый длинный", () => {
  /* Ровно то, что утверждает карточка «Откуда берутся координаты». */
  const sorted = PC.PARTIES.slice().sort((a, b) => gap(a) - gap(b));
  assert.equal(sorted[0].id, "yabloko");
  assert.equal(sorted[sorted.length - 1].id, "ldpr");
  assert.equal(sorted[sorted.length - 2].id, "kprf", "текст раздела называет КПРФ вторым по длине разрыва");
  assert.ok(gap(sorted[0]) < 1, "у «Яблока» разрыв почти нулевой — так и написано в тексте");
});

test("заявленная точка не совпадает с реальной ни у одной партии", () => {
  /* Нулевой разрыв — тоже данные, но тогда полой точки на поле не видно
     вовсе, и читатель решит, что у партии заявленной позиции нет. */
  for(const p of PC.PARTIES) assert.ok(gap(p) >= 0.5, `${p.id}: заявленная точка сливается с реальной`);
});

test("компас рисует слой заявленных позиций и умеет его прятать", () => {
  const compass = read("js/compass.js");
  assert.match(compass, /function drawClaims\(\)/);
  assert.match(compass, /setClaims:setClaims/);
  assert.match(read("index.html"), /id="claimBtn"[^>]*aria-pressed="true"/,
    "чип слоя в разметке обязан стоять включённым — слой включён по умолчанию");
  assert.match(read("js/app.js"), /PC\.store\.get\("pc-claims", "1"\)/);
});

/* ---------- IX созыв ---------- */

test("IX созыв — текущий, и мандаты в нём совпадают с итогами ЦИК", () => {
  assert.equal(PC.CURRENT_CONVOCATION, 9);
  assert.ok(PC.CONVOCATIONS.some(c => c.id === 9), "IX созыв не виден интерфейсу");
  const expected = { er:349, kprf:37, ldpr:23, nl:19, sr:17, rodina:1 };
  for(const [id, n] of Object.entries(expected)){
    assert.equal(PC.seatsAt(PC.partyById(id), 9), n, `${id}: мандаты IX созыва`);
  }
});

test("мандаты партий плюс четыре самовыдвиженца дают ровно 450", () => {
  const parties = PC.PARTIES.reduce((n, p) => n + (PC.seatsAt(p, 9) || 0), 0);
  assert.equal(parties + 4, PC.TOTAL_SEATS);
});

test("мандаты VIII созыва переехали в seatsBy без потерь", () => {
  const was = { er:324, kprf:57, sr:27, ldpr:21, nl:13, rodina:1 };
  for(const [id, n] of Object.entries(was)){
    assert.equal(PC.seatsAt(PC.partyById(id), 8), n, `${id}: мандаты VIII созыва потерялись при переносе`);
  }
});

test("заготовкой будущего созыва стал X", () => {
  const drafts = PC.CONVOCATIONS_ALL.filter(c => c.draft).map(c => c.id);
  assert.deepEqual(Array.from(drafts), [10]);
});

/* ---------- голосования ---------- */

test("в наборе сорок четыре голосования, шестнадцать из них добавлены в 5.1", () => {
  assert.equal(PC.VOTES.length, 44);
  const added = ["kyoto-2004", "kharkiv-2010", "start-2011", "police-2011", "ngo-agents-2012", "libel-2012",
                 "believers-2013", "undesirable-2015", "battery-2017", "renovation-2017", "disrespect-2019",
                 "ndfl-2020", "education-2021", "summons-2023", "windfall-2023", "dprk-2024"];
  for(const id of added){
    const v = PC.VOTES.find(x => x.id === id);
    assert.ok(v, `нет голосования ${id}`);
    assert.ok(v.en && v.en.title && v.en.summary && v.en.tally && v.en.why, `${id}: нет перевода`);
    assert.ok(v.src && v.src.vote && v.src.bill, `${id}: нет протокола голосования`);
  }
  assert.equal(new Set(PC.VOTES.map(v => v.id)).size, 44, "идентификаторы повторяются");
});

test("у каждого голосования есть источник, у позиций — правдоподобная форма", () => {
  const STANCES = ["for", "against", "abstain", "split"];
  for(const v of PC.VOTES){
    assert.ok(v.src && (v.src.vote || v.src.url), `${v.id}: нет источника`);
    if(v.src.vote) assert.ok(Number.isInteger(v.src.vote) && v.src.vote > 40000, `${v.id}: странный номер протокола`);
    if(v.src.bill) assert.match(v.src.bill, /^\d{3,7}-[3-8]$/, `${v.id}: номер законопроекта`);
    if(v.src.url) assert.match(v.src.url, /^https:\/\//, `${v.id}: адрес публикации`);
    for(const [k, st] of Object.entries(v.pos)){
      assert.ok(PC.partyById(k), `${v.id}: неизвестная партия ${k}`);
      assert.ok(STANCES.includes(st), `${v.id}: неизвестная позиция ${st}`);
    }
    assert.match(v.date, /^\d{4}-\d\d-\d\d$/);
    assert.ok([4, 5, 6, 7, 8].includes(v.conv), `${v.id}: созыв`);
    assert.ok(["econ", "state", "foreign"].includes(v.topic), `${v.id}: тема`);
  }
});

test("в разметке и словаре то же число голосований и тот же диапазон лет", () => {
  const html = read("index.html");
  assert.match(html, /<b id="vfCount">44<\/b>/);
  assert.match(html, /<b>2004–2025<\/b>/);
  assert.ok(PC.t("votes.lede.short").includes("2004–2025"));
});

/* ---------- ссылка на результат ---------- */

test("новая ссылка начинается с номера формата 3", () => {
  const src = {};
  PC.quiz.questionsFor("full").forEach(q => { src[q.id] = 1; });
  assert.match(PC.quiz.shareURL(src, "full"), /#\/result\/3[a-e-]{40}$/);
});

test("ссылки 1.x и 2.x распознаются как старые и не открываются", () => {
  const std = "c".repeat(40);
  for(const old of [std, "s" + std, "x" + "b".repeat(90)]){
    assert.ok(PC.quiz.isLegacyCode(old), `${old.slice(0, 3)}…: старый код не распознан`);
    assert.equal(PC.quiz.decodeAnswers(old), null, "старый код не должен раскодироваться");
  }
  assert.ok(!PC.quiz.isLegacyCode("3" + std), "новый код принят за старый");
  assert.ok(PC.t("res.legacyLink").length > 20, "нет сообщения об устаревшей ссылке");
});

test("старые коды из собственной истории дописываются номером и читаются", () => {
  const QC = PC.quizCalc;
  const std = "d".repeat(40);
  assert.equal(QC.upgradeCode(std), "3" + std);
  assert.equal(QC.upgradeCode("3" + std), "3" + std, "новый код не должен меняться");
  assert.ok(QC.decodeAnswers(QC.upgradeCode("s" + std)));
});

test("результат теста сравнивается и с заявленными позициями", () => {
  const rank = PC.quizCalc.ranking({ x:-3, y:-8 });
  assert.ok(rank.every(r => typeof r.said === "number" && r.said >= 0 && r.said <= 100));
  const best = PC.quizCalc.saidBest({ x:-2.5, y:-8.5 });
  assert.equal(best.p.id, "yabloko", "точка в заявленной позиции «Яблока» обязана совпасть с ним по словам");
  assert.equal(best.said, 100);
});

/* ---------- траектории ---------- */

test("траекторий нет ни в данных, ни в коде, ни в разметке", () => {
  assert.ok(PC.PARTIES.every(p => !("history" in p)), "у партии осталось поле history");
  for(const rel of ["js/compass-labels.js", "js/compass-board.js", "js/compass-marks.js", "js/compass.js", "js/app.js", "js/sidebar.js", "js/export.js", "index.html",
                    "css/compass.css", "css/sidebar.css"]){
    assert.ok(!/trailBtn|drawTrails|\.trail-|trajectoriesCSV|show-trails/.test(read(rel)),
      `${rel}: остались следы траекторий`);
  }
  assert.ok(!("trails.btn" in (PC.i18n.dict || {})) && PC.t("trails.btn") === "trails.btn",
    "в словаре остался ключ чипа траекторий");
});

/* ---------- имя версии ---------- */
