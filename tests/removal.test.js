/* Удаление «Моей партии» (5.0). Раздел снят целиком — от разметки до
   словаря, — а то, что посетитель успел накопить, не должно ломать сайт:
   старые резервные копии восстанавливаются без ключей раздела, старые
   адреса открывают компас с сообщением. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp, ROOT, DEFAULT_FILES } = require("./harness.js");

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("в коде, стилях и разметке нет следов раздела", () => {
  const files = ["index.html",
    ...fs.readdirSync(path.join(ROOT, "js")).map(f => "js/" + f),
    ...fs.readdirSync(path.join(ROOT, "css")).map(f => "css/" + f)];
  const BANNED = /partyModel|partyBuilder|party-builder|allParties|myParties|#tab-party|id="tab-party"|panel-party|i18n-party/;
  for(const f of files){
    if(f === "js/data-history.js") continue;           /* история версий рассказывает о 4.x — это прошлое, а не код */
    /* комментарии рассказывают историю (что было до 5.0) — ищем только в коде;
       js/backup.js называет удалённую настройку, чтобы пропустить её в старой копии */
    const code = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
    const hits = code.split("\n").filter(l => BANNED.test(l) && !/key === "myParties"/.test(l));
    assert.deepEqual(hits, [], f);
  }
  for(const gone of ["js/party-model.js", "js/party-builder.js", "js/party-templates.js", "js/party-election.js",
                     "js/party-campaign.js", "js/i18n-party.js", "css/party.css", "js/tisza.js"])
    assert.ok(!fs.existsSync(path.join(ROOT, gone)), gone + " всё ещё на месте");
  assert.equal((read("index.html").match(/class="tab" data-tab=/g) || []).length, 4, "вкладок должно быть четыре");
});

test("старая резервная копия с «Моей партией» восстанавливается без неё", () => {
  const { PC, storage } = loadApp([...DEFAULT_FILES, "js/settings.js", "js/eggs.js", "js/backup.js"]);
  const settings = JSON.stringify({ myParties:"off", startTab:"party", dotSize:"large" });
  const old = { format:"politcompass-backup", v:1, data:{
    "pc-my-parties":JSON.stringify({ v:1, list:[{ id:"u1", name:"Старая" }] }),
    "pc-party-draft":JSON.stringify({ v:1, party:{}, step:2, editId:null }),
    "pc-settings":settings,
    "pc-quiz-mode":"short"
  } };
  assert.equal(PC.backup.validate(old), true, "старая копия не должна браковаться целиком");
  assert.deepEqual([...PC.backup.skipped(old)].sort(), ["pc-my-parties", "pc-party-draft"]);
  assert.equal(PC.backup.restore(old), true);
  assert.equal(storage.getItem("pc-my-parties"), null);
  assert.equal(storage.getItem("pc-party-draft"), null);
  assert.equal(storage.getItem("pc-quiz-mode"), "short");
  assert.equal(storage.getItem("pc-settings"), JSON.stringify({ dotSize:"large" }));
  /* новые копии ключей раздела не несут, даже если они остались в хранилище */
  storage.setItem("pc-my-parties", "{}");
  assert.ok(!("pc-my-parties" in PC.backup.make().data));
});

test("старые адреса раздела и дуэли со своей партией обработаны", () => {
  const app = read("js/app.js"), nav = read("js/nav.js");
  assert.match(nav, /if\(\/\^party\(\?:\\\/\|\$\)\/\.test\(h\)\) return "compass";/, "#/party/… должен открывать компас");
  assert.match(app, /\^#\\\/\?party/, "app.js не узнаёт старый адрес раздела");
  assert.match(app, /\^u\[1-6\]\$/, "дуэль со своей партией не распознаётся");
  const { PC } = loadApp();
  const en = loadApp(undefined, { "pc-lang":"en" }).PC;
  assert.notEqual(PC.t("retired.party"), "retired.party");
  assert.doesNotMatch(en.t("retired.party"), /[А-Яа-яЁё]/);
  assert.equal(PC.partyById("u1"), null);
});
