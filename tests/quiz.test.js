/* Тест на 90 утверждений и две его укороченные выборки: состав анкеты,
   подсчёт координат, рейтинг близости партий и словесные ярлыки.

   Ключевая идея всех проверок ниже: три версии — это не три анкеты,
   а три вложенных выборки одного массива, и они обязаны лежать на
   одной шкале. Поэтому проверяется не «вопросов столько-то», а
   свойства, от которых зависит сопоставимость результатов. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC } = loadApp();
const Q = PC.QUIZ.QUESTIONS, STD = PC.QUIZ.STD, SHORT = PC.QUIZ.SHORT;
const SCALE = PC.QUIZ.SCALE;

/* набор ответов: fn(вопрос) -> число −2…+2 или undefined */
function answers(fn, list){
  const out = {};
  for(const q of (list || Q)){
    const v = fn(q);
    if(v !== undefined) out[q.id] = v;
  }
  return out;
}

/* взвешенный перекос по направлению внутри оси: если он различается
   между выборками, «соглашаюсь со всем» даёт в них разные точки */
function skew(list, axis){
  const pos = list.filter(q => q.axis === axis && q.dir > 0).reduce((s, q) => s + q.w, 0);
  const neg = list.filter(q => q.axis === axis && q.dir < 0).reduce((s, q) => s + q.w, 0);
  return (pos - neg) / (pos + neg);
}

