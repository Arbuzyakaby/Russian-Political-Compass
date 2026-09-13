/* Расчётный слой (js/calc.js): чистые функции без DOM, общие для
   результата теста (js/quiz.js), карточки партии (js/sidebar.js) и
   песочницы коалиций (js/coalition.js). Проверяется не только сама
   арифметика, но и то, что три модуля действительно считают расстояние
   одной и той же функцией, а не тремя похожими копиями. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC } = loadApp();

test("distance: ноль для совпадающих точек, симметрична, теорема Пифагора", () => {
  const a = { x:0, y:0 }, b = { x:3, y:4 };
  assert.equal(PC.calc.distance(a, a), 0);
  assert.equal(PC.calc.distance(a, b), 5);
  assert.equal(PC.calc.distance(a, b), PC.calc.distance(b, a));
});

test("rankParties: отсортировано по возрастанию расстояния, себя можно исключить", () => {
  const p = PC.PARTIES[0];
  const ranked = PC.calc.rankParties(p, p.id);
  assert.equal(ranked.length, PC.PARTIES.length - 1);
  assert.ok(ranked.every(r => r.p.id !== p.id));
  for(let i = 1; i < ranked.length; i++) assert.ok(ranked[i].d >= ranked[i - 1].d);

  /* без excludeId точка отсчёта, если она тоже партия, попадает в список
     первой с расстоянием 0 */
  const withSelf = PC.calc.rankParties(p);
  assert.equal(withSelf.length, PC.PARTIES.length);
  assert.equal(withSelf[0].p.id, p.id);
  assert.equal(withSelf[0].d, 0);
});

test("subaxisDelta: b минус a по каждой из шести под-осей, в порядке SUBAXES", () => {
  const [a, b] = PC.PARTIES;
  const rows = PC.calc.subaxisDelta(a, b);
  assert.equal(rows.length, PC.SUBAXES.length);
  rows.forEach((r, i) => {
    assert.equal(r.axis, PC.SUBAXES[i]);
    assert.equal(r.a, a.sub[r.axis.id]);
    assert.equal(r.b, b.sub[r.axis.id]);
    assert.ok(Math.abs(r.delta - (r.b - r.a)) < 1e-9);
  });
});

test("connectorOf: null меньше чем при трёх участниках, иначе — минимум средней дистанции", () => {
  const some = PC.PARTIES.slice(0, 4);
  assert.equal(PC.calc.connectorOf([]), null);
  assert.equal(PC.calc.connectorOf(some.slice(0, 2)), null);

  const conn = PC.calc.connectorOf(some);
  assert.ok(conn);
  const byBrute = some
    .map(p => ({ p, avg:PC.calc.avgDistanceToOthers(p, some) }))
    .sort((x, y) => x.avg - y.avg)[0];
  assert.equal(conn.p.id, byBrute.p.id);
  assert.ok(Math.abs(conn.avg - byBrute.avg) < 1e-9);
});

test("quiz.js и sidebar.js используют один и тот же расчёт расстояния", () => {
  const pt = { x:1.5, y:-2 };
  const quizRank = PC.quiz.ranking(pt);
  const calcRank = PC.calc.rankParties(pt);
  assert.equal(quizRank.length, calcRank.length);
  quizRank.forEach((r, i) => {
    assert.equal(r.p.id, calcRank[i].p.id);
    assert.ok(Math.abs(r.d - calcRank[i].d) < 1e-9);
  });
});
