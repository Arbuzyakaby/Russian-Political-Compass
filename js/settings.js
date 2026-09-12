/* ============ Меню настроек ============

   До 1.6 настроек как таковых не было: в шапке стояли две кнопки (тема
   и язык), слой траекторий включался чипом над компасом, а всё остальное
   решалось за читателя молча — плотность вёрстки, анимации, зерно на
   фоне, подсветка карточки под курсором. Каждая из этих мелочей кому-то
   мешает, и раскладывать их по углам интерфейса значит либо засорить
   шапку, либо не дать управления вовсе.

   Панель собрана как одно место, где живут все решения о внешнем виде.
   В 2.0 их стало вдвое больше: к теме, плотности и шрифту добавились
   размер текста, скругление углов, стекло, а также отдельные выключатели
   для тех украшений страницы, которые раньше были безусловными —
   полосы прочтения, кнопки возврата наверх, липких вкладок, перекрестия
   на компасе.

   Разметка групп лежит в index.html, а не строится здесь: тема и язык —
   это переключатели theme.js и i18n.js, которые обязаны найти свои узлы
   на этапе инициализации, до всякой отрисовки, и создавать их скриптом
   означало бы гонку между тремя модулями.

   Значения хранятся одним объектом в localStorage и применяются
   атрибутами data-* на <html> — по одному атрибуту на ключ, имя в имя.
   Атрибут, а не класс: на нём же сидят data-theme и data-density, и
   правило вида :root[data-motion="off"] читается в CSS как условие,
   а не как ещё один класс среди прочих. Ни один из новых переключателей
   не потребовал ни строчки в других модулях: всё, что они делают,
   описано правилами в css/settings.css.

   Тема и язык держат свои ключи (pc-theme, pc-lang) — они были до этой
   панели и переживут её. ============ */
(function(PC){
  "use strict";
  var KEY = "pc-settings";

  /* Значения по умолчанию — это ровно то, как страница выглядит
     «из коробки»: ни один переключатель в исходном положении ничего
     не меняет. Ключ отсюда становится атрибутом data-<ключ> на <html>,
     поэтому добавить настройку — значит дописать сюда строку, положить
     в разметку переключатель и написать правило в CSS. */
  var DEFAULTS = {
    /* оформление */
    density:  "cozy",    /* compact | cozy | airy */
    textsize: "normal",  /* small | normal | large */
    corners:  "normal",  /* sharp | normal | soft */
    font:     "modern",  /* modern | compact | creative | mono */
    glass:    "on",      /* полупрозрачные поверхности */
    /* движение и фон */
    motion:   "on",
    grain:    "on",
    spotlight:"on",
    /* компас */
    labels:   "on",      /* подписи партий на компасе */
    quads:    "on",      /* цветная подсветка квадрантов */
    grid:     "on",      /* мелкая сетка поля */
    crosshair:"on",      /* перекрестие от точки к осям */
    /* страница */
    readbar:  "on",      /* полоса прочтения под шапкой */
    topbtn:   "on",      /* кнопка возврата наверх */
    sticky:   "on",      /* липкая полоса вкладок */
    numerals: "tabular"  /* tabular | proportional */
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
     Компас и графики слушают те же атрибуты через CSS, поэтому
     переключение подписей или сетки не требует перерисовки поля. */
  function apply(){
    Object.keys(DEFAULTS).forEach(function(k){ root.dataset[k] = state[k]; });
  }

  function get(key){ return state[key]; }

  function set(key, value){
    if(!(key in DEFAULTS) || state[key] === value) return;
    state[key] = value;
    save();
    apply();
    paint();
    /* Плотность, кегль и скругление меняют ширину контейнеров, а графики
       рисуются в реальных пикселях: без пересборки они остались бы
       нарисованными под прежний размер до первого перехода по вкладкам. */
    if(key === "density" || key === "textsize" || key === "corners"){
      if(PC.charts){
        PC.charts.invalidate();
        PC.charts.render(PC.activeId ? PC.activeId() : null);
      }
      if(PC.compass) PC.compass.redraw();
    }
  }

  /* ---------- отрисовка состояния элементов управления ---------- */
  function paint(){
    if(!sheet) return;
    sheet.querySelectorAll("[data-set-switch]").forEach(function(b){
      b.setAttribute("aria-checked", String(state[b.dataset.setSwitch] === "on"));
    });
    sheet.querySelectorAll("[data-set-seg]").forEach(function(group){
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
      setTimeout(done, 300);
    }
    if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
  }

  function reset(){
    PC.store.remove(KEY);
    PC.store.remove("pc-theme");
    /* Слой траекторий живёт своим ключом и своим переключателем (чип
       над компасом, не эта панель) — сброс обязан погасить его в самом
       компасе, а не только стереть запись в хранилище, иначе после
       клика поле остаётся с траекториями, будто сброса не было. */
    if(PC.resetTrails) PC.resetTrails(); else PC.store.remove("pc-trails");
    load();
    apply();
    paint();
    if(PC.theme) PC.theme.set("system");
    if(PC.charts){
      PC.charts.invalidate();
      PC.charts.render(PC.activeId ? PC.activeId() : null);
    }
    if(PC.compass) PC.compass.redraw();
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

  PC.settings = { init:init, get:get, set:set, open:open, close:close, DEFAULTS:DEFAULTS };
})(window.PC = window.PC || {});
