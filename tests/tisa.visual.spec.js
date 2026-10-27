"use strict";
const {test,expect}=require("@playwright/test");
const version=require("../package.json").version;
async function ready(page,route="party"){
  await page.addInitScript(version=>{localStorage.setItem("pc-welcome",version);localStorage.setItem("pc-lang","ru");localStorage.setItem("pc-theme","dark");if(!localStorage.getItem("pc-settings"))localStorage.setItem("pc-settings",JSON.stringify({motion:"off"}));},version);
  await page.goto("/#/"+route);await page.waitForFunction(()=>window.PC&&PC.settings&&PC.settings.get("dotSize")==="normal");
}
async function newParty(page,name="Союз свободных городов"){
  await ready(page);await page.getByRole("button",{name:"Создать партию ↗"}).click();await page.locator("#party-name").fill(name);await page.locator("#party-short").fill("Союз городов");await page.locator("#party-tag").fill("СГ");
}
async function step(page,n){await page.locator(".party-step").nth(n-1).click();await expect(page.locator("#partyStepTitle")).toHaveText(await page.evaluate(n=>PC.t("party.step."+n),n));}

test("Tisza: full wizard, custom marker, sharing and explicit guest save",async({page,browser})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));await newParty(page);
  await step(page,2);await page.locator('.party-icon[aria-label="Эмблема 2"]').click();await page.locator('.party-swatch[aria-label="#34d399"]').click();
  await step(page,3);await page.locator(".party-direct summary").click();await page.locator("#party-direct-x").fill("-2");await page.locator("#party-direct-y").fill("-3");await expect(page.locator("#partyLive")).toContainText("X -2.0");
  await page.locator(".party-mini-live").focus();await page.keyboard.press("ArrowRight");await expect(page.locator("#partyLive")).toContainText("X -1.5");
  await step(page,4);await page.locator("#party-summary").fill("Города, открытые людям.");await page.getByRole("button",{name:"Добавить тезис"}).click();await page.getByRole("textbox",{name:"Тезис 1"}).fill("Прямые выборы мэров");
  await step(page,5);await page.locator(".party-vote").first().getByRole("button",{name:"Против",exact:true}).click();await expect(page.locator("#partyMatches")).toContainText("100%");
  await step(page,6);await page.locator("#party-seats").fill("98");await page.getByLabel("Добавить в гипотетическую палату").check();await page.getByRole("button",{name:"Сохранить партию",exact:true}).click();await expect(page.locator(".party-collection .party-card")).toHaveCount(1);
  await page.getByRole("button",{name:"На компас",exact:true}).click();await expect(page.locator("#svg .my-party")).toHaveCount(1);await expect(page.locator("#sideBody")).toContainText("Прямые выборы мэров");
  await page.evaluate(()=>Object.defineProperty(navigator,"share",{configurable:true,value:async data=>{window.__partyShare=data;}}));await page.locator("#sideBody").getByRole("button",{name:"Поделиться",exact:true}).click();const url=await page.evaluate(()=>window.__partyShare.url);expect(url).toContain("#/party/view/P1.");
  const context=await browser.newContext();const guest=await context.newPage();await guest.goto(url);await expect(guest.locator("#welcome")).toBeHidden();await expect(guest.locator("#partyRoot")).toContainText("Чужая партия");expect(await guest.evaluate(()=>localStorage.getItem("pc-my-parties"))).toBeNull();await guest.getByRole("button",{name:"Сохранить к себе"}).click();expect(await guest.evaluate(()=>JSON.parse(localStorage.getItem("pc-my-parties")).list.length)).toBe(1);await context.close();expect(errors).toEqual([]);
});