test("анкета: 90 утверждений, поровну по осям, без повторов id", () => {
  assert.equal(Q.length, 90);
  const ids = Q.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length, "id вопросов повторяются");
  assert.equal(Q.filter(q => q.axis === "x").length, 45);
  assert.equal(Q.filter(q => q.axis === "y").length, 45);
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

/* Три выборки вложены друг в друга. Это не удобство реализации:
   на вложенности держится возможность пройти короткую версию, а потом
   дописать остальное — ответы не пропадают, потому что это те же
   вопросы с теми же id. */
test("выборки вложены: короткая ⊂ стандартная ⊂ расширенная", () => {
  assert.equal(STD.length, 40);
  assert.equal(SHORT.length, 20);
  for(const q of STD) assert.ok(Q.includes(q), `${q.id} есть в стандартной, но не в полном наборе`);
  for(const q of SHORT) assert.ok(STD.includes(q), `${q.id} есть в короткой, но не в стандартной`);
});

/* Порядок стандартной выборки — это порядок, в котором пишется код
   ссылки на результат. Ссылки, выданные версиями 1.x, обязаны
   продолжать открываться, а значит перестановка здесь недопустима. */
test("стандартная выборка сохраняет порядок исходного массива", () => {
  const order = Q.filter(q => STD.includes(q)).map(q => q.id);
  assert.deepEqual(STD.map(q => q.id), order);
  assert.equal(STD[0].id, "e1", "первое утверждение стандартной версии сдвинулось");
  assert.equal(STD[STD.length - 1].id, "a20", "последнее утверждение стандартной версии сдвинулось");
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
     в полюс, а не остановиться на восьмёрке. Проверяется во всех трёх
     версиях: нормировка у каждой своя, и ошибка в любой из них видна
     именно здесь. */
  for(const list of [Q, STD, SHORT]){
    const right = PC.quiz.scoreOf(answers(q => 2 * q.dir, list), list);
    assert.equal(right.x, 10, `выборка на ${list.length}: экономика не дошла до полюса`);
    assert.equal(right.y, 10, `выборка на ${list.length}: вертикаль не дошла до полюса`);
    assert.equal(right.answered, list.length);
    assert.equal(right.total, list.length);

    const left = PC.quiz.scoreOf(answers(q => -2 * q.dir, list), list);
    assert.equal(left.x, -10);
    assert.equal(left.y, -10);

    /* «затрудняюсь ответить» не двигает позицию, но считается ответом */
    const neutral = PC.quiz.scoreOf(answers(() => 0, list), list);
    assert.equal(neutral.x, 0);
    assert.equal(neutral.y, 0);
    assert.equal(neutral.answered, list.length);
  }
});

test("версия результата берётся из выборки, по которой он посчитан", () => {
  assert.equal(PC.quiz.scoreOf({}, Q).mode, "long");
  assert.equal(PC.quiz.scoreOf({}, STD).mode, "full");
  assert.equal(PC.quiz.scoreOf({}, SHORT).mode, "short");
  /* умолчание — стандартная выборка: на неё рассчитывают старые ссылки
     и внешние вызовы, которым выборку не передают */
  assert.equal(PC.quiz.scoreOf({}).mode, "full");
  assert.equal(PC.quiz.scoreOf({}).total, STD.length);
});

test("PC.quiz.questionsFor выдаёт выборку по имени версии", () => {
  assert.equal(PC.quiz.questionsFor("long").length, 90);
  assert.equal(PC.quiz.questionsFor("full").length, 40);
  assert.equal(PC.quiz.questionsFor("short").length, 20);
  assert.equal(PC.quiz.questionsFor("чепуха").length, 40, "неизвестная версия падает на стандартную");
  assert.deepEqual(Array.from(PC.quiz.modes()), ["long", "full", "short"]);
});

test("подсчёт: оси независимы, вес ключевых утверждений выше", () => {
  const onlyX = PC.quiz.scoreOf(answers(q => (q.axis === "x" ? 2 * q.dir : undefined), Q), Q);
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
  const half = PC.quiz.scoreOf(answers(q => (q.id.endsWith("1") ? 2 * q.dir : undefined), STD), STD);
  assert.equal(half.answered, STD.filter(q => q.id.endsWith("1")).length);
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
  for(const list of [Q, STD, SHORT]){
    const src = {};
    list.forEach((q, i) => { src[q.id] = [-2, -1, 0, 1, 2][i % 5]; });

    const pt = PC.quiz.scoreOf(src, list);
    const contrib = PC.quiz.contributions(src, list);
    assert.equal(contrib.length, list.length, "в разборе обязаны быть все утверждения выборки");

    for(const axis of ["x", "y"]){
      const sum = contrib.filter(c => c.q.axis === axis)
                         .reduce((s, c) => s + c.value, 0);
      const max = list.filter(q => q.axis === axis).reduce((s, q) => s + q.w * 2, 0);
      /* та же формула, что в модуле: сумма, делённая на достижимый максимум.
         Проверяется именно совпадение разбора с итогом — расхождение здесь
         означало бы, что таблица на экране объясняет не то число, которое
         рядом напечатано. */
      const expected = Math.max(-10, Math.min(10, sum / (max * 0.7) * 10));
      assert.ok(Math.abs(expected - pt[axis]) < 1e-9,
        `выборка на ${list.length}, ось ${axis}: разбор даёт ${expected}, а счёт ${pt[axis]}`);
    }
  }
});

test("пропущенное утверждение попадает в разбор с нулевым вкладом", () => {
  const contrib = PC.quiz.contributions({});
  assert.equal(contrib.length, STD.length, "по умолчанию разбирается стандартная выборка");
  assert.ok(contrib.every(c => c.answer === null && c.value === 0));
});

/* ---------- под-оси ---------- */
test("под-оси теста: полный набор, границы и согласие с главными осями", () => {
  for(const list of [Q, STD, SHORT]){
    const extreme = answers(q => q.dir * 2, list);   /* максимально «правый» и «этатистский» набор */

    const sub = PC.quiz.subScoreOf(extreme, list);
    for(const ax of PC.SUBAXES){
      const v = sub[ax.id];
      assert.equal(typeof v, "number", `под-ось ${ax.id} не посчитана`);
      assert.ok(v >= -10 && v <= 10, `под-ось ${ax.id} вне шкалы: ${v}`);
      assert.ok(v > 5,
        `выборка на ${list.length}: при крайних ответах под-ось ${ax.id} обязана уйти к своему полюсу`);
    }

    /* пустая анкета — центр по всем шести шкалам, как и по двум главным */
    const empty = PC.quiz.subScoreOf({}, list);
    for(const ax of PC.SUBAXES) assert.equal(empty[ax.id], 0);
  }
});

test("каждое утверждение отнесено к существующей под-оси своей же оси", () => {
  const byId = new Map(PC.SUBAXES.map(a => [a.id, a]));
  for(const q of Q){
    const ax = byId.get(q.sub);
    assert.ok(ax, `${q.id}: неизвестная под-ось ${q.sub}`);
    assert.equal(ax.axis, q.axis,
      `${q.id} влияет на ось ${q.axis}, а под-ось ${q.sub} принадлежит оси ${ax.axis}`);
  }
  /* ни одна шкала не должна остаться без вопросов ни в одной из версий —
     иначе луч радара всегда торчал бы в нуле и врал про отсутствие позиции */
  for(const list of [Q, STD, SHORT]){
    for(const ax of PC.SUBAXES){
      const n = list.filter(q => q.sub === ax.id).length;
      assert.ok(n >= 2,
        `выборка на ${list.length}: под-ось ${ax.id} покрыта ${n} утверждением — луч радара будет шумом`);
    }
  }
});

/* Расширенная версия добавлена ради разрешения, а не ради длины: если
   под-ось покрыта втрое большим числом утверждений, её луч перестаёт
   зависеть от формулировки одного вопроса. */
test("расширенная версия раскрывает каждую под-ось поровну", () => {
  const counts = PC.SUBAXES.map(ax => Q.filter(q => q.sub === ax.id).length);
  assert.deepEqual(Array.from(counts), [15, 15, 15, 15, 15, 15]);
});

/* ---------- ссылка на результат ---------- */
test("код ответов кодируется и раскодируется без потерь", () => {
  for(const [mode, list] of [["long", Q], ["full", STD], ["short", SHORT]]){
    const src = {};
    list.forEach((q, i) => { if(i % 3) src[q.id] = [-2, -1, 1, 2][i % 4]; });

    const code = PC.quiz.encodeAnswers(src, mode);
    assert.match(code, /^[sx]?[a-e-]+$/, "в коде только безопасные для адреса символы");
    assert.equal(PC.quiz.decodeMode(code), mode);

    /* Объекты приходят из другого realm (модули исполняются в vm), поэтому
       сравниваем содержимое, а не прототипы: deepStrictEqual на таких парах
       падает по причине, к проверяемому коду отношения не имеющей. */
    const back = PC.quiz.decodeAnswers(code);
    assert.deepEqual({ ...back }, { ...src }, `${mode}: раскодированный набор обязан совпасть с исходным`);

    /* и, что важнее для читателя, координаты обязаны совпасть точь-в-точь */
    const a = PC.quiz.scoreOf(src, list), b = PC.quiz.scoreOf(back, list);
    assert.equal(a.x, b.x);
    assert.equal(a.y, b.y);
  }
});

/* Метка версии в начале кода — не украшение: без неё двадцать ответов
   и двадцать прочерков неотличимы от стандартного прохождения с
   половиной пропусков, а нормировать их нужно по-разному. */
test("метка версии: длина кода и признак версии", () => {
  const src = {};
  Q.forEach(q => { src[q.id] = 1; });

  const long = PC.quiz.encodeAnswers(src, "long");
  assert.equal(long.charAt(0), "x");
  assert.equal(long.length, Q.length + 1);

  const short = PC.quiz.encodeAnswers(src, "short");
  assert.equal(short.charAt(0), "s");
  assert.equal(short.length, STD.length + 1);

  const std = PC.quiz.encodeAnswers(src, "full");
  assert.equal(std.length, STD.length, "код стандартной версии прежней длины — старые ссылки живут");
  assert.match(std, /^[a-e-]+$/, "у стандартной версии метки нет");
  assert.equal(PC.quiz.decodeMode(std), "full");

  /* и главное: по метке результат восстанавливается тот же, что был
     показан отправителю */
  const pt = PC.quiz.scoreOf(PC.quiz.decodeAnswers(long), Q);
  assert.equal(pt.mode, "long");
  const direct = PC.quiz.scoreOf(src, Q);
  assert.deepEqual([pt.x.toFixed(4), pt.y.toFixed(4)], [direct.x.toFixed(4), direct.y.toFixed(4)]);
});

test("испорченный код отвергается, а не даёт правдоподобный результат", () => {
  assert.equal(PC.quiz.decodeAnswers(""), null);
  assert.equal(PC.quiz.decodeAnswers("abc"), null, "обрезанная ссылка не должна декодироваться");
  assert.equal(PC.quiz.decodeAnswers("-".repeat(STD.length)), null,
    "код без единого ответа не результат");
  assert.equal(PC.quiz.decodeAnswers("x" + "-".repeat(Q.length)), null);
  assert.equal(PC.quiz.decodeAnswers(null), null);
  assert.equal(PC.quiz.decodeAnswers("z".repeat(STD.length)), null);
  /* код расширенной версии без метки короче своей выборки — и длиннее
     стандартной: он обязан быть отвергнут, а не прочитан наполовину */
  assert.equal(PC.quiz.decodeAnswers("a".repeat(Q.length)), null);
  assert.equal(PC.quiz.decodeAnswers("x" + "a".repeat(STD.length)), null);
});

test("ссылка на результат ведёт на маршрут, который понимает навигация", () => {
  const src = {};
  Q.forEach(q => { src[q.id] = 1; });
  for(const mode of ["long", "full", "short"]){
    const url = PC.quiz.shareURL(src, mode);
    assert.ok(url.startsWith("https://"), "ссылка должна быть абсолютной");
    /* тот же разбор, что в js/quiz.js: hashCode ждёт необязательную метку
       версии перед телом кода */
    const m = /#\/result\/([sx]?[a-e-]+)$/.exec(url);
    assert.ok(m, `адрес не похож на маршрут результата: ${url}`);
    assert.equal(PC.quiz.decodeMode(m[1]), mode);
    assert.ok(PC.quiz.decodeAnswers(m[1]), `${mode}: код из ссылки не читается`);
  }
});

/* ---------- сопоставимость версий ----------
   Укороченная версия имеет смысл, только если её результат лежит на той
   же шкале, что и результат полной. Иначе это не «тест побыстрее», а
   второй тест с теми же подписями, и сравнивать два прохождения
   в истории нельзя. */

test("короткая версия: выборка, а не первые двадцать подряд", () => {
  assert.equal(SHORT.length * 2, STD.length, "короткая версия — ровно половина стандартной");
  /* «первые двадцать» — это e1..e10 и a1..a10; выборка обязана
     отличаться, иначе конец анкеты не представлен вовсе */
  const firstTwenty = STD.slice(0, 20).map(q => q.id).join(",");
  assert.notEqual(SHORT.map(q => q.id).join(","), firstTwenty);
  assert.ok(SHORT.some(q => STD.indexOf(q) >= 30), "хвост анкеты должен быть представлен");
});

test("короткая версия: оси, под-оси и ключевые утверждения на месте", () => {
  for(const axis of ["x", "y"]){
    assert.equal(SHORT.filter(q => q.axis === axis).length, 10,
      `ось ${axis} представлена не половиной вопросов`);
  }
  for(const q of Q.filter(q => q.w > 1)){
    assert.ok(SHORT.includes(q), `ключевое утверждение ${q.id} потеряно в короткой версии`);
  }
});

/* Самое важное свойство: перекос по направлению внутри оси. Если он
   в одной из версий заметно другой, то «соглашаюсь со всем» даст в них
   разные точки, и результаты перестанут лежать на одной шкале. */
test("перекос по направлению одинаков во всех трёх версиях", () => {
  for(const axis of ["x", "y"]){
    for(const [name, list] of [["расширенная", Q], ["короткая", SHORT]]){
      const diff = Math.abs(skew(list, axis) - skew(STD, axis));
      assert.ok(diff < 0.06,
        `ось ${axis}: перекос версии «${name}» отличается от стандартной на ${(diff * 100).toFixed(1)} п.п.`);
    }
  }
});

test("нормировка идёт по пройденной выборке, а не по всему набору", () => {
  /* Крайние ответы обязаны выводить на полюс в каждой версии. Если бы
     короткая делилась на максимум расширенной, тот же ответ давал бы
     вчетверо меньшую координату — ровно та ошибка, ради которой scoreOf
     принимает выборку вторым аргументом. */
  const extreme = answers(q => q.dir * 2, SHORT);

  const short = PC.quiz.scoreOf(extreme, SHORT);
  assert.equal(short.x, 10);
  assert.equal(short.y, 10);

  /* те же ответы, посчитанные по более длинным выборкам, дают заметно
     меньше — и это не альтернативная норма, а именно ошибка, которую
     мы избегаем */
  const asStd = PC.quiz.scoreOf(extreme, STD);
  const asLong = PC.quiz.scoreOf(extreme, Q);
  assert.ok(asStd.x < short.x, "по стандартной выборке те же ответы должны дать меньше");
  assert.ok(asLong.x < asStd.x, "по расширенной — ещё меньше");
});

/* Согласие со всем подряд — самый простой способ поймать расхождение
   между версиями: если выборки сбалансированы одинаково, все три дают
   близкие точки. */
test("«соглашаюсь со всем» даёт во всех версиях близкие точки", () => {
  const agree = answers(() => 1, Q);
  const std = PC.quiz.scoreOf(agree, STD);
  for(const [name, list] of [["расширенная", Q], ["короткая", SHORT]]){
    const pt = PC.quiz.scoreOf(agree, list);
    assert.ok(Math.abs(std.x - pt.x) < 0.6,
      `${name}: экономика разошлась — стандартная ${std.x.toFixed(2)}, эта ${pt.x.toFixed(2)}`);
    assert.ok(Math.abs(std.y - pt.y) < 0.6,
      `${name}: государство разошлось — стандартная ${std.y.toFixed(2)}, эта ${pt.y.toFixed(2)}`);
  }
});

test("нейтральный ответ даёт центр в любой версии", () => {
  const neutral = answers(() => 0, Q);
  for(const list of [Q, STD, SHORT]){
    const pt = PC.quiz.scoreOf(neutral, list);
    assert.equal(pt.x, 0);
    assert.equal(pt.y, 0);
  }
});
