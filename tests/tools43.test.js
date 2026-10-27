/* Выпуск 4.3: дуэль партий, «Голосую сам», работа без сети, иконки,
   пружинящий слой и единая версия. Проверяется настоящий код в песочнице
   harness.js, а разметка и стили — по исходникам. */
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

test("голосую сам: голоса как у фракции дают ей 100% и первое место", () => {
  const votes = {};
  for(const v of PC.VOTES){
    const s = PC.voteStance(v, PC.partyById("kprf"));
    if(s === "for" || s === "against" || s === "abstain") votes[v.id] = s;
  }
  assert.ok(Object.keys(votes).length >= 10, "у КПРФ должно быть много известных позиций");
  const rows = PC.selfVote.score(votes);
  assert.equal(rows[0].p.id, "kprf");
  assert.equal(rows[0].ratio, 1);
  assert.equal(rows[0].common, Object.keys(votes).length);
  for(let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].ratio >= rows[i].ratio, "рейтинг упорядочен по доле");
});

test("голосую сам: пустые ответы и голосования без известной позиции не дают процентов", () => {
  assert.equal(PC.selfVote.score({}).length, 0);
  const split = PC.VOTES.find(v => Object.values(v.pos).includes("split"));
  if(split){
    const id = Object.keys(split.pos).find(k => split.pos[k] === "split");
    const row = PC.selfVote.score({ [split.id]:"for" }).find(r => r.p.id === id);
    assert.equal(row, undefined, "«разделились» не считается ни совпадением, ни расхождением");
  }
  for(const r of PC.selfVote.score({ [PC.VOTES[0].id]:"for" })) assert.ok(r.common === 1);
});

test("голосую сам: проверка сохранённых ответов и резервная копия", () => {
  const ok = { v:1, votes:{ [PC.VOTES[0].id]:"for", [PC.VOTES[1].id]:"abstain" } };
  assert.equal(PC.selfVote.valid(ok), true);
  for(const bad of [null, [], { v:2, votes:{} }, { v:1, votes:[] }, { v:1, votes:{ "bad id":"for" } }, { v:1, votes:{ [PC.VOTES[0].id]:"split" } }])
    assert.equal(PC.selfVote.valid(bad), false, JSON.stringify(bad));
  /* законопроект, убранный из данных или пришедший из новой версии, не обнуляет остальные ответы */
  assert.equal(PC.selfVote.valid({ v:1, votes:{ "removed-bill":"for", [PC.VOTES[0].id]:"against" } }), true);
  const app = loadApp([...DEFAULT_FILES, "js/settings.js", "js/eggs.js", "js/backup.js", "js/tisza.js"]);
  app.storage.setItem("pc-selfvote", JSON.stringify(ok));
  const backup = app.PC.tisza.backup();
  assert.equal(backup.data["pc-selfvote"], JSON.stringify(ok));
  assert.equal(app.PC.tisza.validateBackup(backup), true);
  backup.data["pc-selfvote"] = JSON.stringify({ v:1, votes:{ evil:"maybe" } });
  assert.equal(app.PC.tisza.validateBackup(backup), false);
});

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
  const css = read("css/spring.css");
  const animated = new Set(Array.from(css.matchAll(/^\s*([^@{}\n][^{}\n]*)\{[^}]*animation:pc-/gm), m => m[1].trim()));
  const off = css.slice(css.indexOf(':root[data-motion="off"] .is-sprung'));
  const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce)"));
  for(const sel of [".is-sprung", ".pc-done", '.tab[aria-selected="true"] .tab-ico', ".panel-enter > *", ".party-step-body"]){
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
  assert.deepEqual(keys.filter(k => !/^(?:duel|sv|offline)\./.test(k)), []);
  const en = loadApp(undefined, { "pc-lang":"en" }).PC;
  for(const k of keys){
    assert.notEqual(en.t(k), k);
    assert.doesNotMatch(en.t(k, { a:"A", b:"B", d:"1", k:1, n:2, p:3, max:"28.3", axis:"x", party:"P" }), /[А-Яа-яЁё]/, k);
  }
  assert.ok(html.indexOf('src="js/i18n-tools.js"') < html.indexOf('src="js/duel.js"'), "словарь подключается раньше модулей");
});

test("новые модули подключены и инициализируются", () => {
  for(const f of ["js/spring.js", "js/duel.js", "js/selfvote.js", "js/offline.js"]) assert.ok(html.includes(`src="${f}"`), f);
  for(const f of ["css/icons.css", "css/spring.css", "css/tools.css"]) assert.ok(html.includes(`href="${f}"`), f);
  const app = read("js/app.js");
  for(const call of ["PC.spring.init()", "PC.selfVote.init()", "PC.offline.init()"]) assert.ok(app.includes(call), call);
  assert.match(read("js/palette.js"), /PC\.duel\.open\(\)/, "дуэль есть в командной палитре");
  assert.match(read("js/votes.js"), /PC\.duel\.open\(tr\.dataset\.row, cell\.dataset\.col\)/, "ячейка матрицы открывает дуэль пары");
});
