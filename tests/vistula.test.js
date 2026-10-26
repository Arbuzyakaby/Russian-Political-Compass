/* Выпуск 3.0 «Висла». Всё, что в нём появилось или ушло, проверяется
   здесь одним файлом: заявленные координаты партий, данные IX созыва,
   восемь новых голосований, формат ссылки «3» и отказ от старых
   ссылок, отсутствие траекторий и имя версии. Файл отдельный намеренно:
   если следующий выпуск что-то из этого сломает, упадёт тест с именем
   выпуска, и станет видно, какое обещание нарушено. */
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

test("в наборе двадцать восемь голосований, восемь из них новые", () => {
  assert.equal(PC.VOTES.length, 28);
  const added = ["torture-2021", "echr-2022", "agents-2022", "declarations-2023",
                 "draftage-2023", "taxreform-2024", "extremism-2025", "vat-2025"];
  for(const id of added){
    const v = PC.VOTES.find(x => x.id === id);
    assert.ok(v, `нет голосования ${id}`);
    assert.equal(v.conv, 8, `${id} принято VIII созывом`);
    assert.ok(v.en && v.en.title && v.en.why, `${id}: нет перевода`);
  }
});

test("у новых голосований хотя бы одна фракция разошлась с «Единой Россией»", () => {
  /* Единогласных голосований VIII созыва в наборе и так шесть; новые
     добавлялись ради разделений, и каждое обязано что-то разделять. */
  for(const id of ["torture-2021", "echr-2022", "agents-2022", "declarations-2023",
                   "draftage-2023", "extremism-2025"]){
    const v = PC.VOTES.find(x => x.id === id);
    const er = v.pos.er;
    assert.ok(Object.entries(v.pos).some(([k, s]) => k !== "er" && s !== er), `${id}: все совпали с ЕР`);
  }
});

test("в разметке и словаре то же число голосований и тот же диапазон лет", () => {
  const html = read("index.html");
  assert.match(html, /<b id="vfCount">28<\/b>/);
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
  for(const rel of ["js/compass.js", "js/app.js", "js/sidebar.js", "js/export.js", "index.html",
                    "css/compass.css", "css/sidebar.css"]){
    assert.ok(!/trailBtn|drawTrails|\.trail-|trajectoriesCSV|show-trails/.test(read(rel)),
      `${rel}: остались следы траекторий`);
  }
  assert.ok(!("trails.btn" in (PC.i18n.dict || {})) && PC.t("trails.btn") === "trails.btn",
    "в словаре остался ключ чипа траекторий");
});

/* ---------- имя версии ---------- */

test("у версии 3.1.1 сохранено имя-гидроним на обоих языках", () => {
  assert.equal(PC.VERSION, "3.1.1");
  assert.deepEqual({ ...PC.VERSION_NAME }, { ru:"Висла", en:"Vistula" });
  assert.equal(PC.VERSION_LABEL, "3.1.1 «Висла»");
  assert.ok(!/RPC/.test(PC.VERSION_LABEL), "приставка RPC осталась в 3.0");
  assert.equal(en.versionLabel(), "3.1.1 “Vistula”");
});
