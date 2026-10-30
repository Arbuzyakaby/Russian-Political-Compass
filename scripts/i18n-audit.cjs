"use strict";
/* Аудит английских строк (5.1): node scripts/i18n-audit.cjs
   Выгружает все английские строки словарей и данных с признаками:
   «=ru» — совпадает с русской, «кириллица» — в английском тексте есть
   русские буквы, «длинно» — английский длиннее русского больше чем на 40%
   (кнопки и подписи на телефоне тогда переносятся), «пусто» — нет перевода.
   Результат — audit/5.1/en.md; код выхода 1, если есть «кириллица» или «пусто». */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");

const box = { window:{ PC:{} }, console };
box.PC = box.window.PC;
vm.createContext(box);
const js = n => fs.readFileSync(path.join(root, "js", n), "utf8");
for(const f of fs.readdirSync(path.join(root, "js")).filter(n => /^i18n-.+\.js$/.test(n)).sort()) vm.runInContext(js(f), box);
for(const f of ["data.js", "data-parties.js", "data-votes.js", "data-people.js", "data-history.js"]) vm.runInContext(js(f), box);
const PC = box.PC;

const rows = [];
function check(where, ru, en){
  const flags = [];
  if(en == null || String(en).trim() === "") flags.push("пусто");
  else{
    if(/[А-Яа-яЁё]/.test(en)) flags.push("кириллица");
    if(ru && en === ru && /[A-Za-z]{3}/.test(en) === false) flags.push("=ru");
    if(ru && en.length > ru.length * 1.4 && ru.length > 12) flags.push("длинно");
  }
  if(flags.length) rows.push({ where, flags, ru, en });
}

/* переключатель языка нарочно подписан на другом языке: «Русский» в английском интерфейсе */
const ALLOW = ["lang.toggle"];
for(const [key, val] of Object.entries(PC.i18nDict)){
  if(!Array.isArray(val) || ALLOW.includes(key)) continue;
  const [ru, en] = val;
  if(Array.isArray(ru)) check(key, ru.join(" / "), Array.isArray(en) ? en.join(" / ") : en);
  else check(key, ru, en);
}
const FIELDS = { PARTIES:["name", "short", "summary", "ideology"], VOTES:["title", "summary", "tally", "why"] };
for(const [list, fields] of Object.entries(FIELDS)){
  for(const item of PC[list] || []){
    for(const f of fields){
      if(!item[f]) continue;
      const en = item.en && item.en[f];
      /* аббревиатуры («ЛДПР», «КПРФ») по схеме данных переводятся отсутствием ключа */
      if(en == null && /^[А-ЯЁ]{2,6}$/.test(item[f])) continue;
      check(list.toLowerCase() + "." + item.id + "." + f, item[f], en);
    }
  }
}

const bad = rows.filter(r => r.flags.includes("кириллица") || r.flags.includes("пусто"));
const by = flag => rows.filter(r => r.flags.includes(flag)).length;
const esc = s => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 160);
const md = ["# Аудит английских строк", "",
  `Создан \`node scripts/i18n-audit.cjs\`. Строк словаря: ${Object.keys(PC.i18nDict).length}, ` +
  `партий: ${PC.PARTIES.length}, голосований: ${PC.VOTES.length}.`, "",
  `| Признак | Число |`, `| --- | --- |`,
  `| кириллица в английском | ${by("кириллица")} |`, `| пусто | ${by("пусто")} |`,
  `| совпадает с русским | ${by("=ru")} |`, `| длиннее русского на 40%+ | ${by("длинно")} |`, "",
  "## Строки с признаками", "", "| Где | Признаки | Русский | Английский |", "| --- | --- | --- | --- |"]
  .concat(rows.map(r => `| \`${r.where}\` | ${r.flags.join(", ")} | ${esc(r.ru)} | ${esc(r.en)} |`));
const dir = path.join(root, "audit", "5.1");
fs.mkdirSync(dir, { recursive:true });
fs.writeFileSync(path.join(dir, "en.md"), md.join("\n") + "\n");
console.log(`en.md: ${rows.length} строк с признаками, из них ошибок ${bad.length}`);
if(bad.length){ for(const r of bad.slice(0, 20)) console.log("  " + r.where + ": " + r.flags.join(", ")); process.exitCode = 1; }
