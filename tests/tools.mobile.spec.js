"use strict";
/* Выпуск 4.3 на телефоне: «Голосую сам» и дуэль партий на 320 и 390 px,
   в том числе при тексте 200%, касаниями. */
const { test, expect } = require("@playwright/test");
const VERSION = require("../package.json").version;

async function ready(page, route){
  await page.addInitScript(v => {
    localStorage.setItem("pc-welcome", v); localStorage.setItem("pc-lang", "ru");
    localStorage.setItem("pc-settings", JSON.stringify({ motion:"off" }));
  }, VERSION);
  await page.goto("/#/" + route);
  await page.waitForFunction(() => window.PC && PC.loadSelfVote);
  await page.evaluate(() => Promise.all([PC.loadSelfVote(), PC.lazy("duel")]));
}
/* Проверяется сам блок, а не ширина документа: при тексте 200% в мобильном
   WebKit страница голосований была шире экрана и в 4.2 (см. docs/RELEASE_4_3.md). */
const noOverflow = page => page.locator("#selfVote").evaluate(card => {
  const r = card.getBoundingClientRect();
  const inner = r.right - parseFloat(getComputedStyle(card).paddingRight) + 1;
  return r.left >= -1 && r.right <= document.documentElement.clientWidth + 1 &&
    Array.from(card.querySelectorAll("*")).every(e => e.getBoundingClientRect().right <= inner) &&
    Array.from(card.querySelectorAll("button")).every(b => b.scrollWidth <= b.clientWidth + 1);
});

for(const width of [320, 390]){
  test(`4.3: «Голосую сам» и дуэль на ${width} px при обычном и крупном тексте`, async({ page }) => {
    await page.setViewportSize({ width, height:800 });
    await ready(page, "votes");
    for(const k of ["1", "2"]){
      await page.evaluate(v => document.documentElement.style.setProperty("--text-k", v), k);
      await page.locator("#selfVote").scrollIntoViewIfNeeded();
      expect(await noOverflow(page), `текст ×${k}`).toBe(true);
      const box = await page.locator(".sv-choice").first().boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('.sv-choice[data-choice="for"]').tap();
    await expect(page.locator(".sv-count")).toHaveText("Отвечено: 1 из 28");
    /* окно дуэли меряется при обычном тексте: при 200% в мобильной эмуляции
       сама страница шире экрана ещё с 4.2, и лист растягивается вместе с ней;
       дуэль при 200% проверяется на 320 px в tools43.visual.spec.js */
    await page.evaluate(() => document.documentElement.style.setProperty("--text-k", "1"));
    await page.evaluate(() => PC.duel.open("er", "nl"));
    const dialog = page.locator(".duel-dialog");
    await expect(dialog).toBeVisible();
    const r = await dialog.boundingBox();
    expect(r.x).toBeGreaterThanOrEqual(-1);
    expect(r.x + r.width).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth) + 1);
    expect(await dialog.locator(".duel-body").evaluate(b => b.scrollWidth <= b.clientWidth + 1)).toBe(true);
    await dialog.getByRole("button", { name:"Закрыть дуэль" }).tap();
    await expect(dialog).toBeHidden();
  });
}
