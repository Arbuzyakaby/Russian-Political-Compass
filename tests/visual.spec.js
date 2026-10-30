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

   Запуск браузерных проверок:

       npm install --package-lock=false
       npx playwright install chromium webkit
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

/* Поле считается готовым не тогда, когда узлы появились в разметке, а
   тогда, когда у них есть радиус. Разница принципиальна: точки въезжают
   анимацией (setTimeout в js/compass.js), а раскладка подписей заново
   пересчитывается, когда доедет веб-шрифт, — и этот пересчёт заново
   обнуляет радиусы. Проверка, начинавшаяся сразу после появления узлов,
   попадала то до анимации, то в середину пересчёта, и падала на пустом
   месте: то «радиус 0», то «клик перехватила линия сетки», потому что у
   точки нулевого радиуса нет площади для попадания.

   Шрифты ждём отдельно и первыми: они тянутся из сети, и на медленном
   канале пересчёт приходит уже после того, как тест всё проверил. */
async function compassReady(page){
  await page.waitForFunction(() => window.PC && document.querySelectorAll("#svg .node").length > 0);
  await page.evaluate(() => (document.fonts && document.fonts.ready) || null).catch(() => {});
  await page.waitForFunction(() => {
    const dots = document.querySelectorAll("#svg .node:not(.person) circle.dot");
    return dots.length > 0 &&
      Array.prototype.every.call(dots, d => Number(d.getAttribute("r")) > 0);
  });
}

/* Приветственный экран закрывает страницу при первом заходе, а у
   каждого теста браузер чистый. Отметка «видел» ставится до проверок,
   экран закрывается: иначе любой клик по странице упирался бы в него.
   Сам экран проверяется отдельным тестом в конце файла. */
async function dismissWelcome(page){
  await page.evaluate(() => {
    localStorage.setItem("pc-welcome", window.PC.VERSION);
    // Закрытие приветствия запускает 3D-пролёт. Проекции прямоугольников
    // текста во время него не подходят для проверки пересечения подписей.
    const flyover = window.PC.flyover;
    window.PC.flyover = () => {};
    try{ window.PC.welcome.close(); }
    finally{ window.PC.flyover = flyover; }
  });
  await expect(page.locator("#welcome")).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await compassReady(page);
  await dismissWelcome(page);
});

test("компас отрисован: сетка, подписи осей и точка на каждую партию", async ({ page }) => {
  const svg = page.locator("#svg");
  await expect(svg).toBeVisible();

  await expect(svg.locator(".node:not(.you):not(.person)")).toHaveCount(PARTIES);
  await expect(svg.locator(".axis-cap")).toHaveCount(4);
  await expect(svg.locator(".quad-cap")).toHaveCount(4);
  await expect(svg.locator(".frame")).toHaveCount(1);

  /* у каждой точки есть видимый радиус: нулевой означает, что анимация
     появления не доиграла или сорвалась, и на поле пусто при живой разметке */
  const radii = await svg.locator(".node:not(.person) circle.dot").evaluateAll(
    nodes => nodes.map(n => Number(n.getAttribute("r")))
  );
  expect(radii.length).toBe(PARTIES);
  expect(Math.min(...radii)).toBeGreaterThan(0);
});

/* Ради этого раскладчик подписей и написан: наезжающие друг на друга
   ярлыки — самый заметный дефект компаса и единственный, который логика
   поймать не может. */
