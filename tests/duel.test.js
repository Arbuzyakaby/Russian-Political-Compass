/* Дуэль партий: расстояние, общие голосования, вердикт, адрес #/duel/…
   и то, что по такой ссылке не показывается приветствие. До 5.0 эти
   проверки лежали в tests/tools43.test.js и tests/tools44.test.js. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT, DEFAULT_FILES } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const html = read("index.html");
const { PC } = loadApp();

test("дуэль: расстояние симметрично, а голосования считаются как в матрице совпадений", () => {
  const er = PC.partyById("er"), kprf = PC.partyById("kprf");
  const ab = PC.duel.compare(er, kprf), ba = PC.duel.compare(kprf, er);
  assert.equal(ab.distance, ba.distance);
  assert.equal(ab.distance, PC.calc.distance(er, kprf));
  const ag = PC.voteAgreement(er, kprf);
  assert.deepEqual([ab.agreement.same, ab.agreement.common], [ag.same, ag.common]);
  assert.equal(ab.same.length, ag.same, "совпавшие голосования перечислены все");
  assert.equal(ab.same.length + ab.differ.length, ag.common, "каждое общее голосование либо совпало, либо разошлось");
  for(const r of ab.differ) assert.notEqual(r.a, r.b);
  assert.ok(ab.share > 0 && ab.share <= 1);
});

test("дуэль: самый большой разрыв — действительно наибольший по модулю, вердикт следует порогам", () => {
  for(const a of PC.PARTIES){
    for(const b of PC.PARTIES){
      if(a.id === b.id) continue;
      const r = PC.duel.compare(a, b);
      const max = Math.max(...r.axes.filter(x => x.delta != null).map(x => Math.abs(x.delta)));
      assert.equal(Math.abs(r.biggest.delta), max, `${a.id}–${b.id}`);
    }
  }
  assert.deepEqual([0, 2.9, 3, 6.9, 7, 11.9, 12, 28].map(PC.duel.verdict),
    ["near", "near", "close", "close", "apart", "apart", "opposite", "opposite"]);
  assert.equal(PC.duel.MAX_DISTANCE.toFixed(2), "28.28");
});

test("дуэль: у фракций, не заседавших вместе, нет общих голосований и нет выдуманных расхождений", () => {
  const yab = PC.partyById("yabloko"), er = PC.partyById("er");
  const r = PC.duel.compare(er, yab);
  assert.equal(r.agreement.common, 0);
  assert.equal(r.agreement.ratio, null);
  assert.equal(r.differ.length, 0);
});

test("приветствие не показывается по ссылке на дуэль", () => {
  const welcome = loadApp([...DEFAULT_FILES, "js/welcome.js"]).PC.welcome, V = PC.VERSION;
  for(const hash of ["#/duel/er-kprf", "#duel/kprf-er"]){
    assert.equal(welcome.decide({ hash, seen:null, version:V }), null, hash);
    assert.equal(welcome.decide({ hash, seen:"1.0", version:V }), null, hash);
  }
  assert.equal(welcome.decide({ hash:"#/votes", seen:null, version:V }), "lang");
});

/* ---------- 5.1: созыв, темы, сводка ---------- */
test("дуэль внутри одного созыва считает только его голосования", () => {
  const er = PC.partyById("er"), kprf = PC.partyById("kprf");
  const all = PC.duel.compare(er, kprf), c8 = PC.duel.compare(er, kprf, 8);
  assert.ok(c8.agreement.common > 0 && c8.agreement.common < all.agreement.common);
  assert.ok(c8.same.concat(c8.differ).every(r => r.vote.conv === 8));
  assert.equal(all.agreement.common, PC.voteAgreement(er, kprf).common);
});

test("совпадения по темам и по созывам складываются в общий итог", () => {
  const r = PC.duel.compare(PC.partyById("er"), PC.partyById("ldpr"));
  assert.deepEqual(Array.from(r.topics, x => x.id), ["econ", "state", "foreign"]);
  const sum = r.topics.reduce((n, x) => n + x.common, 0);
  assert.equal(sum, r.agreement.common);
  assert.equal(r.convs.reduce((n, x) => n + x.common, 0), r.agreement.common);
  for(const x of r.topics.concat(r.convs)) if(x.common) assert.ok(x.ratio >= 0 && x.ratio <= 1);
});

test("словесная сводка называет темы, а ссылка дуэли знает созыв", () => {
  const r = PC.duel.compare(PC.partyById("er"), PC.partyById("kprf"));
  assert.match(PC.duel.summary(r), /«[^»]+»/);
  const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  assert.ok(app.includes(String.raw`(?:\?c=(\d))?$`), "маршрут дуэли не принимает ?c=");
  assert.match(fs.readFileSync(path.join(ROOT, "js", "duel.js"), "utf8"), /"\?c=" \+ state\.c/);
});
