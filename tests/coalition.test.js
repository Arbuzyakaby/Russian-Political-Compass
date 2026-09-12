/* Песочница коалиций: чистый расчёт без DOM. Главное требование —
   формулы общие с плитками палаты, поэтому при всех включённых
   фракциях центр тяжести и поляризация коалиции обязаны совпасть
   с палатой до последнего знака. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC } = loadApp();
const inDuma = c => PC.PARTIES.filter(p => PC.seatsAt(p, c) > 0);

test("пороги: простое большинство 226, две трети 300", () => {
  assert.equal(PC.coalition.majority(), 226);
  assert.equal(PC.coalition.supermajority(), 300);
});

test("все фракции созыва — это вся палата: метрики совпадают с плитками", () => {
  for(const conv of PC.CONVOCATIONS){
    const ids = inDuma(conv.id).map(p => p.id);
    const res = PC.coalition.evaluate(ids, conv.id);
    const house = PC.charts.houseMetrics(conv.id);
    const sum = inDuma(conv.id).reduce((s, p) => s + PC.seatsAt(p, conv.id), 0);
    assert.equal(res.seats, sum, `${conv.id}: мандаты коалиции не равны сумме фракций`);
    assert.ok(Math.abs(res.metrics.wx - house.wx) < 1e-9, `${conv.id}: центр по экономике`);
    assert.ok(Math.abs(res.metrics.wy - house.wy) < 1e-9, `${conv.id}: центр по государству`);
    assert.ok(Math.abs(res.metrics.polar - house.polar) < 1e-9, `${conv.id}: поляризация`);
    assert.equal(res.margin, res.seats - 226);
    assert.equal(res.majority, res.seats >= 226);
  }
});

test("коалиция из одной фракции держится на одном партнёре", () => {
  const c = PC.CURRENT_CONVOCATION;
  const top = inDuma(c).sort((a, b) => PC.seatsAt(b, c) - PC.seatsAt(a, c))[0];
  const res = PC.coalition.evaluate([top.id], c);
  assert.equal(res.seats, PC.seatsAt(top, c));
  assert.ok(Math.abs(res.metrics.enp - 1) < 1e-9, "индекс Лааксо — Таагеперы для одной фракции равен 1");
  assert.ok(Math.abs(res.metrics.polar) < 1e-9, "у одной фракции нет разброса");
  assert.ok(Math.abs(res.metrics.wx - top.x) < 1e-9, "центр коалиции из одной фракции — сама фракция");
});

test("пустая коалиция не даёт NaN и не проходит порог", () => {
  const res = PC.coalition.evaluate([], PC.CURRENT_CONVOCATION);
  assert.equal(res.seats, 0);
  assert.equal(res.majority, false);
  assert.equal(res.supermajority, false);
  for(const v of Object.values(res.metrics)) assert.ok(Number.isFinite(v));
});

test("чужие id и партии без мандатов в созыве отбрасываются", () => {
  const c = PC.CURRENT_CONVOCATION;
  const outside = PC.PARTIES.filter(p => !PC.seatsAt(p, c)).map(p => p.id);
  const res = PC.coalition.evaluate(["нет-такой", ...outside], c);
  assert.equal(res.members.length, 0);
  assert.equal(res.seats, 0);
});

test("больше участников — не меньше мандатов", () => {
  const c = PC.CURRENT_CONVOCATION;
  const ids = inDuma(c).map(p => p.id);
  let prev = -1;
  for(let i = 1; i <= ids.length; i++){
    const s = PC.coalition.evaluate(ids.slice(0, i), c).seats;
    assert.ok(s > prev);
    prev = s;
  }
});

/* ============ АНАЛИТИКА КОАЛИЦИИ (2.0) ============
   Четыре показателя, которых не было в 1.x. Проверяется не «число
   посчиталось», а те свойства, ради которых показатель добавлен: без
   них он превращается в цифру, которую нельзя истолковать. */

