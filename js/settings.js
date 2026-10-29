/* ============ Меню настроек ============

   До 1.6 настроек как таковых не было: в шапке стояли две кнопки (тема
   и язык), слой траекторий (с 3.0 — заявленных позиций) включался чипом над компасом,
   а всё остальное
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
   панели и переживут её.

   С 2.3.1 панель — не лист, выезжающий от края экрана, а окно по центру
   с рельсом разделов слева (сверху на телефоне) и одной открытой
   панелью справа: настроек стало достаточно, что сплошная прокрутка
   всех секций подряд перестала быть самым быстрым способом найти
   нужную. Разделов восемь: к шести исходным в 2.4 добавилась
   «Приватность» с витриной PVFP, а в 2.4.2.1 — SRPC. Рельс — обычный ARIA-tablist (initPanels ниже),
   он не знает
   о самих настройках ничего: какая панель открыта, решает только атрибут
   data-panel на кнопке и на секции, а какие переключатели внутри панели
   что делают — по-прежнему целиком в разметке index.html и в data-* на
   <html>, как было до 2.3.1. ============ */
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
    density:  "cozy",     /* compact | cozy | airy */
    textsize: "normal",   /* small | normal | large */
    corners:  "normal",   /* sharp | normal | soft */
    font:     "modern",   /* modern | compact | creative | mono */
    glass:    "on",       /* полупрозрачные поверхности */
    glasslevel:"normal",  /* subtle | normal | strong — густота размытия */
    /* движение и фон */
    motion:   "on",
    bounce:   "on",      /* пружинящий отклик кнопок и вкладок (4.3) */
    grain:    "on",
    spotlight:"on",
    speed:    "normal",   /* slow | normal | fast (2.2) */
    /* компас */
    labels:   "on",      /* подписи партий на компасе */
    quads:    "on",      /* цветная подсветка квадрантов */
    grid:     "on",      /* мелкая сетка поля */
    crosshair:"on",      /* перекрестие от точки к осям */
    /* страница */
    readbar:  "on",      /* полоса прочтения под шапкой */
    topbtn:   "on",      /* кнопка возврата наверх */
    sticky:   "on",      /* липкая полоса вкладок */
    numerals: "tabular", /* tabular | proportional */
    hints:    "closed",  /* open | closed — пояснения «как это читать» */
    measure:  "normal",  /* narrow | normal — длина строки в длинных разделах */
    contrast: "off",     /* повышенный контраст (2.2) */
    underline:"off",     /* подчёркивание ссылок (2.2) */
    promo:    "on",      /* карточка Lumen (2.2) */
    /* SRPC (2.4.2.1) */
    srpcfail: "off",     /* демонстрация сбоя в третьем звене схемы */
    /* пасхалки */
    eggs:     "off",     /* портал вместо кнопки «наверх» и могила в углу */
    dotSize:"normal", labelMode:"all", bubbles:"off",
    startTab:"compass", convDefault:"9", quizMode:"full", autoNext:"off", confirmReset:"off",
    colorblind:"off", lineheight:"normal", exportFormat:"png", exportScale:"2", transparent:"off", srpcStage:"3",
    /* 5.0: акцент, поле компаса, доступность и отклик */
    accent:"theme", axisNums:"on", quadLabels:"on", center:"off",
    bigtargets:"off", focusring:"normal", haptics:"on", sounds:"off"
  };

  /* Почему две последние настройки выключены по умолчанию, хотя всё
     остальное в этой таблице включено.

     Обе показывают на странице то, чего человек не просил и о чём его
     никто не предупреждал. Пасхалки — портал вместо кнопки «наверх» и
     могила в углу подвала: тому, кто знает, они приятны, а тому, кто
     первый раз открыл сайт про партии, они читаются как сбой вёрстки.
     Демонстрация сбоя в схеме SRPC — то же самое, только хуже: третье
     звено ни с того ни с сего загорается жёлтым, и это выглядит как
     «на сайте прямо сейчас что-то сломалось», хотя это рассказ про
     устройство страницы. Обе вещи остались целиком, просто теперь их
     включают, а не выключают. */

  /* ---------- необязательные гарнитуры ----------
     Две из четырёх настроек шрифта обслуживаются веб-гарнитурами, и до
     2.1 их скачивали все подряд: два семейства с кириллицей в каждой
     загрузке страницы ради режимов, которые включает меньшинство.

     Теперь запрос уходит в тот момент, когда режим выбран, — при старте
     (если он был выбран раньше и лежит в хранилище) или сразу по клику.
     Базовые Inter и Manrope по-прежнему приходят из разметки: они стоят
     в общих стеках и нужны независимо от этой настройки.

     Системный и моноширинный режимы веб-шрифтов не требуют вовсе —
     их и нет в таблице. */
  var FONT_CSS = {
    compact:  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400..700&display=swap",
    creative: "https://fonts.googleapis.com/css2?family=Fraunces:wght@400..800&display=swap"
  };
  var fontsAsked = {};

  /* Подгружает шрифт, если он выбран и ещё не подключён. */
  function ensureFont(name){
    var href = FONT_CSS[name];
    if(!href || fontsAsked[name]) return;
    fontsAsked[name] = true;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    /* Подписи компаса разложены по метрикам прежнего шрифта: пока новый
       не доехал, ярлыки стоят по старым ширинам и могут наехать друг
       на друга. Тот же пересчёт делает app.js при первой загрузке. */
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){
        if(PC.compass && PC.nav && PC.nav.current() === "compass") PC.compass.redraw();
      });
    }
  }
  var state = {};
  var OPTIONS = {
    density:["compact","cozy","airy"],
    textsize:["small","normal","large"],
    corners:["sharp","normal","soft"],
    font:["modern","compact","creative","mono"],
    glasslevel:["subtle","normal","strong"],
    speed:["slow","normal","fast"],
    numerals:["tabular","proportional"],
    hints:["open","closed"],
    measure:["narrow","normal"],
    dotSize:["small","normal","large"],
    labelMode:["all","duma","selected"],
    startTab:["compass","last","quiz","votes","about"],
    convDefault:["4","5","6","7","8","9"],
    quizMode:["short","full","long"],
    lineheight:["normal","increased"],
    exportFormat:["png","svg"],
    exportScale:["1","2","3"],
    srpcStage:["1","2","3","4","5","6"],
    accent:["theme","indigo","teal","amber","rose","green"],
    focusring:["normal","strong"]
  };
  /* Проверяет ключ и значение по DEFAULTS. */
  function valid(key, value){ return Object.prototype.hasOwnProperty.call(DEFAULTS,key) && (OPTIONS[key] || ["on","off"]).indexOf(value) !== -1; }
  var root = document.documentElement;

  /* Читает настройки из storage с проверкой. */
  function load(){
    var saved = PC.store.getJSON(KEY, null) || {};
    state = {};
    Object.keys(DEFAULTS).forEach(function(k){
      state[k] = valid(k, saved[k]) ? saved[k] : DEFAULTS[k];
    });
  }
  function save(){ PC.store.setJSON(KEY, state); }

  /* Единственное место, где настройки превращаются во что-то видимое.
     Компас и графики слушают те же атрибуты через CSS, поэтому
     переключение подписей или сетки не требует перерисовки поля. */
  function apply(){
    Object.keys(DEFAULTS).forEach(function(k){ root.dataset[k] = state[k]; });
    ensureFont(state.font);
  }

  function get(key){ return state[key]; }

  /* Пояснения «как это читать» — единственная настройка, которую нельзя
     выразить атрибутом на <html>: раскрытость <details> живёт в его
     собственном атрибуте open, и CSS до неё не дотягивается.

     Синхронизация идёт только по смене самой настройки и один раз при
     запуске — не на каждое применение подряд. Иначе переключение темы
     захлопывало бы пояснение, которое человек только что раскрыл
     руками, и выглядело бы это как поломка. */
  function syncHints(){
    var open = state.hints === "open";
    document.querySelectorAll("details.chart-why").forEach(function(d){
      d.open = open;
    });
  }

  /* Записывает значение и сразу применяет его к странице. */
  function set(key, value){
    if(!valid(key, value) || state[key] === value) return;
    state[key] = value;
    save();
    apply();
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
    if(key === "hints") syncHints();
    document.dispatchEvent(new CustomEvent("pc:settings", { detail:{ key:key, value:value } }));
  }

  /* Сбрасывает все настройки к значениям по умолчанию. */
  function reset(){
    var previous = Object.assign({},state), previousTheme = PC.store.get("pc-theme","system");
    PC.store.remove(KEY);
    PC.store.remove("pc-theme");
    /* Слой заявленных позиций живёт своим ключом и своим переключателем
       (чип над компасом, не эта панель) — сброс обязан вернуть его в
       самом компасе, а не только стереть запись в хранилище, иначе после
       клика поле остаётся без слоя, будто сброса не было. Ключ
       pc-trails от траекторий 2.X стирается заодно: читать его больше
       некому. */
    PC.store.remove("pc-trails");
    if(PC.resetClaims) PC.resetClaims(); else PC.store.remove("pc-claims");
    load();
    apply();
    syncHints();
    if(PC.theme) PC.theme.set("system");
    if(PC.charts){
      PC.charts.invalidate();
      PC.charts.render(PC.activeId ? PC.activeId() : null);
    }
    if(PC.compass) PC.compass.redraw();
    document.dispatchEvent(new CustomEvent("pc:settings",{detail:{key:"*"}}));
    if(PC.ui) PC.ui.toast(
      PC.t("set.resetDone"),
      false,
      {
        label:PC.t("ui.undo"),
        duration:5000,
        action:function(){
          state=previous;
          save();
          apply();
          syncHints();
          if(PC.theme)PC.theme.set(previousTheme);
          document.dispatchEvent(new CustomEvent("pc:settings",{detail:{key:"*"}}));
        }
      }
    );
  }

  /* Запуск: значения из хранилища ложатся на <html> до первой отрисовки,
     а лист со всеми переключателями собирает js/settings-sheet.js. */
  function init(){
    load();
    apply();
    if(PC.settingsSheet) PC.settingsSheet.init();
    syncHints();
  }

  PC.settings = {
    init:init, get:get, set:set, reset:reset, valid:valid, DEFAULTS:DEFAULTS
  };
})(window.PC = window.PC || {});
