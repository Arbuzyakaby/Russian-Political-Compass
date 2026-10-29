/* Настройки: проверка значений, атрибуты data-* на <html>, сброс и
   новые настройки 5.0. До 5.0 — tests/tisa.test.js. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT, DEFAULT_FILES } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const html = read("index.html");
const { PC } = loadApp();

test("new settings validate values, apply data attributes and reset",()=>{const{PC,document}=loadApp(["js/data.js","js/utils.js","js/settings.js"]);PC.settings.init();for(const[k,v]of Object.entries({dotSize:"large",quizMode:"short",exportScale:"3",colorblind:"on",lineheight:"increased"})){PC.settings.set(k,v);assert.equal(document.documentElement.dataset[k],v);}PC.settings.set("dotSize","evil");assert.equal(PC.settings.get("dotSize"),"large");PC.settings.reset();assert.equal(PC.settings.get("dotSize"),"normal");});
