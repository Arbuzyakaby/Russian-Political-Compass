"use strict";
/* Браузерные сценарии выпуска 4.4: загрузка по требованию, адрес дуэли,
   свои партии в дуэли, плашка «Без сети», обучение по дуэли и «Голосую сам»,
   фильтр «Голосую сам» по теме. */
const { test, expect } = require("@playwright/test");
const version = require("../package.json").version;

/* В отличие от 4.3 модули по требованию здесь не подгружаются в ready():
   проверяется именно то, что их никто не просил. */
async function ready(page, route = "compass", { lang = "ru" } = {}){
  await page.addInitScript(([v, l]) => {
    localStorage.setItem("pc-welcome", v); localStorage.setItem("pc-lang", l);
    localStorage.setItem("pc-settings", JSON.stringify({ motion:"off" }));
  }, [version, lang]);
  await page.goto("/#/" + route);
  await page.waitForFunction(() => window.PC && PC.lazy && PC.loadSelfVote && document.readyState === "complete");
}
const lazyUrl = /\/(?:duel|selfvote)(?:\.[0-9a-f]+)?\.js|\/tools(?:\.[0-9a-f]+)?\.css/;
function errors(page){ const list = []; page.on("pageerror", e => list.push(e.message)); return list; }

test("4.4: дуэль и «Голосую сам» не загружаются на старте и подгружаются по требованию", async({ page }) => {
  const errs = errors(page);
  const urls = [];
  page.on("request", r => urls.push(r.url()));
  await ready(page, "compass");
  await page.waitForTimeout(500);
  expect(urls.filter(u => lazyUrl.test(u)), "запросы на старте").toEqual([]);
  expect(await page.evaluate(() => ({ duel:typeof PC.duel, sv:typeof PC.selfVote, a:PC.lazy.loaded("duel"), b:PC.lazy.loaded("selfvote") })))
    .toEqual({ duel:"undefined", sv:"undefined", a:false, b:false });

  /* прокрутка к «Голосую сам» подгружает модуль и стили, но не дуэль */
  await page.evaluate(() => PC.nav.go("votes"));
  await page.locator("#selfVote").scrollIntoViewIfNeeded();
  await expect(page.locator("#selfVote .sv-count")).toHaveText("Отвечено: 0 из 28");
  expect(await page.evaluate(() => [PC.lazy.loaded("selfvote"), PC.lazy.loaded("duel")])).toEqual([true, false]);
  expect(urls.some(u => /selfvote/.test(u))).toBe(true);
  expect(urls.some(u => /\/duel/.test(u))).toBe(false);
  expect(await page.locator("#selfVote .sv-bill").evaluate(el => getComputedStyle(el).borderTopLeftRadius)).toBe("18px");

  /* нажатие на кнопку дуэли до загрузки не теряется: на время загрузки она занята */
  await page.route(/\/duel(?:\.[0-9a-f]+)?\.js/, async route => { await new Promise(r => setTimeout(r, 500)); await route.continue(); });
  const button = page.locator("#duelFromVotes");
  await button.click();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".duel-dialog")).toBeVisible();
  await expect(button).not.toHaveAttribute("aria-busy", "true");
  expect(await page.evaluate(() => PC.lazy.loaded("duel"))).toBe(true);
  expect(errs).toEqual([]);
});

test("4.4: дуэль открывается по адресу, ведёт на него и копирует ссылку", async({ page, context, browserName }) => {
  const errs = errors(page);
  if(browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await ready(page, "duel/er-kprf");
  const dialog = page.locator(".duel-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#duelA")).toHaveValue("er");
  await expect(dialog.locator("#duelB")).toHaveValue("kprf");
  await expect(page.locator("#panel-votes")).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe("#/duel/er-kprf");

  await dialog.locator("#duelB").selectOption("ldpr");
  expect(await page.evaluate(() => location.hash)).toBe("#/duel/er-ldpr");
  await dialog.getByRole("button", { name:"Поменять местами" }).click();
  expect(await page.evaluate(() => location.hash)).toBe("#/duel/ldpr-er");

  await dialog.getByRole("button", { name:"Скопировать адрес дуэли" }).click();
  await expect(page.locator(".toasts")).toContainText("Адрес дуэли скопирован");
  if(browserName === "chromium"){
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.evaluate(() => location.origin + "/#/duel/ldpr-er"));
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => location.hash)).toBe("#/votes");

  /* смена адреса вручную открывает дуэль заново, а уход на другой адрес закрывает окно */
  await page.evaluate(() => { location.hash = "#/duel/nl-yabloko"; });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#duelA")).toHaveValue("nl");
  await page.evaluate(() => { location.hash = "#/compass"; });
  await expect(dialog).toBeHidden();
  expect(errs).toEqual([]);
});

test("4.4: приветствие не заслоняет ссылку на дуэль", async({ page }) => {
  await page.goto("/#/duel/er-nl");
  await page.waitForFunction(() => window.PC && PC.lazy);
  await expect(page.locator(".duel-dialog")).toBeVisible();
  await expect(page.locator("#welcome")).toBeHidden();
});


