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
/* Модули по требованию (4.4) подключены не тегами, а перечнем #pcLazy */
const lazy = JSON.parse(html.match(/<script type="application\/json" id="pcLazy">([\s\S]*?)<\/script>/)[1]);
const lazyFiles = Object.values(lazy).flatMap(e => [e.js, e.css]).filter(Boolean);

test("все подключённые файлы существуют", () => {
  for(const rel of [...styles, ...scripts, ...lazyFiles]){
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `в index.html подключён несуществующий ${rel}`);
  }
});

test("ни один файл css и js не забыт в разметке", () => {
  for(const dir of ["css", "js"]){
    for(const name of fs.readdirSync(path.join(ROOT, dir))){
      const rel = dir + "/" + name;
      assert.ok([...styles, ...scripts, ...lazyFiles].includes(rel), `файл ${rel} никуда не подключён`);
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
  "app.js:q", "app.js:clearBtn", "app.js:convSelect", "app.js:claimBtn", "app.js:lead",
  "theme.js:themeSeg",
  "i18n.js:langSeg",
  "settings.js:setSheet", "settings.js:setScrim", "settings.js:settingsBtn",
  "settings.js:setClose", "settings.js:setReset",
  "tooltip.js:tip", "tooltip.js:plot", "tooltip.js:svg",
  "compass.js:svg",
  "charts.js:stats", "charts.js:hemi", "charts.js:hemiLegend", "charts.js:trend",
  "charts.js:trendLegend", "charts.js:trendTable", "charts.js:spectrum",
  "charts.js:trendTableBtn", "charts.js:trendTableWrap",
  "charts.js:radarBox", "charts.js:radarPick", "charts.js:radarNote",
  "sidebar.js:sideBody", "sidebar.js:sideTitle", "sidebar.js:count",
  "export.js:exportWrap", "export.js:exportBtn", "export.js:exportMenu",
  "votes.js:votesHost", "votes.js:votesMatrix",
  "coalition.js:coalition", "coalition.js:coTogs", "coalition.js:coPresets",
  "coalition.js:coBar", "coalition.js:coSeats",
  "coalition.js:coTotal", "coalition.js:coVerdict", "coalition.js:coMetrics",
  "coalition.js:coReset", "coalition.js:coClear", "coalition.js:coReal",
  "quiz.js:quiz",
  "people.js:personSheet", "people.js:personScrim", "people.js:personClose", "people.js:personBody",
  "ui.js:abHistory", "ui.js:abHistorySum",
  "about-quiz.js:abQuiz"
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

  /* Манифест — такая же точка ссылки, как разметка и стили: иконка
     на 512 пикселей нужна только при установке приложения, и ссылка
     на неё есть лишь здесь. Без этого файла проверка ниже объявила бы
     её забытой и потребовала удалить. */
  const manifest = fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8");
  for(const icon of JSON.parse(manifest).icons){
    seen.add(icon.src);
    assert.ok(fs.existsSync(path.join(ROOT, icon.src)),
      `manifest.json ссылается на несуществующий ${icon.src}`);
  }

  /* И обратная проверка: лежащий в репозитории, но никем не используемый
     файл — это либо забытый черновик, либо потерянная ссылка. */
  const files = fs.readdirSync(path.join(ROOT, "assets")).flatMap(name =>
    name === "icons" ? fs.readdirSync(path.join(ROOT, "assets", "icons")).filter(f => f !== "LICENSE").map(f => "icons/" + f) : [name]);
  assert.ok(fs.existsSync(path.join(ROOT, "assets", "icons", "LICENSE")), "у набора иконок нет файла лицензии");
  for(const name of files){
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

/* С 4.1 за мобильным слоем идёт оболочка приложения: нижняя панель
   вкладок и листы переопределяют раскладку из css/mobile.css. */
test("мобильные уточнения и оболочка приложения следуют за слоем движения", () => {
  assert.equal(styles[styles.length - 1], "css/app.css");
  assert.equal(styles[styles.length - 2], "css/mobile.css");
  assert.equal(styles[styles.length - 3], "css/spring.css");
  assert.equal(styles[styles.length - 4], "css/motion.css");
});

/* Стеклянный слой уточняет поверхности, объявленные компонентами,
   и делает это каскадом, а не специфичностью: встань он раньше —
   карточка осталась бы с прежней тенью, а панель настроек с прежним
   размытием, и выключатель «Стекло» перестал бы действовать на них. */
test("стекло подключается после компонентов и до слоя движения", () => {
  const glass = styles.indexOf("css/glass.css");
  assert.ok(glass > -1, "css/glass.css не подключён");
  assert.equal(glass, styles.indexOf("css/motion.css") - 1, "css/glass.css должен идти прямо перед css/motion.css");
  for(const name of ["css/layout.css", "css/ui.css", "css/settings.css", "css/coalition.css"]){
    assert.ok(styles.indexOf(name) < glass, `${name} обязан идти раньше css/glass.css`);
  }
});

/* Размытие и его кромка объявляются один раз — в css/glass.css и через
   переменные. Собственный backdrop-filter в файле компонента означает,
   что эта поверхность не выключается настройкой «Стекло»: до 2.0 их
   было пять, и каждая со своими числами. */
test("backdrop-filter объявлен только через переменную стекла", () => {
  for(const name of fs.readdirSync(path.join(ROOT, "css"))){
    if(name === "glass.css") continue;
    /* комментарии вырезаются: слово backdrop-filter встречается
       в пояснениях, и ловить его там — значит запретить о нём писать */
    const css = fs.readFileSync(path.join(ROOT, "css", name), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for(const m of css.matchAll(/backdrop-filter\s*:\s*([^;}]+)/g)){
      const value = m[1].trim();
      /* none разрешено: так размытие снимают — в печати и на карточке
         с фоновой картинкой, где оно ничего не даёт */
      if(/^none\b/.test(value)) continue;
      assert.match(value, /var\(--glass-/,
        `css/${name}: размытие задано мимо переменной стекла (${value})`);
    }
  }
});

/* Каждый ключ настроек становится атрибутом data-<ключ> на <html>,
   и на нём должно висеть хотя бы одно правило: настройка, которую
   не читает ни один селектор, — это переключатель, ничего не делающий.
   Тема и язык не в счёт: у них свои модули и свои ключи хранения. */
test("у каждой настройки есть правило, которое её читает", () => {
  const src = fs.readFileSync(path.join(ROOT, "js", "settings.js"), "utf8");
  const block = /var DEFAULTS = \{([\s\S]*?)\n  \};/.exec(src);
  assert.ok(block, "в js/settings.js не найден список настроек");
  const keys = Object.keys(require("./harness.js").loadApp(["js/data.js", "js/utils.js", "js/settings.js"]).PC.settings.DEFAULTS);
  assert.ok(keys.length >= 10, `настроек подозрительно мало: ${keys.length}`);

  const css = fs.readdirSync(path.join(ROOT, "css"))
    .map(n => fs.readFileSync(path.join(ROOT, "css", n), "utf8")).join("\n");
  const behavior = fs.readdirSync(path.join(ROOT,"js")).map(n => fs.readFileSync(path.join(ROOT,"js",n),"utf8")).join("\n");
  for(const key of keys){
    const attribute = key.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
    assert.ok(css.includes(`[data-${attribute}=`) || behavior.includes(`get("${key}")`) || behavior.includes(`.${key}`),
      `настройка «${key}» ничего не меняет: ни одно правило не читает data-${key}`);
  }

  /* И обратно: переключатель для каждой настройки обязан быть
     в разметке, иначе до неё нельзя добраться из интерфейса. */
  for(const key of keys){
    assert.ok(html.includes(`data-set-switch="${key}"`) || html.includes(`data-set-seg="${key}"`) || html.includes(`data-setting="${key}"`),
      `настройка «${key}» есть в коде, но её нет в панели настроек`);
  }
});

test("дополнительные настройки лежат в разметке и предлагают ровно допустимые значения", () => {
  const settings = require("./harness.js").loadApp(["js/data.js", "js/utils.js", "js/settings.js"]).PC.settings;
  const rows = [...html.matchAll(/<div class="set-row tisza-setting" data-setting="(\w+)">([\s\S]*?)<\/div>/g)];
  assert.ok(rows.length >= 15, `дополнительных строк в разметке: ${rows.length}`);
  for(const [, key, body] of rows){
    assert.ok(key in settings.DEFAULTS, `строка «${key}» не соответствует ни одной настройке`);
    assert.match(body, new RegExp(`<label class="set-name" for="setting-${key}" data-i18n="[\\w.]+">`), `у «${key}» нет переводимой подписи`);
    assert.match(body, new RegExp(`<select id="setting-${key}" data-native>`), `список «${key}» не помечен data-native`);
    const values = [...body.matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
    assert.ok(values.includes(settings.DEFAULTS[key]), `у «${key}» нет значения по умолчанию среди вариантов`);
    for(const v of values) assert.ok(settings.valid(key, v), `«${key}» предлагает недопустимое значение ${v}`);
    for(const [, text] of body.matchAll(/<option[^>]*>([^<]*)</g))
      assert.ok(!/^[a-z]+\.[\w.]+$/.test(text), `у «${key}» вместо подписи варианта ключ словаря: ${text}`);
  }
  assert.ok(!/createElement\("select"\)|node\("select"\)/.test(fs.readFileSync(path.join(ROOT, "js", "settings.js"), "utf8")),
    "js/settings.js снова строит списки скриптом");
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

test("единый canonical не выдаёт JS-перевод за отдельную HTML-страницу", () => {
  assert.match(html, /rel="canonical" href="https:\/\/rupolitcompass.website\/"/);
  assert.ok(!html.includes('hreflang="en"'));
  assert.match(html, /id="project-summary"/);
  assert.match(html, /data-i18n="seo.p1"/);
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
  for(const key of ["votes.lede.short", "ab.votes.p"]){
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

/* Номер версии живёт в пяти местах, и четыре из них — текст, который
   собирается вручную: строка в подвале, подсказка к ней, package.json и
   верхняя запись CHANGELOG. В выпуске 2.0.1 подвал остался на 2.0 и
   уехал в релиз, потому что проверять это было нечем. Теперь проверка
   есть.

   С 2.5 номеров два: машинный PC.VERSION («2.5») и человеческий
   PC.VERSION_LABEL («RPC 2.5»). Первый сравнивается с package.json —
   там приставке линии взяться неоткуда; второй стоит везде, где номер
   читает человек. Связь между ними проверяется отдельно: расходиться
   им нельзя, иначе подвал и сравнение версий начнут говорить разное. */
test("номер версии совпадает во всех местах, где он записан", () => {
  const { PC } = require("./harness.js").loadApp();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

  assert.ok(PC.VERSION_LABEL, "PC.VERSION_LABEL не объявлен");
  assert.ok(PC.VERSION_LABEL.includes(PC.VERSION),
    `человеческий номер «${PC.VERSION_LABEL}» не содержит машинного «${PC.VERSION}»`);

  assert.equal(pkg.version, PC.VERSION,
    `package.json объявляет ${pkg.version}, а код — ${PC.VERSION}`);

  const foot = html.match(/class="foot-version"[\s\S]*?>([^<]+)<\/span>/);
  assert.ok(foot, "в подвале не нашлась строка с номером версии");
  assert.equal(foot[1].trim(), PC.VERSION_LABEL,
    `в подвале «${foot[1].trim()}», а PC.VERSION_LABEL — «${PC.VERSION_LABEL}»`);

  /* С 3.0 у версии есть имя, и по-английски оно своё: английская
     подсказка обязана назвать номер и английское имя реки, а не
     русскую подпись — кириллицы в английских строках быть не должно. */
  const tips = PC.i18n.entry("foot.version.tip");
  assert.ok(tips[0].includes(PC.VERSION_LABEL),
    `подсказка к версии (ru) не упоминает ${PC.VERSION_LABEL}: ${tips[0]}`);
  assert.ok(tips[1].includes(PC.VERSION) && tips[1].includes(PC.VERSION_NAME.en),
    `подсказка к версии (en) не упоминает ${PC.VERSION} и ${PC.VERSION_NAME.en}: ${tips[1]}`);
  assert.equal(PC.versionLabel("en"), PC.VERSION + " “" + PC.VERSION_NAME.en + "”");
  assert.equal(PC.versionLabel("ru"), PC.VERSION_LABEL);

  const footTitle = html.match(/class="foot-version"[\s\S]*?title="([^"]+)"/);
  assert.ok(footTitle[1].includes(PC.VERSION_LABEL),
    `подсказка к версии в разметке не упоминает ${PC.VERSION_LABEL}`);

  const head = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8")
    .match(/^## \[([^\]]+)\]/m);
  assert.equal(head[1], PC.VERSION_LABEL,
    `верхняя запись CHANGELOG — ${head[1]}, а версия ${PC.VERSION_LABEL}`);
});

/* ---------- уроки генеральной ревизии 2.4.3 ----------
   Три правила, каждое из которых уже один раз сломалось молча: их
   нарушение не роняет ни одну страницу и не видно в разметке, но
   ломает интерфейс у той части читателей, которая до него доберётся. */

/* Настройка «Анимации: выкл» ставит всем анимациям длительность в одну
   тысячную секунды. Без сброса числа повторов бесконечная анимация от
   этого не останавливается, а начинает идти тысячу циклов в секунду:
   схема SRPC мигала всеми четырьмя состояниями сразу у человека,
   который анимации именно что выключил. */
test("выключенные анимации не остаются бесконечными", () => {
  const css = fs.readFileSync(path.join(ROOT, "css", "settings.css"), "utf8");
  const rule = css.match(/:root\[data-motion="off"\][^{]*\{([^}]*)\}/);
  assert.ok(rule, "не нашлось правило, выключающее анимации");
  assert.match(rule[1], /animation-iteration-count:\s*1\s*!important/,
    "правило гасит длительность, но не число повторов — бесконечные анимации останутся бесконечными");
});

/* На полноэкранном столе SRPC жест пальцем значит разное в зависимости
   от того, где он начался: по пустому месту — прокрутка холста, по
   карточке — перетаскивание. touch-action:none на всём столе (как было
   до 2.4.3) отнимает первое, а его отсутствие на карточке — второе. */
test("стол SRPC листается, а карточка с него перетаскивается", () => {
  const css = fs.readFileSync(path.join(ROOT, "css", "srpc.css"), "utf8");
  const board = css.match(/\.srpcf-board\{([^}]*)\}/);
  const card  = css.match(/\.srpcf-card\{([^}]*)\}/);
  assert.ok(board && card, "не нашлись правила стола и карточки");
  assert.match(board[1], /overflow:\s*auto/, "стол обязан прокручиваться: холст больше экрана");
  assert.match(board[1], /touch-action:\s*pan/, "по пустому месту стола должен работать жест прокрутки");
  assert.match(card[1], /touch-action:\s*none/, "карточка обязана перехватывать жест у стола, иначе её не утащить пальцем");
});

/* Кнопка возврата к списку партий стоит в заголовке панели — он вне
   прокрутки и виден всегда. Пока она жила первой строкой самой карточки,
   выйти из середины карточки можно было только прокруткой наверх. */
test("возврат к списку партий живёт вне прокручиваемой части панели", () => {
  const head = html.match(/<div class="side-head">[\s\S]*?<\/div>/);
  assert.ok(head, "не нашлась шапка боковой панели");
  assert.match(head[0], /id="sideBack"/, "кнопка возврата обязана стоять в шапке панели");
  const js = fs.readFileSync(path.join(ROOT, "js", "sidebar.js"), "utf8");
  assert.ok(!/id="back"/.test(js),
    "в карточку вернулась вторая кнопка возврата — их снова две, и одна уезжает при прокрутке");
});

/* css/motion.css подключается последним и потому способен молча
   перебить любое свойство из файлов компонентов. Один раз это уже
   случилось: ради бегунка под активной вкладкой там стояло
   .tabs{position:relative}, и полоса вкладок перестала липнуть на всех
   экранах, а настройка «Липкие вкладки» — делать что-либо. Слой
   движения не должен позиционировать ничего, что позиционируют другие. */
test("слой движения не переопределяет положение липкой полосы вкладок", () => {
  const motion = fs.readFileSync(path.join(ROOT, "css", "motion.css"), "utf8");
  for(const rule of motion.matchAll(/(^|\})\s*([^{}@]*\.tabs[^{}]*)\{([^}]*)\}/g)){
    assert.ok(!/(^|;)\s*position\s*:/.test(rule[3]),
      `css/motion.css задаёт position для «${rule[2].trim()}» — он подключается последним и перебьёт sticky`);
  }
  const ui = fs.readFileSync(path.join(ROOT, "css", "ui.css"), "utf8");
  assert.match(ui, /\.tabs\{[^}]*position:\s*sticky/, "полоса вкладок обязана быть липкой");
});

/* ---------- раздел «О проекте» вырос (2.5) ----------
   Две новые карточки собираются скриптом из данных, а не лежат
   в разметке: и лента вех, и вопросы теста. Значит, ошибка в данных
   не роняет страницу — она просто печатает пустую строку, пустой
   вариант ответа или засчитывает неверный ответ верным. Всё, что
   ниже, ловит именно такие ошибки. */

const ABOUT_FILES = ["js/data.js", "js/data-history.js", "js/data-quiz-about.js",
  "js/utils.js",
  "js/i18n-shell.js", "js/i18n-compass.js", "js/i18n-quiz.js",
  "js/i18n-about.js", "js/i18n-misc.js", "js/i18n.js"];

test("у каждой вехи истории есть обе локали и дата, лента идёт по возрастанию", () => {
  const { loadApp } = require("./harness.js");
  const ru = loadApp(ABOUT_FILES).PC;
  const en = loadApp(ABOUT_FILES, { "pc-lang":"en" }).PC;

  assert.ok(ru.HISTORY && ru.HISTORY.length >= 5,
    "лента истории подозрительно коротка или отсутствует");

  for(const item of ru.HISTORY){
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/, `у вехи ${item.v} дата не в формате ISO: ${item.date}`);
    assert.ok(String(item.v).trim(), "у вехи нет номера версии");
    for(const field of ["v", "h", "p"]){
      assert.ok(String(ru.L(item, field) || "").trim(), `${item.v}.${field} пуст`);
      const value = String(en.L(item, field) || "");
      assert.ok(value.trim(), `${item.v}.${field} пуст в английской версии`);
      assert.ok(!/[а-яА-ЯёЁ]/.test(value), `${item.v}.${field} не переведён: ${value}`);
    }
  }

  /* Лента печатается в том порядке, в каком записи лежат в файле, и не
     сортируется: сортировать значило бы позволить им лежать как попало.
     Даты сравниваются как строки — ISO-формат для того и выбран. */
  const dates = Array.from(ru.HISTORY, i => i.date);
  assert.deepEqual(dates, [...dates].sort(), "веха вставлена не на своё место по дате");

  /* Итог под лентой собирается из этого же массива (js/ui.js), и слово
     «веха» там склоняется по числу записей — без формы во множественном
     числе строка вышла бы вида «10 веха». */
  assert.notEqual(ru.i18n.pl(5, "word.milestone"), "word.milestone",
    "нет форм множественного числа для слова «веха»");
});

test("у каждого вопроса теста о проекте ровно один верный ответ", () => {
  const { loadApp } = require("./harness.js");
  const ru = loadApp(ABOUT_FILES).PC;
  const ids = new Set(Array.from(html.matchAll(/\sid="([^"]+)"/g), m => m[1]));

  assert.ok(ru.ABOUT_QUIZ && ru.ABOUT_QUIZ.length >= 5,
    "набор вопросов о проекте подозрительно мал или отсутствует");

  const seen = new Set();
  for(const q of ru.ABOUT_QUIZ){
    assert.ok(!seen.has(q.id), `вопрос ${q.id} объявлен дважды`);
    seen.add(q.id);

    assert.ok(Array.isArray(q.a) && q.a.length >= 2, `${q.id}: вариантов меньше двух`);
    assert.ok(Array.isArray(q.aEn) && q.aEn.length === q.a.length,
      `${q.id}: английских вариантов не столько же, сколько русских`);
    assert.ok(Number.isInteger(q.ok) && q.ok >= 0 && q.ok < q.a.length,
      `${q.id}: верный ответ ${q.ok} лежит за границами списка вариантов`);

    for(const field of ["q", "why"]){
      assert.ok(String(q[field] || "").trim(), `${q.id}.${field} пуст`);
      assert.ok(String(q[field + "En"] || "").trim(), `${q.id}.${field}En пуст`);
    }
    for(const list of ["a", "aEn"]){
      q[list].forEach((text, i) => {
        assert.ok(String(text || "").trim(), `${q.id}.${list}[${i}] пуст`);
      });
    }

    /* Карточка, в которой написан ответ. Без этого id ссылка «читать
       в разделе» ведёт в никуда — молча, потому что getElementById
       просто вернёт null и переход не случится. */
    assert.ok(ids.has(q.card),
      `вопрос ${q.id} ссылается на карточку #${q.card}, которой нет в index.html`);
  }
});

test("в английских строках теста о проекте нет кириллицы", () => {
  const { loadApp } = require("./harness.js");
  const en = loadApp(ABOUT_FILES, { "pc-lang":"en" }).PC;
  /* Ключи словаря проверяет tests/i18n.test.js, но вопросы лежат
     в файле данных и под ту проверку не попадают: копия русской строки
     в английской колонке прошла бы незамеченной. */
  for(const q of en.ABOUT_QUIZ){
    for(const field of ["q", "why"]){
      const value = String(en.L(q, field));
      assert.ok(!/[а-яА-ЯёЁ]/.test(value), `${q.id}.${field} не переведён: ${value}`);
    }
    en.L(q, "a").forEach((text, i) => {
      assert.ok(!/[а-яА-ЯёЁ]/.test(String(text)), `${q.id}: вариант ${i} не переведён — ${text}`);
    });
  }
});

/* Нижний лист настроек выезжает от края экрана вверх, и пружинная
   кривая для него значит не то же самое, что для окна по центру.
   Окно уменьшено на 5% и, проскочив единицу, всего лишь на мгновение
   становится чуть больше конечного размера. Лист, проскочив свою
   конечную точку, уходит выше края экрана: на замере 390 × 844 это
   74 пикселя пустоты под ним на 166-й миллисекунде — то есть видимая
   страница там, где у листа обязан быть низ окна. */
test("нижний лист настроек выезжает без перелёта", () => {
  const css = fs.readFileSync(path.join(ROOT, "css", "settings.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  /* Блоков с таким условием в файле несколько, и первый из них — про
     рельс разделов, а не про лист: смотреть надо во все сразу. */
  const mobile = Array.from(
    css.matchAll(/@media\(max-width:680px\)\{((?:[^{}]|\{[^{}]*\})*)\}/g), m => m[1]).join("\n");
  assert.ok(mobile.trim(), "не нашёлся блок узкого экрана в css/settings.css");

  const rules = Array.from(mobile.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter(r => /\.sheet\b/.test(r[1]));
  assert.ok(rules.length, "на узком экране у .sheet нет ни одного правила");
  const body = rules.map(r => r[2]).join(";");
  assert.ok(!/--ease-spring/.test(body),
    "на узком экране лист едет по пружинной кривой — он перелетит край экрана");
  assert.match(body, /transition-timing-function:/,
    "кривая перехода на узком экране не переопределена — останется пружина из общего правила");
});

/* С 4.2 в коде нет строк длиннее 160 знаков: плотные однострочники 3.1–4.0
   нельзя было ни читать, ни ревьюить построчно. Исключения — файлы, где
   длинная строка это текст, а не код: словари, данные, вопросы теста,
   шаблоны партий, и токены темы. */
/* С 4.3 в двух последних слоях не больше десяти строк с !important на файл:
   остальное решено порядком и специфичностью. Оставшиеся исключения
   перебивают глобальный пол кегля (тоже !important) и объяснены
   комментарием рядом. */
test("в app.css и party.css не больше десяти строк с !important", () => {
  for(const name of ["app.css", "party.css"]){
    const lines = fs.readFileSync(path.join(ROOT, "css", name), "utf8").split("\n").filter(l => l.includes("!important"));
    assert.ok(lines.length <= 10, `css/${name}: строк с !important ${lines.length}`);
  }
});

test("в коде нет строк длиннее 160 знаков", () => {
  const LIMIT = 160;
  const EXEMPT = /^(?:data-.*|i18n-.*|quiz-data|party-templates|tokens)\.(?:js|css)$/;
  const long = [];
  for(const dir of ["js", "css"]){
    for(const name of fs.readdirSync(path.join(ROOT, dir))){
      if(!/\.(?:js|css)$/.test(name) || EXEMPT.test(name)) continue;
      fs.readFileSync(path.join(ROOT, dir, name), "utf8").split(/\r?\n/).forEach((line, i) => {
        /* строка со встроенной картинкой url("data:…") — данные, а не код: её нельзя разорвать */
        if(line.length > LIMIT && !line.includes("url(\"data:")) long.push(`${dir}/${name}:${i + 1} (${line.length})`);
      });
    }
  }
  assert.deepEqual(long.slice(0, 10), [], `строк длиннее ${LIMIT} знаков: ${long.length}`);
});
