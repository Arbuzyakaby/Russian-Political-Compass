"use strict";
/* Браузерные сценарии выпуска 4.3: дуэль партий, «Голосую сам», иконки,
   пружинящий отклик, дополнительные настройки в разметке, английский
   интерфейс и смена языка без потери данных. */
const { test, expect } = require("@playwright/test");
const version = require("../package.json").version;

async function ready(page, route = "compass", { lang = "ru", settings = { motion:"off" }, theme = "dark" } = {}){
  await page.addInitScript(([v, l, s, th]) => {
    localStorage.setItem("pc-welcome", v); localStorage.setItem("pc-lang", l);
    if(!localStorage.getItem("pc-theme")) localStorage.setItem("pc-theme", th);
    if(!localStorage.getItem("pc-settings")) localStorage.setItem("pc-settings", JSON.stringify(s));
  }, [version, lang, settings, theme]);
  await page.goto("/#/" + route);
  await page.waitForFunction(() => window.PC && PC.settings && PC.loadSelfVote && document.readyState === "complete");
  await page.evaluate(() => Promise.all([PC.loadSelfVote(), PC.lazy("duel")]));
}
function errors(page){ const list = []; page.on("pageerror", e => list.push(e.message)); return list; }

test("4.3: «Голосую сам» считает рейтинг, переживает перезагрузку и сбрасывается с отменой", async({ page }) => {
  const errs = errors(page);
  await ready(page, "votes");
  const card = page.locator("#selfVote");
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(".sv-count")).toHaveText("Отвечено: 0 из 28");
  await expect(card.locator(".sv-empty")).toBeVisible();
  for(const name of ["За", "Против", "За", "Воздержусь", "Против"]){
    await card.getByRole("button", { name, exact:true }).click();
  }
  await expect(card.locator(".sv-count")).toHaveText("Отвечено: 5 из 28");
  await expect(card.locator(".sv-rank li").first()).toBeVisible();
  await expect(card.locator(".sv-lead")).toContainText("Ближе всех к вам");
  /* после ответа фокус на заголовке следующего законопроекта */
  await expect(page.locator("#svTitle")).toBeFocused();
  await expect(card.locator(".sv-meta")).toContainText("Законопроект 6 из 28");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("pc-selfvote")));
  expect(Object.keys(stored.votes)).toHaveLength(5);

  await page.reload();
  await page.waitForFunction(() => window.PC && PC.loadSelfVote);
  await page.evaluate(() => PC.loadSelfVote());
  await expect(card.locator(".sv-count")).toHaveText("Отвечено: 5 из 28");
  await card.getByRole("button", { name:"Назад" }).click();
  await expect(card.getByRole("button", { name:"Против", exact:true })).toHaveAttribute("aria-pressed", "true");

  await card.getByRole("button", { name:"Начать заново" }).click();
  await expect(card.locator(".sv-count")).toHaveText("Отвечено: 0 из 28");
  await page.locator(".toast").filter({ hasText:"Ваши голоса стёрты" }).getByRole("button", { name:"Отменить" }).click();
  await expect(card.locator(".sv-count")).toHaveText("Отвечено: 5 из 28");
  expect(errs).toEqual([]);
});

test("4.3: «Голосую сам» проходится с клавиатуры до конца", async({ page }) => {
  await ready(page, "votes");
  await page.locator("#selfVote").scrollIntoViewIfNeeded();
  for(let i = 0; i < 28; i++){
    await page.locator('.sv-choice[data-choice="for"]').focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".sv-done")).toContainText("по всем 28");
  await expect(page.locator(".sv-done .btn")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".sv-meta")).toContainText("Законопроект 1 из 28");
});

