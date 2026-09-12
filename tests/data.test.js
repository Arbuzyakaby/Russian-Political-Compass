/* Данные партий и созывов: целостность массива и выборки по нему.
   Эти проверки ловят не «ошибки в коде», а расхождения в данных —
   опечатку в цвете, пропущенный тезис, историю, последняя точка
   которой разошлась с текущими координатами партии. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");

const { PC } = loadApp();
const P = PC.PARTIES;

test("партии: обязательные поля и допустимые значения", () => {
  assert.ok(P.length >= 5, "партий должно быть больше горстки");
  const seen = new Set();
  for(const p of P){
    assert.ok(!seen.has(p.id), `id «${p.id}» встречается дважды`);
    seen.add(p.id);
    for(const key of ["id", "name", "short", "tag", "ideology", "summary", "leader", "why"]){
      assert.equal(typeof p[key], "string", `${p.id}: поле ${key} должно быть строкой`);
      assert.ok(p[key].trim().length, `${p.id}: поле ${key} пустое`);
    }
    assert.match(p.color, /^#[0-9a-f]{6}$/i, `${p.id}: цвет не в формате #rrggbb`);
    assert.ok(["top", "bottom", "left", "right"].includes(p.lp),
      `${p.id}: сторона подписи «${p.lp}» неизвестна`);
    for(const axis of ["x", "y"]){
      assert.equal(typeof p[axis], "number");
      assert.ok(p[axis] >= -10 && p[axis] <= 10, `${p.id}: ${axis} вне шкалы −10…+10`);
    }
    assert.ok(Array.isArray(p.theses) && p.theses.length >= 3,
      `${p.id}: тезисов должно быть не меньше трёх`);
    assert.ok(Number.isInteger(p.seats) && p.seats >= 0, `${p.id}: мандаты не целое число`);
    assert.ok(p.seats <= PC.TOTAL_SEATS, `${p.id}: мандатов больше, чем мест в палате`);
  }
});

test("созывы: уникальны, отсортированы по возрастанию в convsAsc", () => {
  const ids = PC.CONVOCATIONS.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, "id созывов повторяются");
  /* Array.from: массивы приходят из контекста vm, у них другой прототип,
     и строгое сравнение структур считает их разными объектами */
  const asc = Array.from(PC.convsAsc(), c => c.id);
  assert.deepEqual(asc, [...ids].sort((a, b) => a - b));
  assert.ok(ids.includes(PC.CURRENT_CONVOCATION), "текущего созыва нет в списке");
  for(const c of PC.CONVOCATIONS){
    assert.match(c.years, /^\d{4}–\d{4}$/, `${c.label}: годы не в формате 2021–2026`);
  }
});

test("seatsAt: текущий созыв берётся из seats, прошлые — из seatsBy", () => {
  const er = PC.partyById("er");
  assert.equal(PC.seatsAt(er, PC.CURRENT_CONVOCATION), er.seats);
  assert.equal(PC.seatsAt(er, 7), er.seatsBy[7]);

  /* «Новые люди» появились только в VIII созыве: в прошлых их нет вовсе */
  const nl = PC.partyById("nl");
  assert.equal(PC.seatsAt(nl, 4), null, "отсутствие партии в созыве — это null");

  /* «Яблоко» участвовало, но мандатов не получило: это ноль, а не null */
  assert.equal(PC.seatsAt(PC.partyById("yabloko"), 7), 0);
});

test("partyById: находит по id и не выдумывает партий", () => {
  assert.equal(PC.partyById("kprf").short, "КПРФ");
  assert.equal(PC.partyById("нет-такой"), null);
});

test("сумма мандатов в каждом созыве не превышает размер палаты", () => {
  for(const c of PC.CONVOCATIONS){
    const held = P.reduce((s, p) => s + (PC.seatsAt(p, c.id) || 0), 0);
    assert.ok(held <= PC.TOTAL_SEATS,
      `${c.label}: у фракций ${held} мандатов при ${PC.TOTAL_SEATS} местах`);
  }
});

