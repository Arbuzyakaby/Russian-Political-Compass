/* ============ Приветственный экран ============

   Окно, которое встречает человека при первом заходе и один раз после
   обновления версии. Всё остальное время его нет вовсе.

   С 2.1.1 первый заход состоит из трёх шагов в одной карточке:
     lang  — выбор языка;
     hello — приветствие;
     tour  — короткое анимированное обучение, четыре сцены.

   Когда показывается:
     первый заход            — с выбора языка;
     язык только что выбран  — с приветствия (после перезагрузки);
     версия сменилась        — список изменений;
     версия та же            — не показывается;
     открыт чужой результат  — не показывается никогда.

   Почему язык — первым шагом. До 2.1.1 он угадывался по браузеру, и
   приветствие показывалось то по-русски, то по-английски: у половины
   русскоязычных в списке языков системы первым стоит en-US. Человек
   видел английское окно, закрывал его — и отметка «видел» ставилась,
   так что по-русски приветствия он уже не получал. Со стороны это
   выглядело как «окно то появляется, то нет, иногда на английском».

   Смена языка перезагружает страницу (см. js/i18n.js). Чтобы после
   перезагрузки экран продолжил со второго шага, а не начал сначала,
   в sessionStorage кладётся одноразовая метка. Именно sessionStorage:
   метка нужна ровно на одну перезагрузку одной вкладки и не должна
   пережить закрытие браузера.

   Хранится версия, а не флаг «видел»: флаг пришлось бы сбрасывать
   руками при каждом выпуске, и однажды его забыли бы сбросить. ============ */
