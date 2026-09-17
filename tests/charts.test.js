/* Аналитика: шаг сетки, раскладка мест в парламентской диаграмме
   и подгонка цвета партии под фон темы. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT } = require("./harness.js");

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

/* ============ ЭКСПОРТ КАРТИНКИ КОМПАСА ============
   Файл компаса не видит ни css/compass.css, ни темы на <html>, поэтому
   js/export.js перечисляет оформление поля ещё раз, подставляя значения
   переменных темы. Дублирование осознанное, но молчаливое: класс,
   добавленный в js/compass.js и забытый в exportCSS, ничего не ломает
   на экране и проявляется только в скачанном файле — то есть там, где
   его никто не увидит до жалобы. Сторож ниже сверяет два списка.

   С 2.4.1 это не гипотетический риск: поле переехало на стеклянную
   подложку, и вместе с ней появилось тринадцать новых классов разом. */
test("экспорт знает про все классы, которыми нарисовано поле компаса", () => {
  const compass = fs.readFileSync(path.join(ROOT, "js", "compass.js"), "utf8");
  const exporter = fs.readFileSync(path.join(ROOT, "js", "export.js"), "utf8");

  /* Берём только то, что рисует саму подложку: точки, подписи и
     состояния наведения экспорт либо уже описывает, либо намеренно
     скрывает, и сверять их построчно значило бы ловить ложные тревоги. */
  const BOARD = [
    "gs-plate-hi", "gs-plate-mid", "gs-plate-lo",
    "gs-rim-hi", "gs-rim-mid", "gs-rim-lo",
    "gs-sheen-a", "gs-sheen-b", "gs-sheen-c",
    "quad", "lens-rim", "frame", "frame-inner",
    "grid-minor", "grid-major", "axis", "origin", "tick",
    "axis-cap", "quad-cap", "trail-casing", "trail-seg", "trail-dot", "tag-leader"
  ];
  for(const cls of BOARD){
    assert.ok(compass.includes('"' + cls + '"') || compass.includes("class:\"" + cls + "\"") ||
              compass.includes(cls),
      `класс ${cls} больше не рисуется в js/compass.js — список в тесте устарел`);
    assert.ok(exporter.includes("." + cls + "{"),
      `js/export.js не описывает .${cls}: в скачанном файле поле будет выглядеть иначе, чем на экране`);
  }
});
