/* Данные о голосованиях и производные от них величины. Раздел ценен
   ровно настолько, насколько ему можно верить, поэтому проверяется не
   отрисовка, а целостность: ссылки на существующие партии и созывы,
   отсутствие «позиции» у партии, которой в том созыве не было в Думе,
   и арифметика матрицы совпадений. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC } = loadApp();
const ids = new Set(PC.PARTIES.map(p => p.id));
const convIds = new Set(PC.CONVOCATIONS.map(c => c.id));

test("каждое голосование ссылается на существующие созыв и партии", () => {
  assert.ok(PC.VOTES.length >= 5, "список голосований подозрительно короткий");
  const seen = new Set();
  for(const v of PC.VOTES){
    assert.ok(!seen.has(v.id), `дублируется id голосования ${v.id}`);
    seen.add(v.id);
    assert.ok(convIds.has(v.conv), `${v.id}: неизвестный созыв ${v.conv}`);
    assert.match(v.date, /^\d{4}-\d{2}-\d{2}$/, `${v.id}: дата не в формате ISO`);
    assert.ok(["econ", "state", "foreign"].includes(v.topic), `${v.id}: неизвестная тема`);
    assert.ok(["x", "y"].includes(v.axis), `${v.id}: ось должна быть x или y`);
    for(const id of Object.keys(v.pos)){
      assert.ok(ids.has(id), `${v.id}: позиция несуществующей партии ${id}`);
      assert.ok(["for", "against", "abstain", "split"].includes(v.pos[id]),
        `${v.id}.${id}: неизвестная позиция ${v.pos[id]}`);
    }
  }
});

/* Самое опасное расхождение в этих данных: позиция приписана партии,
   которой в том созыве в Думе не было. Такая строка выглядит достоверно
   и при этом заведомо выдумана. */
test("позиция не приписана партии без фракции в этом созыве", () => {
  for(const v of PC.VOTES){
    for(const id of Object.keys(v.pos)){
      const seats = PC.seatsAt(PC.partyById(id), v.conv);
      assert.ok(seats !== null && seats > 0,
        `${v.id}: у партии ${id} в ${v.conv} созыве нет мандатов, но есть позиция`);
    }
  }
});

test("voteStance различает отсутствие в Думе и отсутствие данных", () => {
  const pension = PC.VOTES.find(v => v.id === "pension-2018");
  assert.ok(pension, "голосование по пенсионному возрасту пропало из набора");

  assert.equal(PC.voteStance(pension, PC.partyById("er")), "for");
  assert.equal(PC.voteStance(pension, PC.partyById("kprf")), "against");
  /* «Новых людей» в VII созыве не было — это не «нет данных», а «не в Думе» */
  assert.equal(PC.voteStance(pension, PC.partyById("nl")), "absent");

  const internet = PC.VOTES.find(v => v.id === "internet-2019");
  /* ЛДПР во фракции была, но официальной позиции в наборе нет:
     догадка вместо признания незнания обесценила бы весь раздел */
  assert.equal(PC.voteStance(internet, PC.partyById("ldpr")), "unknown");
});

test("матрица совпадений: считается только по общим голосованиям", () => {
  const er = PC.partyById("er"), kprf = PC.partyById("kprf");
  const same = PC.voteAgreement(er, er);
  assert.equal(same.ratio, 1, "партия обязана совпадать сама с собой");

  const pair = PC.voteAgreement(er, kprf);
  assert.ok(pair.common > 0);
  assert.ok(pair.same <= pair.common);
  assert.ok(pair.ratio >= 0 && pair.ratio <= 1);

  /* симметричность: порядок аргументов ничего не меняет */
  const flipped = PC.voteAgreement(kprf, er);
  assert.equal(flipped.same, pair.same);
  assert.equal(flipped.common, pair.common);

  /* партия, ни разу не голосовавшая рядом с другой, не должна выглядеть
     как её стопроцентный союзник */
  const yabloko = PC.voteAgreement(PC.partyById("yabloko"), er);
  assert.equal(yabloko.common, 0);
  assert.equal(yabloko.ratio, null);
});

/* Смысл раздела в тексте карточки партии: расстояние на компасе и
   совпадение в голосованиях — разные величины. Проверяем, что данные
   действительно это показывают, а не только утверждают. */
test("близость на компасе не совпадает с близостью в голосованиях", () => {
  const er = PC.partyById("er"), sr = PC.partyById("sr"), ldpr = PC.partyById("ldpr");
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* Ровно то утверждение, которое стоит в тексте раздела «О проекте».
     Если данные изменятся и утверждение перестанет быть верным, упадёт
     этот тест, а не читатель — текст и набор обязаны расходиться шумно. */
  assert.ok(dist(er, ldpr) < dist(sr, ldpr),
    "по координатам ЛДПР ближе к «Единой России», чем к «Справедливой России»");
  assert.equal(PC.voteAgreement(sr, ldpr).ratio, 1,
    "при этом со «Справедливой Россией» ЛДПР совпала во всех общих голосованиях");
  assert.ok(PC.voteAgreement(er, ldpr).ratio < 1,
    "а с ближайшей по полю «Единой Россией» — разошлась хотя бы раз");
});

test("partyBlock: карточка партии не показывает голосования чужих созывов", () => {
  const html = PC.votes.partyBlock(PC.partyById("nl"));
  assert.ok(html.includes("dnr-2022") || html.length > 0);
  const rows = (html.match(/<li/g) || []).length;
  const expected = PC.VOTES.filter(v => PC.voteStance(v, PC.partyById("nl")) !== "absent").length;
  assert.equal(rows, expected, "в блок попали голосования, к которым партия отношения не имела");
});
