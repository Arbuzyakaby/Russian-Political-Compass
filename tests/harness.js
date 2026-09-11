/* ============ Обвязка для тестов ============

   Проект — статическая страница без сборки: модули не экспортируются,
   а дописывают себя в глобальный объект window.PC. Чтобы проверять их
   в Node, файлы исполняются в отдельном контексте vm, где заранее
   разложены те немногие браузерные объекты, к которым модули
   обращаются на этапе загрузки.

   Заглушки намеренно минимальны: тестируется логика (данные, счёт
   теста, форматирование, сборка файлов экспорта), а не отрисовка —
   для DOM-частей нужен настоящий браузер. Если модуль однажды
   потребует чего-то ещё, тест упадёт с внятной ошибкой, а не молча
   пройдёт мимо. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

/* Узел-пустышка: принимает всё, что с ним делают модули отрисовки,
   и ничего не делает. Нужен там, где код по пути к проверяемому
   значению создаёт элементы. */
function makeNode(tag){
  const node = {
    tagName: String(tag || "div").toUpperCase(),
    textContent: "",
    innerHTML: "",
    dataset: {},
    attributes: {},
    children: [],
    style: { setProperty(){}, removeProperty(){}, cssText:"" },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    setAttribute(k, v){ this.attributes[k] = String(v); },
    getAttribute(k){ return k in this.attributes ? this.attributes[k] : null; },
    removeAttribute(k){ delete this.attributes[k]; },
    hasAttribute(k){ return k in this.attributes; },
    appendChild(c){ this.children.push(c); return c; },
    insertBefore(c){ this.children.unshift(c); return c; },
    removeChild(c){ this.children = this.children.filter(x => x !== c); return c; },
    remove(){},
    addEventListener(){},
    removeEventListener(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    getBoundingClientRect(){ return { x:0, y:0, top:0, left:0, right:0, bottom:0, width:0, height:0 }; },
    getBBox(){ return { x:0, y:0, width:0, height:0 }; },
    getClientRects(){ return []; },
    focus(){}
  };
  return node;
}

/* Хранилище: тот же контракт, что у localStorage, включая исключение
   на превышение — обёртка PC.store обязана его гасить. */
function makeStorage(){
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: k => { map.delete(k); },
    clear: () => map.clear(),
    get length(){ return map.size; }
  };
}

const DEFAULT_FILES = [
  "js/data.js", "js/utils.js", "js/i18n.js", "js/quiz-data.js", "js/quiz.js",
  "js/votes.js", "js/charts.js", "js/coalition.js", "js/export.js"
];

/* Собирает окружение и исполняет в нём перечисленные файлы проекта
   в том же порядке, в каком их подключает index.html. Возвращает
   { PC, window, storage } — дальше тест работает с настоящим кодом. */
/* seed — значения, которые должны лежать в хранилище ДО исполнения
   модулей. Нужно локализации: язык выбирается один раз на этапе загрузки
   js/i18n.js, поэтому «запустить приложение по-английски» иначе никак
   не выразить. */
function loadApp(files = DEFAULT_FILES, seed = null){
  const storage = makeStorage();
  if(seed) for(const [k, v] of Object.entries(seed)) storage.setItem(k, v);
  const documentElement = makeNode("html");

  const document = {
    documentElement,
    body: makeNode("body"),
    readyState: "complete",
    createElement: makeNode,
    createElementNS: (ns, tag) => makeNode(tag),
    createTextNode: t => ({ textContent:t }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(){},
    removeEventListener(){}
  };

  const sandbox = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Date, Math, JSON, isFinite, parseInt, parseFloat,
    document,
    localStorage: storage,
    location: { origin:"https://example.org", pathname:"/compass/", host:"example.org",
                search:"", hash:"" },
    /* язык не задан намеренно: js/i18n.js должен уметь выбрать умолчание
       сам, а тесты обязаны идти по той же ветке, что и обычный посетитель
       с неизвестным браузеру языком */
    navigator: { userAgent:"node", language:"", languages:[] },
    history: { replaceState(){} },
    matchMedia: q => ({ matches:false, media:q, addEventListener(){}, addListener(){} }),
    requestAnimationFrame: fn => setTimeout(() => fn(Date.now()), 0),
    cancelAnimationFrame: id => clearTimeout(id),
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    addEventListener(){},
    removeEventListener(){},
    XMLSerializer: function(){ this.serializeToString = () => ""; },
    IntersectionObserver: function(){ this.observe = () => {}; this.unobserve = () => {}; }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  const context = vm.createContext(sandbox);
  for(const rel of files){
    const file = path.join(ROOT, rel);
    const code = fs.readFileSync(file, "utf8");
    vm.runInContext(code, context, { filename:rel });
  }

  return { PC: sandbox.PC, window: sandbox, storage, document };
}

/* Разбор CSV, который пишет js/export.js: точка с запятой, кавычки
   удваиваются, строки разделены CRLF, в начале файла BOM. */
function parseCSV(text){
  const body = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for(let i = 0; i < body.length; i++){
    const c = body[i];
    if(quoted){
      if(c === '"'){
        if(body[i + 1] === '"'){ field += '"'; i++; }
        else quoted = false;
      }else field += c;
      continue;
    }
    if(c === '"'){ quoted = true; }
    else if(c === ";"){ row.push(field); field = ""; }
    else if(c === "\r"){ /* пропускаем: разделитель строк — CRLF */ }
    else if(c === "\n"){ row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows;
}

module.exports = { loadApp, parseCSV, makeNode, makeStorage, ROOT };
