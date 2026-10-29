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
    colorblind:"off", lineheight:"normal", exportFormat:"png", exportScale:"2", transparent:"off", srpcStage:"3"
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
    srpcStage:["1","2","3","4","5","6"]
  };
  /* Проверяет ключ и значение по DEFAULTS. */
  function valid(key, value){ return Object.prototype.hasOwnProperty.call(DEFAULTS,key) && (OPTIONS[key] || ["on","off"]).indexOf(value) !== -1; }
  var root = document.documentElement;
  var sheet, scrim, opener, lastFocus = null;

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
    if(key === "hints") syncHints();
    document.dispatchEvent(new CustomEvent("pc:settings", { detail:{ key:key, value:value } }));
  }

  /* ---------- отрисовка состояния элементов управления ---------- */
  function paint(){
    if(!sheet) return;
    sheet.querySelectorAll("[data-set-switch]").forEach(function(b){
      b.setAttribute("aria-checked", String(state[b.dataset.setSwitch] === "on"));
    });
    sheet.querySelectorAll("[data-set-seg]").forEach(function(group){
      var key = group.dataset.setSeg;
      var all = group.querySelectorAll("[data-val]");
      all.forEach(function(b){
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

  /* Пока панель едет, с неё снимается стекло: см. .sheet.is-moving
     в css/settings.css. Класс убирается по концу перехода, а таймер —
     страховка на случай, когда transitionend не придёт вовсе: при
     выключенных анимациях перехода нет, а событие «переход закончился»
     без перехода не наступает. Прошлый таймер всегда гасится: быстрое
     «открыть — закрыть — открыть» иначе сняло бы класс у уже едущей
     в другую сторону панели. */
  var moveTimer = null;
  function moving(){
    if(!sheet) return;
    sheet.classList.add("is-moving");
    clearTimeout(moveTimer);
    var done = function(e){
      /* У панели два перехода сразу, и прозрачность заканчивается раньше
         движения. Вернуть стекло по её событию значит вернуть его
         посреди хода — то есть устроить пересчёт размытия ровно там,
         где его и убирали. Ждём именно transform и именно у самой
         панели: переходы внутри неё всплывают сюда же. */
      if(e && (e.target !== sheet || e.propertyName !== "transform")) return;
      clearTimeout(moveTimer);
      sheet.removeEventListener("transitionend", done);
      sheet.classList.remove("is-moving");
    };
    sheet.addEventListener("transitionend", done);
    moveTimer = setTimeout(done, 300);
  }

  function open(){
    if(!sheet || !sheet.hidden) return;
    lastFocus = document.activeElement;
    if(drill()) showRoot(); else enter(null);
    sheet.hidden = false;
    scrim.hidden = false;
    if(opener) opener.setAttribute("aria-expanded", "true");
    document.body.classList.add("sheet-lock");
    /* два кадра: первый вставляет панель в поток, второй запускает
       переход — иначе браузер схлопнет оба состояния в одно.

       Фокус ставится здесь же, вторым кадром, а не сразу после
       снятия hidden (как было до 2.5). Постановка фокуса заставляет
       браузер посчитать раскладку панели целиком, и на телефоне эта
       работа занимала больше сотни миллисекунд — ровно между вызовом
       open() и первым нарисованным кадром. Переход при этом уже шёл по
       часам, поэтому первый видимый кадр приходился почти на его конец:
       вместо выезда получался прыжок. Теперь порядок обратный —
       сначала запускается переход, потом считается фокус. */
    var started = false;
    var start = function(){
      if(started) return;
      started = true;
      moving();
      sheet.classList.add("is-open");
      scrim.classList.add("is-open");
      var first = focusables()[0];
      if(first) first.focus({ preventScroll:true });
    };
    requestAnimationFrame(function(){ requestAnimationFrame(start); });
    /* Страховка таймером — тот же приём, что у рельса оглавления
       в js/ui.js и по той же причине: у невидимой вкладки браузер
       кадров не рисует, и запрошенный обратный вызов не приходит
       никогда. Без неё панель, открытая из фоновой вкладки, осталась бы
       навсегда за нижней кромкой экрана: hidden уже снят, а класс,
       который её выдвигает, так и не поставлен. Кто успел первым, тот
       и запускает; второй видит поднятый флаг и молча выходит. */
    setTimeout(start, 60);
  }

  function close(callback){
    if(!sheet || sheet.hidden) return;
    /* незаконченный поиск не переживает закрытия: следующее открытие
       начинается со списка разделов, а не с отфильтрованных строк */
    var query = sheet.querySelector(".settings-search");
    if(query && query.value){ query.value = ""; query.dispatchEvent(new Event("input")); }
    moving();
    sheet.classList.remove("is-open");
    scrim.classList.remove("is-open");
    if(opener) opener.setAttribute("aria-expanded", "false");
    document.body.classList.remove("sheet-lock");
    var done = function(){
      if(sheet.hidden) return;
      sheet.hidden = true;
      scrim.hidden = true;
      if(typeof callback === "function") callback();
    };
    /* панель уезжает анимацией, но при выключенном движении её нет —
       ждать transitionend в этом случае значит не дождаться никогда */
    if(root.dataset.motion === "off" ||
       window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      done();
    }else{
      var ended = function(e){ if(e.target === sheet && e.propertyName === "transform"){ sheet.removeEventListener("transitionend", ended); done(); } };
      sheet.addEventListener("transitionend", ended);
      setTimeout(function(){ sheet.removeEventListener("transitionend", ended); done(); }, 350);
    }
    if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
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
    paint();
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
          paint();
          syncHints();
          if(PC.theme)PC.theme.set(previousTheme);
          document.dispatchEvent(new CustomEvent("pc:settings",{detail:{key:"*"}}));
        }
      }
    );
  }

  /* ---------- рельс разделов (2.3.1) ----------
     Полноценный ARIA-tablist: клик или стрелки переключают панель,
     кочующий tabindex держит в обычном порядке Tab только активную
     кнопку рельса — так же, как в сегментированных переключателях
     ниже, только по одной панели вместо одного значения. */
  var rail, panelTabs, panels, panelsBox;
  function selectPanel(id){
    if(!panels || !panels.length) return;
    panels.forEach(function(p){ p.hidden = p.dataset.panel !== id; });
    panelTabs.forEach(function(b){
      var on = b.dataset.panel === id;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      /* на телефоне рельс — горизонтальная лента: выбранный раздел
         подъезжает в видимую часть, а не остаётся за краем экрана */
      if(on && rail && rail.scrollWidth > rail.clientWidth)
        rail.scrollTo({ left:Math.max(0, b.offsetLeft - 16), behavior:"smooth" });
    });
    /* Раздел меняется целиком, а не листается: без сброса прокрутки
       новая панель могла бы открыться уже прокрученной вниз, если
       прошлая была прокручена, — заголовок и первая строка терялись бы
       из виду. Общий контейнер #setPanels один на все шесть секций,
       поэтому его позиция не привязана к тому, какая секция видна. */
    if(panelsBox) panelsBox.scrollTop = 0;
  }
  /* ---------- список разделов на телефоне (4.1) ----------
     Как в настройках iOS: лист открывается списком разделов с цветными
     иконками, нажатие уводит внутрь раздела, стрелка в шапке
     возвращает к списку. На широком экране рельс и панель видны рядом,
     и этого режима нет — там он только мешал бы. */
  function drill(){ return window.matchMedia("(max-width:720px),(pointer:coarse) and (max-width:1050px)").matches; }
  function showRoot(){
    if(!sheet) return;
    sheet.classList.add("is-root");
    var back = document.getElementById("setBack"), title = document.getElementById("setTitle");
    if(back) back.hidden = true;
    if(title) title.textContent = PC.t("set.title");
  }
  function enter(id){
    if(!sheet) return;
    sheet.classList.remove("is-root");
    var back = document.getElementById("setBack"), title = document.getElementById("setTitle");
    var tab = panelTabs.filter(function(b){ return b.dataset.panel === id; })[0];
    if(back) back.hidden = !drill();
    if(title) title.textContent = tab ? tab.textContent.trim() : PC.t("set.title");
  }
  /* На мобильном: выбирает раздел и переходит внутрь него. */
  function choose(id){ selectPanel(id); if(drill()) enter(id); }
  /* Поиск на телефоне показывает найденные строки всех разделов сразу,
     поэтому список разделов на время поиска убирается. */
  function searching(on){
    if(!sheet) return;
    sheet.classList.toggle("is-search", on);
    if(on && drill()) sheet.classList.remove("is-root");
  }
  /* Вкладки и панели меню настроек с ARIA-ролями. */
  function initPanels(){
    rail = document.getElementById("setRail");
    if(!rail) return;
    panelsBox = document.getElementById("setPanels");
    panelTabs = Array.prototype.slice.call(rail.querySelectorAll(".setm-tab"));
    panels = Array.prototype.slice.call(sheet.querySelectorAll(".set-group[data-panel]"));
    panelTabs.forEach(function(b, i){
      b.addEventListener("click", function(){
        choose(b.dataset.panel);
        if(drill()){ var back = document.getElementById("setBack"); if(back) back.focus({ preventScroll:true }); }
      });
      b.addEventListener("keydown", function(e){
        var horizontal = getComputedStyle(rail).flexDirection === "row";
        var step = horizontal
          ? (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0)
          : (e.key === "ArrowDown"  ? 1 : e.key === "ArrowUp"   ? -1 : 0);
        if(!step) return;
        e.preventDefault();
        var next = panelTabs[(i + step + panelTabs.length) % panelTabs.length];
        selectPanel(next.dataset.panel);
        next.focus({ preventScroll:true });
      });
    });
    if(panelTabs.length) selectPanel(panelTabs[0].dataset.panel);
  }

  /* ---------- сборка ---------- */
  function init(){
    load();
    apply();

    sheet  = document.getElementById("setSheet");
    scrim  = document.getElementById("setScrim");
    opener = document.getElementById("settingsBtn");
    if(!sheet || !scrim) return;

    if(opener){opener.addEventListener("click",function(){sheet.hidden?open():close();});opener.disabled=false;}
    scrim.addEventListener("click", close);
    var closeBtn = document.getElementById("setClose");
    if(closeBtn) closeBtn.addEventListener("click", close);
    /* поворот или изменение окна при открытом листе: режим списка
       разделов включается и снимается вместе с телефонной раскладкой */
    var phoneQuery = window.matchMedia("(max-width:720px),(pointer:coarse) and (max-width:1050px)");
    var onLayout = function(){
      if(sheet.hidden) return;
      var active = sheet.querySelector('.setm-tab[aria-selected="true"]');
      if(drill()) showRoot(); else enter(active ? active.dataset.panel : null);
    };
    if(phoneQuery.addEventListener) phoneQuery.addEventListener("change", onLayout);
    var backBtn = document.getElementById("setBack");
    if(backBtn) backBtn.addEventListener("click", function(){
      var active = sheet.querySelector('.setm-tab[aria-selected="true"]');
      showRoot();
      if(active) active.focus({ preventScroll:true });
    });

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

    initPanels();

    var resetBtn = document.getElementById("setReset");
    if(resetBtn) resetBtn.addEventListener("click", reset);

    var flyBtn = document.getElementById("setFlyover");
    if(flyBtn) flyBtn.addEventListener("click", function(){
      close();
      if(PC.flyover) setTimeout(function(){ PC.flyover(true); }, 320);
    });

    var welBtn = document.getElementById("setWelcome");
    if(welBtn) welBtn.addEventListener("click", function(){
      if(PC.welcome) PC.welcome.replay();
    });

    syncHints();

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

  /* ---------- дополнительные настройки 4.0 ----------
     С 4.3 их строки лежат в index.html (div.tisza-setting[data-setting]
     со списком select#setting-<ключ>, помеченным data-native, чтобы
     PC.dropdown его не подменял): подписи переводятся вместе с остальной
     разметкой. extend() только связывает списки с get/set и добавляет то,
     что относится ко всему листу: метку «изменено» у строки, «сбросить
     раздел», поиск, резервную копию и «стереть всё». Вызывается один раз
     из PC.tisza.init. */
  function extraControls(){
    return Array.from(document.querySelectorAll("#setPanels select[data-native][id^='setting-']"));
  }

  function node(tag, cls, text){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text != null) e.textContent = text;
    return e;
  }

  function smallButton(text, onClick){
    var b = node("button", "btn small", text);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  function bindExtraControls(){
    extraControls().forEach(function(control){
      var key = control.id.slice("setting-".length);
      control.value = get(key);
      control.addEventListener("change", function(){ set(key, control.value); });
    });
  }

  /* Метка «изменено» у строк, чьё значение отличается от исходного, и
     синхронизация дополнительных списков после «сбросить» и восстановления. */
  function markChanged(sheet){
    sheet.querySelectorAll(".set-row").forEach(function(row){
      var controls = Array.from(row.querySelectorAll("[data-set-switch],[data-set-seg]"));
      var different = row.dataset.setting
        ? get(row.dataset.setting) !== DEFAULTS[row.dataset.setting]
        : controls.some(function(c){ var k = c.dataset.setSwitch || c.dataset.setSeg; return get(k) !== DEFAULTS[k]; });
      row.classList.toggle("is-modified", different);
      row.title = different ? PC.t("set.modified") : "";
    });
    extraControls().forEach(function(control){ control.value = get(control.id.slice("setting-".length)); });
  }

  /* «Сбросить раздел» с отменой: прежние значения запоминаются и
     возвращаются кнопкой в уведомлении. */
  function addSectionResets(){
    document.querySelectorAll("#setPanels .set-group").forEach(function(group){
      group.appendChild(smallButton(PC.t("set.resetSection"), function(){
        var previous = {};
        group.querySelectorAll("[data-set-switch],[data-set-seg],[data-setting]").forEach(function(c){
          var k = c.dataset.setSwitch || c.dataset.setSeg || c.dataset.setting;
          previous[k] = get(k);
          set(k, DEFAULTS[k]);
        });
        PC.ui.toast(PC.t("set.resetDone"), false, {
          label:PC.t("ui.undo"),
          duration:5000,
          action:function(){ Object.keys(previous).forEach(function(k){ set(k, previous[k]); }); }
        });
      }));
    });
  }

  /* Поиск под шапкой листа, как в настройках iOS: он один на все разделы
     и виден и в списке разделов, и внутри раздела. */
  function addSearch(sheet){
    var search = node("input", "settings-search");
    search.type = "search";
    search.placeholder = PC.t("set.search");
    search.setAttribute("aria-label", PC.t("set.search"));
    sheet.insertBefore(search, sheet.querySelector(".sheet-body"));
    search.addEventListener("input", function(){
      var value = search.value.trim().toLowerCase();
      document.querySelectorAll("#setPanels .set-group").forEach(function(group){
        var matches = false;
        group.querySelectorAll(".set-row").forEach(function(row){
          row.hidden = !!value && row.textContent.toLowerCase().indexOf(value) < 0;
          if(!row.hidden) matches = true;
        });
        if(value) group.hidden = !matches;
      });
      searching(!!value);
      if(value) return;
      var active = sheet.querySelector('.setm-tab[aria-selected="true"]');
      if(drill()) showRoot();
      else if(active) choose(active.dataset.panel);
    });
  }

  /* Кнопки экспорта и импорта настроек. */
  function addBackupButtons(){
    var general = document.getElementById("setPanel-general");
    var actions = node("div", "set-actions");
    var input = node("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;
    input.id = "backupImport";
    actions.append(
      smallButton(PC.t("set.backup"), function(){
        var data = PC.backup.make();
        if(data) PC.exporter.download(new Blob([JSON.stringify(data, null, 2)], { type:"application/json" }), "politcompass-backup.json");
      }),
      smallButton(PC.t("set.restore"), function(){ input.click(); })
    );
    input.addEventListener("change", async function(){
      var file = input.files[0];
      if(!file) return;
      var data;
      try{
        if(file.size > 5000000) throw Error();
        data = JSON.parse(await file.text());
      }catch(e){
        PC.ui.toast(PC.t("set.badBackup"), true);
        return;
      }
      if(!PC.backup.restore(data)){
        PC.ui.toast(PC.t("set.badBackup"), true);
        return;
      }
      /* копия 4.x могла нести «Мою партию»: её ключи пропущены, и об этом
         надо сказать, а не промолчать */
      var skipped = PC.backup.skipped(data);
      PC.ui.toast(skipped.length ? PC.t("set.restoredSkip", { keys:skipped.join(", ") }) : PC.t("set.restored"));
      setTimeout(function(){ location.reload(); }, 600);
    });
    general.append(actions, input);
  }

  /* «Стереть всё» в разделе приватности: удаляет все pc-*, но оставляет
     в уведомлении кнопку «отменить», пока оно не исчезло. */
  function addEraseAll(){
    var privacy = document.getElementById("setPanel-privacy");
    privacy.appendChild(node("p", "set-meta", "pc-settings · pc-quiz-* · pc-selfvote · pc-eggs-found"));
    privacy.appendChild(smallButton(PC.t("set.eraseAll"), function(){
      var before = PC.backup.make();
      if(!before) return;
      Object.keys(before.data).concat(PC.backup.RETIRED).forEach(function(k){ PC.store.remove(k); });
      PC.quiz.clearLocal();
      if(PC.selfVote) PC.selfVote.clearLocal();
      reset();
      PC.compass.redraw();
      PC.refresh();
      PC.ui.toast(PC.t("set.resetDone"), false, {
        label:PC.t("ui.undo"),
        duration:5000,
        action:function(){ if(PC.backup.restore(before)) location.reload(); }
      });
    }));
  }

  function extend(){
    var sheet = document.getElementById("setSheet");
    addSearch(sheet);
    bindExtraControls();
    document.addEventListener("pc:settings", function(){ markChanged(sheet); });
    addSectionResets();
    addBackupButtons();
    addEraseAll();
    markChanged(sheet);
  }

  PC.settings = {
    init:init, get:get, set:set, open:open, close:close, reset:reset, selectPanel:choose, root:showRoot, drill:drill, searching:searching,
    valid:valid, extend:extend, DEFAULTS:DEFAULTS
  };
})(window.PC = window.PC || {});