test("4.3: дуэль открывается кнопкой, ячейкой матрицы и из карточки партии", async({ page }) => {
  const errs = errors(page);
  await ready(page, "votes");
  await page.locator("#duelFromVotes").click();
  const dialog = page.locator(".duel-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#duelA")).toHaveValue("er");
  await expect(dialog.locator("#duelB")).toHaveValue("kprf");
  await expect(dialog.locator(".duel-verdict")).not.toBeEmpty();
  await expect(dialog.locator(".duel-agree")).toContainText("совпадений");
  const differ = await dialog.locator(".duel-bill").count();
  expect(differ).toBeGreaterThan(0);
  /* обмен сторонами меняет только порядок, но не числа */
  const dist = await dialog.locator(".duel-dist b").textContent();
  await dialog.getByRole("button", { name:"Поменять местами" }).click();
  await expect(dialog.locator("#duelA")).toHaveValue("kprf");
  await expect(dialog.locator(".duel-dist b")).toHaveText(dist);
  /* одна и та же партия с обеих сторон — понятное сообщение, а не пустота */
  await dialog.locator("#duelB").selectOption("kprf");
  await expect(dialog.locator(".duel-empty")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator("#duelFromVotes")).toBeFocused();

  await page.locator("#votesMatrix td.ag").first().click();
  await expect(dialog).toBeVisible();
  const [a, b] = await Promise.all([dialog.locator("#duelA").inputValue(), dialog.locator("#duelB").inputValue()]);
  expect(a).not.toBe(b);
  /* законопроект из списка расхождений открывает его карточку на вкладке голосований */
  await dialog.locator("#duelB").selectOption(a === "er" ? "kprf" : "er");
  await dialog.locator(".duel-bill").first().click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".vote-card:focus")).toHaveCount(1);

  await page.goto("/#/compass");
  await page.waitForFunction(() => window.PC && PC.select);
  await page.evaluate(() => PC.select("ldpr"));
  await page.locator("#cmpDuel").click();
  await expect(dialog.locator("#duelA")).toHaveValue("ldpr");
  expect(errs).toEqual([]);
});

test("4.3: дуэль доступна из командной палитры и не вылезает за экран на 320 px", async({ page }) => {
  await ready(page, "compass");
  await page.keyboard.press("Control+k");
  await page.locator(".command-palette input").fill("Дуэль");
  await page.keyboard.press("Enter");
  await expect(page.locator(".duel-dialog")).toBeVisible();
  await page.setViewportSize({ width:320, height:700 });
  await page.evaluate(() => document.documentElement.style.setProperty("--text-k", "2"));
  const overflow = await page.locator(".duel-dialog").evaluate(d => {
    const r = d.getBoundingClientRect();
    return { left:r.left, right:r.right, scroll:d.querySelector(".duel-body").scrollWidth - d.querySelector(".duel-body").clientWidth };
  });
  expect(overflow.left).toBeGreaterThanOrEqual(-1);
  expect(overflow.right).toBeLessThanOrEqual(321);
  expect(overflow.scroll).toBeLessThanOrEqual(1);
});

test("4.3: все значки ссылаются на существующие символы спрайта и не перехватывают фокус", async({ page }) => {
  await ready(page, "compass");
  await page.locator("#settingsBtn").click();
  const report = await page.evaluate(() => {
    const missing = [], focusable = [], empty = [];
    document.querySelectorAll("svg use").forEach(u => {
      const id = (u.getAttribute("href") || "").slice(1);
      if(!document.getElementById(id)) missing.push(id);
      const svg = u.closest("svg");
      if(svg.getAttribute("aria-hidden") !== "true") focusable.push(id);
      const box = svg.getBoundingClientRect();
      if(svg.checkVisibility && svg.checkVisibility() && (box.width < 8 || box.height < 8)) empty.push(id);
    });
    return { missing, focusable, empty, count:document.querySelectorAll("svg use").length };
  });
  expect(report.count).toBeGreaterThan(20);
  expect(report.missing).toEqual([]);
  expect(report.focusable).toEqual([]);
  expect(report.empty).toEqual([]);
  /* у кнопок только со значком есть доступное имя */
  const unnamed = await page.evaluate(() => Array.from(document.querySelectorAll("button")).filter(b =>
    b.querySelector("svg.ico") && !b.textContent.trim() && !b.getAttribute("aria-label") && b.checkVisibility()).length);
  expect(unnamed).toBe(0);
});