test("Tisza: import, undo deletion, export JSON and collection limit",async({page})=>{
  await ready(page);const raw=await page.evaluate(()=>({format:"politcompass-parties",v:1,list:[PC.partyModel.normalize({name:"Импортированная",tag:"ИМ",sub:PC.partyModel.toSub(1,2)}),{garbage:true}]}));
  await page.locator("#partyImport").setInputFiles({name:"parties.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(raw))});await expect(page.locator(".party-collection .party-card")).toHaveCount(1);await expect(page.locator(".toasts")).toContainText("Добавлено 1, пропущено 1");
  await page.getByRole("button",{name:"Удалить",exact:true}).click();await expect(page.locator(".party-collection .party-card")).toHaveCount(0);await page.locator(".toast").filter({hasText:"Партия удалена"}).getByRole("button",{name:"Отменить"}).click();await expect(page.locator(".party-collection .party-card")).toHaveCount(1);
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Экспорт коллекции"}).click();const file=await download;expect(file.suggestedFilename()).toBe("my-parties.json");
  for(let i=0;i<5;i++)await page.getByRole("button",{name:"Дублировать",exact:true}).first().click();await page.getByRole("button",{name:"Дублировать",exact:true}).first().click();await expect(page.locator(".party-collection .party-card")).toHaveCount(6);await expect(page.locator(".toasts")).toContainText("В коллекции уже 6 партий");
});

test("Tisza: user strings remain text in cards, selectors, radar and SVG",async({page})=>{
  await newParty(page,'<img src=x onerror="window.hacked=1">');await page.locator("#party-short").fill("<script>alert(1)</script>");await step(page,6);await page.getByRole("button",{name:"Сохранить партию",exact:true}).click();await page.getByRole("button",{name:"На компас",exact:true}).click();
  await expect(page.locator("#sideBody img,#sideBody script")).toHaveCount(0);expect(await page.evaluate(()=>window.hacked)).toBeUndefined();
  const report=await page.evaluate(()=>{const svg=PC.exporter.partyCardSVG(PC.partyModel.list()[0]);return{markup:new XMLSerializer().serializeToString(svg),text:svg.textContent};});expect(report.text).toContain("<img");expect(report.markup).not.toContain("<img");expect(report.markup).toContain("&lt;img");
  await page.locator("#radarBox").scrollIntoViewIfNeeded();await expect(page.locator('#radarPick option[value="u1"]')).toHaveText("<script>alert(1)</script>".slice(0,24));
});

test("Tisza: exports reflect layer settings and card PNG is a real image",async({page})=>{
  await newParty(page);await step(page,6);const download=page.waitForEvent("download");await page.getByRole("button",{name:"Скачать PNG"}).click();const png=await download;expect(png.suggestedFilename()).toBe("my-party.png");const stream=await png.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const data=Buffer.concat(chunks);expect(data.subarray(1,4).toString()).toBe("PNG");expect(data.readUInt32BE(16)).toBe(1800);
  const report=await page.evaluate(()=>{PC.nav.go("compass");PC.settings.set("labels","off");PC.settings.set("grid","off");PC.settings.set("quads","off");const xml=PC.exporter.compassSVG();const doc=new DOMParser().parseFromString(xml,"image/svg+xml");return{errors:doc.querySelectorAll("parsererror").length,label:doc.querySelector(".node .tag").style.display,grid:doc.querySelector(".grid-minor").style.display,quad:doc.querySelector(".quad").style.display,ring:doc.querySelector(".origin-ring")?.getAttribute("style"),xml};});expect(report.errors).toBe(0);expect(report.label).toBe("none");expect(report.grid).toBe("none");expect(report.quad).toBe("none");expect(report.ring).toBeTruthy();
});

test("Tisza: palette, history, skip link and settings survive keyboard use",async({page})=>{
  await ready(page,"compass");await page.keyboard.press("Control+k");await page.getByRole("combobox",{name:"Куда перейдём?"}).fill("Моя партия");await page.keyboard.press("Enter");await expect(page.locator("#panel-party")).toBeVisible();await page.evaluate(()=>PC.nav.go("votes"));await page.goBack();await expect(page.locator("#panel-party")).toBeVisible();
  const hash=await page.evaluate(()=>location.hash);await page.locator(".skip-link").focus();await page.keyboard.press("Enter");expect(await page.evaluate(()=>location.hash)).toBe(hash);await expect(page.locator("#panel-party")).toBeFocused();
  await page.locator("#settingsBtn").click();await page.locator(".settings-search").fill("Размер точек");await page.locator("#setting-dotSize").selectOption("large");await expect(page.locator('[data-setting="dotSize"]')).toHaveClass(/is-modified/);await expect(page.locator("html")).toHaveAttribute("data-dot-size","large");
  await page.locator(".settings-search").fill("");await page.evaluate(()=>PC.settings.selectPanel("general"));const download=page.waitForEvent("download");await page.getByRole("button",{name:"Скачать резервную копию"}).click();expect((await download).suggestedFilename()).toContain("backup");
  expect(await page.evaluate(()=>{const data=PC.tisza.backup();return PC.tisza.validateBackup(data)&&!PC.tisza.validateBackup({format:data.format,v:2,data:{}});})).toBe(true);
});

test("Tisza: empty quiz, damaged links, guest mode and radar selection regressions",async({page})=>{
  await ready(page,"quiz");await page.locator('.qmode[data-mode="short"]').click();await page.locator("#quizStart").click();for(let i=0;i<20;i++)await page.locator("#quizSkip").click();await expect(page.locator(".toasts")).toContainText("ответьте хотя бы на один вопрос");expect(await page.evaluate(()=>localStorage.getItem("pc-quiz-result"))).toBeNull();
  await page.evaluate(()=>location.hash="#/result/3sBAD");await expect(page.locator(".toasts")).toContainText("ссылка повреждена");
  await page.evaluate(()=>PC.nav.go("compass"));await page.locator("#radarBox").scrollIntoViewIfNeeded();await expect(page.locator('#radarPick option[value="kprf"]')).toHaveCount(1);await page.locator("#radarPick").evaluate(e=>{e.value="kprf";e.dispatchEvent(new Event("change"));});await page.evaluate(()=>{PC.nav.go("votes");PC.nav.go("compass");});await page.locator("#radarBox").scrollIntoViewIfNeeded();await expect(page.locator("#radarPick")).toHaveValue("kprf");
});

test("Tisza: SRPC layouts, stage details, cycle, persisted zoom and SVG export",async({page})=>{
  await ready(page,"srpc");await expect(page.locator("#srpcStage")).toBeVisible();await expect(page.locator(".srpcf-card")).toHaveCount(6);await page.getByRole("combobox",{name:"Раскладка",exact:true}).selectOption("line");
  await expect.poll(()=>page.locator(".srpcf-card").evaluateAll(cards=>cards.every((c,i)=>i===0||c.offsetLeft>=cards[i-1].offsetLeft+cards[i-1].offsetWidth))).toBe(true);
  for(const layout of ["column","circle","snake"]){await page.getByRole("combobox",{name:"Раскладка",exact:true}).selectOption(layout);await expect.poll(()=>page.locator(".srpcf-card").evaluateAll(cards=>cards.every((a,i)=>cards.slice(i+1).every(b=>a.offsetLeft+a.offsetWidth<=b.offsetLeft||b.offsetLeft+b.offsetWidth<=a.offsetLeft||a.offsetTop+a.offsetHeight<=b.offsetTop||b.offsetTop+b.offsetHeight<=a.offsetTop)))).toBe(true);}
  await page.getByRole("button",{name:"Пауза",exact:true}).click();await expect(page.locator("#srpcStage")).toHaveAttribute("data-paused","true");await page.getByRole("button",{name:"Шаг",exact:true}).click();await page.keyboard.press("1");await page.keyboard.press("Enter");await expect(page.locator(".srpcf-detail")).toContainText("Файлы этой загрузки");await page.locator(".srpcf-detail").getByRole("button").click();await page.getByRole("button",{name:"Вписать",exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("pc-srpc-layout")).scale)).toBeLessThanOrEqual(1);
  const download=page.waitForEvent("download");await page.locator(".srpcf-toolbar").getByRole("button",{name:"SVG",exact:true}).click();expect((await download).suggestedFilename()).toBe("srpc-workbench.svg");await page.keyboard.press("Escape");await expect(page.locator("#srpcStage")).toBeHidden();
});

test("Tisza: easter eggs respect their switch and record discoveries",async({page})=>{
  await ready(page,"compass");await page.evaluate(()=>PC.eggs.party(PC.partyModel.normalize({})));expect(await page.evaluate(()=>localStorage.getItem("pc-eggs-found"))).toBeNull();await page.evaluate(()=>PC.settings.set("eggs","on"));await page.evaluate(()=>PC.eggs.party(PC.partyModel.normalize({})));await expect(page.locator(".toasts")).toContainText("Абсолютный центр");
  await page.evaluate(()=>{PC.eggs.party(PC.partyModel.normalize({sub:PC.partyModel.toSub(10,-10)}));});await expect(page.locator(".toasts")).toContainText("У рынка теперь есть адрес");
  await page.keyboard.press("Backquote");await expect(page.locator(".egg-terminal")).toBeVisible();await page.locator(".egg-terminal input").fill("rivers");await page.keyboard.press("Enter");await expect(page.locator(".egg-terminal pre")).toContainText("Висла → Тиса");await page.locator(".egg-terminal input").fill("exit");await page.keyboard.press("Enter");
  await page.evaluate(()=>location.hash="#/teapot");await expect(page.locator(".egg-teapot")).toBeVisible();await page.evaluate(()=>PC.settings.set("eggs","off"));await expect(page.locator(".egg-teapot")).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("pc-eggs-found")))).toEqual(expect.arrayContaining(["centre","terminal","teapot"]));
});

