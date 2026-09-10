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

/* ---------- разбор результата ---------- */
test("вклады утверждений в сумме дают ту же координату, что и счёт", () => {
  const answers = {};
  Q.forEach((q, i) => { answers[q.id] = [-2, -1, 0, 1, 2][i % 5]; });

  const pt = PC.quiz.scoreOf(answers);
  const contrib = PC.quiz.contributions(answers);
  assert.equal(contrib.length, Q.length, "в разборе обязаны быть все утверждения");

  for(const axis of ["x", "y"]){
    const sum = contrib.filter(c => c.q.axis === axis)
                       .reduce((s, c) => s + c.value, 0);
    const max = Q.filter(q => q.axis === axis).reduce((s, q) => s + q.w * 2, 0);
    /* та же формула, что в модуле: сумма, делённая на достижимый максимум.
       Проверяется именно совпадение разбора с итогом — расхождение здесь
       означало бы, что таблица на экране объясняет не то число, которое
       рядом напечатано. */
    const expected = Math.max(-10, Math.min(10, sum / (max * 0.7) * 10));
    assert.ok(Math.abs(expected - pt[axis]) < 1e-9,
      `ось ${axis}: разбор даёт ${expected}, а счёт ${pt[axis]}`);
  }
});

test("пропущенное утверждение попадает в разбор с нулевым вкладом", () => {
  const contrib = PC.quiz.contributions({});
  assert.ok(contrib.every(c => c.answer === null && c.value === 0));
});

/* ---------- под-оси ---------- */
test("под-оси теста: полный набор, границы и согласие с главными осями", () => {
  const extreme = {};
  Q.forEach(q => { extreme[q.id] = q.dir * 2; });   /* максимально «правый» и «этатистский» набор */

  const sub = PC.quiz.subScoreOf(extreme);
  for(const ax of PC.SUBAXES){
    const v = sub[ax.id];
    assert.equal(typeof v, "number", `под-ось ${ax.id} не посчитана`);
    assert.ok(v >= -10 && v <= 10, `под-ось ${ax.id} вне шкалы: ${v}`);
    assert.ok(v > 5, `при крайних ответах под-ось ${ax.id} обязана уйти к своему полюсу`);
  }

  /* пустая анкета — центр по всем шести шкалам, как и по двум главным */
  const empty = PC.quiz.subScoreOf({});
  for(const ax of PC.SUBAXES) assert.equal(empty[ax.id], 0);
});

test("каждое утверждение отнесено к существующей под-оси своей же оси", () => {
  const byId = new Map(PC.SUBAXES.map(a => [a.id, a]));
  for(const q of Q){
    const ax = byId.get(q.sub);
    assert.ok(ax, `${q.id}: неизвестная под-ось ${q.sub}`);
    assert.equal(ax.axis, q.axis,
      `${q.id} влияет на ось ${q.axis}, а под-ось ${q.sub} принадлежит оси ${ax.axis}`);
  }
  /* ни одна шкала не должна остаться без вопросов — иначе луч радара
     всегда торчал бы в нуле и врал про отсутствие позиции */
  for(const ax of PC.SUBAXES){
    assert.ok(Q.some(q => q.sub === ax.id), `под-ось ${ax.id} не покрыта ни одним утверждением`);
  }
});

/* ---------- ссылка на результат ---------- */
test("код ответов кодируется и раскодируется без потерь", () => {
  const answers = {};
  Q.forEach((q, i) => { if(i % 3) answers[q.id] = [-2, -1, 1, 2][i % 4]; });

  const code = PC.quiz.encodeAnswers(answers);
  assert.equal(code.length, Q.length, "по символу на утверждение");
  assert.match(code, /^[a-e-]+$/, "в коде только безопасные для адреса символы");

  /* Объекты приходят из другого realm (модули исполняются в vm), поэтому
     сравниваем содержимое, а не прототипы: deepStrictEqual на таких парах
     падает по причине, к проверяемому коду отношения не имеющей. */
  const back = PC.quiz.decodeAnswers(code);
  assert.deepEqual({ ...back }, { ...answers }, "раскодированный набор обязан совпасть с исходным");

  /* и, что важнее для читателя, координаты обязаны совпасть точь-в-точь */
  const a = PC.quiz.scoreOf(answers), b = PC.quiz.scoreOf(back);
  assert.equal(a.x, b.x);
  assert.equal(a.y, b.y);
});

