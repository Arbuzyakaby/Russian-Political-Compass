/* Связка разметки и скриптов. Проект собирается из отдельных файлов
   вручную, без сборщика: подключение нового модуля легко забыть, а
   переименованный id узла молча превращается в null. Эти проверки
   ловят именно такие расхождения — они дешевле, чем открывать браузер. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./harness.js");

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function refs(re){
  return Array.from(html.matchAll(re), m => m[1]).filter(v => !/^https?:|^data:/.test(v));
}
const styles = refs(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g);
const scripts = refs(/<script[^>]+src="([^"]+)"/g);

test("все подключённые файлы существуют", () => {
  for(const rel of [...styles, ...scripts]){
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `в index.html подключён несуществующий ${rel}`);
  }
});

test("ни один файл css и js не забыт в разметке", () => {
  for(const dir of ["css", "js"]){
    for(const name of fs.readdirSync(path.join(ROOT, dir))){
      const rel = dir + "/" + name;
      assert.ok([...styles, ...scripts].includes(rel), `файл ${rel} никуда не подключён`);
    }
  }
});

test("порядок скриптов: зависимости раньше потребителей", () => {
  const at = name => scripts.indexOf("js/" + name);
  assert.ok(html.indexOf('src="js/theme-boot.js"') < html.indexOf("</head>"),
    "тема применяется до отрисовки — скрипт обязан быть в <head>");
  assert.ok(at("data.js") < at("utils.js") || at("data.js") > -1);
  for(const dependent of ["compass.js", "charts.js", "quiz.js", "export.js", "votes.js", "app.js"]){
    assert.ok(at("data.js") < at(dependent), `data.js должен идти раньше ${dependent}`);
    assert.ok(at("utils.js") < at(dependent), `utils.js должен идти раньше ${dependent}`);
  }
  /* Словарь читается на этапе загрузки модулей: charts.js и export.js
     сохраняют PC.t в локальную переменную прямо в теле функции-обёртки,
     и подключённый позже i18n.js оставил бы их с undefined. */
  for(const dependent of ["charts.js", "quiz.js", "export.js", "votes.js", "radar.js",
                          "sidebar.js", "share.js", "app.js"]){
    assert.ok(at("i18n.js") < at(dependent), `i18n.js должен идти раньше ${dependent}`);
  }
  assert.ok(at("utils.js") < at("i18n.js"), "i18n.js опирается на PC.utils");
  assert.ok(at("radar.js") < at("charts.js"), "аналитика рисует радар");
  assert.equal(at("app.js"), scripts.length - 1, "app.js запускает всё — он последний");
  assert.ok(at("quiz-data.js") < at("quiz.js"));
  assert.ok(at("ui.js") < at("app.js"));
});

/* Узлы, которые скрипты ищут по id в готовой разметке. Динамически
   создаваемые экраны (тест, карточка партии, меню экспорта) сюда не
   входят: их id живут в том же файле, что и их разметка. */
const STATIC_IDS = [
  "app.js:q", "app.js:clearBtn", "app.js:convSelect", "app.js:trailBtn", "app.js:lead",
  "theme.js:themeBtn", "theme.js:themeIcon",
  "i18n.js:langBtn",
  "tooltip.js:tip", "tooltip.js:plot", "tooltip.js:svg",
  "compass.js:svg",
  "charts.js:stats", "charts.js:hemi", "charts.js:hemiLegend", "charts.js:trend",
  "charts.js:trendLegend", "charts.js:trendTable", "charts.js:spectrum",
  "charts.js:trendTableBtn", "charts.js:trendTableWrap",
  "charts.js:radarBox", "charts.js:radarPick", "charts.js:radarNote",
  "sidebar.js:sideBody", "sidebar.js:sideTitle", "sidebar.js:count",
  "export.js:exportWrap", "export.js:exportBtn", "export.js:exportMenu",
  "votes.js:votesHost", "votes.js:votesMatrix",
  "quiz.js:quiz"
];

test("все id, которые скрипты ищут в разметке, в ней есть", () => {
  const ids = new Set(Array.from(html.matchAll(/\sid="([^"]+)"/g), m => m[1]));
  for(const entry of STATIC_IDS){
    const [file, id] = entry.split(":");
    assert.ok(ids.has(id), `js/${file} обращается к #${id}, которого нет в index.html`);
    const src = fs.readFileSync(path.join(ROOT, "js", file), "utf8");
    assert.ok(src.includes('"' + id + '"'), `js/${file} больше не использует #${id} — список устарел`);
  }
});

test("слой движения подключается последним", () => {
  assert.equal(styles[styles.length - 1], "css/motion.css",
    "css/motion.css уточняет правила из других файлов и обязан идти после них");
});

test("структурированные данные разбираются и описывают то же, что страница", () => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, "нет блока JSON-LD");
  const ld = JSON.parse(m[1]);
  const types = ld["@graph"].map(n => n["@type"]);
  for(const type of ["WebSite", "WebApplication", "Dataset"]){
    assert.ok(types.includes(type), `в разметке нет сущности ${type}`);
  }
  for(const node of ld["@graph"]){
    assert.ok(String(node.license || "").includes("creativecommons"),
      "лицензия обязана совпадать с указанной в подвале") ;
  }
});

test("обе языковые версии объявлены для поисковика", () => {
  assert.match(html, /hreflang="ru"/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="x-default"/);
});

test("разметка: язык, кодировка, вьюпорт и описание на месте", () => {
  assert.match(html, /<html lang="ru">/);
  assert.match(html, /<meta charset="UTF-8">/i);
  assert.match(html, /name="viewport"/);
  assert.match(html, /name="description"/);
  assert.match(html, /name="theme-color"/);
  assert.match(html, /<main id="content"/, "нужен основной лендмарк для скринридеров");
  assert.match(html, /class="skip-link"/, "ссылка пропуска навигации");
});

test("вкладки и панели связаны атрибутами доступности", () => {
  for(const tab of ["compass", "quiz", "votes", "about"]){
    assert.ok(html.includes(`id="tab-${tab}"`), `нет кнопки вкладки ${tab}`);
    assert.ok(html.includes(`id="panel-${tab}"`), `нет панели ${tab}`);
    assert.ok(html.includes(`aria-controls="panel-${tab}"`), `вкладка ${tab} не связана с панелью`);
    assert.ok(html.includes(`aria-labelledby="tab-${tab}"`), `панель ${tab} не связана с вкладкой`);
  }
});

test("внешние ссылки открываются безопасно", () => {
  for(const m of html.matchAll(/<a[^>]+target="_blank"[^>]*>/g)){
    assert.match(m[0], /rel="[^"]*noopener/, `ссылка без noopener: ${m[0]}`);
  }
});
