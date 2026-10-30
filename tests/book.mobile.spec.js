/* ============ Книга и тур 5.1 на телефоне ============ */
"use strict";
const { test, expect } = require("@playwright/test");
const version = require("../package.json").version;

async function ready(page, route, { lang = "ru", text = 1 } = {}){
  await page.addInitScript(([v, l, k]) => {
    localStorage.setItem("pc-welcome", v); localStorage.setItem("pc-lang", l);
    localStorage.setItem("pc-settings", JSON.stringify({ motion:"off" }));
  }, [version, lang, text]);
  await page.goto("/#/" + route);
  await page.waitForFunction(() => window.PC && PC.book && PC.guide && document.readyState === "complete");
}
const wide = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

for(const width of [320, 390]){
  for(const lang of ["ru", "en"]){
    test(`5.1: книга на ${width} px (${lang}) — оглавление листом, без переполнения`, async({ page }) => {
      await page.setViewportSize({ width, height:780 });
      await ready(page, "about/votes", { lang });
      await expect(page.locator("#bk-votes")).toBeVisible();
      await expect(page.locator(".book-side")).toBeHidden();
      expect(await wide(page)).toBeLessThanOrEqual(1);
      await page.locator(".book-mbar-btn").click();
      await expect(page.locator(".book-sheet")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(".book-sheet")).toBeHidden();
      await expect(page.locator(".book-pg--next")).toBeVisible();
    });
  }
}

test("5.1: быстрый старт на телефоне — нижний лист над панелью вкладок", async({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await ready(page, "compass");
  await page.evaluate(() => PC.guide.start("quick"));
  const card = page.locator(".guide-card");
  await expect(card).toHaveClass(/is-sheet/);
  await expect(page.locator("#guideCount")).toHaveText("Шаг 1 из 5");
  await page.waitForTimeout(400);
  const [c, tabs] = await Promise.all([card.boundingBox(), page.locator(".tabs").boundingBox()]);
  expect(c.y + c.height).toBeLessThanOrEqual(tabs.y + 2);
  expect(await wide(page)).toBeLessThanOrEqual(1);
  for(let i = 0; i < 4; i++) await page.locator("#guideNext").tap();
  await expect(page.locator("#guideCount")).toHaveText("Шаг 5 из 5");
  await page.locator("#guideNext").tap();
  await expect(page.locator(".guide")).toBeHidden();
});

test("5.1: тур при тексте 200% на 320 px не шире экрана", async({ page }) => {
  await page.setViewportSize({ width:320, height:700 });
  await ready(page, "compass", { text:2 });
  await page.evaluate(() => document.documentElement.style.setProperty("--text-k", "2"));
  await page.evaluate(() => PC.guide.start("full"));
  await expect(page.locator(".guide-card")).toBeVisible();
  const box = await page.locator(".guide-card").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(321);
});
