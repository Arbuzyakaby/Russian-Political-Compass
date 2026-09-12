/* ============ Тема: системная / светлая / тёмная ============
   По умолчанию тема системная — берётся из prefers-color-scheme и меняется
   вместе с настройкой ОС на лету. Разрешённое значение лежит в data-theme
   на <html> — на него опираются и стили, и вычисление цветов на графиках.

   До 1.6 переключателем была одна кнопка в шапке, перебиравшая три
   состояния по кругу. У кругового перебора есть неустранимый изъян:
   чтобы узнать, в каком ты состоянии, надо посмотреть на иконку, а
   чтобы попасть в нужное — нажимать наугад до двух раз. В меню настроек
   все три положения видны сразу, и выбор занимает одно нажатие. */
(function(PC){
  "use strict";
  var KEY = "pc-theme";
  var ORDER = ["system", "light", "dark"];
  var META = {
    system: { icon:"🖥️", key:"theme.system" },
    light:  { icon:"☀️", key:"theme.light" },
    dark:   { icon:"🌙", key:"theme.dark" }
  };
  /* Сегментированный переключатель в настройках: #themeSeg — контейнер
     роли radiogroup, кнопки внутри помечены data-val. */
  var root = document.documentElement;
  var listeners = [];
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  function pref(){
    var p = root.dataset.themePref;
    return ORDER.indexOf(p) === -1 ? "system" : p;
  }
  function systemTheme(){ return mq && mq.matches ? "light" : "dark"; }
  function resolved(){ return root.dataset.theme === "light" ? "light" : "dark"; }

  function apply(next){
    root.dataset.themePref = next;
    root.dataset.theme = next === "system" ? systemTheme() : next;
    PC.store.set(KEY, next);
    listeners.forEach(function(fn){ fn(resolved()); });
  }

  function onChange(fn){ listeners.push(fn); }

  function init(){
    var seg = document.getElementById("themeSeg");
    var items = seg ? Array.prototype.slice.call(seg.querySelectorAll("[data-val]")) : [];

    function paint(){
      var now = pref();
      items.forEach(function(b){
        var on = b.dataset.val === now;
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
      });
    }

    items.forEach(function(b, i){
      b.addEventListener("click", function(){
        apply(b.dataset.val);
        paint();
      });
      b.addEventListener("keydown", function(e){
        var step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
                 : e.key === "ArrowLeft"  || e.key === "ArrowUp"   ? -1 : 0;
        if(!step) return;
        e.preventDefault();
        var next = items[(i + step + items.length) % items.length];
        apply(next.dataset.val);
        paint();
        next.focus({ preventScroll:true });
      });
    });
    paint();

    /* системная тема сменилась в ОС — подхватываем, пока пользователь
       не выбрал конкретную тему вручную */
    if(mq){
      var react = function(){
        if(pref() !== "system") return;
        root.dataset.theme = systemTheme();
        listeners.forEach(function(fn){ fn(resolved()); });
      };
      if(mq.addEventListener) mq.addEventListener("change", react);
      else if(mq.addListener) mq.addListener(react);
    }
  }

  PC.theme = { init:init, onChange:onChange, current:resolved, pref:pref, set:apply, META:META };
})(window.PC = window.PC || {});
