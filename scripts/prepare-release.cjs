"use strict";
/* Сборка для GitHub Pages. Исходники по-прежнему запускаются без сборки;
   этот скрипт только склеивает и сжимает их в dist/, который выкладывается. */
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { transformSync } = require("esbuild");
const root = path.resolve(__dirname, "..");
const out = path.resolve(root, "dist");
// Заменять можно только известную папку dist: произвольный путь удалять нельзя.
if(path.dirname(out) !== root || path.basename(out) !== "dist") throw new Error("Недопустимая папка выкладки");
if(fs.existsSync(out)) fs.rmSync(out, { recursive:true, force:true });
fs.mkdirSync(out, { recursive:true });
for(const dir of ["css", "js", "assets"]) fs.mkdirSync(path.join(out, dir), { recursive:true });
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles = [...new Set(Array.from(html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(css\/[^"]+)"[^>]*>/g), m => m[1]))];
const scripts = Array.from(html.matchAll(/<script src="(js\/[^"]+)"[^>]*><\/script>/g), m => m[1]);
const boundary = scripts.indexOf("js/welcome-boot.js") + 1;
if(boundary < 2 || scripts.at(-1) !== "js/app.js") throw new Error("Неожиданный состав точек входа скриптов в index.html");
/* Всё, что подключено в index.html, должно существовать на диске: иначе
   сборка молча выложила бы страницу со ссылкой на пустое место. Список
   модулей берётся из самой разметки, а не из второго перечня здесь. */
for(const file of [...scripts, ...styles]){
  if(!fs.existsSync(path.join(root, file))) throw new Error("Файл из index.html не найден: " + file);
}
/* Модули по требованию (4.4): перечень лежит в index.html (#pcLazy), здесь он
   только пересобирается в файлы с хешем в имени. js/lazy.js читает его оттуда. */
const lazyMatch = html.match(/<script type="application\/json" id="pcLazy">([\s\S]*?)<\/script>/);
if(!lazyMatch) throw new Error("В index.html нет перечня модулей по требованию (#pcLazy)");
const lazy = JSON.parse(lazyMatch[1]);
for(const entry of Object.values(lazy)){
  for(const file of [entry.js, entry.css]){
    if(file && !fs.existsSync(path.join(root, file))) throw new Error("Файл модуля по требованию не найден: " + file);
  }
}
function writeAsset(source, prefix, loader){
  /* charset:"utf8" (5.0): кириллица идёт в пакет как есть, а не
     escape-последовательностями по шесть байт на букву —
     словари и данные стали почти вдвое легче. Страница, сервер разработки
     и GitHub Pages отдают скрипты в UTF-8. */
  const code = transformSync(source, { loader, minify:true, target:"es2020", legalComments:"none", charset:"utf8" }).code;
  const hash = createHash("sha256").update(code).digest("hex").slice(0,12);
  const name = prefix + "." + hash + "." + loader;
  fs.writeFileSync(path.join(out, name), code);
  return name;
}
function bundle(files, prefix, tail = ""){
  const source = files.map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n;\n") + tail;
  return writeAsset(source, prefix, "js");
}
// Стили кладутся в ту же папку css/, чтобы относительные адреса картинок не менялись.
const styleAsset = writeAsset(styles.map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n"), "css/site", "css");
const appAsset = bundle(scripts.slice(boundary), "js/site");
// Основной пакет догружается после двух кадров: приветствие и шапка успевают отрисоваться.
const loader = ';requestAnimationFrame(function(){requestAnimationFrame(function(){var s=document.createElement("script");s.src=(document.documentElement.dataset.root||"")+' + JSON.stringify(appAsset) + ';s.fetchPriority="low";document.body.appendChild(s);});});';
const shellAsset = bundle(scripts.slice(1, boundary), "js/shell", loader);
const lazyAssets = {};
const lazyBuilt = {};
function lazyFile(file, loader){
  if(!file) return undefined;
  if(!lazyAssets[file]){
    lazyAssets[file] = writeAsset(fs.readFileSync(path.join(root, file), "utf8"), file.replace(/\.[a-z]+$/, ""), loader);
  }
  return lazyAssets[file];
}
for(const [name, entry] of Object.entries(lazy)){
  lazyBuilt[name] = { js:lazyFile(entry.js, "js"), css:lazyFile(entry.css, "css") };
}
html = html.replace(lazyMatch[0], '<script type="application/json" id="pcLazy">' + JSON.stringify(lazyBuilt) + '</script>');
fs.copyFileSync(path.join(root, "js/theme-boot.js"), path.join(out, "js/theme-boot.js"));
html = html.replace(/<noscript>\s*<link[^>]+href="css\/[^\"]+"[^>]*>\s*<\/noscript>/g, "");
/* Комментарии разметки (5.0) — для того, кто читает исходник, а не для
   посетителя: в выкладку они не идут. */
html = html.replace(/<!--(?!\[)[\s\S]*?-->\s*/g, "");
/* Отступы в начале строк: в разметке нет ни <pre>, ни <textarea>, а
   перевод строки между тегами браузер и так сворачивает в один пробел. */
if(/<(?:pre|textarea)\b/.test(html)) throw new Error("В index.html появился <pre> или <textarea>: снимать отступы больше нельзя");
html = html.replace(/\n[ \t]+/g, "\n");
let styleInserted = false;
html = html.replace(/<link[^>]+rel="stylesheet"[^>]+href="css\/[^\"]+"[^>]*>/g, () => {
  if(styleInserted) return "";
  styleInserted = true;
  return '<link rel="stylesheet" href="' + styleAsset + '">';
});
let scriptsInserted = false;
html = html.replace(/<script src="js\/([^\"]+)"[^>]*><\/script>/g, (tag, name) => {
  if(name === "theme-boot.js") return tag;
  if(scriptsInserted) return "";
  scriptsInserted = true;
  return '<script src="' + shellAsset + '" defer fetchpriority="high"></script>';
});
html = html.replace('</head>', '<link rel="preload" as="script" href="' + shellAsset + '" fetchpriority="high">\n</head>');
// HTML-комментарии — заметки для разработчика, в выкладку они не нужны; условные комментарии (<!--[if) остаются.
html = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, "").replace(/\n[\t ]*\n+/g, "\n");
// Метка сборки: js/offline.js регистрирует service worker только в пакете, не в исходниках.
html = html.replace(/<html([^>]*)>/, '<html$1 data-build="dist">');
fs.writeFileSync(path.join(out, "index.html"), html);

/* ---------- английская страница en/index.html (5.1) ----------
   Тот же документ, но с английским текстом прямо в разметке: заголовок,
   описание, h1, обложка и оглавление книги, блок «О проекте в цифрах».
   Поисковик читает его без скрипта; адрес /en/ указан в hreflang,
   canonical и sitemap. Строки берутся из тех же словарей js/i18n-*.js. */
const vm = require("node:vm");
const dictBox = { window:{ PC:{} } };
dictBox.PC = dictBox.window.PC;
vm.createContext(dictBox);
for(const f of fs.readdirSync(path.join(root, "js")).filter(n => /^i18n-.+\.js$/.test(n)).sort()){
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), dictBox);
}
const DICT = dictBox.PC.i18nDict;
const en = key => {
  const v = DICT[key] && DICT[key][1];
  return typeof v === "string" ? v : null;
};
const escText = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = t => escText(t).replace(/"/g, "&quot;");
const SITE = "https://rupolitcompass.website/";
let enHtml = html
  .replace(/<html lang="ru"/, '<html lang="en"')
  .replace(/<title>[^<]*<\/title>/, "<title>" + escText(en("doc.title.compass")) + "</title>")
  .replace(/(<meta name="description" content=")[^"]*"/, (m, a) => a + escAttr(en("doc.desc")) + '"')
  .replace(/(<meta property="og:title" content=")[^"]*"/, (m, a) => a + escAttr(en("doc.title.compass")) + '"')
  .replace(/(<meta property="og:description" content=")[^"]*"/, (m, a) => a + escAttr(en("doc.desc")) + '"')
  .replace(/(<meta property="og:locale" content=")[^"]*"/, '$1en_US"')
  .replace(/(<link rel="canonical" href=")[^"]*"/, "$1" + SITE + 'en/"')
  .replace(/(<meta property="og:url" content=")[^"]*"/, "$1" + SITE + 'en/"');
/* текст элементов с data-i18n / data-i18n-html, у которых внутри нет вложенной разметки */
enHtml = enHtml.replace(/(<([a-z0-9]+)\b[^>]*?\sdata-i18n(-html)?="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, isHtml, key, inner, close) => {
  const v = en(key);
  if(v == null || /\{[a-z]+\}/.test(v)) return m;
  return open + (isHtml ? v : escText(v)) + close;
});
/* пути к ресурсам — на уровень выше */
enHtml = enHtml
  .replace(/((?:href|src)=")(?=(?:css|js|assets)\/|manifest\.json|favicon)/g, "$1../")
  .replace(/("(?:js|css)":")(?=(?:js|css)\/)/g, "$1../")
  .replace(/<html([^>]*)>/, '<html$1 data-root="../">');
fs.mkdirSync(path.join(out, "en"), { recursive:true });
fs.writeFileSync(path.join(out, "en", "index.html"), enHtml);
fs.cpSync(path.join(root, "assets"), path.join(out, "assets"), { recursive:true });
for(const name of ["robots.txt", "sitemap.xml", "manifest.json", "CNAME", "LICENSE"]){
  fs.copyFileSync(path.join(root, name), path.join(out, name));
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");
/* Работа без сети (4.3): service worker кэширует всё, что лежит в пакете.
   Имя кэша зависит от содержимого, поэтому новая выкладка заменяет старый кэш. */
function listFiles(dir){
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full) : [path.relative(out, full).split(path.sep).join("/")];
  });
}
const offline = listFiles(out).filter(f => /\.(?:html|css|js|png|webp|svg|json)$/.test(f) && f !== "index.html" && f !== "en/index.html" && f !== "assets/og-image.png");
const cacheHash = createHash("sha256").update(offline.map(f => f + createHash("sha256").update(fs.readFileSync(path.join(out, f))).digest("hex")).join("|") + html).digest("hex").slice(0, 10);
fs.writeFileSync(path.join(out, "sw.js"), fs.readFileSync(path.join(root, "scripts", "sw-template.js"), "utf8")
  .replace("__CACHE__", "pc-" + require(path.join(root, "package.json")).version + "-" + cacheHash)
  .replace("__FILES__", JSON.stringify(["./"].concat(offline))));
console.log(`Packaged ${styles.length} stylesheets and ${scripts.length} scripts into ${out}`);
