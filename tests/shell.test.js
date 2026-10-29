/* Оболочка страницы: иконки, пружины, работа без сети, загрузка по
   требованию, обучение, проверка шрифтов, пасхалки к номеру версии,
   переводы подписей в разметке. До 5.0 — tests/tools43.test.js,
   tests/tools44.test.js и tests/tisa.test.js. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT, DEFAULT_FILES } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const html = read("index.html");
const { PC } = loadApp();

test("иконки: каждый значок из разметки и скриптов есть в спрайте, спрайт собран из Lucide", () => {
  const sprite = new Set(Array.from(html.matchAll(/<symbol id="i-([\w-]+)"/g), m => m[1]));
  assert.ok(sprite.size >= 25, `в спрайте ${sprite.size} значков`);
  const used = new Set(Array.from(html.matchAll(/<use href="#i-([\w-]+)"/g), m => m[1]));
  for(const name of fs.readdirSync(path.join(ROOT, "js")))
    for(const m of read("js/" + name).matchAll(/PC\.icon\("([\w-]+)"/g)) used.add(m[1]);
  for(const name of used) assert.ok(sprite.has(name), `значка i-${name} нет в спрайте`);
  assert.match(html, /<!-- icons:start[^>]*Lucide/);
  assert.match(read("assets/icons/LICENSE"), /ISC License/);
  assert.match(read("package.json"), /"lucide-static": "\d+\.\d+\.\d+"/, "версия набора закреплена точно");
});

test("иконки: старые встроенные значки заменены, остались только иллюстрации", () => {
  const inline = Array.from(html.matchAll(/<svg(?![^>]*class="(?:ico|tab-ico ico|icon-sprite)")[^>]*>/g), m => m[0]);
  for(const tag of inline)
    assert.match(tag, /class="(?:compass|wel-grid|pvfp-lock|srpcf-wires)"/, "встроенный значок вне набора: " + tag.slice(0, 80));
  assert.ok(!/>\s*[✕×]\s*<\/button>/.test(html), "крестик-символ вместо значка закрытия");
  for(const css of fs.readdirSync(path.join(ROOT, "css"))){
    const text = read("css/" + css);
    const embedded = (text.match(/url\("data:image\/svg/g) || []).length;
    /* единственное исключение — шумовая текстура фона: это фильтр, а не значок */
    assert.equal(embedded, css === "base.css" ? 1 : 0, `css/${css}: встроенных SVG ${embedded}`);
  }
});

test("пружины: каждое движение снимается и настройкой, и системным уменьшением движения", () => {
  /* пружины с 5.0 — последний раздел css/motion.css */
  const all = read("css/motion.css");
  const css = all.slice(all.indexOf("Пружины и отклик"));
  const animated = new Set(Array.from(css.matchAll(/^\s*([^@{}\n][^{}\n]*)\{[^}]*animation:pc-/gm), m => m[1].trim()));
  const off = css.slice(css.indexOf(':root[data-motion="off"] .is-sprung'));
  const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce)"));
  for(const sel of [".is-sprung", ".pc-done", '.tab[aria-selected="true"] .tab-ico', ".panel-enter > *"]){
    assert.ok([...animated].some(a => a.includes(sel)), `${sel}: нет анимации`);
    assert.ok(off.includes(sel), `${sel}: не снимается при data-motion="off"`);
    assert.ok(reduce.includes(sel), `${sel}: не снимается при prefers-reduced-motion`);
  }
  assert.match(css, /:root\[data-bounce="off"\]/, "у настройки «Пружинящие анимации» нет правила");
  assert.match(read("js/spring.js"), /pointercancel/, "прерванный жест должен сбрасывать пружину");
  assert.ok(!/\bfill-mode:\s*both|backwards;\}[\s\S]*?translate/.test(""));
  assert.doesNotMatch(css, /pc-rise[^;]*\bboth\b/, "translate после подскока должен возвращаться к none");
});

test("работа без сети: работник только в пакете, на https и со всеми файлами сборки", () => {
  const offline = read("js/offline.js");
  assert.match(offline, /dataset\.build === "dist"/);
  assert.match(offline, /location\.protocol === "https:"/);
  const tpl = read("scripts/sw-template.js");
  assert.match(tpl, /__CACHE__/); assert.match(tpl, /__FILES__/);
  assert.match(tpl, /req\.method !== "GET" \|\| new URL\(req\.url\)\.origin !== location\.origin/, "чужие адреса работник не трогает");
  const build = read("scripts/prepare-release.cjs");
  assert.match(build, /data-build="dist"/);
  assert.match(build, /sw-template\.js/);
  assert.ok(!fs.existsSync(path.join(ROOT, "sw.js")), "sw.js в корне исходников подменил бы проверку сборки");
});

