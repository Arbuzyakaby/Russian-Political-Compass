/* ============ Меню настроек ============

   До 1.6 настроек как таковых не было: в шапке стояли две кнопки (тема
   и язык), слой траекторий включался чипом над компасом, а всё остальное
   решалось за читателя молча — плотность вёрстки, анимации, зерно на
   фоне, подсветка карточки под курсором. Каждая из этих мелочей кому-то
   мешает, и раскладывать их по углам интерфейса значит либо засорить
   шапку, либо не дать управления вовсе.

   Панель собрана как одно место, где живут все решения о внешнем виде.
   Разметка лежит в index.html, а не строится здесь: тема и язык — это
   переключатели theme.js и i18n.js, которые обязаны найти свои узлы на
   этапе инициализации, до всякой отрисовки, и создавать их скриптом
   означало бы гонку между тремя модулями.

   Значения хранятся одним объектом в localStorage и применяются
   атрибутами data-* на <html>. Атрибут, а не класс: на нём же сидят
   data-theme и data-density, и правило вида :root[data-motion="off"]
   читается в CSS как условие, а не как ещё один класс среди прочих.
   Тема и язык держат свои ключи (pc-theme, pc-lang) — они были до этой
   панели и переживут её. ============ */
(function(PC){
  "use strict";
  var KEY = "pc-settings";

  /* Значения по умолчанию — это ровно то, как страница выглядела до
     появления настроек: ни один переключатель в положении «из коробки»
     ничего не меняет. */
  var DEFAULTS = {
    density:  "cozy",   /* cozy | compact */
    motion:   "on",
    grain:    "on",
    spotlight:"on",
    labels:   "on",     /* подписи партий на компасе */
    quads:    "on",     /* цветная подсветка квадрантов */
    grid:     "on"      /* мелкая сетка поля */
  };
  var state = {};
  var root = document.documentElement;
  var sheet, scrim, opener, lastFocus = null;

  function load(){
    var saved = PC.store.getJSON(KEY, null) || {};
    state = {};
    Object.keys(DEFAULTS).forEach(function(k){
      state[k] = typeof saved[k] === "string" ? saved[k] : DEFAULTS[k];
    });
  }
  function save(){ PC.store.setJSON(KEY, state); }

  /* Единственное место, где настройки превращаются во что-то видимое.
     Компас слушает те же атрибуты через CSS, поэтому переключение
     подписей или сетки не требует перерисовки поля. */
  function apply(){
    root.dataset.density   = state.density;
    root.dataset.motion    = state.motion;
    root.dataset.grain     = state.grain;
    root.dataset.spotlight = state.spotlight;
    root.dataset.labels    = state.labels;
    root.dataset.quads     = state.quads;
    root.dataset.grid      = state.grid;
  }

  function get(key){ return state[key]; }

  function set(key, value){
    if(!(key in DEFAULTS) || state[key] === value) return;
    state[key] = value;
    save();
    apply();
    paint();
  }

  /* ---------- отрисовка состояния элементов управления ---------- */
  function paint(){
    sheet && sheet.querySelectorAll("[data-set-switch]").forEach(function(b){
      b.setAttribute("aria-checked", String(state[b.dataset.setSwitch] === "on"));
    });
    sheet && sheet.querySelectorAll("[data-set-seg]").forEach(function(group){
      var key = group.dataset.setSeg;
      group.querySelectorAll("[data-val]").forEach(function(b){
        var on = b.dataset.val === state[key];
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
      });
    });
  }

  /* ---------- открытие и закрытие ---------- */
  function focusables(){
    return Array.prototype.filter.call(
      sheet.querySelectorAll('button:not([tabindex="-1"]),[href],input,select'),
      function(n){ return !n.disabled && n.offsetParent !== null; });
  }

  function open(){
    if(!sheet || !sheet.hidden) return;
    lastFocus = document.activeElement;
    sheet.hidden = false;
    scrim.hidden = false;
    /* два кадра: первый вставляет панель в поток, второй запускает
       переход — иначе браузер схлопнет оба состояния в одно */
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        sheet.classList.add("is-open");
        scrim.classList.add("is-open");
      });
    });
    if(opener) opener.setAttribute("aria-expanded", "true");
    document.body.classList.add("sheet-lock");
    var first = focusables()[0];
    if(first) first.focus({ preventScroll:true });
  }

  function close(){
    if(!sheet || sheet.hidden) return;
    sheet.classList.remove("is-open");
    scrim.classList.remove("is-open");
    if(opener) opener.setAttribute("aria-expanded", "false");
    document.body.classList.remove("sheet-lock");
    var done = function(){
      sheet.hidden = true;
      scrim.hidden = true;
    };
    /* панель уезжает анимацией, но при выключенном движении её нет —
       ждать transitionend в этом случае значит не дождаться никогда */
    if(root.dataset.motion === "off" ||
       window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      done();
    }else{
      setTimeout(done, 260);
    }
    if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
  }

  function reset(){
    PC.store.remove(KEY);
    PC.store.remove("pc-theme");
    PC.store.remove("pc-trails");
    load();
    apply();
    paint();
    if(PC.theme) PC.theme.set("system");
    if(PC.ui) PC.ui.toast(PC.t("set.resetDone"));
  }

  /* ---------- сборка ---------- */
  function init(){
    load();
    apply();

    sheet  = document.getElementById("setSheet");
    scrim  = document.getElementById("setScrim");
    opener = document.getElementById("settingsBtn");
    if(!sheet || !scrim) return;

    if(opener) opener.addEventListener("click", function(){ sheet.hidden ? open() : close(); });
    scrim.addEventListener("click", close);
    var closeBtn = document.getElementById("setClose");
    if(closeBtn) closeBtn.addEventListener("click", close);

    sheet.querySelectorAll("[data-set-switch]").forEach(function(b){
      b.addEventListener("click", function(){
        set(b.dataset.setSwitch, state[b.dataset.setSwitch] === "on" ? "off" : "on");
      });
    });

    sheet.querySelectorAll("[data-set-seg]").forEach(function(group){
      var key = group.dataset.setSeg;
      var items = Array.prototype.slice.call(group.querySelectorAll("[data-val]"));
      items.forEach(function(b, i){
        b.addEventListener("click", function(){ set(key, b.dataset.val); });
        /* radiogroup: стрелки не просто переносят фокус, а выбирают —
           так эту роль описывает WAI-ARIA и так ведут себя нативные
           радиокнопки */
        b.addEventListener("keydown", function(e){
          var step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
                   : e.key === "ArrowLeft"  || e.key === "ArrowUp"   ? -1 : 0;
          if(!step) return;
          e.preventDefault();
          var next = items[(i + step + items.length) % items.length];
          set(key, next.dataset.val);
          next.focus({ preventScroll:true });
        });
      });
    });

    var resetBtn = document.getElementById("setReset");
    if(resetBtn) resetBtn.addEventListener("click", reset);

    /* Слой траекторий управляется и чипом над компасом, и переключателем
       здесь: это одно состояние в двух местах, и они обязаны сходиться. */
    var trailSwitch = document.getElementById("setTrails");
    if(trailSwitch){
      var syncTrails = function(){
        trailSwitch.setAttribute("aria-checked", String(PC.compass.trailsOn()));
      };
      trailSwitch.addEventListener("click", function(){
        var next = !PC.compass.trailsOn();
        PC.store.set("pc-trails", next ? "1" : "0");
        PC.compass.setTrails(next);
        var chip = document.getElementById("trailBtn");
        if(chip) chip.setAttribute("aria-pressed", String(next));
        syncTrails();
      });
      var chipBtn = document.getElementById("trailBtn");
      if(chipBtn) chipBtn.addEventListener("click", function(){ setTimeout(syncTrails, 0); });
      if(!PC.compass.hasTrails()){
        var row = trailSwitch.closest(".set-row");
        if(row) row.hidden = true;
      }
      syncTrails();
    }

    document.addEventListener("keydown", function(e){
      if(sheet.hidden) return;
      if(e.key === "Escape"){
        e.preventDefault();
        close();
        return;
      }
      /* Фокус заперт внутри панели, пока она открыта: диалог с
         aria-modal обязан вести себя как модальный не только на словах. */
      if(e.key === "Tab"){
        var list = focusables();
        if(!list.length) return;
        var first = list[0], last = list[list.length - 1];
        if(e.shiftKey && document.activeElement === first){
          e.preventDefault();
          last.focus();
        }else if(!e.shiftKey && document.activeElement === last){
          e.preventDefault();
          first.focus();
        }
      }
    });

    paint();
  }

  PC.settings = { init:init, get:get, set:set, open:open, close:close };
})(window.PC = window.PC || {});
