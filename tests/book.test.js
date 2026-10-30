/* ============ «О проекте» как книга (5.1) ============
   Главы, словарь на двух языках, старые якоря, оглавление в разметке,
   числа из данных и английская страница пакета. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT, DEFAULT_FILES } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const html = read("index.html");
const src = read("js/book.js");
const chapters = Array.from(src.matchAll(/\{ id:"([a-z]+)",\s*(app:true,\s*)?body:\[([^\]]*)\]/g),
  m => ({ id:m[1], app:!!m[2], body:Array.from(m[3].matchAll(/"([^"]+)"/g), x => x[1]) }));

test("книга: двенадцать глав и три приложения в заданном порядке", () => {
  assert.deepEqual(chapters.filter(c => !c.app).map(c => c.id),
    ["intro", "axes", "sub", "method", "votes", "quiz", "duel", "limits", "history", "author", "tech", "check"]);
  assert.deepEqual(chapters.filter(c => c.app).map(c => c.id), ["glossary", "cite", "faq"]);
});

test("книга: у каждого блока главы есть текст на обоих языках, английский без кириллицы", () => {
  const ru = loadApp().PC, en = loadApp(undefined, { "pc-lang":"en" }).PC;
  for(const c of chapters){
    const keys = [`bk.${c.id}.t`, `bk.${c.id}.d`];
    for(const raw of c.body){
      const m = /^(li|n|c|sign|w|s):(.*)$/.exec(raw);
      if(m && m[1] === "w") continue;
      const k = m ? m[2] : raw;
      keys.push(k.startsWith("=") ? k.slice(1) : `bk.${c.id}.${k}`);
    }
    for(const k of keys){
      assert.notEqual(ru.t(k), k, `ru: нет ${k}`);
      assert.notEqual(en.t(k), k, `en: нет ${k}`);
      assert.doesNotMatch(en.t(k).replace(/«[^»]*»/g, ""), /[А-Яа-яЁё]/, `en: кириллица в ${k}`);
      assert.notEqual(en.t(k), ru.t(k), `${k}: английский совпадает с русским`);
    }
  }
});

test("книга: ссылки между главами ведут на существующие главы", () => {
  const ids = new Set(chapters.map(c => c.id));
  const dict = read("js/i18n-book.js");
  for(const m of dict.matchAll(/\]\(ch:([a-z]+)\)/g)) assert.ok(ids.has(m[1]), `ссылка на несуществующую главу ${m[1]}`);
});

test("книга: старые якоря #ab-* ведут на главы, маршрут знает #/about/<глава>", () => {
  const anchors = { "ab-axes":"axes", "ab-src":"method", "ab-sub":"sub", "ab-votes":"votes", "ab-quiz90":"quiz",
    "ab-not":"limits", "ab-author":"author", "ab-history":"history", "ab-quiz":"check", "ab-tech":"tech" };
  for(const [a, ch] of Object.entries(anchors)) assert.ok(src.includes(`"${a}":"${ch}"`), `${a} → ${ch}`);
  const nav = read("js/nav.js");
  assert.match(nav, /\^about\\\//);
  assert.match(nav, /\^ab-\[a-z0-9\]\+\$/);
  assert.match(src, /var KEY = "pc-book";/);
});

test("книга: обложка, оглавление и введение лежат в разметке и читаются без скрипта", () => {
  for(const c of chapters) assert.ok(html.includes(`href="#/about/${c.id}"`), `в оглавлении нет главы ${c.id}`);
  assert.match(html, /id="bookCover"/);
  assert.match(html, /data-i18n="bk\.intro\.1"/);
  assert.match(html, /id="seoIntro"/);
  for(const id of ["abHistory", "abQuiz", "bookParts"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.doesNotMatch(html, /<article class="card about-card/, "старые карточки «О проекте» остались в разметке");
});

test("книга: числа живых вставок берутся из данных", () => {
  const { PC } = loadApp(DEFAULT_FILES.concat(["js/data-history.js", "js/book.js"]));
  assert.equal(typeof PC.book, "object");
  const n = PC.book.figures();
  assert.equal(n.votes, PC.VOTES.length);
  assert.equal(n.parties, PC.PARTIES.length);
  assert.equal(n.years, "2004–2025");
  assert.ok(PC.t("bk.votes.1", n).includes(String(PC.VOTES.length)));
});

test("книга: печать главы и всей книги описана в стилях", () => {
  const css = read("css/book.css");
  assert.match(css, /@media print/);
  assert.match(css, /data-book-print="book"/);
  assert.match(css, /--book-col:min\(var\(--measure/);
});

test("английская страница: сборка пишет en/index.html с английскими тегами", () => {
  const rel = read("scripts/prepare-release.cjs");
  assert.match(rel, /"en", "index\.html"/);
  assert.match(html, /hreflang="en" href="https:\/\/rupolitcompass\.website\/en\/"/);
  assert.match(read("sitemap.xml"), /<loc>https:\/\/rupolitcompass\.website\/en\/<\/loc>/);
  const built = path.join(ROOT, "dist", "en", "index.html");
  if(!fs.existsSync(built)) return;
  const enHtml = fs.readFileSync(built, "utf8");
  assert.match(enHtml, /<html lang="en"/);
  assert.match(enHtml, /<link rel="canonical" href="https:\/\/rupolitcompass\.website\/en\/">/);
  assert.doesNotMatch(enHtml.match(/<title>[^<]*<\/title>/)[0], /[А-Яа-яЁё]/);
  assert.doesNotMatch(enHtml.match(/<h1[^>]*>[^<]*/)[0], /[А-Яа-яЁё]/);
  assert.match(enHtml, /src="\.\.\/js\//);
});
