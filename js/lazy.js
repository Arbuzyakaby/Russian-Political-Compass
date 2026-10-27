/* ============ Загрузка по требованию (4.4) ============
   Дуэль партий и «Голосую сам» нужны не каждому посетителю, поэтому их
   скрипты и стили (js/duel.js, js/selfvote.js, css/tools.css) не лежат
   в основном пакете, а подгружаются, когда понадобятся: при открытии
   дуэли и при прокрутке к блоку «Проголосуйте сами».

   Перечень модулей — в index.html (<script type="application/json"
   id="pcLazy">): единственное место, где он записан. scripts/prepare-release.cjs
   подставляет в него имена файлов с хешем, поэтому в собранном сайте
   этот модуль работает без правок.

   Кнопки работают до загрузки: обработчик всегда вызывает PC.lazy.run(),
   нажатие не теряется, а кнопка на время загрузки получает метку
   aria-busy и класс lazy-busy. Ошибка загрузки (нет сети, файла нет в
   кэше) — уведомление; следующее нажатие пробует снова. ============ */
(function(PC){
  "use strict";

  var map = {}, jobs = {}, sheets = {}, loaded = {};
  var node = document.getElementById("pcLazy");
  try{ if(node) map = JSON.parse(node.textContent); }catch(e){ map = {}; }

  function stylesheet(href){
    if(!sheets[href]){
      sheets[href] = new Promise(function(resolve, reject){
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.onload = resolve;
        link.onerror = function(){ link.remove(); delete sheets[href]; reject(new Error(href)); };
        document.head.appendChild(link);
      });
    }
    return sheets[href];
  }

  function script(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function(){ s.remove(); reject(new Error(src)); };
      document.body.appendChild(s);
    });
  }

  function busy(el, on){
    if(!el) return;
    el.classList.toggle("lazy-busy", on);
    if(on) el.setAttribute("aria-busy", "true"); else el.removeAttribute("aria-busy");
  }

  /* Загружает модуль один раз; повторные вызовы получают тот же промис. */
  function lazy(name){
    var entry = map[name];
    if(!entry) return Promise.reject(new Error("lazy: неизвестный модуль " + name));
    if(loaded[name]) return Promise.resolve();
    if(!jobs[name]){
      jobs[name] = Promise.all([entry.css ? stylesheet(entry.css) : null, script(entry.js)]).then(function(){
        loaded[name] = true;
      }, function(e){ delete jobs[name]; throw e; });
    }
    return jobs[name];
  }

  /* Загружает модуль и вызывает fn. trigger — кнопка, на которой
     показывается ожидание. */
  function run(name, fn, trigger){
    busy(trigger, true);
    return lazy(name).then(function(){ busy(trigger, false); return fn(); }, function(){
      busy(trigger, false);
      if(PC.ui && PC.t) PC.ui.toast(PC.t("lazy.fail"), true);
    });
  }

  lazy.run = run;
  lazy.loaded = function(name){ return !!loaded[name]; };
  lazy.names = function(){ return Object.keys(map); };
  PC.lazy = lazy;
})(window.PC = window.PC || {});
