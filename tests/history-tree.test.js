/* ============ Тесты дерева версий (4.1) ============

   Дерево — это данные (PC.ARCS, PC.RELEASES в js/data-history.js) и
   чистая раскладка (PC.historyTree.layout в js/history-tree.js). Отрисовку
   в Node не проверить, а вот то, от чего она ломается молча, — можно:
   выпуск, пропавший из списка; узлы друг на друге; ребро, ведущее в
   никуда; перевод, оставшийся по-русски. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT } = require("./harness.js");

const FILES = ["js/data.js", "js/utils.js",
  "js/i18n-shell.js", "js/i18n-compass.js", "js/i18n-quiz.js", "js/i18n-about.js",
  "js/i18n-misc.js", "js/i18n.js",
  "js/data-history.js", "js/history-tree.js"];

/* Текущая версия — из package.json, а не зашитая строка: с каждым выпуском
   правилась бы сама проверка, а не только данные. */
const CURRENT = require("../package.json").version;

const ru = loadApp(FILES).PC;
const en = loadApp(FILES, { "pc-lang":"en" }).PC;

/* Заголовки CHANGELOG: «## [4.0 «Тиса»] — 2026-10-26» → { v:"4.0", date }.
   Имя реки в скобках к номеру не относится. Файл идёт от нового к старому. */
