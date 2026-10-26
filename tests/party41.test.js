"use strict";
/* Release 4.1: шаблоны, случайная партия и модель выборов «Моей партии».
   Чистые функции проверяются в Node без браузера; отрисовка — в Playwright. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, DEFAULT_FILES, ROOT } = require("./harness.js");
const FILES = [...DEFAULT_FILES, "js/party-election.js", "js/party-templates.js"];
const app = seed => loadApp(FILES, seed);
const plain = v => JSON.parse(JSON.stringify(v));
const CYR = /[а-яА-ЯёЁ]/;

test("шаблоны: девять валидных партий на двух языках, без кириллицы в английских", () => {
  const { PC } = app(), M = PC.partyModel, T = PC.partyTemplates;
  assert.ok(T.LIST.length >= 8);
  const ids = new Set();
  for(const tpl of T.LIST){
    assert.ok(!ids.has(tpl.id)); ids.add(tpl.id);
    for(const lang of ["ru", "en"]){
      const raw = T.build(tpl.id, lang), p = M.normalize(raw);
      assert.ok(M.valid(raw), tpl.id);
      assert.ok(p.name.length > 2 && p.short && p.tag && p.slogan && p.summary && p.ideology, tpl.id);
      assert.equal(p.color, tpl.color); assert.equal(p.emblem, tpl.emblem); assert.ok(M.EMBLEMS.includes(p.emblem));
      assert.ok(M.FAMILIES.includes(p.family) && M.KINDS.includes(p.kind));
      assert.ok(p.theses.length >= 3 && p.theses.length <= 8);
      assert.ok(Math.abs(p.x - tpl.x) < .06 && Math.abs(p.y - tpl.y) < .06, `${tpl.id}: x,y совпадают с под-осями`);
      assert.ok(Object.keys(p.votes).length >= 20, "голоса заданы по позиции");
      assert.ok(Object.keys(p.votes).every(id => PC.VOTES.some(v => v.id === id)));
      const code = M.encode(p);   /* 4.1: каждым шаблоном можно поделиться ссылкой P1 (до 4000 знаков) */
      assert.ok(code !== null && M.decode(code) !== null, `${tpl.id}/${lang}: ${M.error()}`);
      if(lang === "en") assert.ok(!CYR.test(JSON.stringify(raw)), `${tpl.id}: кириллица в английском тексте`);
    }
  }
});

test("шаблоны расходятся по компасу: нет двух партий в одной точке и цвета различимы", () => {
  const { PC } = app(), L = PC.partyTemplates.LIST;
  for(let i = 0; i < L.length; i++) for(let j = i + 1; j < L.length; j++){
    assert.ok(Math.hypot(L[i].x - L[j].x, L[i].y - L[j].y) > 1, `${L[i].id}/${L[j].id}`);
    assert.notEqual(L[i].color, L[j].color);
  }
});

test("голоса по позиции согласованы: партия на месте реальной голосует как её соседи", () => {
  const { PC } = app(), T = PC.partyTemplates;
  const er = PC.partyById("er"), votes = T.votesFromPosition(er.x, er.y);
  let same = 0, known = 0;
  PC.VOTES.forEach(v => { const s = PC.voteStance(v, er); if(["for", "against", "abstain"].includes(s) && votes[v.id]){ known++; if(votes[v.id] === s) same++; } });
  assert.ok(known > 15 && same / known > .8, `${same}/${known}`);
});

test("копия реальной партии: своя, без declared, реальные данные не меняются", () => {
  const { PC } = app(), M = PC.partyModel, T = PC.partyTemplates, before = JSON.stringify(PC.PARTIES);
  for(const real of PC.PARTIES){
    const raw = T.fromReal(real.id, "ru", "копия"), p = M.normalize(raw);
    assert.ok(M.valid(raw)); assert.match(p.id, /^u[1-6]$/); assert.ok(p.name.endsWith("· копия"));
    assert.equal(p.declared, undefined); assert.equal(p.seats, 0); assert.equal(p.inCoalition, false);
    assert.ok(Math.abs(p.x - real.x) < .6 && Math.abs(p.y - real.y) < .6);
  }
  assert.equal(JSON.stringify(PC.PARTIES), before);
  assert.equal(T.fromReal("нет-такой"), null);
});

