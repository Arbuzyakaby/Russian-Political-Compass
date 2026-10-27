"use strict";
/* Замер запуска (4.4): сколько страница грузится на телефоне при замедлении
   процессора ×4. Сравнивает две собранные папки dist (например, прежний и
   новый выпуск) на одинаковых условиях:
     node scripts/measure-startup.cjs <папка-до> <папка-после> [запусков] > docs/performance-4.4.json
   Условия: Chromium, окно 390×844 с касаниями, замедление процессора ×4 (CDP),
   свежий контекст (пустой кэш) на каждый запуск, сервер tests/server.js
   (gzip, без https). Меряются: первый кадр с содержимым (FCP), самый
   большой кадр (LCP), «приложение готово» (метка pc:calc-ready — после неё
   работают вкладки и поиск) и байты скриптов и стилей с сервера. В
   отчёт идут медианы: отдельные запуски шумят. */
const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const [before, after, runsArg] = process.argv.slice(2);
if(!before || !after){ console.error("Использование: measure-startup.cjs <до> <после> [запусков]"); process.exit(2); }
const RUNS = Number(runsArg) || 7;
const median = list => { const s = list.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

function serve(root, port){
  const child = spawn(process.execPath, [path.join(__dirname, "..", "tests", "server.js")],
    { env:{ ...process.env, PC_ROOT:root, PC_PORT:String(port) }, stdio:["ignore", "pipe", "inherit"] });
  return new Promise(resolve => child.stdout.on("data", d => { if(String(d).includes("static server")) resolve(child); }));
}

async function once(browser, url){
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, locale:"ru-RU" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate:4 });
  await page.addInitScript(() => {
    localStorage.setItem("pc-welcome", "99"); localStorage.setItem("pc-lang", "ru");
    window.__lcp = 0;
    new PerformanceObserver(l => { for(const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type:"largest-contentful-paint", buffered:true });
  });
  await page.goto(url, { waitUntil:"load" });
  await page.waitForFunction(() => performance.getEntriesByName("pc:calc-ready").length > 0, null, { timeout:60000 });
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => ({
    fcp:(performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime,
    lcp:window.__lcp,
    ready:performance.getEntriesByName("pc:calc-ready")[0].startTime,
    bytes:performance.getEntriesByType("resource").filter(e => /\.(?:js|css)(?:\?|$)/.test(e.name)).reduce((n, e) => n + e.decodedBodySize, 0)
  }));
  await ctx.close();
  return { fcp:m.fcp, lcp:m.lcp, ready:m.ready, scriptStyleBytes:m.bytes };
}

(async() => {
  const servers = [await serve(path.resolve(before), 4191), await serve(path.resolve(after), 4192)];
  const browser = await chromium.launch();
  const result = { cpuThrottle:4, viewport:"390x844 touch", runs:RUNS, server:"tests/server.js (gzip, http, localhost)", phases:{} };
  try{
    for(const [phase, port] of [["before", 4191], ["after", 4192]]){
      await once(browser, `http://localhost:${port}/`);                  /* прогрев процесса браузера, не в зачёт */
      const rows = [];
      for(let i = 0; i < RUNS; i++) rows.push(await once(browser, `http://localhost:${port}/`));
      result.phases[phase] = {
        median:{ fcpMs:Math.round(median(rows.map(r => r.fcp))), lcpMs:Math.round(median(rows.map(r => r.lcp))),
                 readyMs:Math.round(median(rows.map(r => r.ready))), scriptStyleBytes:median(rows.map(r => r.scriptStyleBytes)) },
        runs:rows.map(r => ({ fcpMs:Math.round(r.fcp), lcpMs:Math.round(r.lcp), readyMs:Math.round(r.ready), scriptStyleBytes:r.scriptStyleBytes }))
      };
    }
  }finally{ await browser.close(); servers.forEach(s => s.kill()); }
  console.log(JSON.stringify(result, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
