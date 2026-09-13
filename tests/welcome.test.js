/* Приветственный экран. До 2.1.1 он «то появлялся, то нет, иногда
   по-английски»: язык угадывался по браузеру, а решение о показе было
   размазано по модулю. Теперь решение — чистая функция PC.welcome.decide,
   и её поведение проверяется здесь целиком, без браузера. Разметка
   шагов сверяется с тем, что ищет скрипт. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT } = require("./harness.js");

const FILES = ["js/data.js", "js/utils.js", "js/i18n.js", "js/welcome.js"];
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const src = fs.readFileSync(path.join(ROOT, "js", "welcome.js"), "utf8");

const { PC } = loadApp(FILES);
const decide = PC.welcome.decide;
const V = PC.VERSION;

test("первый заход начинается с выбора языка", () => {
  assert.equal(decide({ hash:"", seen:null, version:V }), "lang");
  assert.equal(decide({ hash:"#/quiz", seen:null, version:V }), "lang",
    "вкладка в адресе не должна отменять приветствие");
});

test("после перезагрузки на выбранном языке экран продолжает с приветствия", () => {
  assert.equal(decide({ hash:"", seen:null, version:V, resume:"hello" }), "hello");
});

test("просмотренное в этой версии не показывается, в прошлой — показывает изменения", () => {
  assert.equal(decide({ hash:"", seen:V, version:V }), null);
  assert.equal(decide({ hash:"", seen:"2.0", version:V }), "update");
});

test("по ссылке на результат экран не показывается никогда", () => {
  for(const hash of ["#/result/abc", "#result/abc"]){
    assert.equal(decide({ hash, seen:null, version:V }), null, hash);
    assert.equal(decide({ hash, seen:null, version:V, resume:"hello" }), null, hash);
  }
});

test("неизвестная метка возобновления не ломает решение", () => {
  assert.equal(decide({ hash:"", seen:null, version:V, resume:"garbage" }), "lang");
  assert.equal(decide(), "lang");
});

test("разметка содержит все шаги и узлы, которые ищет скрипт", () => {
  const ids = new Set(Array.from(html.matchAll(/\sid="([^"]+)"/g), m => m[1]));
  const wanted = Array.from(src.matchAll(/getElementById\("([^"]+)"\)/g), m => m[1]);
  assert.ok(wanted.length > 10, "скрипт подозрительно мало обращается к разметке");
  for(const id of wanted){
    assert.ok(ids.has(id), `js/welcome.js ищет #${id}, которого нет в index.html`);
  }
  for(const lang of PC.i18n.LANGS){
    assert.ok(html.includes(`data-lang="${lang}"`), `на шаге языка нет кнопки для ${lang}`);
  }
});

test("число сцен обучения совпадает в разметке, словаре и скрипте", () => {
  const scenes = (html.match(/class="wt-scene /g) || []).length;
  const dots = /id="welTourDots"[^>]*>((?:<i><\/i>)+)</.exec(html);
  const declared = Number(/var SCENES = (\d+)/.exec(src)[1]);
  assert.equal(scenes, declared, "сцен в разметке не столько, сколько объявлено в скрипте");
  assert.equal(dots[1].split("<i>").length - 1, declared, "точек прогресса не столько, сколько сцен");
  const en = loadApp(FILES, { "pc-lang":"en" }).PC;
  for(let n = 1; n <= declared; n++){
    for(const key of [`wel.t${n}.h`, `wel.t${n}.p`]){
      for(const [lang, app] of [["ru", PC], ["en", en]]){
        assert.notEqual(app.t(key), key, `${lang}: нет перевода ${key}`);
      }
    }
  }
  assert.notEqual(PC.t("wel.t.count", { n:1, total:4 }), "wel.t.count");
  assert.match(en.t("wel.t.count", { n:2, total:4 }), /2.*4/);
});

test("список изменений в разметке совпадает со словарём", () => {
  const norm = s => s.replace(/\s+/g, " ").trim();
  for(let n = 1; n <= 5; n++){
    const key = `wel.up.l${n}`;
    const m = new RegExp(`data-i18n="${key.replace(/\./g, "\\.")}">([\\s\\S]*?)</li>`).exec(html);
    assert.ok(m, `в разметке нет ${key}`);
    assert.equal(norm(m[1]), norm(PC.t(key)), `${key}: разметка отстала от словаря`);
  }
});

test("запуск приветствия не зависит от ошибок в остальных модулях", () => {
  const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  assert.match(app, /finally\s*\{\s*if\(PC\.welcome\)\s*PC\.welcome\.init\(\)/,
    "app.js обязан запускать приветствие и тогда, когда init() упал");
  assert.match(src, /function init\(\)\{\s*if\(el\) return;/,
    "повторный вызов welcome.init() обязан быть безопасным");
});
