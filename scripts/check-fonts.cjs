"use strict";
/* Проверка ширины при крупном тексте (4.4): npm run check:fonts.
   Узкий экран 320 px, --text-k: 2 (текст 200%), вместо шрифтов темы —
   Verdana (самый широкий из обычных системных шрифтов: на нём
   переполнение видно раньше, чем на шрифтах темы). Пять вкладок × два
   языка в Chromium и WebKit. Измеряется ширина документа, а не отдельного
   блока: страницу растягивает любой невидимый длинный «хвост».

   Результат сравнивается с эталоном docs/check-fonts-4.4.json: рост ширины
   хоть в одной связке — ошибка. Ширина больше экрана без записи в эталоне
   — тоже ошибка. `--write` записывает эталон заново (после осознанной
   правки). PC_URL — проверять уже запущенный сервер (по умолчанию
   поднимается tests/server.js; PC_ROOT выбирает папку, например dist). */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const BASELINE = path.join(root, "docs", "check-fonts-4.4.json");
const VERSION = require(path.join(root, "package.json")).version;
const WIDTH = 320, TABS = ["compass", "quiz", "votes", "about"], LANGS = ["ru", "en"];

function startServer(){
  const port = process.env.PC_PORT || "4176";
  const child = spawn(process.execPath, [path.join(root, "tests", "server.js")], { env:{ ...process.env, PC_PORT:port }, stdio:["ignore", "pipe", "inherit"] });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.stdout.on("data", d => { if(String(d).includes("static server")) resolve({ child, url:"http://localhost:" + port }); });
  });
}

async function measure(engine, base){
  const browser = await engine.launch();
  const out = {};
  try{
    for(const lang of LANGS){
      const ctx = await browser.newContext({ viewport:{ width:WIDTH, height:800 }, isMobile:true, hasTouch:true, locale:lang === "ru" ? "ru-RU" : "en-US" });
      const page = await ctx.newPage();
      await page.addInitScript(([v, l]) => {
        localStorage.setItem("pc-welcome", v); localStorage.setItem("pc-lang", l);
        localStorage.setItem("pc-settings", JSON.stringify({ motion:"off" }));
      }, [VERSION, lang]);
      for(const tab of TABS){
        await page.goto(base + "/#/" + tab);
        await page.waitForFunction(() => window.PC && PC.nav && PC.loadSelfVote);
        await page.evaluate(() => PC.loadSelfVote());
        await page.addStyleTag({ content:"*,*::before,*::after{font-family:Verdana,'DejaVu Sans',sans-serif !important}" });
        await page.evaluate(() => document.documentElement.style.setProperty("--text-k", "2"));
        await page.waitForTimeout(300);
        out[`${lang}/${tab}`] = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
      }
      await ctx.close();
    }
  }finally{ await browser.close(); }
  return out;
}

(async() => {
  const write = process.argv.includes("--write");
  const pw = require("@playwright/test");
  let server = null, base = process.env.PC_URL;
  if(!base){ server = await startServer(); base = server.url; }
  const result = {};
  try{
    for(const name of ["chromium", "webkit"]){
      try{ result[name] = await measure(pw[name], base); }
      catch(e){ console.warn(`${name}: пропущен (${String(e.message).split("\n")[0]})`); }
    }
  }finally{ if(server) server.child.kill(); }
  if(!Object.keys(result).length){ console.error("Ни один браузер не запустился"); process.exit(1); }
  if(write){
    fs.writeFileSync(BASELINE, JSON.stringify({ version:VERSION, width:WIDTH, textScale:2, font:"Verdana", widths:result }, null, 2) + "\n");
    console.log("Эталон записан: " + path.relative(root, BASELINE));
    return;
  }
  const saved = JSON.parse(fs.readFileSync(BASELINE, "utf8")).widths;
  const bad = [];
  for(const [engine, rows] of Object.entries(result)){
    for(const [key, w] of Object.entries(rows)){
      const was = saved[engine] && saved[engine][key];
      const limit = was == null ? WIDTH : Math.max(was, WIDTH);
      console.log(`${engine.padEnd(8)} ${key.padEnd(14)} ${String(w).padStart(4)} px (эталон ${was == null ? "—" : was})`);
      if(w > limit) bad.push(`${engine} ${key}: ${w} px при допустимых ${limit}`);
    }
  }
  if(bad.length){ console.error("\nШирина выросла:\n  " + bad.join("\n  ")); process.exit(1); }
  console.log("\ncheck:fonts — ширина не выросла");
})().catch(e => { console.error(e); process.exit(1); });