test("подписи партий не накладываются друг на друга", async ({ page }) => {
  const boxes = await page.locator("#svg .node:not(.muted):not(.person) .tag").evaluateAll(
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
  await page.locator("#trend").scrollIntoViewIfNeeded();
  await expect(page.locator("#trend svg .trend-line").first()).toBeVisible();
  await expect(page.locator("#trendLegend .tleg")).not.toHaveCount(0);

  await page.locator("#trendTableBtn").click();
  await expect(page.locator("#trendTableWrap")).toBeVisible();
  /* в шапке таблицы столбец на каждый созыв плюс колонка с названием */
  const cols = await page.locator("#trendTable thead th").count();
  expect(cols).toBe(7);
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
  /* Кликаем по самому кружку, а не по группе: в группу входят ещё и
     подписи, её габаритный прямоугольник смещён относительно точки, и
     центр этого прямоугольника у КПРФ приходится ровно на линию сетки —
     она и перехватывает нажатие. */
  await page.locator('#svg .node[data-id="kprf"] .dot').click();
  const side = page.locator("#sideBody");
  await expect(side.locator(".detail")).toBeVisible();
  await expect(side.locator(".sub-sect .sub-row")).toHaveCount(6);
  await expect(side.locator(".nb-sect .nb-row")).toHaveCount(4);   /* три соседа плюс самый дальний */
  await expect(side.locator(".votes-sect .vote-mini li")).not.toHaveCount(0);
});

test("вкладка голосований: карточки и матрица совпадений", async ({ page }) => {
  await page.locator("#tab-votes").click();
  await expect(page.locator("#panel-votes")).toBeVisible();
  /* Число голосований берётся из данных: записанное в тесте руками, оно
     отставало от набора при каждом пополнении — так восемь и осталось
     в проверке, когда голосований стало двадцать. */
  const voteCount = await page.evaluate(() => window.PC.VOTES.length);
  await expect(page.locator("#votesHost .vote-card")).toHaveCount(voteCount);

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
  expect(url).toMatch(/#\/result\/3[a-e-]{40}$/);

  await page.locator("#qrCompass").click();
  await expect(page.locator("#svg .node.you")).toBeVisible();
});

test("результат открывается по ссылке и не трогает чужие ответы", async ({ page }) => {
  const code = "3" + "a".repeat(20) + "e".repeat(20);
  await page.goto("/?shared=1#/result/" + code);
  await page.waitForFunction(() => document.querySelector(".quiz-result"));

  await expect(page.locator("#panel-quiz")).toBeVisible();
  await expect(page.locator(".qr-shared-note")).toBeVisible();
  /* собственных ответов у этого браузера нет, и чужая ссылка их не создаёт */
  const stored = await page.evaluate(() => localStorage.getItem("pc-quiz-answers"));
  expect(stored).toBeNull();
});

test("переключение языка меняет и разметку, и содержимое компаса", async ({ page }) => {
  /* Переключатель языка живёт в меню настроек: с 1.6 в шапке остаётся
     одна кнопка, открывающая панель. */
  await page.locator("#settingsBtn").click();
  /* Язык — в разделе «Общее»: с 2.3.1 открыта только та панель, чью
     кнопку выбрали на рельсе слева, остальные пять скрыты. */
  await page.locator('.setm-tab[data-panel="general"]').click();
  await page.locator('#langSeg [data-val="en"]').click();
  await page.waitForFunction(() => document.documentElement.lang === "en");
  await compassReady(page);

  await expect(page.locator("#tab-about")).toHaveText(/About/);
  await expect(page.locator(".legend")).not.toContainText(/[а-яА-Я]/);

  const caps = await page.locator("#svg .axis-cap").allTextContents();
  for(const cap of caps){
    expect(cap, `подпись оси осталась на русском: ${cap}`).not.toMatch(/[а-яА-Я]/);
  }
  /* панель закрылась вместе с перезагрузкой — открываем заново и
     убеждаемся, что переключатель показывает выбранный язык */
  await page.locator("#settingsBtn").click();
  await page.locator('.setm-tab[data-panel="general"]').click();
  await expect(page.locator('#langSeg [data-val="en"]')).toHaveAttribute("aria-checked", "true");
});

test("тёмная и светлая темы дают разный фон и обе рисуют компас", async ({ page }) => {
  /* Фон страницы собран из градиентов, то есть лежит в background-image;
     backgroundColor у неё прозрачен в обеих темах, и прежнее сравнение
     сводилось к «rgba(0,0,0,0) не равно rgba(0,0,0,0)». Сравниваем сам
     токен фона — именно он и переопределяется темой. */
  const bg = () => page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());

  await page.evaluate(() => window.PC.theme.set("dark"));
  const dark = await bg();
  await page.evaluate(() => window.PC.theme.set("light"));
  const light = await bg();

  expect(dark).not.toBe(light);
  await expect(page.locator("#svg .node:not(.you):not(.person)")).toHaveCount(PARTIES);
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

test("меню настроек: открывается, переключает плотность и запирает фокус", async ({ page }) => {
  await page.locator("#settingsBtn").click();
  await expect(page.locator("#setSheet")).toBeVisible();

  await page.locator('[data-set-seg="density"] [data-val="compact"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");

  /* Выключение слоя не перерисовывает поле: точки обязаны остаться
     на месте, исчезают только подписи. Сама настройка — в разделе
     «Интерфейс», не в открытом по умолчанию «Внешнем виде». */
  const before = await page.locator("#svg .node").count();
  await page.locator('.setm-tab[data-panel="interface"]').click();
  await page.locator('[data-set-switch="labels"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-labels", "off");
  expect(await page.locator("#svg .node").count()).toBe(before);
  await expect(page.locator("#svg .node .tag").first()).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(page.locator("#setSheet")).toBeHidden();

  /* Выбор переживает перезагрузку — иначе настройка была бы не настройкой,
     а разовым действием. */
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
});

test("кастомный список созывов меняет созыв на всей странице", async ({ page }) => {
  /* на странице два кастомных списка (созыв и партия для радара) —
     привязываемся к тому, внутри которого лежит нужный <select> */
  const trigger = page.locator(".xs:has(#convSelect) .xs-btn");
  await expect(trigger).toBeVisible();
  /* нативный select остаётся в разметке хранилищем состояния, но с глаз
     и из дерева доступности убран */
  await expect(page.locator("#convSelect")).toHaveAttribute("aria-hidden", "true");

  await trigger.click();
  await expect(page.locator(".xs:has(#convSelect) .xs-pop")).toBeVisible();
  await page.locator('.xs:has(#convSelect) .xs-opt', { hasText: /^IV/ }).click();

  await expect(page.locator("#convSelect")).toHaveValue("4");
  await expect(trigger).toContainText("IV");
  await expect(page.locator(".xs:has(#convSelect) .xs-pop")).toBeHidden();
  await page.waitForFunction(() => document.querySelectorAll("#svg .node").length > 0);
});

test("заявленные позиции: слой включён сразу, фокус на одной паре, чип прячет", async ({ page }) => {
  const svg = page.locator("#svg");
  await expect(svg).toHaveClass(/show-claims/);

  const pairs = page.locator("#svg .claim");
  expect(await pairs.count()).toBeGreaterThan(5);
  /* у каждой пары есть полая точка — без неё стрелка ни к чему не ведёт */
  expect(await page.locator("#svg .claim-dot").count()).toBe(await pairs.count());

  await page.locator('#svg .claim[data-id="ldpr"] .claim-dot').hover();
  await expect(page.locator("#svg .claims")).toHaveClass(/has-focus/);
  await expect(page.locator('#svg .claim[data-id="ldpr"]')).toHaveClass(/is-focus/);

  await page.locator("#claimBtn").click();
  await expect(svg).not.toHaveClass(/show-claims/);
  await expect(page.locator("#claimBtn")).toHaveAttribute("aria-pressed", "false");
});

test("карточка партии открывается со сводкой о партии", async ({ page }) => {
  await page.locator(".pitem").first().click();
  const summary = page.locator(".detail .d-summary");
  await expect(summary).toBeVisible();
  /* сводка стоит выше координат: пока неясно, что это за партия,
     числа на шкале ни о чём не говорят */
  const y = async (sel) => (await page.locator(sel).boundingBox()).y;
  expect(await y(".detail .d-summary")).toBeLessThan(await y(".detail .coords"));
});


/* ============ НОВОЕ В 2.0 ============ */

/* Шесть тем — это шесть наборов токенов, и сравнивать их попиксельно
   бессмысленно. Проверяется то, из-за чего тема ломается молча: что
   подложка действительно сменилась, что светлота выставлена отдельным
   атрибутом (на неё смотрит расчёт цвета марок на графиках), что компас
   продолжает рисоваться и что выбор переживает перезагрузку. */
test("шесть тем: подложка меняется, светлота выставляется, выбор запоминается", async ({ page }) => {
  const themes = await page.evaluate(() => Object.keys(window.PC.theme.SCHEME));
  expect(themes.length).toBe(6);

  const backgrounds = new Set();
  for(const name of themes){
    await page.evaluate(t => window.PC.theme.set(t), name);
    await expect(page.locator("html")).toHaveAttribute("data-theme", name);

    const expected = await page.evaluate(t => window.PC.theme.SCHEME[t], name);
    await expect(page.locator("html")).toHaveAttribute("data-scheme", expected);

    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
    expect(bg, `тема ${name} не задаёт подложку`).toBeTruthy();
    backgrounds.add(bg);

    expect(await page.locator("#svg .node:not(.person):not(.you)").count()).toBe(PARTIES);
  }
  /* у всех шести подложка своя — совпадение означало бы, что блок
     токенов какой-то темы не подхватился и она показывается чужой */
  expect(backgrounds.size).toBe(themes.length);

  await page.evaluate(() => window.PC.theme.set("neon"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neon");
  await expect(page.locator("html")).toHaveAttribute("data-scheme", "dark");
});

/* Стекло — единственная настройка, которую нельзя проверить по наличию
   узла: она меняет вычисленное значение свойства. Выключение обязано
   снять размытие со всех поверхностей разом, а не с половины — ради
   этого оно и собрано в один слой. */
test("выключатель стекла снимает размытие со всех поверхностей", async ({ page }) => {
  const blur = () => page.evaluate(() =>
    [".card", ".to-top", ".tip"]
      .map(sel => document.querySelector(sel))
      .filter(Boolean)
      .map(n => {
        const cs = getComputedStyle(n);
        return cs.backdropFilter || cs.webkitBackdropFilter || "none";
      }));

  const on = await blur();
  expect(on.some(v => /blur/.test(v)),
    "при включённом стекле хоть одна поверхность обязана быть размыта").toBe(true);

  await page.locator("#settingsBtn").click();
  await page.locator('[data-set-switch="glass"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-glass", "off");

  const off = await blur();
  expect(off.every(v => !/blur/.test(v)), `размытие осталось: ${off.join(" | ")}`).toBe(true);
});

/* Размер текста и скругление действуют множителями на всю шкалу сразу.
   Проверяется не выставленный атрибут, а вычисленные значения: атрибут
   без правила в CSS — это переключатель, который ничего не делает. */
test("размер текста и скругление меняют вычисленные значения", async ({ page }) => {
  const probe = () => page.evaluate(() => ({
    font: parseFloat(getComputedStyle(document.body).fontSize),
    radius: parseFloat(getComputedStyle(document.querySelector(".card")).borderTopLeftRadius)
  }));

  const base = await probe();
  await page.locator("#settingsBtn").click();

  /* Размер текста — в «Читаемости», скругление — в открытом по
     умолчанию «Внешнем виде»: переключаем раздел только для первого. */
  await page.locator('.setm-tab[data-panel="readability"]').click();
  await page.locator('[data-set-seg="textsize"] [data-val="large"]').click();
  await page.locator('.setm-tab[data-panel="look"]').click();
  await page.locator('[data-set-seg="corners"] [data-val="sharp"]').click();
  const changed = await probe();
  expect(changed.font).toBeGreaterThan(base.font);
  expect(changed.radius).toBeLessThan(base.radius);

  await page.locator('.setm-tab[data-panel="readability"]').click();
  await page.locator('[data-set-seg="textsize"] [data-val="small"]').click();
  expect((await probe()).font).toBeLessThan(base.font);
});

/* Расширенная версия теста. Девяносто вопросов вручную не кликает никто:
   ответы кладутся прямо в хранилище — заодно проверяется, что оно их
   переживает, — а тест смотрит на то, ради чего версия добавлена. */
test("расширенная версия теста: 90 вопросов, свой ярлык и метка в ссылке", async ({ page }) => {
  await page.locator("#tab-quiz").click();
  await expect(page.locator(".quiz-modes .qmode")).toHaveCount(3);

  await page.locator('.qmode[data-mode="long"]').click();
  await expect(page.locator("#tab-quiz .tab-badge")).toHaveText("90");

  await page.locator("#quizStart").click();
  await expect(page.locator(".quiz-counter")).toHaveText("1 / 90");

  const url = await page.evaluate(() => {
    const src = {};
    window.PC.QUIZ.QUESTIONS.forEach(q => { src[q.id] = 1; });
    localStorage.setItem("pc-quiz-answers", JSON.stringify(src));
    localStorage.setItem("pc-quiz-mode", "long");
    return window.PC.quiz.shareURL(src, "long");
  });
  /* метка версии обязательна: без неё девяносто ответов не отличить
     от стандартного прохождения с пропусками */
  expect(url).toMatch(/#\/result\/3x[a-e-]{90}$/);

  /* Проверяем открытие результата после полной загрузки документа. */
  await page.goto(url.replace("#/result/", "?shared=1#/result/"));
  await page.waitForFunction(() => document.querySelector(".quiz-result"));
  await expect(page.locator(".qr-version")).toContainText("90");

  /* сохранённые ответы пережили перезагрузку и остались расширенными */
  await page.goto("/#/quiz");
  await expect(page.locator("#tab-quiz .tab-badge")).toHaveText("90");
});

test("ссылка стандартной версии: формат 3 и сорок ответов без метки режима", async ({ page }) => {
  const code = "3" + "a".repeat(20) + "e".repeat(20);
  await page.goto("/?shared=1#/result/" + code);
  await page.waitForFunction(() => document.querySelector(".quiz-result"));
  await expect(page.locator(".qr-version")).toContainText("40");
});

/* Песочница коалиций: заготовка «минимальная» обязана дать большинство,
   а метка незаменимости — стоять на самой фракции, потому что решение
   «убрать эту» принимается там, а не в сводке. */
test("песочница коалиций: заготовка, тип коалиции и метка незаменимости", async ({ page }) => {
  await scrollThrough(page);
  await expect(page.locator("#coalition")).toBeVisible();

  await page.locator('.co-preset[data-preset="min"]').click();
  await expect(page.locator('#coMetrics [data-m="kind"]')).toHaveText("минимальная выигрышная");
  await expect(page.locator("#coVerdict")).not.toHaveClass(/\bno\b|\bnone\b/);

  /* число незаменимых в сводке и число меток на фракциях — одно и то же */
  const pivots = Number(await page.locator('#coMetrics [data-m="pivot"]').textContent());
  expect(pivots).toBeGreaterThan(0);
  await expect(page.locator(".co-tog .co-key:not([hidden])")).toHaveCount(pivots);

  /* «Снять все»: коалиции нет, и ни один показатель не выдумывает числа */
  await page.locator("#coClear").click();
  await expect(page.locator('#coMetrics [data-m="kind"]')).toHaveText("пусто");
  await expect(page.locator('#coMetrics [data-m="wx"]')).toHaveText("—");
  await expect(page.locator('#coMetrics [data-m="coh"]')).toHaveText("—");

  /* «Как в жизни» возвращает реальный расклад */
  await page.locator("#coReset").click();
  await expect(page.locator("#coReal")).toBeVisible();
  await expect(page.locator('.co-tog[aria-pressed="false"]')).toHaveCount(0);
});


/* ============ НОВОЕ В 2.1.1 ============ */

/* Полный путь новичка: язык → приветствие → обучение →
   страница. До 2.1.1 экран «то появлялся, то нет, иногда на английском»,
   поэтому проверяется и сама последовательность, и то, что после выбора
   языка перезагруженная страница продолжает со второго шага, а не
   показывает выбор языка снова. */
test("приветствие: выбор языка, приветствие, обучение, больше не появляется", async ({ page }) => {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  const welcome = page.locator("#welcome");
  await expect(welcome).toBeVisible();
  await expect(page.locator("#welLang")).toBeVisible();
  await expect(page.locator("#welHello")).toBeHidden();

  /* клик мимо карточки на шаге языка ничего не закрывает */
  await page.mouse.click(5, 5);
  await expect(page.locator("#welLang")).toBeVisible();

  /* Перезагрузка теперь идёт не мгновенно (см. js/welcome.js) — кнопка
     на время паузы гаснет вместе с соседкой, а не запускает переход
     сразу; дожидаемся именно смены языка, а не факта нажатия. */
  await page.locator('.wel-lang[data-lang="en"]').click();
  await expect(page.locator('.wel-lang[data-lang="en"]')).toHaveClass(/is-loading/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout:5000 });
  await expect(page.locator("#welHello")).toBeVisible();
  await expect(page.locator("#welLang")).toBeHidden();
  /* с 5.0 заголовок здоровается по времени суток — какое оно у машины с тестом, заранее неизвестно */
  await expect(page.locator("#welTitle")).toHaveText(/^(?:Good (?:morning|afternoon|evening|night)|Welcome)$/);

  await page.locator("#welTour").click();
  await expect(page.locator(".tour")).toBeVisible();
  const tourSteps = Number((await page.locator("#tourCount").innerText()).match(/of (\d+)/i)[1]);
  for(let i = 0; i < tourSteps; i++){
    await expect(page.locator("#tourCount")).toHaveText(`Step ${i + 1} of ${tourSteps}`, { ignoreCase:true });
    await expect(page.locator("#tourText")).not.toHaveText("");
    await expect(page.locator("#tourText")).not.toContainText(/[а-яё]/i);
    await page.locator("#tourNext").press("ArrowRight");
  }
  await expect(page.locator(".tour")).toBeHidden();
  await expect(welcome).toBeHidden();

  await page.reload();
  await compassReady(page);
  await expect(welcome).toBeHidden();
});

test("приветствие: шаг языка на том же языке не перезагружает страницу", async ({ page }) => {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.evaluate(() => { window.__noReload = true; });
  await page.locator('.wel-lang[data-lang="ru"]').click();
  await expect(page.locator("#welHello")).toBeVisible();
  expect(await page.evaluate(() => window.__noReload)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("pc-lang"))).toBe("ru");
});

test("сброс настроек перекрашивает меню тем", async ({ page }) => {
  await page.locator("#settingsBtn").click();
  await page.locator('.theme-chip[data-val="fireplace"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "fireplace");
  await page.locator("#setReset").click();
  await expect(page.locator('.theme-chip[data-val="system"]')).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('.theme-chip[data-val="fireplace"]')).toHaveAttribute("aria-checked", "false");
});

/* Регрессии целостности результата: черновик, завершённое прохождение
   и ссылка другого человека должны оставаться разными источниками. */
async function seedCompletedResult(page, options = {}){
  const fixture = await page.evaluate(opts => {
    const PC = window.PC;
    const mode = opts.mode || "short";
    const list = PC.quiz.questionsFor(mode);
    const saved = Object.fromEntries(list.map(q => [q.id, 1]));
    const draft = { ...saved };
    if(opts.edited) draft[list[0].id] = -2;
    const result = PC.quiz.scoreOf(saved, list);
    const code = PC.quiz.encodeAnswers(saved, mode);
    if(!opts.legacy) result.answers = { ...saved };
    localStorage.setItem("pc-quiz-mode", mode);
    localStorage.setItem("pc-quiz-answers", JSON.stringify(draft));
    localStorage.setItem("pc-quiz-result", JSON.stringify(result));
    localStorage.setItem("pc-quiz-history", JSON.stringify(opts.history ? [{ ...result, code }] : []));
    localStorage.setItem("pc-settings", JSON.stringify({ motion:"off" }));
    return { saved, draft, mode, code, coords:[PC.utils.fmt(result.x), PC.utils.fmt(result.y)] };
  }, options);
  await page.reload();
  await compassReady(page);
  await dismissWelcome(page);
  return fixture;
}

test("регрессия P1: правка черновика не меняет сохранённый результат, разбор, экспорт и профиль", async ({ page }) => {
  const fixture = await seedCompletedResult(page);
  await page.locator("#tab-quiz").click();
  const link = await page.locator("#resLink").inputValue();
  const profile = await page.locator("#qrRadar .rad-dot title").allTextContents();
  await page.locator("#qrReview").click();
  await page.locator('.qopt[data-v="-2"]').click();
  await page.locator("#quizBack").click();
  await page.locator("#quizShowResult").click();
  await expect(page.locator(".qr-coords .v")).toHaveText(fixture.coords);
  await expect(page.locator("#resLink")).toHaveValue(link);
  expect(await page.locator("#qrRadar .rad-dot title").allTextContents()).toEqual(profile);
  const check = await page.evaluate(() => {
    const PC = window.PC;
    const result = PC.quiz.result();
    const json = JSON.parse(PC.exporter.datasetJSON()).quizResult;
    return { result, json, draft:JSON.parse(localStorage.getItem("pc-quiz-answers")),
      breakdown:PC.quizCalc.axisBreakdown(result.answers, "x", PC.quiz.questionsFor(result.mode)).coord };
  });
  expect(check.draft.e1).toBe(-2);
  expect(check.result.answers).toEqual(fixture.saved);
  expect(check.json.permalink).toBe(link);
  expect(check.breakdown).toBe(check.result.x);
  await page.reload();
  await expect(page.locator(".qr-coords .v")).toHaveText(fixture.coords);
  await expect(page.locator("#resLink")).toHaveValue(link);
  await page.locator("#qrReview").click();
  await expect(page.locator('.qopt[data-v="-2"]')).toHaveAttribute("aria-pressed", "true");
});

test("регрессия P1: старый результат восстанавливается из истории без потери черновика", async ({ page }) => {
  const fixture = await seedCompletedResult(page, { legacy:true, history:true, edited:true });
  await page.locator("#tab-quiz").click();
  await expect(page.locator(".qr-coords .v")).toHaveText(fixture.coords);
  const state = await page.evaluate(() => ({
    result:window.PC.quiz.result(), draft:JSON.parse(localStorage.getItem("pc-quiz-answers"))
  }));
  expect(state.result.answers).toEqual(fixture.saved);
  expect(state.draft).toEqual(fixture.draft);
});

test("регрессия P1: невосстановимый старый результат не смешивается с новым черновиком", async ({ page }) => {
  const fixture = await seedCompletedResult(page, { legacy:true, edited:true });
  await page.locator("#tab-quiz").click();
  await expect(page.locator(".quiz-intro")).toBeVisible();
  await expect(page.locator("#quizShowResult")).toHaveCount(0);
  expect(await page.evaluate(() => window.PC.quiz.result())).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pc-quiz-answers"))))
    .toEqual(fixture.draft);
});

test("регрессия P1: системная отправка чужой карточки не раскрывает свои ответы", async ({ page }) => {
  const fixture = await seedCompletedResult(page, { mode:"long" });
  const guestCode = await page.evaluate(() => window.PC.quiz.encodeAnswers({ e1:-2 }, "short"));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable:true, value:() => true });
    Object.defineProperty(navigator, "share", { configurable:true, value:data => {
      window.__sharePayload = { url:data.url, text:data.text, files:data.files.length };
      return Promise.resolve();
    } });
  });
  await page.goto("/?share-test=1#/result/" + guestCode);
  const link = await page.locator("#resLink").inputValue();
  await page.locator("#shareSend").click();
  await expect.poll(() => page.evaluate(() => window.__sharePayload && window.__sharePayload.url)).toBe(link);
  const payload = await page.evaluate(() => window.__sharePayload);
  expect(payload.files).toBe(1);
  expect(payload.url).toContain(guestCode);
  expect(payload.url).not.toContain(fixture.code);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pc-quiz-answers"))))
    .toEqual(fixture.saved);
});

test("регрессия P2: настройки не пропускают клавиши в скрытый тест или поиск", async ({ page }) => {
  await page.locator("#tab-quiz").click();
  await page.locator("#quizStart").click();
  await page.locator("#settingsBtn").click();
  await page.locator("#setClose").press("5");
  await page.locator("#setClose").press("ArrowRight");
  await expect(page.locator(".quiz-counter")).toHaveText("1 / 40");
  await expect(page.locator('.qopt[aria-pressed="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("pc-quiz-answers"))).toBeNull();
  await page.locator("#setClose").press("Escape");
  await expect(page.locator("#setSheet")).toBeHidden();
  await page.keyboard.press("5");
  await expect(page.locator('.qopt[data-v="2"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator("#tab-compass").click();
  await page.locator('#svg .node[data-id="er"] .dot').click();
  await expect(page.locator("#sideBody .detail")).toBeVisible();
  await page.locator("#settingsBtn").click();
  await page.locator("#setClose").press("/");
  await expect(page.locator("#q")).not.toBeFocused();
  await page.locator("#setClose").press("Escape");
  await expect(page.locator("#setSheet")).toBeHidden();
  await expect(page.locator("#sideBody .detail")).toBeVisible();
});

test("регрессия P2: новая ссылка в том же документе обновляет результат и сохраняет личный тест", async ({ page }) => {
  const fixture = await seedCompletedResult(page);
  const codes = await page.evaluate(() => [
    window.PC.quiz.encodeAnswers({ e1:-2 }, "short"),
    window.PC.quiz.encodeAnswers({ e1:2 }, "long")
  ]);
  await page.evaluate(() => { window.__sameDocument = true; });
  await page.goto("/#/result/" + codes[0]);
  await expect(page.locator(".qr-version")).toContainText("20");
  await page.goto("/#/result/" + codes[1]);
  await expect(page.locator(".qr-version")).toContainText("90");
  await expect(page.locator("#resLink")).toHaveValue(new RegExp(codes[1] + "$"));
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pc-quiz-answers"))))
    .toEqual(fixture.saved);
  await page.goto("/#/quiz");
  await expect(page.locator(".qr-shared-note")).toHaveCount(0);
  await expect(page.locator(".qr-coords .v")).toHaveText(fixture.coords);
});

test("регрессия P2: явный выбор языка заменяет lang и сохраняет параметры и ссылку результата", async ({ page }) => {
  const code = await page.evaluate(() => window.PC.quiz.encodeAnswers({ e1:1 }, "short"));
  await page.goto("/?lang=en&keep=1#/result/" + code);
  for(const lang of ["ru", "en"]){
    await page.locator("#settingsBtn").click();
    await page.locator('#setRail [data-panel="general"]').click();
    await page.locator('#langSeg [data-val="' + lang + '"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    const url = new URL(page.url());
    expect(url.searchParams.get("lang")).toBe(lang);
    expect(url.searchParams.get("keep")).toBe("1");
    expect(url.hash).toBe("#/result/" + code);
    await expect(page.locator(".qr-shared-note")).toBeVisible();
  }
});
