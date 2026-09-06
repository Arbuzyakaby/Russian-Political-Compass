/* ============ Вкладки: компас · тест · о проекте ============
   Панели переключаются атрибутом hidden, то есть скрытая вкладка целиком
   выпадает из раскладки. Для компаса и графиков это принципиально: их
   разметка считается по реальным размерам контейнера и getBBox(), а внутри
   display:none и то и другое даёт нули. Поэтому при возврате на вкладку
   компаса подписчики пересобирают отрисовку. ============ */
(function(PC){
  "use strict";
  var TABS = ["compass", "quiz", "about"];
  var TITLES = {
    compass: "Политический компас партий РФ",
    quiz:    "Тест: где вы на компасе — Политический компас партий РФ",
    about:   "О проекте — Политический компас партий РФ"
  };
  var current = "compass";
  var listeners = [];
  var buttons = [];

  function fromHash(){
    var h = (location.hash || "").replace(/^#\/?/, "");
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
    document.title = TITLES[current] || TITLES.compass;
  }

  function go(name, opts){
    if(TABS.indexOf(name) === -1) name = "compass";
    var changed = name !== current;
    current = name;
    paint();
    if(!(opts && opts.silent)){
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
