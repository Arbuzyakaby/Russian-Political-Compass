/* Оболочка в браузере: палитра, история, клавиатура, SRPC, пасхалки,
   четыре вкладки на всех ширинах и темах, обновление со старой линии.
   До 5.0 — tests/tisa.visual.spec.js. */
"use strict";
const {test,expect}=require("@playwright/test");
const version=require("../package.json").version;
async function ready(page,route="compass"){
  await page.addInitScript(version=>{localStorage.setItem("pc-welcome",version);localStorage.setItem("pc-lang","ru");localStorage.setItem("pc-theme","dark");if(!localStorage.getItem("pc-settings"))localStorage.setItem("pc-settings",JSON.stringify({motion:"off"}));},version);
  await page.goto("/#/"+route);await page.waitForFunction(()=>window.PC&&PC.settings&&PC.settings.get("dotSize")==="normal");
}





test("palette, history, skip link and settings survive keyboard use",async({page})=>{
  await ready(page,"compass");await page.keyboard.press("Control+k");await page.getByRole("combobox",{name:"Куда перейдём?"}).fill("Голосования");await page.keyboard.press("Enter");await expect(page.locator("#panel-votes")).toBeVisible();await page.evaluate(()=>PC.nav.go("quiz"));await page.goBack();await expect(page.locator("#panel-votes")).toBeVisible();
  const hash=await page.evaluate(()=>location.hash);await page.locator(".skip-link").focus();await page.keyboard.press("Enter");expect(await page.evaluate(()=>location.hash)).toBe(hash);await expect(page.locator("#panel-votes")).toBeFocused();
  await page.locator("#settingsBtn").click();await page.locator(".settings-search").fill("Размер точек");await page.locator("#setting-dotSize").selectOption("large");await expect(page.locator('[data-setting="dotSize"]')).toHaveClass(/is-modified/);await expect(page.locator("html")).toHaveAttribute("data-dot-size","large");
  await page.locator(".settings-search").fill("");await page.evaluate(()=>PC.settings.selectPanel("general"));const download=page.waitForEvent("download");await page.getByRole("button",{name:"Скачать резервную копию"}).click();expect((await download).suggestedFilename()).toContain("backup");
  expect(await page.evaluate(()=>{const data=PC.backup.make();return PC.backup.validate(data)&&!PC.backup.validate({format:data.format,v:2,data:{}});})).toBe(true);
});

test("empty quiz, damaged links, guest mode and radar selection regressions",async({page})=>{
  await ready(page,"quiz");await page.locator('.qmode[data-mode="short"]').click();await page.locator("#quizStart").click();for(let i=0;i<20;i++)await page.locator("#quizSkip").click();await expect(page.locator(".toasts")).toContainText("ответьте хотя бы на один вопрос");expect(await page.evaluate(()=>localStorage.getItem("pc-quiz-result"))).toBeNull();
  await page.evaluate(()=>location.hash="#/result/3sBAD");await expect(page.locator(".toasts")).toContainText("ссылка повреждена");
  await page.evaluate(()=>PC.nav.go("compass"));await page.locator("#radarBox").scrollIntoViewIfNeeded();await expect(page.locator('#radarPick option[value="kprf"]')).toHaveCount(1);await page.locator("#radarPick").evaluate(e=>{e.value="kprf";e.dispatchEvent(new Event("change"));});await page.evaluate(()=>{PC.nav.go("votes");PC.nav.go("compass");});await page.locator("#radarBox").scrollIntoViewIfNeeded();await expect(page.locator("#radarPick")).toHaveValue("kprf");
});

