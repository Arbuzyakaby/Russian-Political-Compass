/* ============ Лист настроек: открытие, разделы, переключатели ============
   Вынесено из js/settings.js в 5.0. Там остались значения: таблица
   по умолчанию, проверка, хранение и атрибуты data-* на <html>. Здесь —
   всё, что относится к самому листу: открыть и закрыть, рельс разделов
   на широком экране и список разделов на телефоне, связь переключателей
   разметки с PC.settings.set и их отрисовка по событию pc:settings. ============ */
(function(PC){
  "use strict";
  var root = document.documentElement;
  var sheet, scrim, opener, lastFocus = null;
  var get = function(key){ return PC.settings.get(key); };
  var set = function(key, value){ PC.settings.set(key, value); };

  /* ---------- отрисовка состояния элементов управления ---------- */
  function paint(){
    if(!sheet) return;
    sheet.querySelectorAll("[data-set-switch]").forEach(function(b){
      b.setAttribute("aria-checked", String(get(b.dataset.setSwitch) === "on"));
    });
    sheet.querySelectorAll("[data-set-seg]").forEach(function(group){
      var key = group.dataset.setSeg;
      var all = group.querySelectorAll("[data-val]");
      all.forEach(function(b){
        var on = b.dataset.val === get(key);
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

  function closeSheet(callback){
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
    sheet  = document.getElementById("setSheet");
    scrim  = document.getElementById("setScrim");
    opener = document.getElementById("settingsBtn");
    if(!sheet || !scrim) return;

    if(opener){opener.addEventListener("click",function(){sheet.hidden?open():closeSheet();});opener.disabled=false;}
    scrim.addEventListener("click", function(){ closeSheet(); });
    var closeBtn = document.getElementById("setClose");
    if(closeBtn) closeBtn.addEventListener("click", function(){ closeSheet(); });
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
        set(b.dataset.setSwitch, get(b.dataset.setSwitch) === "on" ? "off" : "on");
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
    if(resetBtn) resetBtn.addEventListener("click", function(){ PC.settings.reset(); });

    var flyBtn = document.getElementById("setFlyover");
    if(flyBtn) flyBtn.addEventListener("click", function(){
      closeSheet();
      if(PC.flyover) setTimeout(function(){ PC.flyover(true); }, 320);
    });

    var welBtn = document.getElementById("setWelcome");
    if(welBtn) welBtn.addEventListener("click", function(){
      if(PC.welcome) PC.welcome.replay();
    });

    document.addEventListener("keydown", function(e){
      if(sheet.hidden) return;
      if(e.key === "Escape"){
        e.preventDefault();
        closeSheet();
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

    /* значения меняются и снаружи листа: палитра, сброс, отмена */
    document.addEventListener("pc:settings", paint);
    paint();
  }

  PC.settingsSheet = { init:init, paint:paint };
  Object.assign(PC.settings, { open:open, close:closeSheet, selectPanel:choose, root:showRoot, drill:drill, searching:searching });
})(window.PC = window.PC || {});
