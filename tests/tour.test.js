/* ============ Обучение 5.1 (js/guide.js) ============
   Маршруты написаны селекторами, и переименование узла в вёрстке молча
   выбросило бы шаг из тура. Здесь проверяется, что каждая цель есть в
   разметке, у каждого шага есть текст на обоих языках, от старого тура
   не осталось ни файла, ни ключа, а прогресс живёт в pc-tour. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT } = require("./harness.js");

const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const html = read("index.html");
const src = read("js/guide.js");

function routes(){
  const out = {};
  for(const m of src.matchAll(/(quick|full): \[([\s\S]*?)\n    \]/g)){
    out[m[1]] = Array.from(m[2].matchAll(/\{ key:"(\w+)",\s*tab:(null|"\w+"),\s*sel:\[([^\]]+)\]/g), s => ({
      key:s[1], tab:s[2] === "null" ? null : s[2].slice(1, -1),
      sel:Array.from(s[3].matchAll(/"([^"]+)"/g), x => x[1])
    }));
  }
  return out;
}

test("два маршрута: быстрый старт из пяти шагов и полный тур из двенадцати", () => {
  const r = routes();
  assert.deepEqual(r.quick.map(s => s.key), ["field", "party", "quiz", "votes", "book"]);
  assert.equal(r.full.length, 12);
  for(const key of ["conv", "charts", "duel", "selfvote", "palette", "settings", "export"]){
    assert.ok(r.full.some(s => s.key === key), `в полном туре нет шага ${key}`);
  }
});

test("каждая цель шага есть в разметке", () => {
  for(const [name, list] of Object.entries(routes())){
    for(const step of list){
      const first = step.sel[0].split(/[\s:]/)[0];
      const needle = first.startsWith("#") ? ' id="' + first.slice(1) + '"' : 'class="' + first.slice(1);
      assert.ok(html.includes(needle), `${name}/${step.key}: в разметке нет ${first}`);
      if(step.tab) assert.ok(html.includes(`id="panel-${step.tab}"`), `${name}/${step.key}: нет вкладки ${step.tab}`);
    }
  }
});

test("у каждого шага есть заголовок и текст на обоих языках, английский без кириллицы", () => {
  const ru = loadApp().PC, en = loadApp(undefined, { "pc-lang":"en" }).PC;
  const keys = new Set();
  for(const list of Object.values(routes())) for(const s of list) keys.add(s.key);
  for(const key of keys){
    for(const part of ["h", "p"]){
      const k = `guide.${key}.${part}`;
      assert.notEqual(ru.t(k), k, `ru: нет ${k}`);
      assert.notEqual(en.t(k), k, `en: нет ${k}`);
      assert.doesNotMatch(en.t(k), /[А-Яа-яЁё]/, `en: кириллица в ${k}`);
      assert.notEqual(en.t(k), ru.t(k), `${k}: английский совпадает с русским`);
    }
  }
  assert.match(ru.t("guide.count", { n:2, total:5 }), /2.*5/);
  assert.match(en.t("guide.count", { n:2, total:5 }), /Step 2 of 5/);
});

test("от старого тура не осталось ни файла, ни ключа, ни кнопки", () => {
  assert.ok(!fs.existsSync(path.join(ROOT, "js", "tour.js")));
  assert.ok(!fs.existsSync(path.join(ROOT, "css", "tour.css")));
  assert.doesNotMatch(html, /id="welTour"|id="setTour"|css\/tour\.css|js\/tour\.js/);
  for(const file of fs.readdirSync(path.join(ROOT, "js")).filter(f => /^i18n-.*\.js$/.test(f))){
    assert.doesNotMatch(read("js/" + file), /"(?:tour\.|set\.tour|wel\.tour)[^"]*"\s*:/, `${file}: ключ старого тура`);
  }
  assert.match(html, /id="welGuide"/);
  assert.match(html, /id="setGuideQuick"/);
  assert.match(html, /id="setGuideFull"/);
  assert.match(html, /src="js\/guide\.js"/);
});

test("прогресс — в pc-tour; старые ключи стираются", () => {
  assert.match(src, /var KEY = "pc-tour";/);
  assert.match(src, /RETIRED = \[/);
  const { PC, window:w } = loadApp(["js/data.js", "js/utils.js", "js/i18n-shell.js", "js/i18n.js", "js/guide.js"],
    { "pc-tour":JSON.stringify({ mode:"full", at:7, run:true, done:{ quick:true } }) });
  const s = PC.guide.read();
  assert.deepEqual([s.mode, s.at, s.run, s.done.quick, s.done.full], ["full", 7, true, true, false]);
  w.localStorage.setItem("pc-tour", "{битый json");
  const broken = PC.guide.read();
  assert.deepEqual([broken.mode, broken.at, broken.run], ["quick", 0, false]);
});

test("тур доступен из настроек, палитры и окна обновления", () => {
  assert.match(read("js/palette.js"), /PC\.guide\.start\("quick"\)/);
  assert.match(read("js/palette.js"), /PC\.guide\.start\("full"\)/);
  assert.match(read("js/welcome.js"), /PC\.guide\.start\("quick"\)/);
  assert.match(read("js/welcome.js"), /wel\.up\.guide/);
});

test("доступность: диалог, живая область, клавиши и движение", () => {
  for(const needle of ['"aria-modal", "true"', '"aria-live", "polite"', '"Escape"', '"ArrowRight"', '"ArrowLeft"',
                       '"Tab"', "prefers-reduced-motion"]){
    assert.ok(src.includes(needle), `в js/guide.js нет ${needle}`);
  }
  const css = read("css/guide.css");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.is-sheet/);
  assert.match(css, /safe-area-inset-bottom/);
});
