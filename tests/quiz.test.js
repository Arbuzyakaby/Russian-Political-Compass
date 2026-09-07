/* Тест на 40 утверждений: состав анкеты, подсчёт координат,
   рейтинг близости партий и словесные ярлыки. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC } = loadApp();
const Q = PC.QUIZ.QUESTIONS, SCALE = PC.QUIZ.SCALE;

/* набор ответов: fn(вопрос) -> число −2…+2 или undefined */
function answers(fn){
  const out = {};
  for(const q of Q){
    const v = fn(q);
    if(v !== undefined) out[q.id] = v;
  }
  return out;
}

test("анкета: 40 утверждений, поровну по осям, без повторов id", () => {
  assert.equal(Q.length, 40);
  const ids = Q.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length, "id вопросов повторяются");
  assert.equal(Q.filter(q => q.axis === "x").length, 20);
  assert.equal(Q.filter(q => q.axis === "y").length, 20);
  for(const q of Q){
    assert.ok([1, -1].includes(q.dir), `${q.id}: dir должен быть +1 или −1`);
    assert.ok(q.w > 0 && q.w <= 2, `${q.id}: подозрительный вес ${q.w}`);
    assert.ok(q.t.trim().length > 20, `${q.id}: формулировка слишком короткая`);
  }
  /* обе стороны каждой оси должны быть представлены, иначе шкала
     съезжает к одному полюсу независимо от ответов */
  for(const axis of ["x", "y"]){
    const dirs = new Set(Q.filter(q => q.axis === axis).map(q => q.dir));
    assert.equal(dirs.size, 2, `ось ${axis}: утверждения тянут только в одну сторону`);
  }
});

test("шкала ответов: симметрична и с нейтральной серединой", () => {
  assert.deepEqual(Array.from(SCALE, s => s.v), [-2, -1, 0, 1, 2]);
  for(const s of SCALE) assert.ok(s.label.trim().length);
});

test("подсчёт: пустая анкета даёт центр, крайние ответы — полюса", () => {
  const empty = PC.quiz.scoreOf({});
  assert.equal(empty.x, 0);
  assert.equal(empty.y, 0);
  assert.equal(empty.answered, 0);

  /* согласие со всем, что тянет к «+», и несогласие со всем, что тянет
     к «−», — это максимально выраженная позиция: она обязана упереться
     в полюс, а не остановиться на восьмёрке */
  const right = PC.quiz.scoreOf(answers(q => 2 * q.dir));
  assert.equal(right.x, 10);
  assert.equal(right.y, 10);
  assert.equal(right.answered, 40);

  const left = PC.quiz.scoreOf(answers(q => -2 * q.dir));
  assert.equal(left.x, -10);
  assert.equal(left.y, -10);

  /* «затрудняюсь ответить» не двигает позицию, но считается ответом */
  const neutral = PC.quiz.scoreOf(answers(() => 0));
  assert.equal(neutral.x, 0);
  assert.equal(neutral.y, 0);
  assert.equal(neutral.answered, 40);
});

test("подсчёт: оси независимы, вес ключевых утверждений выше", () => {
  const onlyX = PC.quiz.scoreOf(answers(q => (q.axis === "x" ? 2 * q.dir : undefined)));
  assert.equal(onlyX.x, 10);
  assert.equal(onlyX.y, 0, "экономические ответы не должны двигать вертикаль");

  const key = Q.find(q => q.axis === "x" && q.w > 1);
  const plain = Q.find(q => q.axis === "x" && q.w === 1 && q.dir === key.dir);
  const byKey = PC.quiz.scoreOf({ [key.id]: 2 * key.dir });
  const byPlain = PC.quiz.scoreOf({ [plain.id]: 2 * plain.dir });
  assert.ok(Math.abs(byKey.x) > Math.abs(byPlain.x),
    "ключевое утверждение должно двигать шкалу сильнее обычного");
});

test("подсчёт: пропущенные вопросы просто не участвуют", () => {
  const half = PC.quiz.scoreOf(answers(q => (q.id.endsWith("1") ? 2 * q.dir : undefined)));
  assert.equal(half.answered, Q.filter(q => q.id.endsWith("1")).length);
  assert.ok(half.x > 0 && half.x < 10, "часть ответов — не полюс, но и не ноль");
});

test("ranking: отсортирован по расстоянию, совпадение в границах 0…100", () => {
  const rank = PC.quiz.ranking({ x:-8, y:4.8 });
  assert.equal(rank.length, PC.PARTIES.length);
  assert.equal(rank[0].p.id, "kprf", "точка КПРФ должна совпасть с самой КПРФ");
  assert.equal(rank[0].match, 100);
  for(let i = 1; i < rank.length; i++){
    assert.ok(rank[i].d >= rank[i - 1].d, "рейтинг не отсортирован по расстоянию");
  }
  for(const r of rank){
    assert.ok(r.match >= 0 && r.match <= 100, `${r.p.id}: совпадение вне 0…100%`);
  }
});

test("quadrant: четыре сектора и границы по нулю", () => {
  assert.equal(PC.quiz.quadrant(-5, 5), "левый этатизм");
  assert.equal(PC.quiz.quadrant(5, 5), "правый этатизм");
  assert.equal(PC.quiz.quadrant(-5, -5), "левое либертарианство");
  assert.equal(PC.quiz.quadrant(5, -5), "правое либертарианство");
  assert.equal(PC.quiz.quadrant(0, 0), "правый этатизм", "ноль относится к положительной стороне");
});

test("words: ярлыки меняются вместе с координатой", () => {
  assert.equal(PC.quiz.words({ x:-8, y:0 }).econ, "последовательно левые");
  assert.equal(PC.quiz.words({ x:0, y:0 }).econ, "центристские");
  assert.equal(PC.quiz.words({ x:8, y:0 }).econ, "последовательно правые");
  assert.equal(PC.quiz.words({ x:0, y:-8 }).state, "выраженно либертарианские");
  assert.equal(PC.quiz.words({ x:0, y:8 }).state, "выраженно этатистские");
});