function changelog(){
  const text = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
  const out = [];
  for(const m of text.matchAll(/^## \[(.+?)\] — (\d{4}-\d{2}-\d{2})\s*$/gm)){
    out.push({ v:m[1].replace(/\s*«.*»\s*$/, ""), date:m[2] });
  }
  return out;
}

test("выпуски идут по возрастанию даты", () => {
  const dates = Array.from(ru.RELEASES, r => r.date);
  for(const d of dates) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(dates, dates.slice().sort(), "RELEASES должны лежать по возрастанию даты");
  assert.equal(new Set(ru.RELEASES.map(r => r.v)).size, ru.RELEASES.length, "номера выпусков повторяются");
});

test("каждый выпуск из CHANGELOG есть в дереве, с той же датой и в том же порядке", () => {
  const log = changelog().reverse();
  assert.ok(log.length >= 38, "CHANGELOG разобрался подозрительно коротко: " + log.length);
  const byV = new Map(ru.RELEASES.map(r => [r.v, r]));
  for(const e of log){
    const r = byV.get(e.v);
    assert.ok(r, `выпуск ${e.v} есть в CHANGELOG.md, но не в PC.RELEASES`);
    assert.equal(r.date, e.date, `${e.v}: дата в дереве и в CHANGELOG разная`);
  }
  /* Выпуск, которого в CHANGELOG ещё нет, допустим только один — текущий:
     запись в журнале появляется вместе с релизом. */
  const logV = new Set(log.map(e => e.v));
  for(const r of ru.RELEASES){
    if(!logV.has(r.v)) assert.ok(r.cur, `${r.v} есть в дереве, но не в CHANGELOG.md и не помечен текущим`);
  }
  assert.deepEqual(Array.from(ru.RELEASES, r => r.v).filter(v => logV.has(v)), log.map(e => e.v),
    "порядок выпусков в дереве расходится с CHANGELOG.md");
});

test("у каждого выпуска и ветки есть русский и английский текст", () => {
  const cyr = /[а-яА-ЯёЁ]/;
  for(const r of ru.RELEASES){
    assert.ok(String(r.s || "").trim(), `${r.v}: пуст s`);
    assert.ok(String(r.sEn || "").trim(), `${r.v}: пуст sEn`);
    assert.ok(!cyr.test(r.sEn), `${r.v}: sEn не переведён`);
    assert.ok(cyr.test(r.s), `${r.v}: s не по-русски`);
    assert.equal(ru.L(r, "s"), r.s);
    assert.equal(en.L(r, "s"), r.sEn);
  }
  for(const a of ru.ARCS){
    assert.ok(a.label && a.d && a.dEn, `ветка ${a.id}: нет подписи или описания`);
    assert.ok(!cyr.test(a.dEn), `ветка ${a.id}: dEn не переведён`);
    if(a.name) assert.ok(a.nameEn && !cyr.test(a.nameEn), `ветка ${a.id}: нет английского имени`);
  }
});

test("ровно один выпуск помечен текущим и это версия из package.json", () => {
  const cur = ru.RELEASES.filter(r => r.cur);
  assert.equal(cur.length, 1);
  assert.equal(cur[0].v, CURRENT);
  assert.equal(cur[0].date, "2026-10-28");
  assert.equal(cur[0].arc, "v4");
  assert.equal(ru.RELEASES[ru.RELEASES.length - 1], cur[0], "текущий выпуск должен быть самым новым");
  assert.equal(ru.ARCS.find(a => a.id === "v4").nameEn, "Tisza");
});

test("вехи связаны с выпусками один к одному", () => {
  const used = new Map();
  for(const r of ru.RELEASES){
    if(!r.ms) continue;
    const h = ru.HISTORY.find(x => x.v === r.ms);
    assert.ok(h, `${r.v}: ms «${r.ms}» не найдена в PC.HISTORY`);
    assert.equal(h.date, r.date, `${r.v}: дата вехи «${r.ms}» не совпадает`);
    assert.ok(!used.has(r.ms), `веха «${r.ms}» привязана дважды`);
    used.set(r.ms, r.v);
  }
  for(const h of ru.HISTORY) assert.ok(used.has(h.v), `веха «${h.v}» не привязана ни к одному выпуску`);
});

test("ветки, развилки и слияния ссылаются на существующие выпуски", () => {
  const arcs = new Set(ru.ARCS.map(a => a.id));
  const idx = new Map(ru.RELEASES.map((r, i) => [r.v, i]));
  const firstOfArc = new Set();
  ru.RELEASES.forEach((r, i) => {
    assert.ok(arcs.has(r.arc), `${r.v}: неизвестная ветка ${r.arc}`);
    const first = !firstOfArc.has(r.arc);
    firstOfArc.add(r.arc);
    if(first && r.arc !== "v1") assert.ok(r.from, `${r.v}: первый выпуск ветки ${r.arc} без from`);
    for(const ref of [r.from, r.merge].filter(Boolean)){
      assert.ok(idx.has(ref), `${r.v}: ссылка на несуществующий выпуск ${ref}`);
      assert.ok(idx.get(ref) < i, `${r.v}: ссылка ${ref} ведёт вперёд по времени`);
    }
  });
  const rpc = ru.RELEASES.find(r => r.arc === "rpc");
  assert.equal(rpc.v, "RPC 2.5");
  assert.equal(rpc.from, "2.4.3");
  assert.equal(ru.RELEASES.find(r => r.v === "3.0").merge, "RPC 2.5");
});

test("раскладка: узлы не накладываются, рёбра ведут к существующим узлам", () => {
  const T = ru.historyTree;
  for(const keyOnly of [false, true]){
    const lay = T.layout(ru.RELEASES, ru.ARCS, { keyOnly });
    const expected = ru.RELEASES.filter(r => !keyOnly || T.isKey(r)).length;
    assert.equal(lay.nodes.length, expected);
    assert.equal(lay.height, expected * lay.row);

    const seen = new Set();
    lay.nodes.forEach((n, i) => {
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), `${n.id}: нечисловые координаты`);
      assert.ok(n.x > 0 && n.x < lay.width, `${n.id}: x вне дерева`);
      assert.ok(n.y > 0 && n.y < lay.height, `${n.id}: y вне дерева`);
      const key = n.x + ":" + n.y;
      assert.ok(!seen.has(key), `${n.id}: узел лежит на другом узле`);
      seen.add(key);
      if(i) assert.ok(n.y - lay.nodes[i - 1].y >= lay.row, `${n.id}: строки ближе высоты строки`);
    });
    /* новое сверху */
    assert.equal(lay.nodes[0].id, CURRENT);
    assert.equal(lay.nodes[lay.nodes.length - 1].id, "1.0.0");

    const ids = new Set(lay.nodes.map(n => n.id));
    const kinds = new Set();
    for(const e of lay.edges){
      assert.ok(ids.has(e.from) && ids.has(e.to), `ребро ${e.from} → ${e.to} ведёт в никуда`);
      assert.ok(e.y1 < e.y2, `ребро ${e.from} → ${e.to} идёт не вниз`);
      assert.match(e.d, /^M[-\d. ]+/);
      kinds.add(e.kind);
    }
    /* Всякий узел, кроме самого первого, соединён с предком */
    const children = new Set(lay.edges.map(e => e.from));
    for(const n of lay.nodes.slice(0, -1)) assert.ok(children.has(n.id), `${n.id}: нет ребра к предку`);
    assert.ok(kinds.has("fork") && kinds.has("merge"), "в дереве должны быть и развилка, и слияние");
  }
});

