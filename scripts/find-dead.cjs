"use strict";
/* Поиск мёртвого кода (5.0): имена PC.*, ключи словаря и CSS-классы,
   на которые ничто не ссылается. Отчёт — кандидаты, а не приговор:
   ключ, собранный склейкой ("tab." + name), и класс, добавленный
   скриптом из переменной, отсюда не видны. Поэтому ключ считается
   живым, если в коде встречается его префикс в кавычках с точкой на
   конце ("tab."), а класс — если его имя есть в любой строке скриптов.

     node scripts/find-dead.cjs            — отчёт в консоль
     node scripts/find-dead.cjs --md FILE  — то же в Markdown-файл */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const list = (dir, ext) => fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith(ext)).map(f => dir + "/" + f);

const jsFiles = list("js", ".js");
const cssFiles = list("css", ".css");
const testFiles = list("tests", ".js");
const html = read("index.html");
const dictFiles = jsFiles.filter(f => /\/i18n-[a-z]+\.js$/.test(f));
const codeFiles = jsFiles.filter(f => !dictFiles.includes(f));
const code = codeFiles.map(read).join("\n");
const tests = testFiles.map(read).join("\n");

/* ---------- PC.<имя>: объявлено, но нигде не читается ---------- */
function deadGlobals(){
  const out = [];
  const declared = new Map();
  for(const f of jsFiles){
    for(const m of read(f).matchAll(/\bPC\.(\w+)\s*=(?!=)/g)) if(!declared.has(m[1])) declared.set(m[1], f);
  }
  for(const [name, file] of declared){
    const uses = (code + "\n" + html).match(new RegExp("\\bPC\\." + name + "\\b(?!\\s*=[^=])", "g")) || [];
    if(!uses.length) out.push(`PC.${name} (${file})${tests.includes("PC." + name) ? " — только в тестах" : ""}`);
  }
  return out;
}

/* ---------- ключи словаря без единого обращения ---------- */
function deadKeys(){
  const out = [];
  const haystack = code + "\n" + html;
  const prefixes = new Set(Array.from(haystack.matchAll(/["']([a-z][\w-]*(?:\.[\w-]+)*\.)["']/g), m => m[1]));
  for(const f of dictFiles){
    for(const m of read(f).matchAll(/^\s{2,}"([\w.+-]+)":\s*\[/gm)){
      const key = m[1];
      if(haystack.includes('"' + key + '"') || haystack.includes("'" + key + "'") || haystack.includes(":" + key + ";") ||
         haystack.includes(":" + key + '"') || haystack.includes('data-i18n="' + key + '"')) continue;
      const parts = key.split(".");
      let dynamic = false;
      for(let i = 1; i < parts.length; i++) if(prefixes.has(parts.slice(0, i).join(".") + ".")) dynamic = true;
      if(!dynamic) out.push(`${key} (${f})`);
    }
  }
  return out;
}

/* ---------- CSS-классы, которых нет ни в разметке, ни в скриптах ---------- */
function deadClasses(){
  const out = [];
  const seen = new Set();
  const haystack = code + "\n" + html + "\n" + dictFiles.map(read).join("\n");
  for(const f of cssFiles){
    const css = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
    for(const m of css.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)){
      const name = m[1];
      if(seen.has(name) || /^\d/.test(name)) continue;
      seen.add(name);
      if(!new RegExp("(^|[^\\w-])" + name.replace(/[-]/g, "\\-") + "([^\\w-]|$)").test(haystack)) out.push(`.${name} (${f})`);
    }
  }
  return out;
}

const report = { globals:deadGlobals(), keys:deadKeys(), classes:deadClasses() };
const lines = ["# Кандидаты в мёртвый код", "",
  "Отчёт `node scripts/find-dead.cjs`. Кандидат — не приговор: перед удалением проверить поиском по проекту.", ""];
for(const [title, items] of [["Имена PC.*", report.globals], ["Ключи словаря", report.keys], ["CSS-классы", report.classes]]){
  lines.push(`## ${title}: ${items.length}`, "");
  items.forEach(i => lines.push("- " + i));
  lines.push("");
}
const at = process.argv.indexOf("--md");
if(at > 0 && process.argv[at + 1]){
  fs.mkdirSync(path.dirname(path.resolve(process.argv[at + 1])), { recursive:true });
  fs.writeFileSync(process.argv[at + 1], lines.join("\n"));
}
console.log(lines.join("\n"));