test("тип коалиции: миноритарная, минимальная выигрышная, избыточная", () => {
  const c = PC.CURRENT_CONVOCATION;
  const bySeats = inDuma(c).slice().sort((a, b) => PC.seatsAt(b, c) - PC.seatsAt(a, c));
  const top = bySeats[0];

  assert.equal(PC.coalition.evaluate([], c).kind, "empty");

  /* самая мелкая фракция в одиночку большинства не даёт */
  const small = bySeats[bySeats.length - 1];
  assert.equal(PC.coalition.evaluate([small.id], c).kind, "minority");

  /* Одна «Единая Россия» держит большинство сама и потому незаменима:
     убрать из такой коалиции некого — это и есть минимальная выигрышная */
  const alone = PC.coalition.evaluate([top.id], c);
  assert.ok(alone.majority);
  assert.equal(alone.kind, "minimal");
  assert.deepEqual(Array.from(alone.pivots, p => p.id), [top.id]);

  /* та же коалиция плюс кто угодно — уже избыточная: добавленный
     участник ничего не держит, и убрать его можно без последствий */
  const withExtra = PC.coalition.evaluate([top.id, small.id], c);
  assert.equal(withExtra.kind, "surplus");
  assert.deepEqual(Array.from(withExtra.pivots, p => p.id), [top.id],
    "незаменимой осталась только фракция, без которой большинство рассыпается");
});

/* Переговорная сила не равна числу мандатов — ровно это метрика и
   показывает. Проверяем определение буквально: незаменима та фракция,
   без которой коалиция теряет большинство. */
test("незаменимые считаются по определению, а не по размеру фракции", () => {
  for(const conv of PC.CONVOCATIONS){
    const c = conv.id;
    const ids = inDuma(c).map(p => p.id);
    const res = PC.coalition.evaluate(ids, c);
    if(!res.majority){
      assert.equal(res.pivots.length, 0, `${c}: у коалиции без большинства не бывает незаменимых`);
      continue;
    }
    for(const p of res.members){
      const without = PC.coalition.evaluate(ids.filter(id => id !== p.id), c);
      const isPivot = res.pivots.some(q => q.id === p.id);
      assert.equal(isPivot, !without.majority,
        `${c}/${p.id}: метка незаменимости расходится с проверкой «убрать и посмотреть»`);
    }
  }
});

test("сплочённость: доля совпадений, только по голосованиям своего созыва", () => {
  const c = PC.CURRENT_CONVOCATION;
  const members = inDuma(c);

  /* одна фракция сама с собой не спорит — считать нечего */
  assert.equal(PC.coalition.cohesionOf(members.slice(0, 1), c), null);

  const coh = PC.coalition.cohesionOf(members, c);
  assert.ok(coh, "по текущему созыву данных достаточно");
  assert.ok(coh.ratio >= 0 && coh.ratio <= 1, `доля вне 0…1: ${coh.ratio}`);
  assert.ok(coh.pairs > 0);

  /* Ключевое свойство: в расчёт идут только голосования этого созыва.
     Если бы брался весь набор, пара фракций, вместе заседавших ещё
     в VI созыве, принесла бы в коалицию VIII чужие совпадения. */
  const usable = (a, b, conv) => PC.VOTES.filter(v => {
    if(v.conv !== conv) return false;
    const sa = PC.voteStance(v, a), sb = PC.voteStance(v, b);
    return sa !== "absent" && sb !== "absent" && sa !== "unknown" && sb !== "unknown";
  });
  const same = (a, b, conv) => usable(a, b, conv)
    .filter(v => PC.voteStance(v, a) === PC.voteStance(v, b)).length;

  const [a, b] = members;
  const here = usable(a, b, c);
  if(here.length >= 3){
    const pair = PC.coalition.cohesionOf([a, b], c);
    assert.ok(Math.abs(pair.ratio - same(a, b, c) / here.length) < 1e-9,
      "доля пары не равна её собственному счёту совпадений");
    assert.equal(pair.pairs, 1);
    /* и главное: голосования других созывов в этот счёт не попали */
    assert.ok(here.length <= PC.VOTES.filter(v => v.conv === c).length);
    assert.ok(here.every(v => v.conv === c));
  }

  /* Пары, по которым голосований почти нет, в среднее не попадают:
     одно совпадение из одного — это не сто процентов, это отсутствие
     данных. Созыв без голосований обязан честно промолчать. */
  const empty = PC.CONVOCATIONS.map(x => x.id).find(id => !PC.VOTES.some(v => v.conv === id));
  if(empty !== undefined){
    assert.equal(PC.coalition.cohesionOf(inDuma(empty), empty), null,
      "созыв без голосований не может иметь сплочённости");
  }
});

