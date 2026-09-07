/* Утилиты: форматирование чисел, русские окончания, экранирование,
   геометрия компаса и безопасная обёртка над localStorage. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC, storage } = loadApp();
const U = PC.utils, G = PC.geom;

test("fmt: знак всегда явный, один знак после запятой", () => {
  assert.equal(U.fmt(3.2), "+3.2");
  assert.equal(U.fmt(-8), "-8.0");
  assert.equal(U.fmt(0), "0.0");
  /* знак ставится по округлённому значению: показанный ноль не бывает
     ни «+0.0», ни «−0.0» */
  assert.equal(U.fmt(0.04), "0.0");
  assert.equal(U.fmt(-0.04), "0.0");
  assert.equal(U.fmt(-0.06), "-0.1");
});

test("plural и seatsLabel: русский счёт мандатов", () => {
  assert.equal(U.plural(1), "");
  assert.equal(U.plural(2), "а");
  assert.equal(U.plural(5), "ов");
  assert.equal(U.plural(11), "ов", "одиннадцать — исключение");
  assert.equal(U.plural(21), "");
  assert.equal(U.plural(112), "ов");
  assert.equal(U.plural(324), "а");
  assert.equal(U.seatsLabel(0), "нет мандатов");
  assert.equal(U.seatsLabel(57), "57 мандатов");
  assert.equal(U.seatsLabel(1), "1 мандат");
});

test("word: общий склонятель по трём формам", () => {
  const forms = ["утверждение", "утверждения", "утверждений"];
  assert.equal(U.word(1, forms), "утверждение");
  assert.equal(U.word(3, forms), "утверждения");
  assert.equal(U.word(40, forms), "утверждений");
  assert.equal(U.word(11, forms), "утверждений");
});

test("clamp: удерживает значение в границах", () => {
  assert.equal(U.clamp(15, -10, 10), 10);
  assert.equal(U.clamp(-15, -10, 10), -10);
  assert.equal(U.clamp(3, -10, 10), 3);
});

test("esc: закрывает все пять опасных символов", () => {
  assert.equal(U.esc('<b>"он" & \'она\'</b>'),
    "&lt;b&gt;&quot;он&quot; &amp; &#39;она&#39;&lt;/b&gt;");
  assert.equal(U.esc(5), "5", "число тоже должно пройти через esc без падения");
});

test("геометрия компаса: центр, полюса и радиус точки", () => {
  const c = G.px(0, 0);
  assert.equal(c.sx, G.C);
  assert.equal(c.sy, G.C);

  /* ось Y направлена вниз, поэтому +10 по шкале — это верх поля */
  assert.equal(G.px(10, 10).sx, G.SIZE - G.PAD);
  assert.equal(G.px(10, 10).sy, G.PAD);
  assert.equal(G.px(-10, -10).sx, G.PAD);
  assert.equal(G.px(-10, -10).sy, G.SIZE - G.PAD);

  assert.ok(G.radius(0) < G.radius(57), "радиус растёт с числом мандатов");
  assert.ok(G.radius(450) - G.radius(324) < 1, "и упирается в потолок");
  assert.equal(G.radius(undefined), G.radius(0), "отсутствие мандатов — не NaN");
});

test("store: читает, пишет и не падает на сломанном JSON", () => {
  assert.equal(PC.store.get("нет-ключа", "по умолчанию"), "по умолчанию");
  PC.store.set("ключ", "значение");
  assert.equal(PC.store.get("ключ"), "значение");

  PC.store.setJSON("объект", { a:1 });
  assert.deepEqual(PC.store.getJSON("объект", null), { a:1 });

  storage.setItem("битый", "{не json");
  assert.equal(PC.store.getJSON("битый", "запасное"), "запасное");

  PC.store.remove("ключ");
  assert.equal(PC.store.get("ключ", null), null);
});

test("store: исключение хранилища гасится, а не роняет страницу", () => {
  const { PC: app, storage: box } = loadApp();
  box.setItem = () => { throw new Error("QuotaExceededError"); };
  box.getItem = () => { throw new Error("SecurityError"); };
  assert.equal(app.store.set("k", "v"), false);
  assert.equal(app.store.get("k", "по умолчанию"), "по умолчанию");
});
