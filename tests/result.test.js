"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadApp, parseCSV, ROOT } = require("./harness.js");

test("экспорт завершённого результата использует его снимок и режим во всех трёх версиях", () => {
  const { PC, storage } = loadApp();
  for(const mode of PC.quiz.modes()){
    const questions = PC.quiz.questionsFor(mode);
    const saved = Object.fromEntries(questions.map(q => [q.id, 1]));
    const draft = Object.fromEntries(questions.map(q => [q.id, -2]));
    const result = PC.quiz.scoreOf(saved, questions);
    result.answers = saved;
    PC.quiz.result = () => result;
    storage.setItem("pc-quiz-answers", JSON.stringify(draft));
    const json = JSON.parse(PC.exporter.datasetJSON()).quizResult;
    assert.equal(json.version, mode);
    assert.equal(json.statements, questions.length);
    assert.equal(json.permalink, PC.quiz.shareURL(saved, mode));
    assert.deepEqual(json.subAxes, JSON.parse(JSON.stringify(PC.quizCalc.subScoreOf(saved, questions))));
    const csv = parseCSV(PC.exporter.quizCSV());
    assert.equal(csv.find(row => row[0] === PC.t("csv.version"))[1], PC.t("quiz.mode." + mode + ".n"));
    for(const axis of PC.SUBAXES){
      assert.equal(csv.find(row => row[0] === PC.t("sub." + axis.id))[1],
        json.subAxes[axis.id].toFixed(2).replace(".", ","));
    }
    assert.deepEqual(JSON.parse(storage.getItem("pc-quiz-answers")), draft);
  }
});

test("поделиться чужой карточкой: ссылка и текст относятся к ней, личный черновик не читается", () => {
  const { PC, window: sandbox, storage } = loadApp();
  const own = { e1:2 };
  storage.setItem("pc-quiz-answers", JSON.stringify(own));
  const guest = { e1:-2 };
  const pt = PC.quiz.scoreOf(guest, PC.quiz.questionsFor("short"));
  const url = PC.quiz.shareURL(guest, "short");
  const handlers = {};
  const gradient = { addColorStop(){} };
  const ctx = new Proxy({}, {
    get(target, key){
      if(key === "measureText") return text => ({ width:String(text).length * 8 });
      if(key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      return target[key] || (() => {});
    },
    set(target, key, value){ target[key] = value; return true; }
  });
  let blobReady, payload;
  const canvas = { getContext:() => ctx, classList:{ toggle(){} }, toBlob:fn => { blobReady = fn; } };
  const button = id => ({ addEventListener(type, fn){ handlers[id + type] = fn; } });
  const nodes = { "#shareCanvas":canvas, "#shareNote":{}, "#shareSave":button("save"), "#shareSend":button("send") };
  const host = { querySelector:key => nodes[key], querySelectorAll:() => [] };
  sandbox.Blob = class Blob {};
  sandbox.File = class File {};
  sandbox.navigator.canShare = () => true;
  sandbox.navigator.share = value => { payload = value; return Promise.resolve(); };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "js/share.js"), "utf8"), sandbox);
  PC.share.mount(host, pt, url);
  handlers.sendclick();
  // Canvas экспортируется асинхронно: даже смена черновика за это время
  // не должна подменять источник ссылки.
  storage.setItem("pc-quiz-answers", JSON.stringify({ e1:1 }));
  blobReady({});
  assert.equal(payload.url, url);
  assert.equal(payload.text, PC.t("card.shareText", {
    q:PC.quiz.quadrant(pt.x, pt.y), x:PC.utils.fmt(pt.x), y:PC.utils.fmt(pt.y)
  }));
  assert.equal(storage.getItem("pc-quiz-answers"), JSON.stringify({ e1:1 }));
});

test("неизвестная позиция голосования подписана как отсутствие данных в обеих локалях", () => {
  for(const lang of ["ru", "en"]){
    const { PC } = loadApp(undefined, { "pc-lang":lang });
    assert.equal(PC.t(PC.votes.STANCE.unknown.key), lang === "ru" ? "Нет данных" : "No data");
    assert.notEqual(PC.votes.STANCE.unknown.key, PC.votes.STANCE.abstain.key);
    assert.ok(PC.exporter.votesCSV().includes(lang === "ru" ? "Нет данных" : "No data"));
  }
});
