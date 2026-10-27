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
  const code = transformSync(source, { loader, minify:true, target:"es2020", legalComments:"none" }).code;
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
const loader = ';requestAnimationFrame(function(){requestAnimationFrame(function(){var s=document.createElement("script");s.src=' + JSON.stringify(appAsset) + ';s.fetchPriority="low";document.body.appendChild(s);});});';
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
const offline = listFiles(out).filter(f => /\.(?:html|css|js|png|webp|svg|json)$/.test(f) && f !== "index.html" && f !== "assets/og-image.png");
const cacheHash = createHash("sha256").update(offline.map(f => f + createHash("sha256").update(fs.readFileSync(path.join(out, f))).digest("hex")).join("|") + html).digest("hex").slice(0, 10);
fs.writeFileSync(path.join(out, "sw.js"), fs.readFileSync(path.join(root, "scripts", "sw-template.js"), "utf8")
  .replace("__CACHE__", "pc-" + require(path.join(root, "package.json")).version + "-" + cacheHash)
  .replace("__FILES__", JSON.stringify(["./"].concat(offline))));
console.log(`Packaged ${styles.length} stylesheets and ${scripts.length} scripts into ${out}`);