test("4.4: плашка «Без сети» появляется без сети и исчезает при её возвращении", async({ page, context }) => {
  await ready(page, "compass");
  const bar = page.locator(".offline-bar");
  await expect(bar).toHaveCount(0);
  await context.setOffline(true);
  await expect(bar).toBeVisible();
  await expect(bar).toHaveText("Без сети — сайт работает из сохранённой копии");
  await expect(bar).toHaveAttribute("role", "status");
  await context.setOffline(false);
  await expect(bar).toBeHidden();
});

test("4.4: плашка «Без сети» на английском", async({ page, context }) => {
  await ready(page, "compass", { lang:"en" });
  await context.setOffline(true);
  await expect(page.locator(".offline-bar")).toHaveText("Offline — the site is running from its saved copy");
  await context.setOffline(false);
  await expect(page.locator(".offline-bar")).toBeHidden();
});

test("4.4: обучение рассказывает про дуэль и «Голосую сам» и возвращает на компас", async({ page }) => {
  const errs = errors(page);
  await ready(page, "compass");
  await page.evaluate(() => PC.tour.start());
  await expect(page.locator(".tour")).toBeVisible();
  const total = Number((await page.locator("#tourCount").innerText()).match(/из (\d+)/i)[1]);
  expect(total).toBeGreaterThanOrEqual(12);
  const seen = [];
  for(let i = 0; i < total; i++){
    await expect(page.locator("#tourCount")).toHaveText(`Шаг ${i + 1} из ${total}`, { ignoreCase:true });
    const title = await page.locator("#tourTitle").innerText();
    seen.push(title);
    if(title === "Дуэль партий" || title === "Голосую сам"){
      await expect(page.locator("#panel-votes")).toBeVisible();
      const box = await page.locator("#tourHole").boundingBox();
      expect(box.width, title).toBeGreaterThan(40);
    }
    await page.locator("#tourNext").press("ArrowRight");
  }
  expect(seen).toEqual(expect.arrayContaining(["Дуэль партий", "Голосую сам"]));
  await expect(page.locator(".tour")).toBeHidden();
  await expect(page.locator("#panel-compass")).toBeVisible();
  await expect(page.locator("#panel-votes")).toBeHidden();
  expect(await page.evaluate(() => location.hash), "тур не меняет адрес").toBe("#/compass");
  expect(errs).toEqual([]);
});

test("4.4: «Голосую сам» — фильтр по теме и переход к законопроекту в списке", async({ page }) => {
  const errs = errors(page);
  await ready(page, "votes");
  const card = page.locator("#selfVote");
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(".sv-count")).toHaveText("Отвечено: 0 из 28");
  await card.getByRole("button", { name:"Экономика" }).click();
  const econ = await page.evaluate(() => PC.VOTES.filter(v => v.topic === "econ").length);
  await expect(card.locator(".sv-count")).toHaveText(`Отвечено: 0 из ${econ}`);
  await expect(card.getByRole("button", { name:"Экономика" })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("button", { name:"Экономика" })).toBeFocused();
  await card.getByRole("button", { name:"За", exact:true }).click();
  await card.getByRole("button", { name:"Против", exact:true }).click();
  await expect(card.locator(".sv-count")).toHaveText(`Отвечено: 2 из ${econ}`);
  await expect(card.locator(".sv-lead")).toContainText("В теме «Экономика»");

  /* ответы по другим темам хранятся и после возврата к «Все» считаются */
  await card.getByRole("button", { name:"Все голосования", exact:true }).click();
  await expect(card.locator(".sv-count")).toHaveText("Отвечено: 2 из 28");
  const id = await page.evaluate(() => document.querySelector("#svTitle") && PC.VOTES.find(v => v.title === document.querySelector("#svTitle").textContent).id);
  await card.getByRole("button", { name:"К этому законопроекту в списке" }).click();
  const target = page.locator(`.vote-card[data-id="${id}"]`);
  await expect(target).toBeFocused();
  expect(errs).toEqual([]);
});

test("4.4: пасхалки к номеру версии — «4.4» в поиске и команда 444 в терминале", async({ page }) => {
  const errs = errors(page);
  await ready(page, "compass");
  await page.locator("#q").fill("4.4");
  expect(await page.evaluate(() => localStorage.getItem("pc-eggs-found")), "пасхалки выключены").toBeNull();
  await page.evaluate(() => PC.settings.set("eggs", "on"));
  await page.locator("#q").fill("");
  await page.locator("#q").fill("4.4");
  await expect(page.locator(".toasts")).toContainText("4.4: два раза по четыре");
  await page.locator("#q").fill("");
  await page.locator("#q").blur();
  await page.keyboard.press("Backquote");
  const terminal = page.locator(".egg-terminal");
  await expect(terminal).toBeVisible();
  await terminal.locator("input").fill("444");
  await page.keyboard.press("Enter");
  await expect(terminal.locator("pre")).toContainText("444 No Response");
  await terminal.locator("input").fill("help");
  await page.keyboard.press("Enter");
  await expect(terminal.locator("pre")).not.toContainText("444 · ", { timeout:1000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pc-eggs-found")))).toEqual(expect.arrayContaining(["44", "444"]));
  expect(errs).toEqual([]);
});