test("SRPC layouts, stage details, cycle, persisted zoom and SVG export",async({page})=>{
  await ready(page,"srpc");await expect(page.locator("#srpcStage")).toBeVisible();await expect(page.locator(".srpcf-card")).toHaveCount(6);await page.getByRole("combobox",{name:"Раскладка",exact:true}).selectOption("line");
  await expect.poll(()=>page.locator(".srpcf-card").evaluateAll(cards=>cards.every((c,i)=>i===0||c.offsetLeft>=cards[i-1].offsetLeft+cards[i-1].offsetWidth))).toBe(true);
  for(const layout of ["column","circle","snake"]){await page.getByRole("combobox",{name:"Раскладка",exact:true}).selectOption(layout);await expect.poll(()=>page.locator(".srpcf-card").evaluateAll(cards=>cards.every((a,i)=>cards.slice(i+1).every(b=>a.offsetLeft+a.offsetWidth<=b.offsetLeft||b.offsetLeft+b.offsetWidth<=a.offsetLeft||a.offsetTop+a.offsetHeight<=b.offsetTop||b.offsetTop+b.offsetHeight<=a.offsetTop)))).toBe(true);}
  await page.getByRole("button",{name:"Пауза",exact:true}).click();await expect(page.locator("#srpcStage")).toHaveAttribute("data-paused","true");await page.getByRole("button",{name:"Шаг",exact:true}).click();await page.keyboard.press("1");await page.keyboard.press("Enter");await expect(page.locator(".srpcf-detail")).toContainText("Файлы этой загрузки");await page.locator(".srpcf-detail").getByRole("button").click();await page.getByRole("button",{name:"Вписать",exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("pc-srpc-layout")).scale)).toBeLessThanOrEqual(1);
  const download=page.waitForEvent("download");await page.locator(".srpcf-toolbar").getByRole("button",{name:"SVG",exact:true}).click();expect((await download).suggestedFilename()).toBe("srpc-workbench.svg");await page.keyboard.press("Escape");await expect(page.locator("#srpcStage")).toBeHidden();
});

test("easter eggs respect their switch and record discoveries",async({page})=>{
  await ready(page,"compass");await page.evaluate(()=>PC.eggs.point({x:0,y:0}));expect(await page.evaluate(()=>localStorage.getItem("pc-eggs-found"))).toBeNull();await page.evaluate(()=>PC.settings.set("eggs","on"));await page.evaluate(()=>PC.eggs.point({x:0,y:0}));await expect(page.locator(".toasts")).toContainText("Абсолютный центр");
  await page.evaluate(()=>{PC.eggs.point({x:10,y:-10});});await expect(page.locator(".toasts")).toContainText("У рынка теперь есть адрес");
  await page.keyboard.press("Backquote");await expect(page.locator(".egg-terminal")).toBeVisible();await page.locator(".egg-terminal input").fill("rivers");await page.keyboard.press("Enter");await expect(page.locator(".egg-terminal pre")).toContainText("Висла → Тиса");await page.locator(".egg-terminal input").fill("exit");await page.keyboard.press("Enter");
  await page.evaluate(()=>location.hash="#/teapot");await expect(page.locator(".egg-teapot")).toBeVisible();await page.evaluate(()=>PC.settings.set("eggs","off"));await expect(page.locator(".egg-teapot")).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("pc-eggs-found")))).toEqual(expect.arrayContaining(["centre","terminal","teapot"]));
});

test("four tabs, both languages, six themes and 200% text at responsive widths",async({page})=>{
  test.setTimeout(180000);await ready(page);const errors=[];page.on("pageerror",e=>errors.push(e.message));
  for(const lang of ["ru","en"]){await page.goto("/?lang="+lang+"#/compass");await page.waitForFunction(()=>window.PC&&PC.settings&&PC.settings.get("motion")==="off");for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:960});for(const theme of ["dark","light","paper","alaska","neon","fireplace"]){await page.evaluate(theme=>PC.theme.set(theme),theme);for(const tab of ["compass","quiz","votes","about"]){await page.evaluate(tab=>PC.nav.go(tab),tab);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+" "+width+" "+theme+" "+tab).toBe(true);}await page.evaluate(()=>{PC.nav.go("votes");document.documentElement.style.setProperty("--text-k","2");});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.evaluate(()=>document.documentElement.style.removeProperty("--text-k"));}}}
  expect(errors).toEqual([]);
});