test("Tisza: five tabs, both languages, six themes and 200% text at responsive widths",async({page})=>{
  test.setTimeout(180000);await ready(page);const errors=[];page.on("pageerror",e=>errors.push(e.message));
  for(const lang of ["ru","en"]){await page.goto("/?lang="+lang+"#/party");await page.waitForFunction(()=>window.PC&&PC.settings&&PC.settings.get("motion")==="off");for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:960});for(const theme of ["dark","light","paper","alaska","neon","fireplace"]){await page.evaluate(theme=>PC.theme.set(theme),theme);for(const tab of ["compass","quiz","votes","party","about"]){await page.evaluate(tab=>PC.nav.go(tab),tab);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+" "+width+" "+theme+" "+tab).toBe(true);}await page.evaluate(()=>{PC.nav.go("party");document.documentElement.style.setProperty("--text-k","2");});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.evaluate(()=>document.documentElement.style.removeProperty("--text-k"));}}}
  expect(errors).toEqual([]);
});

test("Tisza review: editing drafts survive reload and marker size survives delayed paint",async({page})=>{
  await newParty(page,"Сохранённая партия");await step(page,6);await page.getByRole("button",{name:"Сохранить партию",exact:true}).click();await page.getByRole("button",{name:"Изменить",exact:true}).click();await page.locator("#party-name").fill("Несохранённый черновик");await step(page,3);await page.reload();await expect(page.locator("#partyStepTitle")).toHaveText("Позиция");await step(page,1);await expect(page.locator("#party-name")).toHaveValue("Несохранённый черновик");expect(await page.evaluate(()=>PC.partyModel.list()[0].name)).toBe("Сохранённая партия");
  await page.evaluate(()=>{PC.settings.set("dotSize","large");PC.settings.set("bubbles","off");PC.nav.go("compass");});await page.reload();await expect.poll(()=>page.locator('#svg .node[data-id="er"] .dot').getAttribute("r")).toBe("14.3");await page.waitForTimeout(1000);await expect(page.locator('#svg .node[data-id="er"] .dot')).toHaveAttribute("r","14.3");
});
test("Tisza review: palette opens the exact vote and existing settings",async({page})=>{
  await ready(page,"votes");await page.locator('.votes-filter [data-topic="foreign"]').click();const title=await page.evaluate(()=>PC.VOTES[0].title);await page.keyboard.press("Control+k");await page.locator(".command-palette input").fill(title);await page.keyboard.press("Enter");await expect(page.locator('.vote-card[data-id="benefits-2004"]')).toBeFocused();await expect(page.locator('.vote-card[data-id="benefits-2004"] .vote-why')).toBeVisible();
  await page.keyboard.press("Control+k");await page.locator(".command-palette input").fill("Плотность");await expect(page.locator(".palette-result")).not.toHaveCount(0);await page.keyboard.press("Enter");await expect(page.locator("#setSheet")).toBeVisible();
});
test("Tisza review: nearest own party loads with result and guest override clears",async({page})=>{
  await ready(page,"quiz");await page.evaluate(()=>{const answers={};PC.quiz.questionsFor("short").forEach(q=>answers[q.id]=1);const result=Object.assign(PC.quiz.scoreOf(answers,PC.quiz.questionsFor("short")),{answers,mode:"short",ts:Date.now()});PC.store.setJSON("pc-quiz-result",result);PC.partyModel.save(PC.partyModel.normalize({name:"Моя близкая",sub:PC.partyModel.toSub(result.x,result.y)}),true);});await page.reload();await expect(page.locator("#quiz")).toContainText("Ближе всего из ваших партий: Моя близкая");
  await page.evaluate(()=>{const a={};PC.quiz.questionsFor("short").forEach(q=>a[q.id]=-2);PC.quiz.openShared(PC.quiz.encodeAnswers(a,"short"));});await page.locator("#qrCompass").click();expect(await page.evaluate(()=>PC.quiz.compassResult().shared)).toBe(true);await page.evaluate(()=>PC.nav.go("quiz"));await page.locator("#qrMine").click();expect(await page.evaluate(()=>!!PC.quiz.compassResult().shared)).toBe(false);
  await page.locator("#qrAgain").click();expect(await page.evaluate(()=>PC.quiz.compassResult())).toBeNull();
});
test("Tisza review: repeated auto-next answers advance exactly one question",async({page})=>{
  await ready(page,"quiz");await page.evaluate(()=>{const a={};PC.quiz.questionsFor("short").forEach(q=>a[q.id]=1);PC.store.setJSON("pc-quiz-answers",a);PC.store.set("pc-quiz-mode","short");PC.settings.set("autoNext","on");});await page.reload();await page.locator("#quizStart").click();await page.locator('.qopt[data-v="1"]').dblclick({delay:40});await expect(page.locator(".quiz-counter")).toHaveText("2 / 20");await page.waitForTimeout(350);await expect(page.locator(".quiz-counter")).toHaveText("2 / 20");
});
test("Tisza review: privacy erase removes the open draft from memory and storage",async({page})=>{await newParty(page,"Удалить этот черновик");await page.locator("#settingsBtn").click();await page.evaluate(()=>PC.settings.selectPanel("privacy"));await page.getByRole("button",{name:"Сбросить все локальные данные"}).click();expect(await page.evaluate(()=>localStorage.getItem("pc-party-draft"))).toBeNull();await page.locator("#setClose").click();await expect(page.locator(".party-hero")).toBeVisible();await page.getByRole("button",{name:"Создать партию ↗"}).click();await expect(page.locator("#party-name")).toHaveValue("");});
/* Обновление с прошлой линии на текущую: приветствие называет выпуск и
   перечисляет изменения. Ни номер, ни пункты не зашиты в тест — они берутся
   из package.json и словаря (wel.up.l1…l5), чтобы проверка не правилась
   вместе с каждым выпуском. */
