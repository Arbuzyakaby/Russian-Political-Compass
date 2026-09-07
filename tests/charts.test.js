/* Аналитика: шаг сетки, раскладка мест в парламентской диаграмме
   и подгонка цвета партии под фон темы. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC, document } = loadApp();

test("niceScale: круглый шаг и максимум не ниже данных", () => {
  for(const max of [1, 7, 42, 57, 324, 450, 76.7]){
    const s = PC.charts.niceScale(max, 5);
    assert.ok(s.max >= max, `${max}: верх шкалы обрезал данные`);
    assert.ok(s.step > 0);
    const mantissa = s.step / Math.pow(10, Math.floor(Math.log10(s.step)));
    assert.ok([1, 2, 5, 10].some(v => Math.abs(mantissa - v) < 1e-9),
      `шаг ${s.step} не круглый`);
    assert.ok(Math.abs(s.max / s.step - Math.round(s.max / s.step)) < 1e-9,
      "максимум должен быть кратен шагу");
  }
  assert.deepEqual({ ...PC.charts.niceScale(0, 5) }, { max:1, step:1 },
    "пустой созыв не должен ломать ось");
});

test("hemiSeats: раздаёт ровно 450 мест и не роняет ряды", () => {
  for(const rows of [8, 11]){
    const res = PC.charts.hemiSeats(450, rows, 60, 130, 160, 150);
    assert.equal(res.pts.length, 450, `${rows} рядов: мест получилось не 450`);
    assert.ok(res.innerCount > 0);
    assert.ok(res.gap > 0);
    /* точки отсортированы слева направо по углу: первая — у левого края */
    assert.ok(res.pts[0].x < res.pts[res.pts.length - 1].x);
    for(const pt of res.pts){
      assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y));
      assert.ok(pt.y <= 150 + 1e-9, "места не должны уходить ниже основания дуги");
    }
  }
});

test("chartColor: тёмные цвета осветляются под тёмный фон", () => {
  document.documentElement.dataset.theme = "dark";
  const dark = PC.charts.chartColor("#8b1f3f");     /* бордовый «Коммунистов России» */
  const m = dark.match(/hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/);
  assert.ok(m, `неожиданный формат цвета: ${dark}`);
  assert.ok(Number(m[3]) >= 48, "на почти чёрном фоне светлота поднимается до порога");

  document.documentElement.dataset.theme = "light";
  const light = PC.charts.chartColor("#eab308");    /* жёлтый ЛДПР */
  const l = Number(light.match(/ ([\d.]+)%\)$/)[1]);
  assert.ok(l <= 55, "в светлой теме жёлтый ограничивается сверху, иначе выцветает");

  /* тон сохраняется: цвет партии остаётся узнаваемым */
  const hue = Number(PC.charts.chartColor("#dc2626").match(/hsl\(([\d.]+)/)[1]);
  assert.ok(hue < 20 || hue > 340, "красный должен остаться красным");
});
