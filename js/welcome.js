/* ============ Приветственный экран ============

   Окно, которое встречает человека при первом заходе и один раз после
   обновления версии. Всё остальное время его нет вовсе — ни в разметке
   по-настоящему (оно hidden), ни в расходах.

   Почему вообще: страница открывается компасом, а компас без объяснения
   выглядит как график, к которому потеряли подпись. Одиннадцать кружков
   на сетке ничего не сообщают о том, что это за проект, чего он не
   делает и куда уходят ответы теста. Раньше это было написано во
   вкладке «О проекте» — то есть там, куда заходят последней.

   Когда показывается:
     первый заход            — приветствие;
     версия сменилась        — список изменений;
     версия та же            — не показывается;
     открыт чужой результат  — не показывается никогда.

   Последнее правило важнее остальных. Ссылка вида #/result/<код> —
   это ссылка, которой поделились: человек пришёл смотреть конкретный
   результат, и загораживать его рассказом о проекте значит встретить
   гостя дверью в лицо.

   Хранится версия, а не флаг «видел»: флаг пришлось бы сбрасывать
   руками при каждом выпуске, и однажды его забыли бы сбросить. ============ */
(function(PC){
  "use strict";

  var KEY = "pc-welcome";

  var el, card, points, news, closeBtn;
  var lastFocus = null;
  var mode = "hello";        /* hello | update */

  function reduced(){
    return document.documentElement.dataset.motion === "off" ||
           !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ---------- что показывать и показывать ли ---------- */
  function decide(){
    /* Чужой результат важнее любого приветствия. */
    if(location.hash.indexOf("#/result/") === 0) return null;
    var seen = PC.store.get(KEY, null);
    if(!seen) return "hello";
    if(seen !== PC.VERSION) return "update";
    return null;
  }

  /* Отметка ставится при закрытии, а не при показе: окно, закрытое
     перезагрузкой на середине, человек не читал — пусть придёт снова. */
  function remember(){ PC.store.set(KEY, PC.VERSION); }

  /* ---------- наполнение ---------- */
  function fill(which){
    mode = which;
    var isUpdate = which === "update";

    document.getElementById("welEyebrow").textContent =
      isUpdate ? PC.t("wel.up.eyebrow", { v:PC.VERSION }) : PC.t("wel.eyebrow");
    document.getElementById("welTitle").textContent =
      PC.t(isUpdate ? "wel.up.h" : "wel.h");
    document.getElementById("welLede").textContent =
      PC.t(isUpdate ? "wel.up.lede" : "wel.lede");
    document.getElementById("welEnter").textContent =
      PC.t(isUpdate ? "wel.up.enter" : "wel.enter");

    points.hidden = isUpdate;
    news.hidden = !isUpdate;
    /* «Сразу к тесту» — предложение новичку. Тому, кто вернулся после
       обновления, оно ни к чему: он знает, где тест. */
    document.getElementById("welQuiz").hidden = isUpdate;
    document.getElementById("welNote").hidden = isUpdate;
  }

  /* ---------- показ и закрытие ---------- */
  function focusables(){
    return Array.prototype.filter.call(
      el.querySelectorAll("button:not([hidden])"),
      function(n){ return !n.disabled && n.offsetParent !== null; });
  }

  function show(which){
    if(!el || !el.hidden) return;
    lastFocus = document.activeElement;
    fill(which);
    el.hidden = false;
    el.classList.remove("is-out");
    document.body.classList.add("welcome-lock");
    document.body.classList.remove("welcome-out");
    card.focus({ preventScroll:true });
  }

  function close(){
    if(!el || el.hidden) return;
    remember();
    el.classList.add("is-out");
    /* Страница проясняется на кадр раньше, чем уходит карточка: так
       закрытие читается как «пустили внутрь», а не как «окно исчезло». */
    document.body.classList.add("welcome-out");
    var done = function(){
      el.hidden = true;
      el.classList.remove("is-out");
      document.body.classList.remove("welcome-lock", "welcome-out");
      if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
      lastFocus = null;
    };
    if(reduced()) done(); else setTimeout(done, 320);
  }

  /* Повторный показ из настроек: отметку стираем, иначе кнопка
     сработала бы один раз за сеанс и молча перестала бы. */
  function replay(){
    PC.store.remove(KEY);
    if(PC.settings) PC.settings.close();
    /* Панель настроек уезжает анимацией, и открывать экран поверх
       уезжающей панели незачем — ждём, пока она уйдёт. */
    setTimeout(function(){ show("hello"); }, reduced() ? 0 : 320);
  }

  function init(){
    el = document.getElementById("welcome");
    if(!el) return;
    card     = document.getElementById("welCard");
    points   = document.getElementById("welPoints");
    news     = document.getElementById("welNews");
    closeBtn = document.getElementById("welClose");

    closeBtn.addEventListener("click", close);
    document.getElementById("welEnter").addEventListener("click", close);
    document.getElementById("welQuiz").addEventListener("click", function(){
      close();
      PC.nav.go("quiz");
    });
    /* Клик мимо карточки закрывает: экран не удерживает ничего, что
       стоило бы защищать от случайного касания. */
    el.addEventListener("click", function(e){
      if(e.target === el) close();
    });

    document.addEventListener("keydown", function(e){
      if(el.hidden) return;
      if(e.key === "Escape"){ e.preventDefault(); close(); return; }
      if(e.key !== "Tab") return;
      var list = focusables();
      if(!list.length) return;
      var first = list[0], last = list[list.length - 1];
      /* Фокус заперт внутри: под экраном лежит целая страница ссылок,
         и уйти в неё табом из модального диалога нельзя. */
      if(e.shiftKey && (document.activeElement === first || document.activeElement === card)){
        e.preventDefault();
        last.focus();
      }else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault();
        first.focus();
      }
    });

    var which = decide();
    if(which) show(which);
  }

  PC.welcome = { init:init, replay:replay, close:close };
})(window.PC = window.PC || {});
