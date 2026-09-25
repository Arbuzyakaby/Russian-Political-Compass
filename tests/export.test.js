/* Экспорт: CSV должен открываться русским Excel и переживать
   разделитель внутри значения, JSON — быть полным и валидным. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp, parseCSV } = require("./harness.js");

const { PC } = loadApp();

test("CSV: BOM, точка с запятой, CRLF", () => {
  const csv = PC.exporter.partiesCSV();
  assert.ok(csv.startsWith("﻿"), "без BOM Excel ломает кириллицу");
  assert.ok(csv.includes(";"), "разделитель — точка с запятой");
  assert.ok(csv.includes("\r\n"), "строки разделяются CRLF");
});

test("Партии · CSV: строка на партию, столбец на созыв", () => {
  const rows = parseCSV(PC.exporter.partiesCSV());
  const head = rows[0];
  assert.equal(rows.length - 1, PC.PARTIES.length);
  assert.equal(head.length, 7 + PC.CONVOCATIONS.length);
  for(const row of rows) assert.equal(row.length, head.length, "ширина строк разъехалась");

  const er = rows.find(r => r[0] === "er");
  assert.equal(er[1], "Единая Россия");
  assert.equal(er[5], "3,2", "дробь пишется через запятую — так её читает русская локаль");
  /* столбцы созывов идут от старого к новому */
  assert.equal(er[er.length - 1], String(PC.partyById("er").seats));
});

test("Партии · CSV: значение с разделителем берётся в кавычки", () => {
  const rows = parseCSV(PC.exporter.partiesCSV());
  const green = rows.find(r => r[0] === "green");
  assert.ok(green[4].includes(","), "у «Зелёных» коллегиальное руководство через запятую");
  assert.equal(green[4], PC.partyById("green").leader, "разбор вернул исходную строку без потерь");
});

test("Мандаты по созывам · CSV: только реально существовавшие партии", () => {
  const rows = parseCSV(PC.exporter.seatsCSV());
  assert.deepEqual(rows[0], ["Созыв", "Годы", "id", "Партия", "Мандаты", "Доля палаты, %"]);
  const expected = PC.CONVOCATIONS.reduce((n, c) =>
    n + PC.PARTIES.filter(p => PC.seatsAt(p, c.id) !== null).length, 0);
  assert.equal(rows.length - 1, expected);
  assert.ok(!rows.some(r => r[4] === "—"), "прочерков в длинной таблице быть не должно");
});

test("Заявлено и на деле · CSV: строка на партию, разрыв посчитан верно", () => {
  const rows = parseCSV(PC.exporter.claimsCSV());
  assert.equal(rows.length - 1, PC.PARTIES.filter(p => p.declared).length);
  for(const r of rows.slice(1)){
    const p = PC.partyById(r[0]);
    const num = s => Number(String(s).replace(",", "."));
    assert.equal(num(r[2]), p.declared.x);
    assert.equal(num(r[4]), p.x);
    assert.ok(Math.abs(num(r[6]) - Math.hypot(p.x - p.declared.x, p.y - p.declared.y)) < 0.051,
      `${p.id}: разрыв в CSV посчитан неверно`);
  }
});

test("Всё · JSON: валиден, полон и честен про источник", () => {
  const data = JSON.parse(PC.exporter.datasetJSON());
  assert.equal(data.totalSeats, PC.TOTAL_SEATS);
  assert.equal(data.parties.length, PC.PARTIES.length);
  assert.equal(data.convocations.length, PC.CONVOCATIONS.length);
  assert.ok(data.note.includes("экспертная оценка"), "оговорка о характере данных обязательна");
  assert.ok(data.url.startsWith("https://"));
  assert.ok(!("quizResult" in data), "непройденный тест не должен попадать в файл");

  const er = data.parties.find(p => p.id === "er");
  assert.equal(er.seats[String(PC.CURRENT_CONVOCATION)], PC.partyById("er").seats);
  assert.ok(!("history" in er), "траектории убраны в 3.0 и в выгрузку попадать не должны");
  assert.deepEqual([er.declared.x, er.declared.y], [PC.partyById("er").declared.x, PC.partyById("er").declared.y]);
  const nl = data.parties.find(p => p.id === "nl");
  assert.ok(!(4 in nl.seats), "созывы без участия партии в JSON не попадают");
});

test("Мой результат · CSV: пусто без теста, полон после", () => {
  assert.equal(PC.exporter.quizCSV(), null);

  /* подменяем ровно тот кусок API, которым пользуется экспорт */
  const pt = { x:-3.4, y:2.1, answered:40, ts:Date.now() };
  const real = PC.quiz.result;
  PC.quiz.result = () => pt;
  try{
    const rows = parseCSV(PC.exporter.quizCSV());
    assert.equal(rows[1][0], "Экономика (X)");
    assert.equal(rows[1][1], "-3,40");
    assert.equal(rows[3][1], PC.quiz.quadrant(pt.x, pt.y));
    /* Файл идёт тремя блоками: шапка из заголовка и четырёх показателей,
       затем разбор по под-осям, затем рейтинг партий. Между блоками —
       пустая строка и собственный заголовок, поэтому смещение считается
       от длины PC.SUBAXES, а не прибито числом: добавится седьмая шкала —
       тест продолжит проверять то же самое. */
    /* заголовок + пять показателей (координаты, квадрант, версия теста,
       число ответов), пустая строка, заголовок разбора, сам разбор,
       пустая строка и заголовок рейтинга */
    const head = 6 + 1 + 1 + PC.SUBAXES.length + 1 + 1;
    assert.equal(rows.length - head, PC.PARTIES.length, "после шапки идёт рейтинг всех партий");
    assert.ok(rows.some(r => r[0] === PC.t("sub.property")), "разбор по под-осям обязан быть в файле");
    assert.ok(rows.some(r => r[0] === PC.t("csv.version")),
      "в файле должна быть версия теста: короткая и полная не одно измерение");

    const json = JSON.parse(PC.exporter.datasetJSON());
    assert.equal(json.quizResult.answered, 40);
    assert.equal(json.quizResult.ranking.length, PC.PARTIES.length);
    assert.ok(json.quizResult.permalink.includes("#/result/"),
      "в JSON должна лежать ссылка, по которой результат воспроизводится");
  }finally{
    PC.quiz.result = real;
  }
});
