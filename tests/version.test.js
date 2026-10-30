/* Номер версии (5.0): один и тот же везде, где он записан. Проверка не знает
   номера заранее — он берётся из package.json, — поэтому при следующем
   выпуске правятся данные, а не этот файл. До 5.0 похожая проверка жила в
   tests/tisa.test.js и знала только линию 4.x «Тиса». */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const pkg = JSON.parse(read("package.json"));
const { PC } = loadApp();
const en = loadApp(undefined, { "pc-lang":"en" }).PC;
const CYR = /[А-Яа-яЁё]/;

test("package.json, package-lock.json и PC.VERSION показывают один номер", () => {
  assert.equal(PC.VERSION, pkg.version);
  /* lock-файл локальный и в репозиторий не входит (.gitignore): в CI его нет */
  if(!fs.existsSync(path.join(ROOT, "package-lock.json"))) return;
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(lock.version, pkg.version, "package-lock.json: version");
  assert.equal(lock.packages[""].version, pkg.version, "package-lock.json: packages[\"\"].version");
});

test("подпись версии собрана из номера и имени реки на обоих языках", () => {
  assert.ok(PC.VERSION_NAME && PC.VERSION_NAME.ru && PC.VERSION_NAME.en);
  assert.doesNotMatch(PC.VERSION_NAME.en, CYR);
  assert.equal(PC.VERSION_LABEL, PC.VERSION + " «" + PC.VERSION_NAME.ru + "»");
  assert.equal(PC.versionLabel("ru"), PC.VERSION_LABEL);
  assert.equal(PC.versionLabel("en"), PC.VERSION + " “" + PC.VERSION_NAME.en + "”");
});

test("разметка: подвал, подсказка, schema.org и обе локали подсказки", () => {
  const html = read("index.html");
  assert.match(html, new RegExp('"softwareVersion": "' + PC.VERSION.replace(/\./g, "\\.") + '"'));
  const foot = html.match(/class="foot-version"[\s\S]*?>([^<]+)<\/span>/);
  assert.equal(foot[1].trim(), PC.VERSION_LABEL);
  const tip = PC.i18n.entry("foot.version.tip");
  assert.ok(tip[0].includes(PC.VERSION_LABEL));
  assert.ok(tip[1].includes(PC.VERSION) && tip[1].includes(PC.VERSION_NAME.en));
  assert.doesNotMatch(tip[1], CYR);
  assert.ok(en.t("foot.version.tip").includes(PC.VERSION_NAME.en));
});

test("верхняя запись CHANGELOG и шапки актуальных документов — текущая версия", () => {
  const head = read("CHANGELOG.md").match(/^## \[([^\]]+)\]/m);
  assert.equal(head[1], PC.VERSION_LABEL);
  for(const doc of ["docs/USER_GUIDE.md", "docs/DEVELOPMENT.md", "docs/METHODOLOGY.md", "docs/RELEASING.md"]){
    const line = read(doc).match(/\*\*Версия документации: ([^·*]+?) ·/);
    assert.ok(line, `${doc}: нет строки «Версия документации»`);
    assert.equal(line[1].trim(), PC.VERSION_LABEL, doc);
  }
  assert.ok(read("README.md").includes("**Текущая версия — " + PC.VERSION_LABEL + "**"), "README: строка «Текущая версия»");
  assert.ok(fs.existsSync(path.join(ROOT, "docs", "RELEASE_" + PC.VERSION.replace(/\./g, "_") + ".md")), "нет отчёта о выпуске в docs/");
});

test("история версий: текущий узел — эта версия, её линия носит это имя", () => {
  const { PC:h } = loadApp(["js/data.js", "js/utils.js", "js/data-history.js"]);
  const cur = h.RELEASES.filter(r => r.cur);
  assert.equal(cur.length, 1);
  assert.equal(cur[0].v, PC.VERSION);
  const line = h.ARCS.find(a => a.id === cur[0].arc);
  assert.equal(line.name, PC.VERSION_NAME.ru);
  assert.equal(line.nameEn, PC.VERSION_NAME.en);
  assert.ok(h.HISTORY.some(x => x.v === PC.VERSION_LABEL), "нет вехи текущей версии");
});

test("окно обновления: пять пунктов, разметка совпадает со словарём, слоган на месте", () => {
  const html = read("index.html");
  for(let i = 1; i <= 5; i++){
    const li = html.match(new RegExp('<li data-i18n="wel\\.up\\.l' + i + '">([^<]*)</li>'));
    assert.ok(li, `wel.up.l${i} нет в разметке`);
    assert.equal(li[1], PC.t("wel.up.l" + i), `wel.up.l${i}: разметка и словарь разошлись`);
    assert.doesNotMatch(en.t("wel.up.l" + i), CYR);
  }
  assert.equal(PC.t("slogan"), "Make Compass Great Again");
  assert.ok(read("README.md").includes("Make Compass Great Again"));
});
