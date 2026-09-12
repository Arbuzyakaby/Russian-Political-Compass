/* Темы оформления. Тем шесть, и знание о них разложено по трём местам:
   таблица светлот в js/theme-boot.js (он выполняется синхронно в <head>
   и обязан быть самодостаточным), такая же таблица в js/theme.js вместе
   со списком для меню, и блоки токенов в css/tokens.css.

   Разойтись они могут тихо: забытая в css тема просто покажется тёмной,
   забытая в theme-boot даст вспышку чужого фона на загрузке, а тема без
   подписи в словаре встанет в меню ключом вида "set.theme.paper".
   Поэтому проверяется не «темы есть», а совпадение всех трёх списков. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT } = require("./harness.js");

const boot = fs.readFileSync(path.join(ROOT, "js", "theme-boot.js"), "utf8");
const themeJs = fs.readFileSync(path.join(ROOT, "js", "theme.js"), "utf8");
const tokens = fs.readFileSync(path.join(ROOT, "css", "tokens.css"), "utf8");

/* Таблица имя -> светлота, выдернутая из исходника: оба файла объявляют
   её литералом вида `paper:"light"`, и разбирать её регулярным
   выражением честнее, чем исполнять файл ради одного объекта. */
function schemeTable(src){
  const block = /SCHEME\s*=\s*\{([\s\S]*?)\}/.exec(src);
  assert.ok(block, "в файле нет таблицы SCHEME");
  const out = {};
  for(const m of block[1].matchAll(/(\w+)\s*:\s*"(light|dark)"/g)) out[m[1]] = m[2];
  return out;
}

const bootScheme = schemeTable(boot);
const themeScheme = schemeTable(themeJs);

/* Имена тем, у которых в css/tokens.css есть свой блок. Тёмная тема
   блока не имеет намеренно: она и есть значения по умолчанию в :root. */
const CSS_THEMES = new Set(
  Array.from(tokens.matchAll(/:root\[data-theme="(\w+)"\]/g), m => m[1])
);

test("таблица светлот одинакова в theme-boot.js и theme.js", () => {
  assert.ok(Object.keys(bootScheme).length >= 6, "тем подозрительно мало");
  assert.deepEqual({ ...bootScheme }, { ...themeScheme },
    "таблицы разошлись: на загрузке и при переключении тема получит разную светлоту");
});

test("у каждой темы, кроме тёмной, есть блок токенов", () => {
  for(const name of Object.keys(bootScheme)){
    if(name === "dark") continue;
    assert.ok(CSS_THEMES.has(name),
      `тема ${name} объявлена в скриптах, но в css/tokens.css её нет — она покажется тёмной`);
  }
  for(const name of CSS_THEMES){
    assert.ok(name in bootScheme,
      `в css/tokens.css есть тема ${name}, но скрипты о ней не знают — выбрать её нельзя`);
  }
});

/* Токены, без которых тема ломается заметно: подложка, цвет текста,
   акцент, фон карточки «О проекте» и параметры стекла. Наследование
   от :root спасло бы от пустого экрана, но дало бы тёмный акцент на
   светлой подложке — то есть молчаливую ошибку вместо громкой. */
const REQUIRED = ["--bg", "--bg-deep", "--text", "--body", "--muted",
                  "--accent", "--accent-2", "--accent-ink",
                  "--glass-bg", "--glass-bg-2", "--glass-stroke", "--glass-edge",
                  "--hero-bg", "--hero-veil-a", "--hero-veil-b",
                  "--chart-surface", "--tip-bg", "--shadow"];

test("каждая тема задаёт полный набор ключевых токенов", () => {
  const blocks = {};
  /* :root{...} — тёмная тема; остальные помечены именем в скобках */
  const dark = tokens.slice(tokens.indexOf(":root{"), tokens.indexOf(':root[data-theme="light"]'));
  blocks.dark = dark;
  for(const name of CSS_THEMES){
    const start = tokens.indexOf(`:root[data-theme="${name}"]`);
    const rest = tokens.slice(start);
    const end = rest.indexOf("}");
    blocks[name] = rest.slice(0, end);
  }
  for(const [name, block] of Object.entries(blocks)){
    for(const token of REQUIRED){
      assert.ok(block.includes(token + ":"),
        `тема ${name} не задаёт ${token} — он унаследуется от тёмной и будет не к месту`);
    }
  }
});

test("названия тем переведены на оба языка", () => {
  const ru = loadApp().PC;
  const en = loadApp(undefined, { "pc-lang": "en" }).PC;
  for(const name of Object.keys(bootScheme).concat(["system"])){
    const key = "set.theme." + name;
    for(const [lang, PC] of [["ru", ru], ["en", en]]){
      assert.notEqual(PC.t(key), key, `${lang}: у темы ${name} нет подписи (${key})`);
    }
  }
});

test("список тем в меню совпадает с таблицей светлот", () => {
  const listed = Array.from(
    /var THEMES = \[([\s\S]*?)\];/.exec(themeJs)[1].matchAll(/id:"(\w+)"/g),
    m => m[1]
  );
  assert.equal(listed[0], "system", "системный режим обязан стоять первым");
  const themes = listed.slice(1).sort();
  assert.deepEqual(themes, Object.keys(themeScheme).sort(),
    "в меню показывается не тот набор тем, который умеет применять модуль");
});

/* Цвет строки браузера на мобильных подменяется скриптом при каждом
   переключении: два <meta> с медиазапросами в разметке обслуживают
   только системный режим, и без подмены панель осталась бы белой над
   «неоном». Тема без записи в таблице получила бы чужой цвет. */
test("у каждой темы есть цвет строки браузера", () => {
  const bar = /var BAR = \{([\s\S]*?)\};/.exec(themeJs);
  assert.ok(bar, "в theme.js нет таблицы цветов строки браузера");
  const names = Array.from(bar[1].matchAll(/(\w+)\s*:\s*"#[0-9a-f]{6}"/gi), m => m[1]);
  assert.deepEqual(names.sort(), Object.keys(themeScheme).sort());
});