test("случайная партия: валидна, связна и детерминирована по seed", () => {
  const { PC } = app(), M = PC.partyModel, T = PC.partyTemplates, names = new Set();
  for(let seed = 1; seed <= 200; seed++){
    for(const lang of ["ru", "en"]){
      const a = T.random(seed, lang), b = T.random(seed, lang);
      assert.deepEqual(plain(a), plain(b), "тот же seed — та же партия");
      assert.ok(M.valid(a)); const p = M.normalize(a);
      assert.ok(p.name.length >= 3 && p.name.length <= 60 && p.tag.length >= 1 && p.tag.length <= 8);
      assert.match(p.color, /^#[0-9a-f]{6}$/); assert.ok(M.EMBLEMS.includes(p.emblem) && p.emblem !== "mono");
      assert.ok(p.theses.length >= 3 && Object.keys(p.votes).length >= 20);
      assert.ok(Math.abs(p.x) <= 10 && Math.abs(p.y) <= 10);
      if(lang === "ru") names.add(p.name);
      if(lang === "en") assert.ok(!CYR.test(JSON.stringify(a)), "английская случайная партия без кириллицы");
    }
  }
  assert.ok(names.size > 80, `разнообразие названий: ${names.size}`);
  assert.notDeepEqual(plain(T.random(1, "ru")), plain(T.random(2, "ru")));
});

test("случайная партия: цвет не повторяет реальные партии вплотную", () => {
  const { PC } = app(), T = PC.partyTemplates, rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  let close = 0;
  for(let s = 1; s <= 100; s++){
    const c = rgb(T.random(s, "ru").color);
    if(PC.PARTIES.some(p => { const q = rgb(p.color); return Math.hypot(c[0] - q[0], c[1] - q[1], c[2] - q[2]) < 25; })) close++;
  }
  assert.ok(close < 15, `слишком близких цветов: ${close}`);
});

test("apportion: сумма ровно total, нули и дробные веса", () => {
  const { PC } = app(), ap = PC.partyModel.apportion;
  assert.deepEqual(plain(ap([1, 1, 1], 450)), [150, 150, 150]);
  assert.equal(ap([.31, .27, .22, .2], 450).reduce((a, b) => a + b, 0), 450);
  assert.deepEqual(plain(ap([0, 0], 450)), [0, 0]);
  assert.deepEqual(plain(ap([5, 0, 5], 7)), [4, 0, 3]);
});

function mine(PC, x, y, id = "u1"){
  return PC.partyModel.normalize({ id, name:"Моя " + id, short:"Моя", tag:"М", color:"#34d399", sub:PC.partyModel.toSub(x, y) });
}

test("выборы: доли дают 100, места 450, барьер соблюдён, для всех созывов и сидов", () => {
  const { PC } = app(), E = PC.partyElection;
  for(const c of PC.CONVOCATIONS) for(const seed of [0, 1, 7]) for(const strength of ["low", "mid", "high"]) for(const own of [[], [mine(PC, -3, -4)], [mine(PC, 0, 0), mine(PC, 6, -6, "u2")]]){
    const r = E.simulate(c.id, own, { seed, strength });
    assert.ok(Math.abs(r.rows.reduce((s, x) => s + x.share, 0) - 100) < 1e-6, "сумма долей");
    assert.equal(r.rows.reduce((s, x) => s + x.seats, 0), 450, "сумма мандатов");
    assert.equal(r.rows.length, E.participants(c.id).length + own.length);
    assert.equal(r.own.length, own.length);
    const anyPassed = r.rows.some(x => x.share >= 5);
    for(const x of r.rows){
      assert.ok(Number.isInteger(x.seats) && x.seats >= 0);
      if(anyPassed){ assert.equal(x.passed, x.share >= 5 - 1e-9); if(!x.passed) assert.equal(x.seats, 0); }
      assert.ok(x.share >= 0);
    }
    for(let i = 1; i < r.rows.length; i++) assert.ok(r.rows[i - 1].share >= r.rows[i].share, "строки по убыванию");
    const ownShare = r.own.reduce((s, x) => s + x.share, 0), taken = r.taken.reduce((s, x) => s + x.pp, 0);
    assert.ok(Math.abs(ownShare - taken) < 1e-6, "отнятые голоса равны доле ваших партий");
  }
});

test("выборы детерминированы: тот же seed — тот же результат, другой шум — другой", () => {
  const { PC } = app(), E = PC.partyElection, own = [mine(PC, -2, -3)];
  const a = E.simulate(9, own, { seed:3, strength:"mid" }), b = E.simulate(9, own, { seed:3, strength:"mid" });
  assert.deepEqual(plain(a.rows.map(r => [r.p.id, r.share, r.seats])), plain(b.rows.map(r => [r.p.id, r.share, r.seats])));
  const c = E.simulate(9, own, { seed:4, strength:"mid" });
  assert.notDeepEqual(a.rows.map(r => r.share), c.rows.map(r => r.share));
  const base = E.simulate(9, own, { seed:0 }), noNoise = E.simulate(9, own, {});
  assert.deepEqual(plain(base.rows.map(r => r.share)), plain(noNoise.rows.map(r => r.share)));
  assert.equal(E.rng(5)(), E.rng(5)());
});

test("выборы: база считается без вашей партии, новая партия никому не добавляет голосов", () => {
  const { PC } = app(), E = PC.partyElection, p = mine(PC, 0, 0);
  const low = E.simulate(9, [p], { strength:"low" }).own[0].share, high = E.simulate(9, [p], { strength:"high" }).own[0].share;
  assert.ok(high > low, "сильная кампания помогает");
  const without = E.simulate(9, [], { seed:2 }), withP = E.simulate(9, [p], { seed:2 });
  for(const r of withP.rows.filter(r => !r.user)){
    assert.ok(Math.abs(r.base - without.rows.find(x => x.p.id === r.p.id).share) < 1e-9);
    assert.ok(r.share <= r.base + 1e-9);
  }
});

test("выборы: у партии в гуще избирателей больше голосов, чем в углу; реальные данные не меняются", () => {
  const { PC } = app(), E = PC.partyElection, before = JSON.stringify(PC.PARTIES);
  const heart = E.simulate(9, [mine(PC, 3, 8)], { strength:"mid" }).own[0].share, corner = E.simulate(9, [mine(PC, 9.5, -9.5)], { strength:"mid" }).own[0].share;
  assert.ok(heart > corner, `${heart} > ${corner}`);
  assert.equal(JSON.stringify(PC.PARTIES), before);
});

test("сравнение по созывам: от IV к IX, по одному результату на созыв", () => {
  const { PC } = app(), E = PC.partyElection, rows = E.compare([mine(PC, 0, 0)], { seed:1 });
  assert.deepEqual(plain(rows.map(r => r.conv)), plain(PC.CONVOCATIONS.map(c => c.id).sort((a, b) => a - b)));
  assert.equal(rows.length, 6);
  rows.forEach(r => assert.equal(r.rows.reduce((s, x) => s + x.seats, 0), 450));
});

test("старые сохранения 4.0 читаются: коллекция, P1-ссылка и JSON без новых полей", () => {
  const { PC, storage } = app(), M = PC.partyModel;
  const old = { name:"Старая", short:"С", tag:"СТ", color:"#a5b4fc", emblem:"leaf", founded:2024, leader:"", slogan:"", summary:"", family:"green", ideology:"", kind:"movement",
    sub:{ property:1, redistribution:2, regulation:3, civil:-1, centralization:0, tradition:1 }, theses:["a"], votes:{ [PC.VOTES[0].id]:"for" }, seats:10, inCoalition:true,
    created:"2026-01-01T00:00:00.000Z", updated:"2026-01-02T00:00:00.000Z", extraFuture:"ignored" };
  storage.setItem(M.KEY, JSON.stringify({ v:1, list:[{ ...old, id:"u1" }] }));
  assert.deepEqual(plain(M.load()), { reset:false, migrated:false });
  const p = M.list()[0]; assert.equal(p.name, "Старая"); assert.equal(p.extraFuture, undefined); assert.equal(p.seats, 10);
  assert.deepEqual(plain(M.decode(M.encode(p))), plain(p));
  assert.deepEqual(plain(M.importJSON(JSON.stringify({ format:"politcompass-parties", v:1, list:[old] }))), { added:1, skipped:0 });
  storage.setItem(M.KEY, JSON.stringify([old]));
  assert.equal(M.load().migrated, true);
  assert.equal(PC.partyElection.simulate(9, M.list(), {}).own.length, 1, "старую партию можно выставить на выборы");
});

test("шаблон сохраняется, экспортируется и снова импортируется без потерь", () => {
  const { PC } = app(), M = PC.partyModel, T = PC.partyTemplates;
  const saved = M.save(T.build("green", "ru"), true);
  assert.ok(saved);
  const json = M.exportJSON(), back = JSON.parse(json);
  assert.deepEqual(plain(M.importJSON(json)), { added:1, skipped:0 });
  assert.deepEqual(plain(back.list[0].sub), plain(saved.sub));
  const lean = M.normalize({ ...saved, votes:{}, theses:[], summary:"" });
  assert.deepEqual(plain(M.decode(M.encode(lean))), plain(lean));
});

test("все ключи словаря в новых модулях существуют на обоих языках", () => {
  const ru = app().PC, en = loadApp(FILES, { "pc-lang":"en" }).PC, keys = new Set();
  for(const f of ["js/party-builder.js", "js/party-campaign.js"]){
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for(const m of src.matchAll(/\bt\("(party\.[\w.]+)"/g)) if(!m[1].endsWith(".")) keys.add(m[1]);
    for(const m of src.matchAll(/"(party\.(?:camp|votes|start|base|real|ax|ready)\.[\w.]+)"/g)) if(!m[1].endsWith(".")) keys.add(m[1]);
  }
  ru.partyModel.FAMILIES.forEach(f => keys.add("party.family." + f)); ru.partyModel.KINDS.forEach(k => keys.add("party.kind." + k));
  for(let n = 1; n <= 6; n++){ keys.add("party.step." + n); keys.add("party.hint." + n); }
  ["low", "mid", "high"].forEach(k => keys.add("party.camp.s." + k));
  assert.ok(keys.size > 60);
  for(const k of keys){
    for(const [lang, PC] of [["ru", ru], ["en", en]]) assert.notEqual(PC.t(k), k, `${lang}: нет перевода ${k}`);
  }
});

test("страница подключает новые модули в правильном порядке", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const at = n => html.indexOf(`src="js/${n}"`);
  assert.ok(at("party-model.js") < at("party-election.js") && at("party-election.js") < at("party-builder.js"));
  assert.ok(at("party-templates.js") < at("party-builder.js") && at("party-builder.js") < at("party-campaign.js"));
  assert.ok(at("party-campaign.js") < at("app.js"));
});