test("траектории: годы по возрастанию, финал совпадает с текущей позицией", () => {
  for(const p of P){
    if(!p.history) continue;
    assert.ok(p.history.length >= 2, `${p.id}: траектория из одной точки бессмысленна`);
    let prev = -Infinity;
    for(const h of p.history){
      assert.ok(Number.isInteger(h.year), `${p.id}: год не целое число`);
      assert.ok(h.year > prev, `${p.id}: годы траектории идут не по возрастанию`);
      prev = h.year;
      assert.ok(h.x >= -10 && h.x <= 10 && h.y >= -10 && h.y <= 10,
        `${p.id} · ${h.year}: координата вне шкалы`);
      assert.ok(typeof h.note === "string" && h.note.trim().length,
        `${p.id} · ${h.year}: нет пояснения к сдвигу`);
    }
    const last = p.history[p.history.length - 1];
    assert.equal(last.x, p.x, `${p.id}: конец траектории разошёлся с текущим x`);
    assert.equal(last.y, p.y, `${p.id}: конец траектории разошёлся с текущим y`);
  }
});

/* ---------- под-оси ----------
   Под-оси имеют смысл, только если они объясняют точку на компасе.
   Как только среднее трёх шкал перестаёт совпадать с координатой,
   радар начинает показывать одну партию, а поле — другую, и обе
   картинки становятся недостоверными. Это требование к данным,
   поэтому оно проверяется, а не только описывается в комментарии. */
test("под-оси: полный набор, границы шкалы и среднее, равное координате", () => {
  const byAxis = { x:[], y:[] };
  for(const ax of PC.SUBAXES){
    assert.ok(["x", "y"].includes(ax.axis), `под-ось ${ax.id}: неизвестная родительская ось`);
    byAxis[ax.axis].push(ax.id);
  }
  assert.equal(byAxis.x.length, 3, "экономическую ось уточняют ровно три шкалы");
  assert.equal(byAxis.y.length, 3, "ось отношения к государству — тоже три");

  for(const p of PC.PARTIES){
    assert.ok(p.sub, `у партии ${p.id} нет разложения по под-осям`);
    for(const ax of PC.SUBAXES){
      const v = p.sub[ax.id];
      assert.equal(typeof v, "number", `${p.id}.${ax.id}: не число`);
      assert.ok(v >= -10 && v <= 10, `${p.id}.${ax.id} = ${v} вне шкалы −10…+10`);
    }
    for(const axis of ["x", "y"]){
      const mean = byAxis[axis].reduce((s, id) => s + p.sub[id], 0) / 3;
      assert.ok(Math.abs(mean - p[axis]) < 0.05,
        `${p.id}: среднее под-осей ${axis} равно ${mean.toFixed(2)}, а координата ${p[axis]}`);
    }
  }
});

test("под-оси различают партии, стоящие рядом на компасе", () => {
  /* Смысл радара в том, что близкие точки могут иметь разный профиль.
     Если бы все под-оси были простой копией координаты, диаграмма не
     сообщала бы ничего сверх самого компаса. */
  const spread = p => Math.max(...PC.SUBAXES.map(a => Math.abs(p.sub[a.id] - p[a.axis])));
  const varied = PC.PARTIES.filter(p => spread(p) > 2).length;
  assert.ok(varied >= PC.PARTIES.length / 2,
    "у большинства партий под-оси обязаны заметно расходиться с итоговой координатой");
});

/* Сводка отвечает на вопрос «что это вообще за партия», и отвечать на
   него одной строкой нельзя: слишком короткий текст — это ещё один
   ярлык, ровно то, что проект обещает не делать. Верхняя граница тоже
   нужна: сводка стоит в карточке выше координат, и абзац в половину
   экрана отодвинул бы вниз то, ради чего карточку открывают. */
test("сводка о партии: осмысленная длина и не пересказ идеологии", () => {
  for(const p of P){
    const len = p.summary.length;
    assert.ok(len >= 120, `${p.id}: сводка короче ста двадцати знаков — это ярлык, а не описание`);
    assert.ok(len <= 520, `${p.id}: сводка длиннее пятисот двадцати знаков — это уже раздел «почему»`);
    assert.notEqual(p.summary, p.ideology, `${p.id}: сводка повторяет строку идеологии`);
    assert.notEqual(p.summary, p.why, `${p.id}: сводка повторяет обоснование координат`);
  }
});