test("раскладка: боковая линия RPC на второй дорожке, остальное на стволе", () => {
  const lay = ru.historyTree.layout(ru.RELEASES, ru.ARCS);
  for(const n of lay.nodes) assert.equal(n.lane, n.arc === "rpc" ? 1 : 0, `${n.id}: не та дорожка`);
  const byId = Object.fromEntries(lay.nodes.map(n => [n.id, n]));
  assert.ok(byId["RPC 2.5"].x > byId["2.4.3"].x);
  /* развилка у 2.4.3, слияние у 3.0 */
  assert.ok(lay.edges.some(e => e.kind === "fork" && e.from === "RPC 2.5" && e.to === "2.4.3"));
  assert.ok(lay.edges.some(e => e.kind === "merge" && e.from === "3.0" && e.to === "RPC 2.5"));
  assert.ok(lay.edges.some(e => e.kind === "line" && e.from === "3.0" && e.to === "2.4.3"));
});

test("режим «только вехи» не рвёт линию: скрытый родитель заменяется предком", () => {
  const lay = ru.historyTree.layout(ru.RELEASES, ru.ARCS, { keyOnly:true });
  const ids = lay.nodes.map(n => n.id);
  assert.ok(!ids.includes("1.1.1"));
  assert.ok(ids.includes("RPC 2.5") && ids.includes(CURRENT));
  assert.ok(lay.edges.some(e => e.from === "1.4.0" && e.to === "1.1.0"), "1.4.0 должен тянуться к 1.1.0");
});

test("сводка считает выпуски, ветки и дни из данных", () => {
  const st = ru.historyTree.stats(ru.RELEASES, ru.ARCS);
  assert.equal(st.releases, ru.RELEASES.length);
  assert.equal(st.branches, 5);
  const first = ru.RELEASES[0].date, last = ru.RELEASES[ru.RELEASES.length - 1].date;
  assert.equal(st.days, Math.round((Date.parse(last) - Date.parse(first)) / 86400000));
});

test("все ключи словаря, которыми пользуется дерево, переведены на оба языка", () => {
  const src = fs.readFileSync(path.join(ROOT, "js/history-tree.js"), "utf8");
  const keys = new Set(Array.from(src.matchAll(/"(ab\.ht\.[\w.]+)"/g), m => m[1]));
  assert.ok(keys.size >= 15);
  for(const k of keys){
    const entry = ru.i18n.entry(k);
    assert.ok(entry, `нет ключа ${k} в словаре`);
    assert.equal(entry.length, 2, `${k}: нужны обе локали`);
    const e = entry[1];
    const flat = Array.isArray(e) ? e.join(" ") : e;
    assert.ok(flat.trim() && !/[а-яА-ЯёЁ]/.test(flat), `${k}: английский пуст или не переведён`);
  }
  const sumRu = ru.t("ab.ht.sum", { n:ru.i18n.n(39, "ab.ht.w.rel"), m:ru.i18n.n(5, "ab.ht.w.br"), k:ru.i18n.n(51, "ab.ht.w.day") });
  assert.equal(sumRu, "39 выпусков · 5 веток · за 51 день");
  const sumEn = en.t("ab.ht.sum", { n:en.i18n.n(39, "ab.ht.w.rel"), m:en.i18n.n(1, "ab.ht.w.br"), k:en.i18n.n(51, "ab.ht.w.day") });
  assert.equal(sumEn, "39 releases · 1 branch · over 51 days");
});
