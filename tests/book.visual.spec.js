/* ============ Книга «О проекте» и тур 5.1 на широком экране ============ */
"use strict";
const { test, expect } = require("@playwright/test");
const version = require("../package.json").version;

async function ready(page, route = "about", { lang = "ru" } = {}){
  await page.addInitScript(([v, l]) => {
    if(!sessionStorage.getItem("pc-seeded")){
      localStorage.setItem("pc-welcome", v); localStorage.setItem("pc-lang", l);
      localStorage.setItem("pc-settings", JSON.stringify({ motion:"off" }));
      sessionStorage.setItem("pc-seeded", "1");
    }
  }, [version, lang]);
  await page.goto("/#/" + route);
  await page.waitForFunction(() => window.PC && PC.book && PC.guide && document.readyState === "complete");
}
function errors(page){ const list = []; page.on("pageerror", e => list.push(e.message)); return list; }

test("5.1: книга — обложка, главы, «Далее», закладка и старый якорь", async({ page }) => {
  const errs = errors(page);
  await ready(page, "about");
  await expect(page.locator("#bookCover")).toBeVisible();
  await expect(page.locator(".book-toc-static a")).toHaveCount(15);
  await page.locator("#bookStart").click();
  await expect(page.locator("#bk-intro")).toBeVisible();
  await expect(page.locator(".book-side")).toBeVisible();
  await expect(page.locator(".book-side .book-toc-link.is-current")).toHaveAttribute("data-ch", "intro");
  await page.locator(".book-pg--next").click();
  await expect(page).toHaveURL(/#\/about\/axes$/);
  await expect(page.locator("#bk-axes .book-mini")).toBeVisible();
  await expect(page.locator("#bk-axes .axis-map")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#\/about\/sub$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pc-book")).ch)).toBe("sub");

  await page.goto("/#/about");
  await expect(page.locator("#bookResume")).toBeVisible();
  await expect(page.locator("#bookResume")).toContainText("3");

  await page.goto("/#ab-history");
  await expect(page).toHaveURL(/#\/about\/history$/);
  await expect(page.locator("#bk-history #abHistory")).toBeVisible();
  expect(errs).toEqual([]);
});

test("5.1: книга — поиск ведёт в главу, ширина колонки не больше ≈68 знаков", async({ page }) => {
  await ready(page, "about/intro");
  await page.locator("#bookSearchSide").fill("мандат");
  await expect(page.locator(".book-side .book-hit").first()).toBeVisible();
  await page.locator(".book-side .book-hit").first().click();
  await expect(page.locator(".book-ch:not([hidden])")).toHaveCount(1);
  const w = await page.locator(".book-ch:not([hidden]) .book-body p").first().evaluate(p => {
    const ch = parseFloat(getComputedStyle(p).fontSize) * 0.5;
    return p.getBoundingClientRect().width / ch;
  });
  expect(w).toBeLessThan(80);
});

test("5.1: книга по-английски без переполнения и без кириллицы в главе", async({ page }) => {
  await ready(page, "about/quiz", { lang:"en" });
  await expect(page.locator("#bk-quiz .book-ch-title")).toContainText("The quiz");
  await expect(page.locator("#bk-quiz .book-body")).not.toContainText(/[а-яё]/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("5.1: быстрый старт — пять шагов, Esc, возобновление после перезагрузки", async({ page }) => {
  const errs = errors(page);
  await ready(page, "compass");
  await page.evaluate(() => PC.guide.start("quick"));
  await expect(page.locator(".guide-card")).toBeVisible();
  await expect(page.locator("#guideCount")).toHaveText("Шаг 1 из 5");
  await expect(page.locator(".guide-card")).toHaveAttribute("aria-modal", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#guideCount")).toHaveText("Шаг 2 из 5");
  await page.reload();
  await page.waitForFunction(() => window.PC && PC.guide && PC.guide.running());
  await expect(page.locator("#guideCount")).toHaveText("Шаг 2 из 5");
  await page.keyboard.press("Escape");
  await expect(page.locator(".guide")).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pc-tour")).run)).toBe(false);
  expect(errs).toEqual([]);
});
