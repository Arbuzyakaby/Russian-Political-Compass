/* Резервная копия: проверка схем, восстановление старых форматов и
   ключи удалённой в 5.0 «Моей партии». До 5.0 — tests/tisa.test.js. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT, DEFAULT_FILES } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const html = read("index.html");
const { PC } = loadApp();

test("backup rejects invalid quiz and settings schemas without erasing current data",()=>{const{DEFAULT_FILES}=require("./harness.js"),{PC,storage}=loadApp([...DEFAULT_FILES,"js/settings.js","js/eggs.js","js/backup.js"]);storage.setItem("pc-quiz-mode","short");const before=storage.getItem("pc-quiz-mode");for(const data of [{"pc-quiz-answers":"null"},{"pc-quiz-answers":"[]"},{"pc-settings":'{"dotSize":"bad"}'},{"pc-quiz-mode":"evil"}]){const backup={format:"politcompass-backup",v:1,data};assert.equal(PC.backup.validate(backup),false);assert.equal(PC.backup.restore(backup),false);assert.equal(storage.getItem("pc-quiz-mode"),before);}assert.equal(PC.backup.validate(PC.backup.make()),true);});

test("backup can restore both supported legacy SRPC layout formats",()=>{const{DEFAULT_FILES}=require("./harness.js"),{PC,storage}=loadApp([...DEFAULT_FILES,"js/settings.js","js/eggs.js","js/backup.js"]);for(const layout of [Array(6).fill([.2,.2]),{c:3,p:Array(6).fill([.2,.2])}]){storage.setItem("pc-srpc-layout",JSON.stringify(layout));const backup=PC.backup.make();assert.equal(PC.backup.validate(backup),true);assert.equal(PC.backup.restore(backup),true);assert.equal(storage.getItem("pc-srpc-layout"),JSON.stringify(layout));}});