test("испорченный код отвергается, а не даёт правдоподобный результат", () => {
  assert.equal(PC.quiz.decodeAnswers(""), null);
  assert.equal(PC.quiz.decodeAnswers("abc"), null, "обрезанная ссылка не должна декодироваться");
  assert.equal(PC.quiz.decodeAnswers("-".repeat(Q.length)), null,
    "код без единого ответа не результат");
  assert.equal(PC.quiz.decodeAnswers(null), null);
  assert.equal(PC.quiz.decodeAnswers("z".repeat(Q.length)), null);
});

test("ссылка на результат ведёт на маршрут, который понимает навигация", () => {
  const answers = {};
  Q.forEach(q => { answers[q.id] = 1; });
  const url = PC.quiz.shareURL(answers);
  assert.ok(url.startsWith("https://"), "ссылка должна быть абсолютной");
  const m = /#\/result\/([a-e-]+)$/.exec(url);
  assert.ok(m, `адрес не похож на маршрут результата: ${url}`);
  assert.deepEqual({ ...PC.quiz.decodeAnswers(m[1]) }, { ...answers });
});

/* ---------- короткая версия ----------
   Короткая версия имеет смысл, только если её результат лежит на той же
   шкале, что и результат полной. Иначе это не «тест побыстрее», а второй
   тест с теми же подписями, и сравнивать два прохождения в истории
   нельзя. Отсюда проверяется не «двадцать вопросов есть», а свойства,
   от которых зависит сопоставимость. */
const SHORT = PC.QUIZ.SHORT;

test("короткая версия: половина вопросов, отобранных, а не первых подряд", () => {
  assert.equal(SHORT.length, 20);
  assert.equal(SHORT.length * 2, Q.length, "короткая версия — ровно половина полной");
  for(const q of SHORT){
    assert.ok(Q.includes(q), `${q.id} есть в короткой версии, но не в полной`);
  }
  /* «первые двадцать» — это e1..e10 и a1..a10; выборка обязана
     отличаться, иначе конец анкеты не представлен вовсе */
  const firstTwenty = Q.slice(0, 20).map(q => q.id).join(",");
  assert.notEqual(SHORT.map(q => q.id).join(","), firstTwenty);
  assert.ok(SHORT.some(q => Q.indexOf(q) >= 30), "хвост анкеты должен быть представлен");
});

test("короткая версия: оси, под-оси и ключевые утверждения на месте", () => {
  for(const axis of ["x", "y"]){
    assert.equal(SHORT.filter(q => q.axis === axis).length, 10,
      `ось ${axis} представлена не половиной вопросов`);
  }
  for(const ax of PC.SUBAXES){
    const n = SHORT.filter(q => q.sub === ax.id).length;
    assert.ok(n >= 2, `под-ось ${ax.id} покрыта только ${n} утверждением — луч радара будет шумом`);
  }
  for(const q of Q.filter(q => q.w > 1)){
    assert.ok(SHORT.includes(q), `ключевое утверждение ${q.id} потеряно в короткой версии`);
  }
});

/* Самое важное свойство: перекос по направлению внутри оси. Если в
   короткой версии согласие тянет преимущественно в одну сторону сильнее,
   чем в полной, то «соглашаюсь со всем» даст в двух версиях разные
   точки, и результаты перестанут лежать на одной шкале. */
test("короткая версия: перекос по направлению такой же, как в полной", () => {
  const skew = (list, axis) => {
    const pos = list.filter(q => q.axis === axis && q.dir > 0).reduce((s, q) => s + q.w, 0);
    const neg = list.filter(q => q.axis === axis && q.dir < 0).reduce((s, q) => s + q.w, 0);
    return (pos - neg) / (pos + neg);
  };
  for(const axis of ["x", "y"]){
    const diff = Math.abs(skew(SHORT, axis) - skew(Q, axis));
    assert.ok(diff < 0.06,
      `ось ${axis}: перекос короткой версии отличается от полной на ${(diff * 100).toFixed(1)} п.п.`);
  }
});