test("4.3: пружина срабатывает после отпускания и выключается обеими настройками", async({ page }) => {
  await ready(page, "compass", { settings:{ motion:"on" } });
  const tab = page.locator("#tab-quiz");
  await tab.click();
  await expect(page.locator("#panel-quiz")).toBeVisible();
  /* класс ставится по pointerup и снимается по окончании анимации — проверяем сразу после отпускания */
  expect(await tab.evaluate(el => {
    const box = el.getBoundingClientRect(), opt = { bubbles:true, button:0, clientX:box.x + 5, clientY:box.y + 5 };
    el.dispatchEvent(new PointerEvent("pointerdown", opt)); el.dispatchEvent(new PointerEvent("pointerup", opt));
    return el.classList.contains("is-sprung") && getComputedStyle(el).animationName === "pc-release";
  })).toBe(true);
  /* настройка пружины меняет кривую, но не убирает отклик */
  await page.evaluate(() => PC.settings.set("bounce", "off"));
  await expect(page.locator("html")).toHaveAttribute("data-bounce", "off");
  const soft = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--dur-spring").trim());
  expect(soft).toBe(".28s");
  /* без анимаций модуль ничего не добавляет */
  await page.evaluate(() => PC.settings.set("motion", "off"));
  await page.locator("#tab-votes").click();
  await expect(page.locator("#tab-votes")).not.toHaveClass(/is-sprung/);
});

test("4.3: системное уменьшение движения снимает пружины", async({ browser }) => {
  const context = await browser.newContext({ reducedMotion:"reduce" });
  const page = await context.newPage();
  await ready(page, "compass", { settings:{ motion:"on" } });
  await page.locator("#tab-votes").click();
  await expect(page.locator("#tab-votes")).not.toHaveClass(/is-sprung/);
  expect(await page.locator("#tab-votes .tab-ico").evaluate(e => getComputedStyle(e).animationName)).toBe("none");
  await context.close();
});

test("4.3: дополнительные настройки переводятся вместе со страницей и сохраняются", async({ page }) => {
  await ready(page, "compass");
  await page.locator("#settingsBtn").click();
  await page.locator("#setting-convDefault").selectOption("7", { force:true });
  await page.locator("#setting-startTab").selectOption("votes", { force:true });
  expect(await page.evaluate(() => [PC.settings.get("convDefault"), PC.settings.get("startTab")])).toEqual(["7", "votes"]);
  await expect(page.locator('label[for="setting-startTab"]')).toHaveText("Вкладка при открытии");
  await page.evaluate(() => localStorage.setItem("pc-lang", "en"));
  await page.goto("/?lang=en#/compass");
  await page.waitForFunction(() => window.PC && PC.settings);
  await expect(page.locator('label[for="setting-startTab"]')).toHaveText("Start tab");
  await expect(page.locator('#setting-startTab option[value="last"]')).toHaveText("Last visited");
  expect(await page.evaluate(() => [PC.settings.get("convDefault"), PC.settings.get("startTab")])).toEqual(["7", "votes"]);
});

test("4.3: смена языка не теряет голоса, партии и ответы теста", async({ page }) => {
  await ready(page, "votes");
  await page.locator("#selfVote").scrollIntoViewIfNeeded();
  await page.locator('.sv-choice[data-choice="against"]').click();
  await page.locator('.sv-choice[data-choice="for"]').click();
  await page.evaluate(() => { localStorage.setItem("pc-quiz-answers", JSON.stringify({ e1:2, e2:-1 })); });
  await page.goto("/?lang=en#/votes");
  await page.waitForFunction(() => window.PC && PC.loadSelfVote);
  await page.evaluate(() => PC.loadSelfVote());
  await expect(page.locator(".sv-count")).toHaveText("Answered: 2 of 28");
  await expect(page.locator("#svHead")).toHaveText("Cast your own votes");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pc-quiz-answers")).e1)).toBe(2);
});

