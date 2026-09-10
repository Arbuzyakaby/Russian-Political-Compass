/* ============ ВИЗУАЛЬНЫЕ ТЕСТЫ (Playwright) ============

   Обычные тесты проекта проверяют логику в Node: счёт теста, сборку
   файлов экспорта, целостность данных, полноту словаря. Всё, что
   касается отрисовки, они по определению не видят — компас, парламентская
   диаграмма, спектр и радар строятся по getBBox() и реальным размерам
   контейнера, а их в заглушках нет.

   Эти проверки закрывают именно ту дыру и намеренно не сравнивают
   скриншоты попиксельно: эталон, который краснеет от смены версии
   шрифта, перестают смотреть через неделю. Вместо этого проверяется,
   что в SVG действительно появились узлы, что их столько, сколько
   партий, что подписи не наехали друг на друга и что при переключении
   языка на поле не осталось кириллицы. Скриншоты всё же снимаются —
   но как приложение к отчёту, а не как критерий.

   Запуск (Playwright ставится отдельно, в зависимости проекта он
   не входит — иначе «страница без сборки и зависимостей» перестала бы
   быть правдой):

       npm i -D @playwright/test && npx playwright install chromium
       npm run test:visual

   Сервер поднимается сам, см. playwright.config.js. ============ */
"use strict";

const { test, expect } = require("@playwright/test");

const PARTIES = 11;          /* столько точек обязано быть на поле */
const TOTAL_SEATS = 450;

/* Появление блоков завязано на IntersectionObserver, а он срабатывает
   асинхронно: без прокрутки вниз половина карточек так и осталась бы
   прозрачной, и тест ловил бы не отрисовку, а свою же нетерпеливость. */
async function scrollThrough(page){
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for(let y = 0; y < document.body.scrollHeight; y += step){
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 120));
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.PC && document.querySelectorAll("#svg .node").length > 0);
});

test("компас отрисован: сетка, подписи осей и точка на каждую партию", async ({ page }) => {
  const svg = page.locator("#svg");
  await expect(svg).toBeVisible();

  await expect(svg.locator(".node:not(.you)")).toHaveCount(PARTIES);
  await expect(svg.locator(".axis-cap")).toHaveCount(4);
  await expect(svg.locator(".quad-cap")).toHaveCount(4);
  await expect(svg.locator(".frame")).toHaveCount(1);

  /* у каждой точки есть видимый радиус: нулевой означает, что анимация
     появления не доиграла или сорвалась, и на поле пусто при живой разметке */
  const radii = await svg.locator(".node .dot").evaluateAll(
    nodes => nodes.map(n => Number(n.getAttribute("r")))
  );
  expect(radii.length).toBe(PARTIES);
  expect(Math.min(...radii)).toBeGreaterThan(0);
});

/* Ради этого раскладчик подписей и написан: наезжающие друг на друга
   ярлыки — самый заметный дефект компаса и единственный, который логика
   поймать не может. */
test("подписи партий не накладываются друг на друга", async ({ page }) => {
  const boxes = await page.locator("#svg .node:not(.muted) .tag").evaluateAll(
    nodes => nodes.map(n => {
      const b = n.getBoundingClientRect();
      return { x1:b.left, y1:b.top, x2:b.right, y2:b.bottom, t:n.textContent };
    })
  );
  expect(boxes.length).toBe(PARTIES);

  for(let i = 0; i < boxes.length; i++){
    for(let j = i + 1; j < boxes.length; j++){
      const a = boxes[i], b = boxes[j];
      const overlap = !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
      expect(overlap, `подписи «${a.t}» и «${b.t}» перекрываются`).toBe(false);
    }
  }
});

test("парламентская диаграмма: ровно 450 мест и легенда фракций", async ({ page }) => {
  await scrollThrough(page);
  await expect(page.locator("#hemi svg .seat")).toHaveCount(TOTAL_SEATS);
  await expect(page.locator("#hemiLegend .hleg")).not.toHaveCount(0);
  await expect(page.locator(".hemi-center .big")).toContainText(String(TOTAL_SEATS));
});

test("график динамики прорисован и таблица данных повторяет его", async ({ page }) => {
  await scrollThrough(page);
  await expect(page.locator("#trend svg .trend-line").first()).toBeVisible();
  await expect(page.locator("#trendLegend .tleg")).not.toHaveCount(0);

  await page.locator("#trendTableBtn").click();
  await expect(page.locator("#trendTableWrap")).toBeVisible();
  /* в шапке таблицы столбец на каждый созыв плюс колонка с названием */
  const cols = await page.locator("#trendTable thead th").count();
  expect(cols).toBe(6);
});

