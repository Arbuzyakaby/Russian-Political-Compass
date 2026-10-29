"use strict";
/* Выпуск 4.4 на телефоне: ширина документа (а не отдельного блока) на 320 px
   при тексте 200% во всех пяти вкладках на двух языках — в Chromium и WebKit.
   В 4.3 вкладка «Голосования» в WebKit была шире экрана на ~70 px: длинные
   слова («Голосования» крупным шрифтом, «самопровозглашёнными») не переносились. */
const { test, expect } = require("@playwright/test");
const VERSION = require("../package.json").version;

const TABS = ["compass", "quiz", "votes", "about"];

for(const lang of ["ru", "en"]){
  test(`4.4: ширина документа не больше экрана, 320 px, текст 200%, ${lang}`, async({ page }) => {
    await page.setViewportSize({ width:320, height:800 });
    await page.addInitScript(([v, l]) => {
      localStorage.setItem("pc-welcome", v); localStorage.setItem("pc-lang", l);
      localStorage.setItem("pc-settings", JSON.stringify({ motion:"off" }));
    }, [VERSION, lang]);
    for(const tab of TABS){
      await page.goto("/#/" + tab);
      await page.waitForFunction(() => window.PC && PC.nav && PC.loadSelfVote);
      await page.evaluate(() => PC.loadSelfVote());
      await page.evaluate(() => document.documentElement.style.setProperty("--text-k", "2"));
      await page.waitForTimeout(250);
      /* Верхней границей служит 1 px на округление; шрифты темы в CI могут
         не загрузиться, поэтому строгий замер с Verdana — в npm run check:fonts */
      const widths = await page.evaluate(() => ({
        view:document.documentElement.clientWidth,
        doc:document.documentElement.scrollWidth,
        body:document.body.scrollWidth
      }));
      expect(widths.doc, `${tab}: документ ${widths.doc} px при экране ${widths.view}`).toBeLessThanOrEqual(widths.view + 1);
      expect(widths.body, `${tab}: body ${widths.body} px при экране ${widths.view}`).toBeLessThanOrEqual(widths.view + 1);
    }
  });
}