test("4.3: английский интерфейс без русского текста в разделах, окнах и подсказках", async({ page }) => {
  await ready(page, "compass", { lang:"en" });
  const cyrillic = async () => page.evaluate(() => {
    const bad = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const n = walker.currentNode, el = n.parentElement;
      if(!el || el.closest("script,style,[lang='ru'],#langSeg,.foot-rose,.sr-only[data-ru]") || !el.checkVisibility()) continue;
      if(/[А-Яа-яЁё]/.test(n.textContent)) bad.push(n.textContent.trim().slice(0, 60));
    }
    document.querySelectorAll("[aria-label],[title],[placeholder]").forEach(el => {
      if(!el.checkVisibility() || el.closest("#langSeg")) return;
      for(const a of ["aria-label", "title", "placeholder"]){
        const v = el.getAttribute(a);
        if(v && /[А-Яа-яЁё]/.test(v)) bad.push(a + ": " + v.slice(0, 60));
      }
    });
    return bad;
  });
  for(const tab of ["compass", "quiz", "votes", "party", "about"]){
    await page.locator("#tab-" + tab).click();
    await page.waitForTimeout(150);
    expect(await cyrillic(), tab).toEqual([]);
  }
  await page.evaluate(() => PC.duel.open("er", "ldpr"));
  expect(await cyrillic(), "duel").toEqual([]);
  await page.keyboard.press("Escape");
  await page.locator("#settingsBtn").click();
  for(const panel of ["look", "interface", "motion", "readability", "nav", "privacy", "srpc", "general"]){
    await page.evaluate(id => PC.settings.selectPanel(id), panel);
    expect(await cyrillic(), "settings:" + panel).toEqual([]);
  }
});

test("4.3: шесть тем — новые разделы читаются и не роняют страницу", async({ page }) => {
  const errs = errors(page);
  await ready(page, "votes");
  for(const theme of ["dark", "light", "paper", "alaska", "neon", "fireplace"]){
    await page.evaluate(th => localStorage.setItem("pc-theme", th), theme);
    await page.reload();
    await page.waitForFunction(() => window.PC && PC.lazy && document.readyState === "complete");
    await page.evaluate(() => PC.lazy("duel"));
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    /* Цвета приводятся к RGB через canvas: темы задают их и в oklab()/color(). */
    const contrast = await page.locator("#svHead").evaluate(el => {
      const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently:true });
      const rgba = c => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data); };
      const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; })
        .reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
      let node = el, back = null;
      while(node){ const c = rgba(getComputedStyle(node).backgroundColor); if(c[3] > 200){ back = c; break; } node = node.parentElement; }
      /* фон страницы — градиент на body; без сплошного цвета берётся крайний по схеме темы */
      back = back || (document.documentElement.dataset.scheme === "light" ? [255, 255, 255, 255] : [0, 0, 0, 255]);
      const a = lum(rgba(getComputedStyle(el).color)), b = lum(back);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
    expect(contrast, theme).toBeGreaterThan(3);
    await page.evaluate(() => PC.duel.open("er", "kprf"));
    await expect(page.locator(".duel-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  expect(errs).toEqual([]);
});

test("4.3: резервная копия переносит голоса «Голосую сам»", async({ page }) => {
  await ready(page, "votes");
  await page.locator("#selfVote").scrollIntoViewIfNeeded();
  await page.locator('.sv-choice[data-choice="abstain"]').click();
  const backup = await page.evaluate(() => PC.backup.make());
  expect(backup.data["pc-selfvote"]).toContain("abstain");
  await page.evaluate(() => localStorage.removeItem("pc-selfvote"));
  expect(await page.evaluate(b => PC.backup.restore(b), backup)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("pc-selfvote"))).toContain("abstain");
});