test("спектр и радар: полосы выросли, у радара шесть лучей", async ({ page }) => {
  await scrollThrough(page);

  const widths = await page.locator("#spectrum .fill").evaluateAll(
    nodes => nodes.map(n => parseFloat(n.style.width) || 0)
  );
  expect(widths.length).toBeGreaterThan(0);
  expect(Math.min(...widths)).toBeGreaterThan(0);

  await expect(page.locator("#radarBox .radar .rad-spoke")).toHaveCount(6);
  await expect(page.locator("#radarBox .radar .rad-cap")).toHaveCount(6);
  await expect(page.locator("#radarBox .rad-legend .rl")).not.toHaveCount(0);
});

test("выбор партии открывает карточку с обоснованием координат", async ({ page }) => {
  await page.locator('#svg .node[data-id="kprf"]').click();
  const side = page.locator("#sideBody");
  await expect(side.locator(".detail")).toBeVisible();
  await expect(side.locator(".sub-sect .sub-row")).toHaveCount(6);
  await expect(side.locator(".nb-sect .nb-row")).toHaveCount(4);   /* три соседа плюс самый дальний */
  await expect(side.locator(".votes-sect .vote-mini li")).not.toHaveCount(0);
});

test("вкладка голосований: карточки и матрица совпадений", async ({ page }) => {
  await page.locator("#tab-votes").click();
  await expect(page.locator("#panel-votes")).toBeVisible();
  await expect(page.locator("#votesHost .vote-card")).toHaveCount(8);

  /* матрица квадратная: сколько строк, столько и столбцов данных */
  const rows = await page.locator("#votesMatrix tbody tr").count();
  const cols = await page.locator("#votesMatrix thead th").count();
  expect(rows).toBe(cols);
  expect(rows).toBeGreaterThan(3);
});

test("тест проходится до результата, и результат появляется на компасе", async ({ page }) => {
  await page.locator("#tab-quiz").click();
  await page.locator("#quizStart").click();

  for(let i = 0; i < 40; i++){
    await page.locator(".qopt").nth(3).click();       /* «скорее согласен» на всё */
    await page.locator("#quizNext").click();
  }

  await expect(page.locator(".quiz-result")).toBeVisible();
  await expect(page.locator(".mini-compass")).toBeVisible();
  await expect(page.locator(".qr-rank .qr-row")).toHaveCount(11);
  await expect(page.locator("#qrRadar .radar")).toBeVisible();

  /* ссылка на результат должна вести на маршрут, который страница понимает */
  const url = await page.locator("#resLink").inputValue();
  expect(url).toMatch(/#\/result\/[a-e-]{40}$/);

  await page.locator("#qrCompass").click();
  await expect(page.locator("#svg .node.you")).toBeVisible();
});

test("результат открывается по ссылке и не трогает чужие ответы", async ({ page }) => {
  const code = "a".repeat(20) + "e".repeat(20);
  await page.goto("/#/result/" + code);
  await page.waitForFunction(() => document.querySelector(".quiz-result"));

  await expect(page.locator("#panel-quiz")).toBeVisible();
  await expect(page.locator(".qr-shared-note")).toBeVisible();
  /* собственных ответов у этого браузера нет, и чужая ссылка их не создаёт */
  const stored = await page.evaluate(() => localStorage.getItem("pc-quiz-answers"));
  expect(stored).toBeNull();
});

test("переключение языка меняет и разметку, и содержимое компаса", async ({ page }) => {
  await page.locator("#langBtn").click();
  await page.waitForFunction(() => document.documentElement.lang === "en");
  await page.waitForFunction(() => document.querySelectorAll("#svg .node").length > 0);

  await expect(page.locator("#tab-about")).toHaveText(/About/);
  await expect(page.locator(".legend")).not.toContainText(/[а-яА-Я]/);

  const caps = await page.locator("#svg .axis-cap").allTextContents();
  for(const cap of caps){
    expect(cap, `подпись оси осталась на русском: ${cap}`).not.toMatch(/[а-яА-Я]/);
  }
  await expect(page.locator("#langBtn .lang-code")).toHaveText("RU");
});

test("тёмная и светлая темы дают разный фон и обе рисуют компас", async ({ page }) => {
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.evaluate(() => window.PC.theme.set("dark"));
  const dark = await bg();
  await page.evaluate(() => window.PC.theme.set("light"));
  const light = await bg();

  expect(dark).not.toBe(light);
  await expect(page.locator("#svg .node:not(.you)")).toHaveCount(PARTIES);
});

/* Скриншоты снимаются в конце и складываются в отчёт Playwright:
   они помогают разбирать упавший прогон, но сами ничего не утверждают. */
test("снимки экрана для отчёта", async ({ page }) => {
  await scrollThrough(page);
  await page.screenshot({ path: "test-results/compass-dark.png", fullPage: true });

  await page.evaluate(() => window.PC.theme.set("light"));
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/compass-light.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/compass-mobile.png", fullPage: true });
});
