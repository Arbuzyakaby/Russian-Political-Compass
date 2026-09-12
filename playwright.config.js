/* Конфигурация визуальных тестов (tests/visual.spec.js).

   Playwright не входит в зависимости проекта: страница обещает работать
   без сборки и без node_modules, и держать браузерный движок в
   обязательных зависимостях ради проверок противоречило бы этому.
   Файл лежит в репозитории, чтобы прогон настраивался одной командой,
   когда он нужен:

       npm i -D @playwright/test && npx playwright install chromium
       npm run test:visual

   Сервер поднимается сам из tests/server.js — тридцать строк на
   node:http вместо ещё одного пакета. */
"use strict";

const PORT = 4173;

module.exports = {
  testDir: "./tests",
  testMatch: /visual\.spec\.js$/,
  /* Отрисовка компаса считается по метрикам текста, а параллельные
     воркеры на одной машине дают разный тайминг загрузки шрифта —
     раскладка подписей начинает «плавать» от прогона к прогону. */
  workers: 1,
  fullyParallel: false,
  timeout: 40000,
  expect: { timeout: 7000 },
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 960 },
    /* Язык интерфейса определяется по navigator.language, а Playwright
       по умолчанию представляется как en-US — страница открывалась
       по-английски, и проверка «переключение языка» переключала с
       английского на английский, то есть не делала ничего. */
    locale: "ru-RU",
    /* Шрифты подгружаются с Google Fonts; в тестах это единственный
       внешний запрос, и он не должен превращать падение сети в падение
       проверки — раскладка проверяется на том, что доехало. */
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    colorScheme: "dark"
  },

  projects: [
    { name: "chromium", use: { browserName: "chromium" } }
  ],

  webServer: {
    command: `node tests/server.js`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 20000
  }
};