(function(PC){
  "use strict";

  var KEY = "pc-welcome";
  var RESUME = "pc-welcome-resume";
  var SCENES = 4;

  var el, card, points, news;
  var steps = {};
  var lastFocus = null;
  var step = null;           /* lang | hello | tour */
  var mode = "hello";        /* hello | update */
  var scene = 0;

  function reduced(){
    return document.documentElement.dataset.motion === "off" ||
           !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function session(action, value){
    try{
      if(action === "take"){
        var v = sessionStorage.getItem(RESUME);
        sessionStorage.removeItem(RESUME);
        return v;
      }
      sessionStorage.setItem(RESUME, value);
    }catch(e){ /* приватный режим: шаг языка просто покажется ещё раз */ }
    return null;
  }

  /* ---------- что показывать и показывать ли ----------
     Чистая функция: всё, от чего зависит решение, приходит аргументом.
     Так её можно проверить в Node без браузера, и так видно, что
     решение не зависит ни от чего, кроме этих четырёх значений. */
  function decide(o){
    o = o || {};
    /* Чужой результат важнее любого приветствия. */
    if(/^#\/?result\//.test(o.hash || "")) return null;
    if(o.resume === "hello" || o.resume === "tour") return o.resume;
    if(!o.seen) return "lang";
    if(o.seen !== o.version) return "update";
    return null;
  }

  /* Отметка ставится при закрытии, а не при показе: окно, закрытое
     перезагрузкой на середине, человек не читал — пусть придёт снова. */
  function remember(){ PC.store.set(KEY, PC.VERSION); }

  /* ---------- шаги ---------- */
  function fillHello(which){
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
    /* «Сразу к тесту» и обучение — предложение новичку. Тому, кто
       вернулся после обновления, они ни к чему: он знает, где тест. */
    document.getElementById("welQuiz").hidden = isUpdate;
    document.getElementById("welNote").hidden = isUpdate;
    document.getElementById("welTour").hidden = isUpdate;
    document.getElementById("welEnter").classList.toggle("primary", isUpdate);
  }

  function go(next){
    step = next;
    card.dataset.step = next;
    Object.keys(steps).forEach(function(k){ steps[k].hidden = k !== next; });
    var title = { lang:"welLangTitle", hello:"welTitle", tour:"welTourTitle" }[next];
    card.setAttribute("aria-labelledby", title);
    if(next === "tour") showScene(0);
    /* каждый шаг заново проигрывает появление содержимого */
    var s = steps[next];
    s.classList.remove("is-enter");
    void s.offsetWidth;
    s.classList.add("is-enter");
    /* фокус на карточку, а не на первую кнопку: иначе на шаге обучения
       рамка фокуса висела бы на «Пропустить» и читалась как подсказка */
    card.focus({ preventScroll:true });
  }

  /* ---------- обучение ---------- */
  function showScene(i){
    scene = Math.max(0, Math.min(SCENES - 1, i));
    var n = scene + 1;
    document.getElementById("welTourCount").textContent = PC.t("wel.t.count", { n:n, total:SCENES });
    document.getElementById("welTourTitle").textContent = PC.t("wel.t" + n + ".h");
    document.getElementById("welTourText").textContent = PC.t("wel.t" + n + ".p");

    el.querySelectorAll(".wt-scene").forEach(function(node){
      var on = Number(node.dataset.scene) === scene;
      node.classList.remove("is-on");
      if(on){
        /* перезапуск анимации: без перерисовки браузер склеит снятие
           и возврат класса в одно ничего */
        void node.offsetWidth;
        node.classList.add("is-on");
      }
    });
    el.querySelectorAll("#welTourDots i").forEach(function(dot, k){
      dot.classList.toggle("is-on", k === scene);
      dot.classList.toggle("is-done", k < scene);
    });
    document.getElementById("welBack").hidden = scene === 0;
    document.getElementById("welSkip").hidden = scene === SCENES - 1;
    document.getElementById("welNext").textContent =
      PC.t(scene === SCENES - 1 ? "wel.done" : "wel.next");
  }

  function nextScene(){
    if(scene >= SCENES - 1) close();
    else showScene(scene + 1);
  }

  /* ---------- язык ---------- */
  function paintLang(){
    var now = PC.i18n.current();
    el.querySelectorAll(".wel-lang").forEach(function(b){
      b.classList.toggle("is-current", b.dataset.lang === now);
    });
  }

  function pickLang(lang){
    if(lang === PC.i18n.current()){
      /* Явный выбор запоминается и тогда, когда он совпал с угаданным:
         иначе при следующей смене языка браузера страница молча
         переключилась бы сама. */
      PC.store.set("pc-lang", lang);
      go("hello");
      return;
    }
    /* Пауза перед перезагрузкой (см. ниже) не должна выглядеть как
       зависшая страница: кнопки гасятся, а нажатая получает лёгкую
       пульсацию — то же самое ощущение «идёт», что и у остальных
       кнопок с сетевым действием на странице. */
    el.querySelectorAll(".wel-lang").forEach(function(b){
      b.disabled = true;
      b.classList.toggle("is-loading", b.dataset.lang === lang);
    });
    session("set", "hello");
    /* Перезагрузка идёт не мгновенно, а через кадр. Это первый переход
       на странице после самой первой загрузки, и на некоторых доменах
       перед сайтом стоит прокси с проверкой «не бот» (например,
       Cloudflare): она может ещё не успеть доверить браузеру эту
       вкладку, если запрос на перезагрузку уходит через доли секунды
       после самого первого запроса. Секундной паузы достаточно, чтобы
       проверка гарантированно завершилась, и стоит она человеку
       незаметно мало на фоне остального интерфейса. Полностью снять
       так можно только часть случаев — сама проверка живёт вне этого
       проекта, на стороне прокси. */
    setTimeout(function(){ PC.i18n.set(lang); }, 700);
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
    fillHello(which === "update" ? "update" : "hello");
    paintLang();
    el.hidden = false;
    el.classList.remove("is-out");
    document.body.classList.add("welcome-lock");
    document.body.classList.remove("welcome-out");
    go(which === "update" ? "hello" : which);
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
    setTimeout(function(){ show("lang"); }, reduced() ? 0 : 320);
  }

  function init(){
    if(el) return;           /* повторный вызов из запасного пути app.js */
    el = document.getElementById("welcome");
    if(!el) return;
    card   = document.getElementById("welCard");
    points = document.getElementById("welPoints");
    news   = document.getElementById("welNews");
    steps  = {
      lang:  document.getElementById("welLang"),
      hello: document.getElementById("welHello"),
      tour:  document.getElementById("welTourStep")
    };

    document.getElementById("welClose").addEventListener("click", close);
    document.getElementById("welEnter").addEventListener("click", close);
    document.getElementById("welTour").addEventListener("click", function(){ go("tour"); });
    document.getElementById("welQuiz").addEventListener("click", function(){
      close();
      PC.nav.go("quiz");
    });
    document.getElementById("welSkip").addEventListener("click", close);
    document.getElementById("welBack").addEventListener("click", function(){ showScene(scene - 1); });
    document.getElementById("welNext").addEventListener("click", nextScene);
    el.querySelectorAll(".wel-lang").forEach(function(b){
      b.addEventListener("click", function(){ pickLang(b.dataset.lang); });
    });

    /* Клик мимо карточки закрывает — но не на шаге языка: там выбор ещё
       не сделан, и случайное касание оставило бы человека на языке,
       которого он не выбирал. */
    el.addEventListener("click", function(e){
      if(e.target === el && step !== "lang") close();
    });

    document.addEventListener("keydown", function(e){
      if(el.hidden) return;
      if(e.key === "Escape"){ e.preventDefault(); close(); return; }
      if(step === "tour" && (e.key === "ArrowRight" || e.key === "ArrowLeft")){
        e.preventDefault();
        if(e.key === "ArrowRight") nextScene(); else showScene(scene - 1);
        return;
      }
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

    var which = decide({
      hash: location.hash,
      seen: PC.store.get(KEY, null),
      version: PC.VERSION,
      resume: session("take")
    });
    if(which) show(which);
  }

  PC.welcome = { init:init, replay:replay, close:close, decide:decide };
})(window.PC = window.PC || {});
