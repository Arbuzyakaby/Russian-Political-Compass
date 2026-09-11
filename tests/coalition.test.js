/* Песочница коалиций: чистый расчёт без DOM. Главное требование —
   формулы общие с плитками палаты, поэтому при всех включённых
   фракциях центр тяжести и поляризация коалиции обязаны совпасть
   с палатой до последнего знака. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC } = loadApp();
const inDuma = c => PC.PARTIES.filter(p => PC.seatsAt(p, c) > 0);

test("пороги: простое большинство 226, две трети 300", () => {
  assert.equal(PC.coalition.majority(), 226);
  assert.equal(PC.coalition.supermajority(), 300);
});

test("все фракции созыва — это вся палата: метрики совпадают с плитками", () => {
  for(const conv of PC.CONVOCATIONS){
    const ids = inDuma(conv.id).map(p => p.id);
    const res = PC.coalition.evaluate(ids, conv.id);
    const house = PC.charts.houseMetrics(conv.id);
    const sum = inDuma(conv.id).reduce((s, p) => s + PC.seatsAt(p, conv.id), 0);
    assert.equal(res.seats, sum, `${conv.id}: мандаты коалиции не равны сумме фракций`);
    assert.ok(Math.abs(res.metrics.wx - house.wx) < 1e-9, `${conv.id}: центр по экономике`);
    assert.ok(Math.abs(res.metrics.wy - house.wy) < 1e-9, `${conv.id}: центр по государству`);
    assert.ok(Math.abs(res.metrics.polar - house.polar) < 1e-9, `${conv.id}: поляризация`);
    assert.equal(res.margin, res.seats - 226);
    assert.equal(res.majority, res.seats >= 226);
  }
});

test("коалиция из одной фракции держится на одном партнёре", () => {
  const c = PC.CURRENT_CONVOCATION;
  const top = inDuma(c).sort((a, b) => PC.seatsAt(b, c) - PC.seatsAt(a, c))[0];
  const res = PC.coalition.evaluate([top.id], c);
  assert.equal(res.seats, PC.seatsAt(top, c));
  assert.ok(Math.abs(res.metrics.enp - 1) < 1e-9, "индекс Лааксо — Таагеперы для одной фракции равен 1");
  assert.ok(Math.abs(res.metrics.polar) < 1e-9, "у одной фракции нет разброса");
  assert.ok(Math.abs(res.metrics.wx - top.x) < 1e-9, "центр коалиции из одной фракции — сама фракция");
});

test("пустая коалиция не даёт NaN и не проходит порог", () => {
  const res = PC.coalition.evaluate([], PC.CURRENT_CONVOCATION);
  assert.equal(res.seats, 0);
  assert.equal(res.majority, false);
  assert.equal(res.supermajority, false);
  for(const v of Object.values(res.metrics)) assert.ok(Number.isFinite(v));
});

test("чужие id и партии без мандатов в созыве отбрасываются", () => {
  const c = PC.CURRENT_CONVOCATION;
  const outside = PC.PARTIES.filter(p => !PC.seatsAt(p, c)).map(p => p.id);
  const res = PC.coalition.evaluate(["нет-такой", ...outside], c);
  assert.equal(res.members.length, 0);
  assert.equal(res.seats, 0);
});

test("больше участников — не меньше мандатов", () => {
  const c = PC.CURRENT_CONVOCATION;
  const ids = inDuma(c).map(p => p.id);
  let prev = -1;
  for(let i = 1; i <= ids.length; i++){
    const s = PC.coalition.evaluate(ids.slice(0, i), c).seats;
    assert.ok(s > prev);
    prev = s;
  }
});
