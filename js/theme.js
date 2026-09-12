/* ============ Темы оформления ============
   С версии 2.0 тем шесть плюс системный режим. Системная тема берётся
   из prefers-color-scheme и меняется вместе с настройкой ОС на лету;
   выбранная вручную живёт до следующего выбора.

   На <html> лежат два атрибута: data-theme — имя темы (на него смотрят
   стили в css/tokens.css), data-scheme — её светлота, "light" или
   "dark". Второй существует ровно для того, чтобы код, которому нужно
   знать только «светло или темно» — расчёт цвета марок на графиках в
   js/charts.js, — не обязан был знать список тем. Добавление седьмой
   темы тогда сводится к двум местам: таблице SCHEME и блоку токенов.

   До 1.6 переключателем была одна кнопка в шапке, перебиравшая три
   состояния по кругу. У кругового перебора есть неустранимый изъян:
   чтобы узнать, в каком ты состоянии, надо посмотреть на иконку, а
   чтобы попасть в нужное — нажимать наугад до двух раз. В меню настроек
   все положения видны сразу, и выбор занимает одно нажатие. С шестью
   темами перебор был бы уже просто издевательством. ============ */
(function(PC){
  "use strict";
  var KEY = "pc-theme";

  /* Светлота каждой темы. Та же таблица есть в js/theme-boot.js —
     он обязан быть самодостаточным, потому что выполняется в <head>
     до всего остального. Расхождение между копиями ловит тест. */
  var SCHEME = {
    light:"light", dark:"dark",
    paper:"light", alaska:"light",
    neon:"dark",   fireplace:"dark"
  };

  /* Порядок в меню: сначала системный режим, затем две исходные темы,
     затем четыре, появившиеся в 2.0. Точка — цвет-образец в меню:
     подложка и акцент темы, по которым её узнают, не открывая. */
  var THEMES = [
    { id:"system",    key:"set.theme.system",    bg:"linear-gradient(135deg,#f1efea 50%,#08090d 50%)", dot:"#f0b25f" },
    { id:"dark",      key:"set.theme.dark",      bg:"#08090d", dot:"#f0b25f" },
    { id:"light",     key:"set.theme.light",     bg:"#f1efea", dot:"#a1541c" },
    { id:"paper",     key:"set.theme.paper",     bg:"#f7f2e6", dot:"#b23a2e" },
    { id:"alaska",    key:"set.theme.alaska",    bg:"#e9eff5", dot:"#0e6e8c" },
    { id:"neon",      key:"set.theme.neon",      bg:"#07060f", dot:"#ff4d9d" },
    { id:"fireplace", key:"set.theme.fireplace", bg:"#16100c", dot:"#ff8a3d" }
  ];

  /* Цвет строки браузера на мобильных. В разметке стоят два <meta
     theme-color> с медиазапросами — они обслуживают только системный
     режим; выбранную вручную тему браузер по ним не угадает, и панель
     осталась бы, например, белой над «неоном». Поэтому при каждом
     переключении подменяется отдельный тег без медиазапроса: он
     перекрывает оба исходных. */
  var BAR = {
    light:"#f1efea", dark:"#08090d",
    paper:"#f7f2e6", alaska:"#e9eff5",
    neon:"#07060f",  fireplace:"#16100c"
  };

  var root = document.documentElement;
  var listeners = [];
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  var barMeta = null;

  function pref(){
    var p = root.dataset.themePref;
    return (p === "system" || SCHEME[p]) ? p : "system";
  }
  function systemTheme(){ return mq && mq.matches ? "light" : "dark"; }
  function name(){ return SCHEME[root.dataset.theme] ? root.dataset.theme : "dark"; }
  function resolved(){ return root.dataset.scheme === "light" ? "light" : "dark"; }

  function paintBar(){
    if(!barMeta){
      barMeta = document.createElement("meta");
      barMeta.name = "theme-color";
      document.head.appendChild(barMeta);
    }
    barMeta.setAttribute("content", BAR[name()] || BAR.dark);
  }

  function put(next){
    root.dataset.theme = next;
    root.dataset.scheme = SCHEME[next] || "dark";
    paintBar();
    listeners.forEach(function(fn){ fn(resolved()); });
  }

  function apply(next){
    if(next !== "system" && !SCHEME[next]) next = "system";
    root.dataset.themePref = next;
    PC.store.set(KEY, next);
    put(next === "system" ? systemTheme() : next);
  }

  function onChange(fn){ listeners.push(fn); }

  /* ---------- меню выбора ----------
     Разметка строится здесь, а не в index.html: список тем живёт в этом
     файле, и держать его вторую копию в разметке значило бы гарантировать
     расхождение при добавлении следующей темы. Контейнер #themeSeg в
     разметке есть — он обязан существовать до инициализации. */
  function init(){
    paintBar();

    var seg = document.getElementById("themeSeg");
    if(!seg) return;
    var t = PC.t;

    seg.innerHTML = THEMES.map(function(th){
      return '<button type="button" role="radio" class="theme-chip" data-val="' + th.id +
        '" aria-checked="false" tabindex="-1">' +
        '<span class="tc-swatch" style="background:' + th.bg + '" aria-hidden="true">' +
          '<i style="background:' + th.dot + '"></i></span>' +
        '<span class="tc-name" data-i18n="' + th.key + '">' + t(th.key) + '</span>' +
      '</button>';
    }).join("");

    var items = Array.prototype.slice.call(seg.querySelectorAll("[data-val]"));

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
        put(systemTheme());
      };
      if(mq.addEventListener) mq.addEventListener("change", react);
      else if(mq.addListener) mq.addListener(react);
    }
  }

  PC.theme = { init:init, onChange:onChange, current:resolved, name:name,
               pref:pref, set:apply, THEMES:THEMES, SCHEME:SCHEME };
})(window.PC = window.PC || {});
