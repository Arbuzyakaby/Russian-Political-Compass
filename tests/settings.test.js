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

test("5.0: акцент, слои поля и доступность — допустимые значения, атрибуты и разметка", () => {
  const { PC, document } = loadApp(["js/data.js", "js/utils.js", "js/settings.js"]);
  PC.settings.init();
  const DEF = { accent:"theme", axisNums:"on", quadLabels:"on", center:"off", bigtargets:"off", focusring:"normal", haptics:"on", sounds:"off" };
  for(const [k, v] of Object.entries(DEF)) assert.equal(PC.settings.get(k), v, k);
  for(const v of ["indigo", "teal", "amber", "rose", "green"]){
    PC.settings.set("accent", v);
    assert.equal(document.documentElement.dataset.accent, v);
  }
  PC.settings.set("accent", "purple");
  assert.equal(PC.settings.get("accent"), "green", "недопустимый акцент не принимается");
  PC.settings.set("focusring", "strong");
  assert.equal(document.documentElement.dataset.focusring, "strong");
  for(const k of ["axisNums", "quadLabels", "center", "bigtargets", "haptics", "sounds"])
    assert.ok(html.includes(`data-set-switch="${k}"`), `${k}: нет переключателя в листе`);
  assert.ok(html.includes('data-set-seg="accent"') && html.includes('data-set-seg="focusring"'));
  assert.ok(html.includes('id="setPanel-access"') && html.includes('id="setTab-access"'));
  /* акцент применяется ещё до отрисовки — в js/theme-boot.js, тем же набором значений */
  assert.match(read("js/theme-boot.js"), /indigo\|teal\|amber\|rose\|green/);
  PC.settings.reset();
  assert.equal(PC.settings.get("accent"), "theme");
});
