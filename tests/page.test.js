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
  assert.ok(at("charts.js") < at("coalition.js"), "песочница коалиций берёт формулы из charts.js");
  assert.ok(at("i18n.js") < at("coalition.js"));
  assert.equal(at("app.js"), scripts.length - 1, "app.js запускает всё — он последний");
  assert.ok(at("quiz-data.js") < at("quiz.js"));
  assert.ok(at("ui.js") < at("app.js"));
});

/* Узлы, которые скрипты ищут по id в готовой разметке. Динамически
   создаваемые экраны (тест, карточка партии, меню экспорта) сюда не
   входят: их id живут в том же файле, что и их разметка. */
const STATIC_IDS = [
  "app.js:q", "app.js:clearBtn", "app.js:convSelect", "app.js:trailBtn", "app.js:lead",
  "theme.js:themeSeg",
  "i18n.js:langSeg",
  "settings.js:setSheet", "settings.js:setScrim", "settings.js:settingsBtn",
  "settings.js:setClose", "settings.js:setReset", "settings.js:setTrails",
  "tooltip.js:tip", "tooltip.js:plot", "tooltip.js:svg",
  "compass.js:svg",
  "charts.js:stats", "charts.js:hemi", "charts.js:hemiLegend", "charts.js:trend",
  "charts.js:trendLegend", "charts.js:trendTable", "charts.js:spectrum",
  "charts.js:trendTableBtn", "charts.js:trendTableWrap",
  "charts.js:radarBox", "charts.js:radarPick", "charts.js:radarNote",
  "sidebar.js:sideBody", "sidebar.js:sideTitle", "sidebar.js:count",
  "export.js:exportWrap", "export.js:exportBtn", "export.js:exportMenu",
  "votes.js:votesHost", "votes.js:votesMatrix",
  "coalition.js:coalition", "coalition.js:coTogs", "coalition.js:coBar", "coalition.js:coSeats",
  "coalition.js:coTotal", "coalition.js:coVerdict", "coalition.js:coMetrics",
  "coalition.js:coReset", "coalition.js:coClear", "coalition.js:coReal",
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

/* Пути к картинкам живут в CSS и ничем не проверяются: опечатка в
   url() не ломает страницу, а просто оставляет фон пустым — заметить
   это можно только глазами и только в той теме, где картинка нужна. */
test("все картинки, на которые ссылается CSS и разметка, существуют", () => {
  const seen = new Set();
  for(const name of fs.readdirSync(path.join(ROOT, "css"))){
    const css = fs.readFileSync(path.join(ROOT, "css", name), "utf8");
    for(const m of css.matchAll(/url\(\s*["']?(\.\.\/[^"')]+)["']?\s*\)/g)){
      const rel = m[1].replace(/^\.\.\//, "");
      seen.add(rel);
      assert.ok(fs.existsSync(path.join(ROOT, rel)),
        `css/${name} ссылается на несуществующий ${rel}`);
    }
  }
  for(const m of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)){
    seen.add(m[1]);
    assert.ok(fs.existsSync(path.join(ROOT, m[1])),
      `index.html ссылается на несуществующий ${m[1]}`);
  }

  /* И обратная проверка: лежащий в репозитории, но никем не используемый
     файл — это либо забытый черновик, либо потерянная ссылка. */
  for(const name of fs.readdirSync(path.join(ROOT, "assets"))){
    const rel = "assets/" + name;
    assert.ok(seen.has(rel) || html.includes(rel),
      `${rel} лежит в репозитории, но нигде не используется`);
  }
});

test("у карточки «О проекте» свой фон в каждой теме", () => {
  const tokens = fs.readFileSync(path.join(ROOT, "css", "tokens.css"), "utf8");
  const dark = tokens.slice(tokens.indexOf(":root{"), tokens.indexOf(':root[data-theme="light"]'));
  const light = tokens.slice(tokens.indexOf(':root[data-theme="light"]'));
  for(const [name, block] of [["тёмная", dark], ["светлая", light]]){
    assert.match(block, /--hero-bg:\s*url\(/, `в ${name} тема не задаёт --hero-bg`);
    assert.match(block, /--hero-veil-a:/, `в ${name} тема не задаёт плотность вуали`);
  }
  assert.notEqual(
    /--hero-bg:\s*url\("([^"]+)"\)/.exec(dark)[1],
    /--hero-bg:\s*url\("([^"]+)"\)/.exec(light)[1],
    "у тем должны быть разные картинки, иначе разделять их незачем"
  );
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

test("манифест подключён, разбирается и ссылается на существующие иконки", () => {
  assert.match(html, /<link rel="manifest" href="manifest\.json">/);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  for(const field of ["name", "short_name", "start_url", "display", "theme_color", "background_color"]){
    assert.ok(manifest[field], `в манифесте нет ${field}`);
  }
  assert.ok(manifest.icons && manifest.icons.length, "в манифесте нет иконок");
  for(const icon of manifest.icons){
    assert.ok(fs.existsSync(path.join(ROOT, icon.src)), `иконка ${icon.src} не найдена`);
  }
});

test("лицензия одна и та же в LICENSE, package.json и разметке", () => {
  const license = fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.license, "CC-BY-4.0");
  assert.match(license, /Attribution 4\.0 International/);
  assert.match(license, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(html, /creativecommons\.org\/licenses\/by\/4\.0/);
});

test("CI гоняет тот же npm test, что и локально", () => {
  const ci = fs.readFileSync(path.join(ROOT, ".github", "workflows", "test.yml"), "utf8");
  assert.match(ci, /pull_request/);
  assert.match(ci, /npm test/);
});

/* Число голосований записано в трёх местах сразу: в данных, в словаре
   и в русском тексте разметки, который виден без JavaScript и
   поисковику. В 1.5 они разошлись — разметка говорила «восемь», словарь
   «десять», а на ярлыке вкладки стояло 10. Теперь расхождение шумное. */
test("число голосований одно и то же в данных, словаре и разметке", () => {
  const { PC } = require("./harness.js").loadApp();
  const n = PC.VOTES.length;
  const norm = s => s.replace(/\s+/g, " ").trim();
  const fallback = (attr, key, tag) =>
    norm(html.match(new RegExp(attr + '="' + key.replace(/\./g, "\\.") + '">([\\s\\S]*?)</' + tag + ">"))[1]);

  assert.equal(fallback("data-i18n-html", "ft.data.l3", "li"), norm(PC.t("ft.data.l3")),
    "текст подвала в разметке отстал от словаря");
  assert.ok(PC.t("ft.data.l3").includes("<b>" + n + "</b>"), `в подвале не ${n} голосований`);
  for(const key of ["votes.lede", "ab.votes.p"]){
    assert.equal(fallback("data-i18n", key, "p"), norm(PC.t(key)), `${key}: разметка отстала от словаря`);
  }
  const badge = html.match(/id="tab-votes"[\s\S]*?class="tab-badge">(\d+)</);
  assert.equal(Number(badge[1]), n, "ярлык вкладки голосований не совпадает с числом голосований");
});

test("переключатель шкалы графика не цепляет чужие кнопки с тем же классом", () => {
  const charts = fs.readFileSync(path.join(ROOT, "js", "charts.js"), "utf8");
  assert.ok(!/querySelectorAll\("\.trend-mode"\)/.test(charts),
    "charts.js выбирает все .trend-mode — кнопки песочницы коалиций сломают шкалу графика");
});

test("голосования в наборе идут по порядку дат", () => {
  const { PC } = require("./harness.js").loadApp();
  /* Array.from — чтобы массив был из этого же контекста: массив из vm
     несёт чужой Array.prototype, и deepStrictEqual счёл бы его другим */
  const dates = Array.from(PC.VOTES, v => v.date);
  assert.deepEqual(dates, [...dates].sort(), "новое голосование вставлено не на своё место");
});

test("внешние ссылки открываются безопасно", () => {
  for(const m of html.matchAll(/<a[^>]+target="_blank"[^>]*>/g)){
    assert.match(m[0], /rel="[^"]*noopener/, `ссылка без noopener: ${m[0]}`);
  }
});
