/* «Голосую сам»: рейтинг фракций по ответам, проверка сохранённых
   ответов, резервная копия и загрузка модуля по требованию. До 5.0 —
   tests/tools43.test.js и tests/tools44.test.js. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT, DEFAULT_FILES } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const html = read("index.html");
const { PC } = loadApp();

test("голосую сам: голоса как у фракции дают ей 100% и первое место", () => {
  const votes = {};
  for(const v of PC.VOTES){
    const s = PC.voteStance(v, PC.partyById("kprf"));
    if(s === "for" || s === "against" || s === "abstain") votes[v.id] = s;
  }
  assert.ok(Object.keys(votes).length >= 10, "у КПРФ должно быть много известных позиций");
  const rows = PC.selfVote.score(votes);
  assert.equal(rows[0].p.id, "kprf");
  assert.equal(rows[0].ratio, 1);
  assert.equal(rows[0].common, Object.keys(votes).length);
  for(let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].ratio >= rows[i].ratio, "рейтинг упорядочен по доле");
});

test("голосую сам: пустые ответы и голосования без известной позиции не дают процентов", () => {
  assert.equal(PC.selfVote.score({}).length, 0);
  const split = PC.VOTES.find(v => Object.values(v.pos).includes("split"));
  if(split){
    const id = Object.keys(split.pos).find(k => split.pos[k] === "split");
    const row = PC.selfVote.score({ [split.id]:"for" }).find(r => r.p.id === id);
    assert.equal(row, undefined, "«разделились» не считается ни совпадением, ни расхождением");
  }
  for(const r of PC.selfVote.score({ [PC.VOTES[0].id]:"for" })) assert.ok(r.common === 1);
});

test("голосую сам: проверка сохранённых ответов и резервная копия", () => {
  const ok = { v:1, votes:{ [PC.VOTES[0].id]:"for", [PC.VOTES[1].id]:"abstain" } };
  assert.equal(PC.selfVote.valid(ok), true);
  for(const bad of [null, [], { v:2, votes:{} }, { v:1, votes:[] }, { v:1, votes:{ "bad id":"for" } }, { v:1, votes:{ [PC.VOTES[0].id]:"split" } }])
    assert.equal(PC.selfVote.valid(bad), false, JSON.stringify(bad));
  /* законопроект, убранный из данных или пришедший из новой версии, не обнуляет остальные ответы */
  assert.equal(PC.selfVote.valid({ v:1, votes:{ "removed-bill":"for", [PC.VOTES[0].id]:"against" } }), true);
  const app = loadApp([...DEFAULT_FILES, "js/settings.js", "js/eggs.js", "js/backup.js"]);
  app.storage.setItem("pc-selfvote", JSON.stringify(ok));
  const backup = app.PC.backup.make();
  assert.equal(backup.data["pc-selfvote"], JSON.stringify(ok));
  assert.equal(app.PC.backup.validate(backup), true);
  backup.data["pc-selfvote"] = JSON.stringify({ v:1, votes:{ evil:"maybe" } });
  assert.equal(app.PC.backup.validate(backup), false);
});

test("загрузка по требованию: резервная копия проверяет ответы «Голосую сам» и без загруженного модуля", () => {
  const files = [...DEFAULT_FILES.filter(f => f !== "js/selfvote.js" && f !== "js/duel.js"), "js/settings.js", "js/eggs.js", "js/backup.js"];
  const app = loadApp(files);
  assert.equal(app.PC.selfVote, undefined, "модуль не загружен");
  const ok = { v:1, votes:{ [app.PC.VOTES[0].id]:"for" } };
  app.storage.setItem("pc-selfvote", JSON.stringify(ok));
  const backup = app.PC.backup.make();
  assert.equal(app.PC.backup.validate(backup), true);
  backup.data["pc-selfvote"] = JSON.stringify({ v:1, votes:{ evil:"maybe" } });
  assert.equal(app.PC.backup.validate(backup), false);
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

/* ---------- 5.1: веса, ссылка, совместимость ---------- */
test("«Голосую сам»: ссылка на ответы кодирует и читает ответы и важность", () => {
  const votes = { [PC.VOTES[0].id]:"for", [PC.VOTES[3].id]:"against", [PC.VOTES[10].id]:"abstain" };
  const imp = { [PC.VOTES[3].id]:true };
  const code = PC.selfVote.encode(votes, imp);
  assert.match(code, /^v1\.[-fabFAB]+$/);
  assert.ok(code.length <= 3 + PC.VOTES.length, "код длиннее набора");
  const back = PC.selfVote.decode(code);
  assert.deepEqual({ ...back.votes }, votes);
  assert.deepEqual({ ...back.imp }, imp);
  /* старая (короткая) ссылка читается: недостающее — «нет ответа» */
  assert.deepEqual({ ...PC.selfVote.decode("v1.f").votes }, { [PC.VOTES[0].id]:"for" });
  for(const bad of ["", "v2.fff", "v1.xyz", "v1." + "f".repeat(700), null, 5]) assert.equal(PC.selfVote.decode(bad), null, String(bad).slice(0, 20));
});

test("«Голосую сам»: важный законопроект весит вдвое", () => {
  const kprf = PC.partyById("kprf");
  const known = PC.VOTES.filter(v => ["for", "against"].includes(PC.voteStance(v, kprf)));
  const agree = known[0], disagree = known[1];
  const flip = s => s === "for" ? "against" : "for";
  const votes = { [agree.id]:PC.voteStance(agree, kprf), [disagree.id]:flip(PC.voteStance(disagree, kprf)) };
  const plain = PC.selfVote.score(votes).find(r => r.p.id === "kprf");
  const heavy = PC.selfVote.score(votes, undefined, { [agree.id]:true }).find(r => r.p.id === "kprf");
  assert.equal(plain.ratio, 0.5);
  assert.equal(heavy.common, 3);
  assert.ok(Math.abs(heavy.ratio - 2 / 3) < 1e-9);
});

test("«Голосую сам»: старые сохранённые ответы без поля imp остаются валидными", () => {
  assert.ok(PC.votes.validSelf({ v:1, votes:{ [PC.VOTES[0].id]:"for" } }));
  assert.ok(PC.votes.validSelf({ v:1, votes:{ [PC.VOTES[0].id]:"for" }, imp:[PC.VOTES[0].id] }));
  assert.match(read("js/nav.js"), /selfvote/);
});
