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
fs.writeFileSync(path.join(out, "index.html"), html);
fs.cpSync(path.join(root, "assets"), path.join(out, "assets"), { recursive:true });
for(const name of ["robots.txt", "sitemap.xml", "manifest.json", "CNAME", "LICENSE"]){
  fs.copyFileSync(path.join(root, name), path.join(out, name));
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log(`Packaged ${styles.length} stylesheets and ${scripts.length} scripts into ${out}`);
