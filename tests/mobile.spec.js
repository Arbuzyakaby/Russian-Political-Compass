"use strict";
const { test, expect } = require("@playwright/test");

async function ready(page, lang = "ru"){
  await page.addInitScript(version => {
    localStorage.setItem("pc-lang", "ru");
    localStorage.setItem("pc-welcome", version);
  }, require("../package.json").version);
  await page.goto("/?lang=" + lang);
  await page.waitForFunction(() => window.PC && PC.mobile &&
    [...document.querySelectorAll('#svg .node:not(.you):not(.person)')].length === PC.PARTIES.length &&
    [...document.querySelectorAll('#svg .node:not(.you):not(.person)')].every(n => n.classList.contains("in")));
  await page.evaluate(() => { PC.flyover = () => {}; PC.welcome.close(); });
  await expect(page.locator("#welcome")).toBeHidden();
}

for(const width of [320, 360, 390, 430, 768]){
  test(`разделы читаются на ${width}px в обоих языках`, async ({ page }) => {
    test.setTimeout(60000);
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.setViewportSize({ width, height:844 });
    for(const lang of ["ru", "en"]){
      await ready(page, lang);
      for(const route of ["compass", "quiz", "votes", "about"]){
        await page.evaluate(route => PC.nav.go(route), route);
        await expect(page.locator("#panel-" + route)).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
        const tab = page.locator("#tab-" + route);
        const box = await tab.boundingBox();
        expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
        if(width <= 720){
          /* 4.1: пять вкладок одной плавающей панелью у нижнего края */
          expect(await page.locator(".tabs").evaluate(e => getComputedStyle(e).gridTemplateColumns.split(" ").length)).toBe(4);
          const bar = await page.locator(".tabs").boundingBox();
          expect(bar.y + bar.height).toBeGreaterThan(page.viewportSize().height - 40);
          expect(await page.locator("#q").evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
        }
      }
    }
    expect(errors).toEqual([]);
  });
}

test("одиночное касание выбирает ближайшую партию, кнопка возвращает список", async ({ page }) => {
  await ready(page);
  await page.locator("#plot").scrollIntoViewIfNeeded();
  const point = await page.locator('#svg .node[data-id="yabloko"]').evaluate(e => {
    const m = e.getScreenCTM(); return { x:m.e, y:m.f };
  });
  await page.touchscreen.tap(point.x, point.y);
  await expect(page.locator("#sideBack")).toBeVisible();
  await expect(page.locator("#sideTitle")).toContainText("Яблоко");
  await expect(page.locator("#tip")).toBeHidden();
  await expect(page.locator("#sideBack")).toBeFocused();
  /* с 5.0 карточка — нижний лист: прижат к нижнему краю и не выше экрана */
  await expect(page.locator(".side")).toHaveClass(/is-sheet/);
  await expect(page.locator(".side")).toHaveClass(/is-open/);
  await expect(page.locator(".side-scrim")).toBeVisible();
  await page.waitForTimeout(500);
  const side = await page.locator(".side").boundingBox(), view = page.viewportSize();
  expect(side.y).toBeGreaterThanOrEqual(0);
  expect(Math.abs(side.y + side.height - view.height)).toBeLessThan(2);
  await page.locator("#sideBack").tap();
  await expect(page.locator("#sideBack")).toBeHidden();
  await expect(page.locator(".side")).not.toHaveClass(/is-sheet/);
  await expect(page.locator(".pitem")).toHaveCount(11);
});

test("движение пальца и отмена жеста не выбирают партию", async ({ page }) => {
  await ready(page);
  await page.locator("#plot").scrollIntoViewIfNeeded();
  await page.locator("#svg").evaluate(svg => {
    const m = svg.querySelector('.node[data-id="yabloko"]').getScreenCTM();
    const dispatch = (type, x, y) => svg.dispatchEvent(new PointerEvent(type, {
      bubbles:true, pointerType:"touch", pointerId:7, clientX:x, clientY:y
    }));
    dispatch("pointerdown", m.e, m.f);
    dispatch("pointermove", m.e, m.f + 70);
    dispatch("pointerup", m.e, m.f + 70);
    dispatch("pointerdown", m.e, m.f);
    dispatch("pointercancel", m.e, m.f);
    dispatch("pointerup", m.e, m.f);
  });
  await expect(page.locator("#sideBack")).toBeHidden();
});

test("графики строятся при прокрутке и сохраняют выбор после переходов", async ({ page }) => {
  await ready(page);
  await expect(page.locator("#radarBox svg")).toHaveCount(0);
  await page.locator("#radarBox").scrollIntoViewIfNeeded();
  await expect(page.locator("#radarBox .rad-values tbody tr")).toHaveCount(6);
  await page.evaluate(() => {
    const sel = document.getElementById("radarPick");
    sel.value = "kprf"; sel.dispatchEvent(new Event("change", { bubbles:true }));
    PC.nav.go("quiz"); PC.nav.go("compass");
  });
  await page.locator("#radarBox").scrollIntoViewIfNeeded();
  await expect(page.locator("#radarPick")).toHaveValue("kprf");
  await expect(page.locator("#radarBox .rad-values thead")).toContainText("КПРФ");
  await page.setViewportSize({ width:844, height:390 });
  await page.locator("#hemi").scrollIntoViewIfNeeded();
  await expect(page.locator("#hemi .seat")).toHaveCount(450);
});

test("матрица прокручивается отдельно от страницы", async ({ page }) => {
  await ready(page);
  await page.locator("#tab-votes").tap();
  const region = page.locator(".matrix-scroll");
  await region.scrollIntoViewIfNeeded();
  expect(await region.evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true);
  await region.evaluate(e => { e.scrollLeft = 100; });
  expect(await region.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("настройки, темы, крупный текст и поля поиска доступны", async ({ page }) => {
  await ready(page);
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const themes = await page.evaluate(() => PC.theme.THEMES.map(t => t.id));
  for(const theme of themes){
    await page.evaluate(theme => PC.theme.set(theme), theme);
    await expect(page.locator("#svg")).toBeVisible();
  }
  await page.evaluate(() => document.documentElement.style.setProperty("--text-k", "2"));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(await page.locator(".pitem .nm").first().evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(28);
  await page.locator("#settingsBtn").tap();
  await expect(page.locator("#setSheet")).toBeVisible();
  /* лист выезжает снизу — размеры меряются после окончания движения */
  await expect.poll(async () => { const b = await page.locator("#setSheet").boundingBox(); return Math.round(b.y + b.height); }).toBeLessThanOrEqual(845);
  const sheet = await page.locator("#setSheet").boundingBox();
  expect(sheet.x).toBeGreaterThanOrEqual(0);
  expect(sheet.x + sheet.width).toBeLessThanOrEqual(391);
  expect(sheet.y).toBeGreaterThanOrEqual(0);
  expect(sheet.y + sheet.height).toBeLessThanOrEqual(845);
  await page.locator("#setClose").tap();
  await page.locator("#q").fill("Яблоко");
  await expect(page.locator(".pitem")).toHaveCount(1);
  await page.locator("#clearBtn").tap();
  await expect(page.locator(".pitem")).toHaveCount(11);
  expect(errors).toEqual([]);
});

test("короткий тест сохраняется, результат открывается по ссылке", async ({ page }) => {
  test.setTimeout(60000);
  await ready(page);
  await page.locator("#tab-quiz").tap();
  await page.locator('.qmode[data-mode="short"]').tap();
  await page.locator("#quizStart").tap();
  for(let i = 0; i < 20; i++){
    await page.locator(".qopt").nth(3).tap();
    await page.locator("#quizNext").tap();
  }
  await expect(page.locator(".quiz-result")).toBeVisible();
  const link = await page.locator("#resLink").inputValue();
  expect(link).toMatch(/#\/result\/3s/);
  const result = await page.evaluate(() => JSON.stringify(PC.quiz.result()));
  await page.reload();
  await page.waitForFunction(() => window.PC?.mobile);
  expect(await page.evaluate(() => JSON.stringify(PC.quiz.result()))).toBe(result);
  await page.goto(link);
  await expect(page.locator(".quiz-result")).toBeVisible();
  await expect(page.locator("#qrRadar .rad-values tbody tr")).toHaveCount(6);
});

test("описание проекта остаётся доступно без JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled:false, viewport:{width:320,height:700} });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator("#project-summary")).toBeVisible();
  await expect(page.locator('[data-i18n="seo.p1"]')).toContainText("11 российских партий");
  await context.close();
});

test("экспорт по касанию отдаёт файл данных", async ({ page }) => {
  await ready(page);
  await page.locator("#exportBtn").tap();
  const pending = page.waitForEvent("download");
  await page.locator('.export-item[data-id="json"]').tap();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const stream = await download.createReadStream();
  const parts = [];
  for await(const part of stream) parts.push(part);
  const data = JSON.parse(Buffer.concat(parts).toString("utf8"));
  expect(JSON.stringify(data)).toContain("yabloko");
});

test("приветствие работает до загрузки остальных модулей", async ({ page }) => {
  // И сборка, и исходники обязаны показать рабочее приветствие рано, не дожидаясь основных модулей.
  await page.route(/\/js\/(?:site(?:\.[a-f0-9]+)?|data-parties)\.js$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto("/?lang=ru", { waitUntil:"commit" });
  await expect(page.locator("#welcome")).toBeVisible();
  await page.locator('.wel-lang[data-lang="ru"]').tap();
  await expect(page.locator("#welHello")).toBeVisible();
  await page.locator("#welQuiz").tap();
  await expect(page.locator("#panel-quiz")).toBeVisible();
  await expect(page.locator("#quizStart")).toBeVisible();
});