test("Tisza: update from the previous line to the current one keeps its release heading after app initialization",async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem("pc-welcome","3.2");
    localStorage.setItem("pc-lang","ru");
  });
  await page.goto("/");
  await page.waitForFunction(()=>window.PC&&PC.settings&&PC.settings.get("dotSize")==="normal");
  await expect(page.locator("#welTitle")).toHaveText("Кое-что изменилось");
  await expect(page.locator("#welEyebrow")).toContainText(await page.evaluate(()=>PC.versionLabel("ru")));
  const news=await page.evaluate(()=>[1,2,3,4,5].map(n=>PC.t("wel.up.l"+n)));
  for(const line of news)await expect(page.locator("#welNews")).toContainText(line);
  await page.goto("/?lang=en#/about");
  await expect(page.locator(".foot-version")).toHaveText(await page.evaluate(()=>PC.versionLabel("en")));
  await expect(page.locator("#welTitle")).toHaveText("A few things have changed");
});
test("Tisza: rivers, night session, uniform answers and perfect pipeline are discoverable",async({page})=>{await ready(page,"compass");await page.locator("#q").fill("tisza");expect(await page.evaluate(()=>localStorage.getItem("pc-eggs-found"))).toBeNull();await page.evaluate(()=>{Date.prototype.getHours=()=>3;PC.settings.set("eggs","on");});await page.locator("#q").fill("тиса");await expect(page.locator(".site-footer .egg-night")).toHaveCount(1);await page.evaluate(()=>{document.querySelector(".foot-version").click();document.querySelector(".foot-version").click();document.querySelector(".foot-version").click();document.querySelector(".foot-version").click();document.querySelector(".foot-version").click();const a={};PC.quiz.questionsFor("short").forEach(q=>a[q.id]=1);PC.eggs.quiz(a);PC.srpc.open();});await page.getByRole("combobox",{name:"Раскладка",exact:true}).selectOption("line");await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("pc-eggs-found")||"[]"))).toEqual(expect.arrayContaining(["night","river","rivers","agree","pipeline"]));await page.evaluate(()=>PC.settings.set("eggs","off"));await expect(page.locator(".egg-night")).toHaveCount(0);});

/* Предупреждение «слабо выделяется» должно стоять только у цветов, которые
   почти сливаются с фоном темы. Раньше оно появлялось у каждого цвета палитры
   на светлых темах: яркость фона бралась условно, а палитра вся пастельная. */
test("Tisza: party colour warning appears only for colours that blend into the theme background",async({page})=>{
  await ready(page,"party");
  await page.getByRole("button",{name:/Создать партию/}).click();
  await page.locator("#party-name").fill("Цвет");
  await page.locator("#party-short").fill("Цвет");
  await page.locator("#party-tag").fill("ЦВ");
  await page.locator(".party-step").nth(1).click();
  const weak=async()=>{
    const found=[];
    for(const swatch of await page.locator(".party-swatch").all()){
      await swatch.click();
      if((await page.locator("#partyColorWarning").innerText()).includes("слабо"))found.push(await swatch.getAttribute("aria-label"));
    }
    return found;
  };
  expect(await weak()).toEqual([]);
  await page.evaluate(()=>{document.documentElement.dataset.theme="paper";document.documentElement.dataset.scheme="light";});
  const onPaper=await weak();
  expect(onPaper).toContain("#f1f5f9");
  expect(onPaper.length).toBeLessThan(8);
});