test("ось разлома: размах по оси и крайние участники", () => {
  const c = PC.CURRENT_CONVOCATION;
  const members = inDuma(c);

  assert.equal(PC.coalition.faultOf([]), null);
  assert.equal(PC.coalition.faultOf(members.slice(0, 1)), null, "у одного участника нет разлома");

  const f = PC.coalition.faultOf(members);
  assert.ok(["x", "y"].includes(f.axis));
  const key = f.axis;
  const values = members.map(p => p[key]);
  assert.ok(Math.abs(f.span - (Math.max(...values) - Math.min(...values))) < 1e-9,
    "размах не равен разнице крайних значений");
  assert.equal(f.lo[key], Math.min(...values), "нижний край не самый низкий");
  assert.equal(f.hi[key], Math.max(...values), "верхний край не самый высокий");

  /* Выбирается ось с БОЛЬШИМ размахом: именно она и есть то, о чём
     коалиции придётся договариваться. */
  const spanX = Math.max(...members.map(p => p.x)) - Math.min(...members.map(p => p.x));
  const spanY = Math.max(...members.map(p => p.y)) - Math.min(...members.map(p => p.y));
  assert.equal(f.axis, spanX >= spanY ? "x" : "y");
  assert.ok(Math.abs(f.span - Math.max(spanX, spanY)) < 1e-9);
});

test("готовые расклады считаются из данных созыва, а не выписаны списком", () => {
  for(const conv of PC.CONVOCATIONS){
    const c = conv.id;
    const all = inDuma(c).map(p => p.id);

    const left = PC.coalition.presetIds("left", c);
    const right = PC.coalition.presetIds("right", c);
    assert.equal(left.length + right.length, all.length,
      `${c}: «левее нуля» и «правее нуля» вместе обязаны покрыть палату без пересечений`);
    for(const id of left) assert.ok(PC.partyById(id).x < 0, `${c}: ${id} попал в левый набор правее нуля`);
    for(const id of right) assert.ok(PC.partyById(id).x >= 0, `${c}: ${id} попал в правый набор левее нуля`);

    /* Минимальная: большинство есть, а без последнего добавленного
       участника его уже нет — иначе жадный проход взял лишнего. */
    const min = PC.coalition.presetIds("min", c);
    const res = PC.coalition.evaluate(min, c);
    assert.ok(res.majority, `${c}: заготовка «минимальная» не набирает большинства`);
    const without = PC.coalition.evaluate(min.slice(0, -1), c);
    assert.ok(!without.majority, `${c}: в «минимальной» есть лишний участник`);
  }
});

test("остальная палата: метрики считаются по тем, кто вне коалиции", () => {
  const c = PC.CURRENT_CONVOCATION;
  const all = inDuma(c).map(p => p.id);
  const half = all.slice(0, 2);
  const res = PC.coalition.evaluate(half, c);

  assert.deepEqual(Array.from(res.others, p => p.id).sort(), Array.from(all.slice(2)).sort());
  const mirror = PC.coalition.evaluate(all.slice(2), c);
  assert.ok(Math.abs(res.oppMetrics.wx - mirror.metrics.wx) < 1e-9,
    "центр оппозиции обязан совпасть с центром той же коалиции, собранной напрямую");
  assert.ok(Math.abs(res.oppMetrics.wy - mirror.metrics.wy) < 1e-9);

  /* Доля палаты — та же величина, что и мандаты, только в процентах:
     два числа рядом не имеют права расходиться. */
  assert.ok(Math.abs(res.share - res.seats / PC.TOTAL_SEATS * 100) < 1e-9);
});