test("palette opens the exact vote and existing settings",async({page})=>{
  await ready(page,"votes");await page.locator('.votes-filter [data-topic="foreign"]').click();const title=await page.evaluate(()=>PC.VOTES[0].title);await page.keyboard.press("Control+k");await page.locator(".command-palette input").fill(title);await page.keyboard.press("Enter");await expect(page.locator('.vote-card[data-id="benefits-2004"]')).toBeFocused();await expect(page.locator('.vote-card[data-id="benefits-2004"] .vote-why')).toBeVisible();
  await page.keyboard.press("Control+k");await page.locator(".command-palette input").fill("Плотность");await expect(page.locator(".palette-result")).not.toHaveCount(0);await page.keyboard.press("Enter");await expect(page.locator("#setSheet")).toBeVisible();
});
test("repeated auto-next answers advance exactly one question",async({page})=>{
  await ready(page,"quiz");await page.evaluate(()=>{const a={};PC.quiz.questionsFor("short").forEach(q=>a[q.id]=1);PC.store.setJSON("pc-quiz-answers",a);PC.store.set("pc-quiz-mode","short");PC.settings.set("autoNext","on");});await page.reload();await page.locator("#quizStart").click();await page.locator('.qopt[data-v="1"]').dblclick({delay:40});await expect(page.locator(".quiz-counter")).toHaveText("2 / 20");await page.waitForTimeout(350);await expect(page.locator(".quiz-counter")).toHaveText("2 / 20");
});
/* Обновление с прошлой линии на текущую: приветствие называет выпуск и
   перечисляет изменения. Ни номер, ни пункты не зашиты в тест — они берутся
   из package.json и словаря (wel.up.l1…l5), чтобы проверка не правилась
   вместе с каждым выпуском. */
test("update from the previous line to the current one keeps its release heading after app initialization",async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem("pc-welcome","3.2");
    localStorage.setItem("pc-lang","ru");
  });
  await page.goto("/");
  await page.waitForFunction(()=>window.PC&&PC.settings&&PC.settings.get("dotSize")==="normal");
  await expect(page.locator("#welTitle")).toHaveText(await page.evaluate(()=>PC.t("wel.up.h")));
  await expect(page.locator("#welEyebrow")).toContainText(await page.evaluate(()=>PC.versionLabel("ru")));
  const news=await page.evaluate(()=>[1,2,3,4,5].map(n=>PC.t("wel.up.l"+n)));
  for(const line of news)await expect(page.locator("#welNews")).toContainText(line);
  await page.goto("/?lang=en#/about");
  await expect(page.locator(".foot-version")).toHaveText(await page.evaluate(()=>PC.versionLabel("en")));
  await expect(page.locator("#welTitle")).toHaveText("Welcome back");
});
test("rivers, night session, uniform answers and perfect pipeline are discoverable",async({page})=>{await ready(page,"compass");await page.locator("#q").fill("tisza");expect(await page.evaluate(()=>localStorage.getItem("pc-eggs-found"))).toBeNull();await page.evaluate(()=>{Date.prototype.getHours=()=>3;PC.settings.set("eggs","on");});await page.locator("#q").fill("тиса");await expect(page.locator(".site-footer .egg-night")).toHaveCount(1);await page.evaluate(()=>{document.querySelector(".foot-version").click();document.querySelector(".foot-version").click();document.querySelector(".foot-version").click();document.querySelector(".foot-version").click();document.querySelector(".foot-version").click();const a={};PC.quiz.questionsFor("short").forEach(q=>a[q.id]=1);PC.eggs.quiz(a);PC.srpc.open();});await page.getByRole("combobox",{name:"Раскладка",exact:true}).selectOption("line");await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("pc-eggs-found")||"[]"))).toEqual(expect.arrayContaining(["night","river","rivers","agree","pipeline"]));await page.evaluate(()=>PC.settings.set("eggs","off"));await expect(page.locator(".egg-night")).toHaveCount(0);});

/* Предупреждение «слабо выделяется» должно стоять только у цветов, которые
   почти сливаются с фоном темы. Раньше оно появлялось у каждого цвета палитры
   на светлых темах: яркость фона бралась условно, а палитра вся пастельная. */
