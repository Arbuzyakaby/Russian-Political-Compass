/* Выпуск 4.4.0.4: блок «О проекте в цифрах» под вкладками (js/intro.js). */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT } = require("./harness.js");

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

test("блок: разметка сохраняет заголовок, оба абзаца описания и цифры", () => {
  assert.match(html, /id="seoIntro"/);
  assert.match(html, /id="project-summary"/);
  assert.match(html, /data-i18n="seo\.p1"/);
  assert.match(html, /data-i18n="seo\.p2"/);
  assert.match(html, /<details class="si-more" id="siMore" open>/, "без скрипта описание остаётся открытым");
  for(const k of ["parties", "seats", "votes", "quiz"]) assert.match(html, new RegExp(`data-si="${k}"`));
});

test("блок: все подписи есть на обоих языках, английские без кириллицы", () => {
  const ru = loadApp().PC;
  const en = loadApp(undefined, { "pc-lang":"en" }).PC;
  for(const key of ["seo.eyebrow", "seo.f.parties", "seo.f.seats", "seo.f.votes", "seo.f.quiz",
                    "seo.more", "seo.next", "seo.go.quiz", "seo.go.compass", "seo.go.method", "seo.method"]){
    assert.ok(ru.t(key) && ru.t(key) !== key, `нет русской подписи ${key}`);
    assert.ok(en.t(key) && en.t(key) !== key, `нет английской подписи ${key}`);
    assert.ok(!/[А-Яа-яЁё]/.test(en.t(key)), `${key}: кириллица в английском`);
    assert.notEqual(ru.t(key), en.t(key), `${key}: перевод совпадает с оригиналом`);
  }
});

test("кнопки «что дальше»: текущая вкладка не предлагается, ведут только на существующие", () => {
  const { PC } = loadApp();
  for(const tab of ["compass", "quiz", "votes", "party", "about"]){
    const list = PC.intro.nextFor(tab);
    assert.equal(list.length, 2, tab);
    assert.ok(!list.includes(tab), `${tab}: кнопка ведёт на саму себя`);
    for(const to of list) assert.ok(["compass", "quiz", "about"].includes(to), `${tab} → ${to}`);
  }
  assert.deepEqual(PC.intro.nextFor("unknown"), PC.intro.nextFor("compass"));
});

test("цифры берутся из данных", () => {
  const { PC } = loadApp();
  const c = PC.intro.counts();
  assert.equal(c.parties, PC.PARTIES.length);
  assert.equal(c.votes, PC.VOTES.length);
  assert.equal(c.seats, PC.TOTAL_SEATS);
});

test("стили блока подключены, а прежние правила не остались в mobile.css", () => {
  assert.match(html, /<link rel="stylesheet" href="css\/intro\.css">/);
  assert.match(html, /<script src="js\/intro\.js" defer><\/script>/);
  const mobile = fs.readFileSync(path.join(ROOT, "css", "mobile.css"), "utf8");
  assert.ok(!/^\.seo-intro\{/m.test(mobile));
});