test("нормировка идёт по пройденной выборке, а не по всем сорока", () => {
  /* Крайние ответы обязаны выводить на полюс в обеих версиях. Если бы
     короткая делилась на максимум полной, тот же ответ давал бы вдвое
     меньшую координату — ровно та ошибка, ради которой scoreOf принимает
     выборку вторым аргументом. */
  const extreme = {};
  SHORT.forEach(q => { extreme[q.id] = q.dir * 2; });

  const short = PC.quiz.scoreOf(extreme, SHORT);
  assert.equal(short.x, 10);
  assert.equal(short.y, 10);
  assert.equal(short.mode, "short");
  assert.equal(short.total, SHORT.length);

  /* те же ответы, посчитанные по полной выборке, дают заметно меньше —
     и это не альтернативная норма, а именно ошибка, которую мы избегаем */
  const asFull = PC.quiz.scoreOf(extreme, Q);
  assert.ok(asFull.x < short.x, "по полной выборке те же ответы должны дать меньше");
  assert.equal(asFull.mode, "full");
});

test("нейтральный ответ даёт центр в обеих версиях", () => {
  const neutral = {};
  Q.forEach(q => { neutral[q.id] = 0; });
  for(const list of [Q, SHORT]){
    const pt = PC.quiz.scoreOf(neutral, list);
    assert.equal(pt.x, 0);
    assert.equal(pt.y, 0);
  }
});

/* Согласие со всем подряд — самый простой способ поймать расхождение
   между версиями: если выборка сбалансирована так же, как полная,
   обе дают близкие точки. */
test("«соглашаюсь со всем» даёт в двух версиях близкие точки", () => {
  const agree = {};
  Q.forEach(q => { agree[q.id] = 1; });
  const full = PC.quiz.scoreOf(agree, Q);
  const short = PC.quiz.scoreOf(agree, SHORT);
  assert.ok(Math.abs(full.x - short.x) < 0.6,
    `экономика разошлась: полная ${full.x.toFixed(2)}, короткая ${short.x.toFixed(2)}`);
  assert.ok(Math.abs(full.y - short.y) < 0.6,
    `государство разошлось: полная ${full.y.toFixed(2)}, короткая ${short.y.toFixed(2)}`);
});

test("под-оси короткой версии тоже нормируются по своей выборке", () => {
  const extreme = {};
  SHORT.forEach(q => { extreme[q.id] = q.dir * 2; });
  const sub = PC.quiz.subScoreOf(extreme, SHORT);
  for(const ax of PC.SUBAXES){
    assert.ok(sub[ax.id] > 5,
      `под-ось ${ax.id} при крайних ответах осталась на ${sub[ax.id].toFixed(1)}`);
  }
});

test("ссылка помечает короткую версию, а полная остаётся совместимой", () => {
  const answers = {};
  SHORT.forEach(q => { answers[q.id] = 1; });

  const shortCode = PC.quiz.encodeAnswers(answers, "short");
  assert.equal(shortCode.charAt(0), "s");
  assert.equal(shortCode.length, Q.length + 1);
  assert.equal(PC.quiz.decodeMode(shortCode), "short");
  assert.deepEqual({ ...PC.quiz.decodeAnswers(shortCode) }, { ...answers });

  const fullCode = PC.quiz.encodeAnswers(answers, "full");
  assert.equal(fullCode.length, Q.length, "полный код прежней длины — старые ссылки живут");
  assert.match(fullCode, /^[a-e-]+$/);
  assert.equal(PC.quiz.decodeMode(fullCode), "full");
  assert.deepEqual({ ...PC.quiz.decodeAnswers(fullCode) }, { ...answers });

  /* и главное: по метке в ссылке результат восстанавливается тот же,
     что был показан отправителю */
  const pt = PC.quiz.scoreOf(PC.quiz.decodeAnswers(shortCode), SHORT);
  assert.equal(pt.mode, "short");
  assert.deepEqual(
    [pt.x.toFixed(4), pt.y.toFixed(4)],
    [PC.quiz.scoreOf(answers, SHORT).x.toFixed(4), PC.quiz.scoreOf(answers, SHORT).y.toFixed(4)]
  );
});