test("каждая русская подпись атрибутом в разметке переводится на английский", () => {
  const BILINGUAL = ["Язык · Language"];
  const missing = [];
  for(const tag of html.match(/<[a-z][^>]*>/gis)){
    const map = (tag.match(/data-i18n-attr="([^"]*)"/) || [])[1] || "";
    for(const attr of ["aria-label", "title", "placeholder", "alt"]){
      const m = tag.match(new RegExp(`\s${attr}="([^"]*)"`));
      if(m && /[А-Яа-яЁё]/.test(m[1]) && !BILINGUAL.includes(m[1]) && !map.includes(attr + ":")) missing.push(attr + ": " + m[1]);
    }
  }
  assert.deepEqual(missing, []);
});

test("словарь инструментов 4.3 держит только свои ключи и переведён полностью", () => {
  const own = read("js/i18n-tools.js");
  const keys = Array.from(own.matchAll(/^\s{4}"([\w.+-]+)":\s*\[/gm), m => m[1]);
  assert.ok(keys.length >= 30);
  assert.deepEqual(keys.filter(k => !/^(?:duel|sv|offline|lazy)\./.test(k)), []);
  const en = loadApp(undefined, { "pc-lang":"en" }).PC;
  for(const k of keys){
    assert.notEqual(en.t(k), k);
    assert.doesNotMatch(en.t(k, { a:"A", b:"B", d:"1", k:1, n:2, p:3, max:"28.3", axis:"x", party:"P" }), /[А-Яа-яЁё]/, k);
  }
  assert.ok(html.includes('src="js/i18n-tools.js"') && !html.includes('src="js/duel.js"'), "словарь в основном пакете, дуэль — по требованию");
});

test("новые модули подключены и инициализируются", () => {
  for(const f of ["js/spring.js", "js/lazy.js", "js/offline.js"]) assert.ok(html.includes(`src="${f}"`), f);
  /* дуэль, «Голосую сам» и их стили с 4.4 подгружаются по требованию */
  for(const f of ["js/duel.js", "js/selfvote.js", "css/tools.css"]) assert.ok(html.includes(`"${f}"`) && !html.includes(`src="${f}"`) && !html.includes(`href="${f}"`), f);
  const app = read("js/app.js");
  for(const call of ["PC.spring.init()", "PC.selfVote.init()", "PC.offline.init()"]) assert.ok(app.includes(call), call);
  assert.match(read("js/palette.js"), /PC\.duel\.open\(\)/, "дуэль есть в командной палитре");
  assert.match(read("js/votes.js"), /PC\.duel\.open\(tr\.dataset\.row, cell\.dataset\.col\)/, "ячейка матрицы открывает дуэль пары");
});

test("загрузка по требованию: перечень в разметке, файлы на месте, на первом экране их нет", () => {
  const lazy = JSON.parse(html.match(/<script type="application\/json" id="pcLazy">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(Object.keys(lazy).sort(), ["duel", "selfvote"]);
  for(const [name, entry] of Object.entries(lazy)){
    for(const f of [entry.js, entry.css]){
      assert.ok(fs.existsSync(path.join(ROOT, f)), `${name}: нет ${f}`);
      assert.ok(!html.includes(`src="${f}"`) && !html.includes(`href="${f}"`), `${name}: ${f} подключён на первом экране`);
    }
  }
  assert.ok(html.indexOf('src="js/lazy.js"') > 0 && html.indexOf('src="js/lazy.js"') < html.indexOf('src="js/app.js"'), "lazy.js подключён до app.js");
  /* кнопки дуэли и палитра ходят через PC.lazy.run, а не через PC.duel напрямую */
  for(const [file, needle] of [["js/app.js", 'PC.lazy.run("duel"'], ["js/sidebar.js", 'PC.lazy.run("duel"'],
    ["js/votes.js", 'PC.lazy.run("duel"'], ["js/palette.js", 'PC.lazy.run("duel"'], ["js/palette.js", "PC.loadSelfVote()"]])
    assert.ok(read(file).includes(needle), `${file}: ${needle}`);
});

test("обучение: число шагов в настройках совпадает с маршрутом, новые шаги переведены", () => {
  const tour = read("js/tour.js");
  const steps = Array.from(tour.matchAll(/\{ key:"(\w+)",\s*tab:"(\w+)",\s*sel:"([^"]+)"/g), m => ({ key:m[1], tab:m[2], sel:m[3] }));
  const words = { 10:["Десять", "Ten"], 11:["Одиннадцать", "Eleven"], 12:["Двенадцать", "Twelve"], 13:["Тринадцать", "Thirteen"], 14:["Четырнадцать", "Fourteen"] };
  assert.ok(words[steps.length], `нет слова для ${steps.length} шагов`);
  const en = loadApp(undefined, { "pc-lang":"en" }).PC;
  assert.ok(PC.t("set.tour.d").startsWith(words[steps.length][0] + " шагов"), PC.t("set.tour.d"));
  assert.ok(en.t("set.tour.d").startsWith(words[steps.length][1] + " steps"), en.t("set.tour.d"));
  for(const key of ["duel", "sv"]){
    const step = steps.find(s => s.key === key);
    assert.ok(step && step.tab === "votes", `шаг ${key} на вкладке голосований`);
    assert.ok(html.includes(`id="${step.sel.slice(1)}"`), step.sel);
    for(const app of [PC, en]) for(const part of ["h", "p"]) assert.notEqual(app.t(`tour.${key}.${part}`), `tour.${key}.${part}`);
  }
  assert.doesNotMatch(en.t("tour.duel.p") + en.t("tour.sv.p"), /[А-Яа-яЁё]/);
  assert.ok(steps.at(-1).key === "settings" && steps.at(-1).tab === "any", "последний шаг — настройки, не привязаны к вкладке");
});

test("check:fonts: команда, эталон и состав проверки", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["check:fonts"], "node scripts/check-fonts.cjs");
  const base = JSON.parse(read("docs/check-fonts-4.4.json"));
  assert.equal(base.width, 320);
  assert.equal(base.textScale, 2);
  const keys = ["en", "ru"].flatMap(l => ["about", "compass", "quiz", "votes"].map(t => `${l}/${t}`)).sort();
  for(const engine of ["chromium", "webkit"]){
    assert.deepEqual(Object.keys(base.widths[engine]).sort(), keys, engine);
    for(const w of Object.values(base.widths[engine])) assert.ok(w >= 320 && w <= 330, `ширина ${w}`);
  }
  const script = read("scripts/check-fonts.cjs");
  for(const needle of ["Verdana", '"--text-k", "2"', "width:WIDTH", "--write"]) assert.ok(script.includes(needle), needle);
});

test("мелочи 4.4: плашка без сети, подскок выбора партий снят", () => {
  const offline = read("js/offline.js");
  assert.ok(offline.includes('"offline"') && offline.includes('"online"') && offline.includes("navigator.onLine"));
  assert.ok(/\.offline-bar\{[^}]*position:fixed/.test(read("css/ui.css")));
  assert.doesNotMatch(read("css/motion.css"), /\.duel-pick/, "выбор партий в дуэли не подпрыгивает при наведении");
  /* живые области обновляются только при смене текста */
  const sv = read("js/selfvote.js");
  assert.ok(sv.includes("count.textContent !== countText") && sv.includes("res.dataset.html !== html"));
});

test("пасхалки 4.4: «4.4» в поиске и команда 444 в терминале учтены в списке", () => {
  const eggs = loadApp([...DEFAULT_FILES, "js/settings.js", "js/eggs.js"]).PC.eggs;
  assert.ok(eggs.IDS.includes("44") && eggs.IDS.includes("444"));
  assert.equal(new Set(eggs.IDS).size, eggs.IDS.length);
  const en = loadApp(undefined, { "pc-lang":"en" }).PC;
  for(const key of ["eggs.v44", "eggs.v444"]){
    assert.notEqual(PC.t(key), key); assert.notEqual(en.t(key), key);
    assert.doesNotMatch(en.t(key), /[А-Яа-яЁё]/, key);
  }
});

test("strict result links reject inserted, prefixed and suffixed characters",()=>{const{PC}=loadApp();const src={};PC.quiz.questionsFor("short").forEach(q=>src[q.id]=1);const code=PC.quiz.encodeAnswers(src,"short");assert.ok(PC.quiz.decodeAnswers(code));for(const bad of [code+"!",code.slice(0,10)+"?"+code.slice(10),code+"a","3"+"a".repeat(500)])assert.equal(PC.quiz.decodeAnswers(bad),null);});

test("SRPC handles use the edge gap and stay between separated cards",()=>{const{PC}=loadApp(["js/data.js","js/utils.js","js/srpc.js"]);const a={offsetLeft:0,offsetTop:0,offsetWidth:240,offsetHeight:180},b={...a,offsetLeft:264};let p=PC.srpc.anchors(a,b);assert.equal(p.h,12);assert.ok(p.x1+p.h<=p.x2);assert.ok(p.x2-p.h>=p.x1);b.offsetLeft=0;b.offsetTop=204;p=PC.srpc.anchors(a,b);assert.equal(p.v,12);assert.ok(p.y1+p.v<=p.y2);});
