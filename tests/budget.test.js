/* Бюджет размера пакета (4.4). Проверяется собранная папка dist/ — после
   `npm run prepare:release`; без неё тест пропускается, а в чек-листе
   релиза (docs/RELEASING.md) сборка идёт раньше тестов. Лимиты — в КиБ
   (1 КиБ = 1024 байта), считаются по файлам на диске (до gzip):
     CSS первого экрана ≤ 300, JS (оболочка + основной пакет) ≤ 1000,
     index.html ≤ 125. Модули по требованию в сумму не входят: они
     загружаются, только когда понадобятся (js/lazy.js), но у каждого
     свой потолок, чтобы «по требованию» не стало свалкой. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./harness.js");

const DIST = path.join(ROOT, "dist");
const KIB = 1024;
const BUDGET = { css:300, js:1000, html:125, lazyJs:40, lazyCss:30 };
const size = file => fs.statSync(path.join(DIST, file)).size;
const built = fs.existsSync(path.join(DIST, "index.html"));

test("бюджет пакета: CSS, JS и index.html в пределах", { skip:!built && "нет dist/ — выполните npm run prepare:release" }, () => {
  const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(css\/[^"]+)"/g)].map(m => m[1]);
  const js = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]).filter(f => f !== "js/theme-boot.js");
  const shell = js.find(f => /^js\/shell\./.test(f));
  assert.ok(shell, "в dist/index.html нет оболочки js/shell.*");
  const site = fs.readFileSync(path.join(DIST, shell), "utf8").match(/js\/site\.[0-9a-f]+\.js/);
  assert.ok(site, "оболочка не ссылается на основной пакет js/site.*");
  const total = {
    css:css.reduce((n, f) => n + size(f), 0),
    js:size(shell) + size(site[0]),
    html:size("index.html")
  };
  for(const [kind, limit] of Object.entries({ css:BUDGET.css, js:BUDGET.js, html:BUDGET.html })){
    assert.ok(total[kind] <= limit * KIB, `${kind}: ${total[kind]} байт (${(total[kind] / KIB).toFixed(1)} КиБ) при бюджете ${limit} КиБ`);
  }
});

test("бюджет пакета: модули по требованию не выходят за свой потолок и не попадают на первый экран", { skip:!built && "нет dist/ — выполните npm run prepare:release" }, () => {
  const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  const lazy = JSON.parse(html.match(/<script type="application\/json" id="pcLazy">([\s\S]*?)<\/script>/)[1]);
  assert.ok(Object.keys(lazy).length >= 2);
  for(const [name, entry] of Object.entries(lazy)){
    assert.ok(fs.existsSync(path.join(DIST, entry.js)), `${name}: нет ${entry.js}`);
    assert.ok(size(entry.js) <= BUDGET.lazyJs * KIB, `${name}: ${entry.js} больше ${BUDGET.lazyJs} КиБ`);
    assert.ok(size(entry.css) <= BUDGET.lazyCss * KIB, `${name}: ${entry.css} больше ${BUDGET.lazyCss} КиБ`);
    assert.ok(!html.includes(`href="${entry.css}"`) && !html.includes(`src="${entry.js}"`), `${name}: подключён на первом экране`);
  }
});
