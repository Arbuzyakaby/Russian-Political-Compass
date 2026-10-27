"use strict";
/* Иконки интерфейса (4.3). Источник — набор Lucide (lucide-static, ISC),
   единая сетка 24×24 и толщина линии 2. Скрипт пересобирает две вещи:

   1. Спрайт <symbol id="i-…"> в index.html между метками icons:start
      и icons:end. Разметка и скрипты ссылаются на него через
      <svg class="ico"><use href="#i-…"/></svg> (в JS — PC.icon()).
   2. Файлы assets/icons/*.svg для CSS: маски (mask-image) чёрным цветом
      и два приглушённых варианта для фона полей, где маску не повесить
      (у <select> и <input> нет псевдоэлементов).

   Запуск после изменения списка: npm run icons. */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const lucide = path.join(root, "node_modules", "lucide-static", "icons");
if(!fs.existsSync(lucide)) throw new Error("Нет node_modules/lucide-static: выполните npm install");

/* имя в проекте → имя в Lucide */
const SPRITE = {
  compass:"compass", quiz:"clipboard-list", votes:"vote", party:"flag", about:"info",
  search:"search", settings:"settings", close:"x", back:"chevron-left", next:"chevron-right",
  down:"chevron-down", up:"arrow-up", "arrow-down":"arrow-down",
  trash:"trash-2", map:"map", target:"crosshair", shield:"shield-check",
  "eye-off":"eye-off", phone:"smartphone", "check-circle":"circle-check", external:"external-link",
  minus:"minus", plus:"plus", reset:"rotate-ccw", list:"list", duel:"swords", ballot:"square-check-big",
  shuffle:"shuffle", alert:"circle-alert"
};
const MASKS = {
  check:"check", search:"search",
  look:"palette", interface:"layout-grid", motion:"activity", readability:"type",
  nav:"navigation", privacy:"lock", srpc:"workflow", general:"sliders-horizontal"
};
/* Приглушённые — цвет --muted тёмной темы (#878ea3), как было во встроенных SVG до 4.3. */
const MUTED = { "search-muted":"search", "down-muted":"chevron-down", "next-muted":"chevron-right" };

function inner(name){
  const file = path.join(lucide, name + ".svg");
  if(!fs.existsSync(file)) throw new Error("В Lucide нет иконки " + name);
  const svg = fs.readFileSync(file, "utf8");
  return svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>"))
    .replace(/\s*\n\s*/g, "").replace(/\s*\/>/g, "/>").trim();
}
function standalone(name, stroke){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + stroke +
    '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner(name) + "</svg>\n";
}

const symbols = Object.entries(SPRITE).map(([id, name]) => '  <symbol id="i-' + id + '" viewBox="0 0 24 24">' + inner(name) + "</symbol>");
const sprite = "<!-- icons:start — собрано scripts/icons.cjs из Lucide (ISC), вручную не править -->\n" +
  '<svg class="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">\n' +
  symbols.join("\n") + "\n</svg>\n<!-- icons:end -->";
const htmlFile = path.join(root, "index.html");
let html = fs.readFileSync(htmlFile, "utf8");
const re = /<!-- icons:start[\s\S]*?<!-- icons:end -->/;
html = re.test(html) ? html.replace(re, sprite) : html.replace(/(<body[^>]*>\n)/, "$1" + sprite + "\n");
fs.writeFileSync(htmlFile, html);

const out = path.join(root, "assets", "icons");
fs.mkdirSync(out, { recursive:true });
for(const [id, name] of Object.entries(MASKS)) fs.writeFileSync(path.join(out, id + ".svg"), standalone(name, "#000"));
for(const [id, name] of Object.entries(MUTED)) fs.writeFileSync(path.join(out, id + ".svg"), standalone(name, "#878ea3"));
fs.copyFileSync(path.join(root, "node_modules", "lucide-static", "LICENSE"), path.join(out, "LICENSE"));
console.log("Иконок в спрайте:", symbols.length, "· файлов для CSS:", Object.keys(MASKS).length + Object.keys(MUTED).length);
