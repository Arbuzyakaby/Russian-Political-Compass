/* Локализация. Двуязычный проект без сборки ломается тихо: забытый
   перевод не падает, а показывает читателю ключ вида "res.break.axisX"
   или, что хуже, русскую фразу посреди английского текста. Поймать это
   глазами нельзя — экранов слишком много, — поэтому проверяется
   полнота словаря и данных целиком, а не выборочно. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT } = require("./harness.js");

const ru = loadApp().PC;
const en = loadApp(undefined, { "pc-lang": "en" }).PC;

const dictSource = fs.readFileSync(path.join(ROOT, "js", "i18n.js"), "utf8");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* Ключи словаря вынимаются из исходника: сам объект наружу не отдаётся,
   и отдавать его только ради теста значило бы расширить публичный
   интерфейс модуля под нужды проверки. */
const DICT_KEYS = Array.from(
  dictSource.matchAll(/^\s{2,}"([\w.+-]+)":\s*\[/gm), m => m[1]
);

test("язык выбран и различается между двумя запусками", () => {
  assert.equal(ru.i18n.current(), "ru");
  assert.equal(en.i18n.current(), "en");
  assert.ok(ru.i18n.isRu());
  assert.ok(!en.i18n.isRu());
});

test("словарь непустой и каждый ключ переведён на оба языка", () => {
  assert.ok(DICT_KEYS.length > 200, `словарь подозрительно мал: ${DICT_KEYS.length} ключей`);
  const seen = new Set();
  for(const key of DICT_KEYS){
    assert.ok(!seen.has(key), `ключ ${key} объявлен дважды`);
    seen.add(key);

    for(const [lang, PC] of [["ru", ru], ["en", en]]){
      const value = PC.t(key);
      assert.notEqual(value, key, `${lang}: нет перевода для ${key}`);
      assert.ok(String(value).trim().length > 0, `${lang}: пустая строка у ${key}`);
    }
  }
});

/* Кириллица в английской строке — самый частый способ забыть перевод:
   ключ на месте, значение скопировано из русской колонки. Исключения
   перечислены поимённо: это имена собственные и аббревиатуры, которые
   в английском тексте остаются как есть. */
test("в английских строках не осталось русского текста", () => {
  /* lang.toggle намеренно держит подпись ДРУГОГО языка: на английской
     версии кнопка обязана предлагать «Переключить на русский», иначе
     русскоязычный посетитель, случайно попавший на английскую страницу,
     не найдёт дорогу назад. */
  const ALLOW = new Set(["lang.toggle"]);
  for(const key of DICT_KEYS){
    if(ALLOW.has(key)) continue;
    const value = String(en.t(key));
    assert.ok(!/[а-яА-ЯёЁ]/.test(value), `английская строка ${key} содержит кириллицу: ${value}`);
  }
});

test("формы множественного числа: три русских, две английских", () => {
  assert.equal(ru.i18n.pl(1, "word.seat"), "мандат");
  assert.equal(ru.i18n.pl(2, "word.seat"), "мандата");
  assert.equal(ru.i18n.pl(5, "word.seat"), "мандатов");
  assert.equal(ru.i18n.pl(11, "word.seat"), "мандатов");
  assert.equal(ru.i18n.pl(21, "word.seat"), "мандат");

  assert.equal(en.i18n.pl(1, "word.seat"), "seat");
  assert.equal(en.i18n.pl(2, "word.seat"), "seats");
  assert.equal(en.i18n.pl(21, "word.seat"), "seats");

  assert.equal(ru.i18n.n(3, "word.party"), "3 партии");
  assert.equal(en.i18n.n(3, "word.party"), "3 parties");
});

test("подстановка переменных заполняет все места", () => {
  for(const PC of [ru, en]){
    const s = PC.t("side.duma", { conv:"VIII" });
    assert.ok(s.includes("VIII"));
    assert.ok(!/\{\w+\}/.test(s), `в строке осталась незаполненная подстановка: ${s}`);
  }
  /* неизвестное имя оставляем как есть — это заметно на экране и
     показывает, какой именно ключ забыли передать */
  assert.ok(ru.t("side.duma", {}).includes("{conv}"));
});

test("все ключи из разметки есть в словаре", () => {
  const attrs = [
    ...Array.from(html.matchAll(/data-i18n="([\w.+-]+)"/g), m => m[1]),
    ...Array.from(html.matchAll(/data-i18n-html="([\w.+-]+)"/g), m => m[1])
  ];
  const fromAttrPairs = Array.from(html.matchAll(/data-i18n-attr="([^"]+)"/g), m => m[1])
    .flatMap(v => v.split(";"))
    .map(pair => pair.split(":")[1])
    .filter(Boolean)
    .map(v => v.trim());

  assert.ok(attrs.length > 60, "разметка почти не размечена под перевод");
  for(const key of [...attrs, ...fromAttrPairs]){
    assert.ok(DICT_KEYS.includes(key), `в разметке ключ ${key}, которого нет в словаре`);
  }
});

test("L(): английское поле подменяет русское и откатывается при его отсутствии", () => {
  const obj = { name:"Яблоко", short:"Яблоко", en:{ name:"Yabloko" } };
  assert.equal(ru.L(obj, "name"), "Яблоко");
  assert.equal(en.L(obj, "name"), "Yabloko");
  /* поля без перевода — не ошибка: аббревиатура одинакова в обоих языках */
  assert.equal(en.L(obj, "short"), "Яблоко");
  assert.equal(en.L(null, "name"), "");
});

test("данные партий переведены целиком", () => {
  const TEXT = ["name", "short", "tag", "ideology", "summary", "leader", "why"];
  for(const p of en.PARTIES){
    assert.ok(p.en, `у партии ${p.id} нет английского блока`);
    for(const field of TEXT){
      const value = en.L(p, field);
      assert.ok(value && String(value).trim(), `${p.id}.${field} пуст в английской версии`);
      assert.ok(!/[а-яА-ЯёЁ]/.test(String(value)),
        `${p.id}.${field} не переведён: ${value}`);
    }
    const theses = en.L(p, "theses");
    assert.equal(theses.length, p.theses.length, `${p.id}: тезисы переведены не полностью`);
    for(const th of theses){
      assert.ok(!/[а-яА-ЯёЁ]/.test(th), `${p.id}: тезис не переведён — ${th}`);
    }
    for(const step of p.history || []){
      assert.ok(!/[а-яА-ЯёЁ]/.test(en.L(step, "note")),
        `${p.id}: точка траектории ${step.year} не переведена`);
    }
  }
});

test("утверждения теста переведены все девяносто", () => {
  assert.equal(en.QUIZ.QUESTIONS.length, 90, "набор утверждений изменился — проверка устарела");
  for(const q of en.QUIZ.QUESTIONS){
    const text = en.L(q, "t");
    assert.ok(text && text.trim(), `${q.id}: пустой английский текст`);
    assert.ok(!/[а-яА-ЯёЁ]/.test(text), `${q.id} не переведён: ${text}`);
    assert.notEqual(text, q.t, `${q.id}: английский текст совпадает с русским`);
  }
});

test("голосования переведены вместе с пояснениями", () => {
  for(const v of en.VOTES){
    for(const field of ["title", "summary", "tally", "why"]){
      const value = en.L(v, field);
      assert.ok(value && String(value).trim(), `${v.id}.${field} пуст`);
      assert.ok(!/[а-яА-ЯёЁ]/.test(String(value)), `${v.id}.${field} не переведён`);
    }
  }
});

test("созывы и под-оси подписаны на обоих языках", () => {
  /* CONVOCATIONS_ALL, а не CONVOCATIONS: заготовка будущего созыва тоже
     обязана быть переведена заранее. Смысл заготовки в том, что после
     выборов правится один флаг, а не подписи на двух языках. */
  for(const c of en.CONVOCATIONS_ALL){
    assert.ok(!/[а-яА-ЯёЁ]/.test(en.L(c, "label")), `созыв ${c.id} не переведён`);
  }
  for(const ax of en.SUBAXES){
    for(const suffix of ["", ".d", ".lo", ".hi"]){
      const key = "sub." + ax.id + suffix;
      assert.notEqual(en.t(key), key, `нет английского ${key}`);
      assert.notEqual(ru.t(key), key, `нет русского ${key}`);
    }
  }
});

test("выгрузка следует за языком интерфейса", () => {
  const head = ruLine(ru.exporter.partiesCSV());
  const headEn = ruLine(en.exporter.partiesCSV());
  assert.ok(head.includes("Партия"), "русская выгрузка потеряла русские заголовки");
  assert.ok(headEn.includes("Party"), "английская выгрузка осталась на русском");
  assert.ok(!/[а-яА-ЯёЁ]/.test(headEn), `в английской шапке CSV кириллица: ${headEn}`);

  function ruLine(csv){ return csv.replace(/^﻿/, "").split("\r\n")[0]; }
});
