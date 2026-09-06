/* ============ Тема: системная / светлая / тёмная ============
   По умолчанию тема системная — берётся из prefers-color-scheme и меняется
   вместе с настройкой ОС на лету. Кнопка в шапке перебирает три состояния
   по кругу и запоминает выбор; вернувшись к «системной», приложение снова
   слушает ОС. Разрешённое значение лежит в data-theme на <html> — на него
   опираются и стили, и вычисление цветов на графиках. */
(function(PC){
  "use strict";
  var KEY = "pc-theme";
  var ORDER = ["system", "light", "dark"];
  var META = {
    system: { icon:"🖥️", label:"Тема: системная" },
    light:  { icon:"☀️", label:"Тема: светлая" },
    dark:   { icon:"🌙", label:"Тема: тёмная" }
  };
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
    var btn  = document.getElementById("themeBtn");
    var icon = document.getElementById("themeIcon");

    function paint(){
      var m = META[pref()];
      if(icon) icon.textContent = m.icon;
      if(btn){
        btn.title = m.label + " · нажмите, чтобы переключить";
        btn.setAttribute("aria-label", m.label);
      }
    }
    paint();

    if(btn && icon){
      btn.addEventListener("click", function(){
        var next = ORDER[(ORDER.indexOf(pref()) + 1) % ORDER.length];
        icon.style.transform = "rotate(180deg) scale(.3)";
        apply(next);
        setTimeout(function(){
          paint();
          icon.style.transform = "none";
        }, 170);
      });
    }

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

  PC.theme = { init:init, onChange:onChange, current:resolved, pref:pref, set:apply };
})(window.PC = window.PC || {});
