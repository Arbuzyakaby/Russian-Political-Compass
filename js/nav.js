/* ============ Вкладки: компас · тест · о проекте ============
   Панели переключаются атрибутом hidden, то есть скрытая вкладка целиком
   выпадает из раскладки. Для компаса и графиков это принципиально: их
   разметка считается по реальным размерам контейнера и getBBox(), а внутри
   display:none и то и другое даёт нули. Поэтому при возврате на вкладку
   компаса подписчики пересобирают отрисовку. ============ */
(function(PC){
  "use strict";
  var TABS = ["compass", "quiz", "votes", "about"];
  var TITLES = {
    compass: "doc.title.compass",
    quiz:    "doc.title.quiz",
    votes:   "doc.title.votes",
    about:   "doc.title.about"
  };
  var current = "compass";
  var listeners = [];
  var buttons = [];
  var indicator = null;

  /* Ссылка на результат теста — тоже адрес вкладки, просто с полезной
     нагрузкой: #/result/<код> открывает вкладку теста и передаёт код
     самому тесту. Держать это знание здесь, а не в quiz.js, необходимо —
     иначе неизвестный хеш откатывался бы на компас, и ссылка из
     мессенджера открывала бы не то, что обещала. */
  function fromHash(){
    var h = (location.hash || "").replace(/^#\/?/, "");
    if(/^result\//.test(h)) return "quiz";
    return TABS.indexOf(h) === -1 ? "compass" : h;
  }

  function paint(){
    buttons.forEach(function(b){
      var on = b.dataset.tab === current;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    TABS.forEach(function(name){
      var panel = document.getElementById("panel-" + name);
      if(!panel) return;
      if(name === current){
        panel.removeAttribute("hidden");
        /* класс снимаем и вешаем заново, иначе анимация входа проигралась
           бы только при первом показе: обращение к offsetWidth между двумя
           операциями заставляет браузер применить снятие класса сразу */
        panel.classList.remove("panel-enter");
        void panel.offsetWidth;
        panel.classList.add("panel-enter");
      }else{
        panel.setAttribute("hidden", "");
        panel.classList.remove("panel-enter");
      }
    });
    /* поиск относится только к компасу — на других вкладках он бесполезен.
       Оставшуюся в одиночестве кнопку темы на узком экране убирает в угол
       шапки класс tools-solo (см. css/header.css). */
    var search = document.getElementById("searchWrap");
    if(search){
      var solo = current !== "compass";
      search.hidden = solo;
      var tools = search.parentNode;
      if(tools) tools.classList.toggle("tools-solo", solo);
      var bar = document.querySelector(".topbar");
      if(bar) bar.classList.toggle("topbar-solo", solo);
    }
    document.title = PC.t(TITLES[current] || TITLES.compass);
    moveIndicator();
  }

  /* ---------- бегунок под активной вкладкой ----------
     Полоса едет от вкладки к вкладке вместо того, чтобы мигать в новом
     месте: движение показывает, откуда и куда переключились, и связывает
     два состояния в одно действие. Считается по реальным размерам кнопки,
     потому что ширина вкладок зависит от языка — «Голосования» и «Votes»
     занимают разное место. */
  function moveIndicator(){
    if(!indicator) return;
    var active = buttons.filter(function(b){ return b.dataset.tab === current; })[0];
    if(!active || !active.offsetWidth) return;
    indicator.style.width = active.offsetWidth + "px";
    indicator.style.transform = "translateX(" + active.offsetLeft + "px)";
    indicator.style.opacity = "1";
  }

  function go(name, opts){
    if(TABS.indexOf(name) === -1) name = "compass";
    var changed = name !== current;
    current = name;
    paint();
    /* Хеш переписывается, только если он ведёт на другую вкладку: иначе
       переход по #/result/<код> тут же затирал бы код на «#/quiz», и
       обновление страницы теряло бы открытый результат. */
    if(!(opts && opts.silent) && fromHash() !== name){
      var hash = "#/" + name;
      if(location.hash !== hash) history.replaceState(null, "", hash);
    }
    if(changed || (opts && opts.force)){
      listeners.forEach(function(fn){ fn(current); });
      if(!(opts && opts.keepScroll)) window.scrollTo({ top:0, behavior:"smooth" });
    }
  }

  function onChange(fn){ listeners.push(fn); }

  function init(){
    buttons = Array.prototype.slice.call(document.querySelectorAll(".tab"));

    var bar = document.querySelector(".tabs");
    if(bar){
      indicator = document.createElement("span");
      indicator.className = "tab-indicator";
      indicator.setAttribute("aria-hidden", "true");
      bar.appendChild(indicator);
      window.addEventListener("resize", moveIndicator, { passive:true });
      if(document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
    }
    buttons.forEach(function(b, i){
      b.addEventListener("click", function(){ go(b.dataset.tab); });
      /* стрелки перемещают фокус по вкладкам — поведение роли tablist */
      b.addEventListener("keydown", function(e){
        var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if(!step) return;
        e.preventDefault();
        var nextBtn = buttons[(i + step + buttons.length) % buttons.length];
        nextBtn.focus();
        go(nextBtn.dataset.tab);
      });
    });

    current = fromHash();
    paint();
    window.addEventListener("hashchange", function(){ go(fromHash(), { silent:true }); });
  }

  PC.nav = { init:init, go:go, onChange:onChange, current:function(){ return current; } };
})(window.PC = window.PC || {});
