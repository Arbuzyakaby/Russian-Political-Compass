/* ============ Обучение по живой странице (2.4.2.1) ============

   До этой версии «обучение» было четырьмя нарисованными сценами внутри
   приветственного окна: абстрактное поле с абстрактными точками,
   абстрактная панель, абстрактный переключатель созыва. Картинки были
   честные, но они показывали не эту страницу, а её схему — и человек,
   закрыв окно, всё равно оставался перед интерфейсом, в котором ещё
   не знает, где что лежит. Переход от картинки к настоящей кнопке
   каждый проделывал сам.

   Теперь обучение идёт по самой странице. Экран затемняется, а в
   темноте остаётся окно — ровно тот элемент, о котором идёт речь:
   поле компаса, переключатель созыва, панель справа, кнопка экспорта.
   Рядом встаёт подпись с объяснением, стрелка показывает на вырез.
   Ничего не имитируется: это те самые узлы, которыми человек будет
   пользоваться через минуту, в том положении, в котором они стоят
   именно у него — с его темой, его плотностью, его шириной окна.

   ---------- как сделан вырез ----------

   Не маской и не четырьмя прямоугольниками вокруг цели, а одним
   элементом с огромной тенью: box-shadow в 9999 пикселей затемняет
   всё, кроме самого элемента, а сам элемент прозрачен. Отсюда сразу
   три свойства, ради которых приём и выбран: вырез скругляется как
   обычная рамка, он анимируется одним transform-ом при переходе к
   следующему шагу (окно «переезжает» по странице, а не мигает), и под
   ним видна настоящая страница, а не её копия.

   ---------- что здесь намеренно не делается ----------

   Тур ничего не нажимает за человека. Он переключает вкладку, если
   следующий шаг живёт на другой, и прокручивает страницу к цели — но
   не открывает карточек, не запускает тест и не меняет настроек.
   Обучение, которое само трогает интерфейс, человек не запоминает:
   запоминается то, что он сделал руками.

   Взаимодействие со страницей на время тура заблокировано: подложка
   перехватывает нажатия целиком. Иначе случайный клик по вырезу уводил
   бы со шага (например, открывал карточку партии) и подпись начинала
   бы рассказывать про то, чего на экране уже нет.

   ---------- шаги, которых может не быть ----------

   Половина целей — необязательные узлы: кнопка траекторий прячется,
   если у партий нет истории, карточка Lumen выключается настройкой,
   кнопка «наверх» — тоже. Шаг, чьей цели на странице нет или она
   скрыта, просто выпадает из маршрута, и нумерация считается по
   оставшимся. Тур не должен показывать пустой прямоугольник и
   рассказывать про кнопку, которой у этого человека не существует. */
(function(PC){
  "use strict";

  /* Маршрут. tab — вкладка, на которой живёт цель (тур переключит её
     сам); pad — насколько вырез шире самой цели; place — с какой
     стороны предпочтительно встать подписи. */
  var STEPS = [
    { key:"tabs",     tab:"compass", sel:".tabs",            pad:8,  place:"bottom" },
    { key:"board",    tab:"compass", sel:"#plot",            pad:10, place:"right" },
    { key:"node",     tab:"compass", sel:"#svg .node",       pad:24, place:"right" },
    { key:"conv",     tab:"compass", sel:".conv-select",     pad:10, place:"bottom" },
    { key:"search",   tab:"compass", sel:"#searchWrap",      pad:8,  place:"bottom" },
    { key:"side",     tab:"compass", sel:".side-flip",       pad:10, place:"left" },
    { key:"trails",   tab:"compass", sel:"#trailBtn",        pad:8,  place:"bottom" },
    { key:"export",   tab:"compass", sel:"#exportBtn",       pad:8,  place:"bottom" },
    { key:"quiz",     tab:"compass", sel:"#tab-quiz",        pad:8,  place:"bottom" },
    { key:"settings", tab:"compass", sel:"#settingsBtn",     pad:8,  place:"bottom" }
  ];

  var root = document.documentElement;
  var layer, hole, bubble, title, text, count, dots, backBtn, nextBtn, skipBtn, arrow;
  var route = [], at = 0, running = false, lastFocus = null, built = false;
  /* Уборка после закрытия отложена на время затухания слоя. Если за это
     время обучение запустят снова (кнопка в настройках — в одном нажатии
     от кнопки «Готово»), отложенная уборка спрячет уже открытый слой, и
     тур пойдёт вслепую: шаги считаются, а на экране ничего нет. */
  var hideTimer = null;

  function t(key, vars){ return PC.t ? PC.t(key, vars) : key; }
  function reduced(){
    return root.dataset.motion === "off" ||
      !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* Цель считается доступной, если узел есть и он действительно занимает
     место: hidden, display:none и нулевой размер — всё это «шага нет». */
  function target(step){
    var node = document.querySelector(step.sel);
    if(!node) return null;
    var r = node.getBoundingClientRect();
    if(!r.width || !r.height) return null;
    return node;
  }

  /* ---------- разметка слоя ----------
     Строится скриптом и один раз: до запуска тура в документе не должно
     лежать ни одного его узла — это экран, который большинство людей
     не откроет никогда. */
  function build(){
    if(built) return;
    built = true;

    layer = document.createElement("div");
    layer.className = "tour";
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-modal", "true");
    layer.hidden = true;
    layer.innerHTML =
      '<div class="tour-hole" id="tourHole"><i class="tour-ring"></i></div>' +
      '<div class="tour-bubble" id="tourBubble">' +
        '<span class="tour-arrow" id="tourArrow" aria-hidden="true"></span>' +
        '<span class="eyebrow" id="tourCount"></span>' +
        '<h2 id="tourTitle"></h2>' +
        '<p id="tourText" aria-live="polite"></p>' +
        '<div class="tour-dots" id="tourDots" aria-hidden="true"></div>' +
        '<div class="tour-acts">' +
          '<button type="button" class="btn ghost small" id="tourSkip"></button>' +
          '<span class="tour-spacer"></span>' +
          '<button type="button" class="btn small" id="tourBack"></button>' +
          '<button type="button" class="btn primary small" id="tourNext"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(layer);

    hole   = layer.querySelector("#tourHole");
    bubble = layer.querySelector("#tourBubble");
    arrow  = layer.querySelector("#tourArrow");
    title  = layer.querySelector("#tourTitle");
    text   = layer.querySelector("#tourText");
    count  = layer.querySelector("#tourCount");
    dots   = layer.querySelector("#tourDots");
    backBtn = layer.querySelector("#tourBack");
    nextBtn = layer.querySelector("#tourNext");
    skipBtn = layer.querySelector("#tourSkip");

    layer.setAttribute("aria-labelledby", "tourTitle");
    backBtn.addEventListener("click", function(){ go(at - 1); });
    nextBtn.addEventListener("click", function(){
      if(at >= route.length - 1) stop(); else go(at + 1);
    });
    skipBtn.addEventListener("click", stop);
    /* Клик по затемнению — не закрытие: на этом экране слишком легко
       промахнуться мимо узкой подписи, а выход должен быть намеренным
       (кнопка, Esc). Зато любое нажатие гасится, чтобы не провалиться
       в страницу под слоем. */
    layer.addEventListener("click", function(e){ e.stopPropagation(); });
  }

  /* ---------- размещение выреза и подписи ---------- */
  function frame(step, node){
    var r = node.getBoundingClientRect();
    var pad = step.pad || 8;
    var x = Math.max(6, r.left - pad);
    var y = Math.max(6, r.top - pad);
    var w = Math.min(window.innerWidth - x - 6, r.width + pad * 2);
    var h = Math.min(window.innerHeight - y - 6, r.height + pad * 2);
    /* Цель выше экрана — обычное дело на телефоне: панель справа там
       разворачивается на восемьсот с лишним пикселей. Вырез во весь
       экран не подсвечивает ничего (подсветить всё — это не подсветить),
       да ещё и не оставляет места подписи, и она падает в нижний угол
       поверх самого выреза. Поэтому вырез показывает начало цели, а не
       её целиком: две трети экрана — это заведомо «вот эта штука», и
       под подпись внизу остаётся место. */
    h = Math.min(h, Math.round(window.innerHeight * 0.62));
    hole.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    hole.style.width  = Math.round(w) + "px";
    hole.style.height = Math.round(h) + "px";
    return { x:x, y:y, w:w, h:h };
  }

  /* Подпись встаёт со стороны, которую просит шаг, и переезжает на
     противоположную, если там не хватает места. Порядок проверки —
     предпочтение, затем его зеркало, затем низ и верх: любой экран,
     даже телефон в альбомной ориентации, закрывается этим списком. */
  function say(box, place){
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var gap = 16, m = 10;
    var W = window.innerWidth, H = window.innerHeight;
    var opposite = { top:"bottom", bottom:"top", left:"right", right:"left" };
    var order = [place, opposite[place], "bottom", "top", "right", "left"];

    /* Проверяется только та ось, вдоль которой подпись отходит от
       выреза. Поперечную кладёт на место put(), прижимая подпись к краю
       экрана, а стрелка всё равно целится в середину выреза, а не в
       середину подписи — ради этого она так и считается.

       До 2.4.3 требовалось, чтобы подпись поместилась целиком, никуда
       не упираясь. На телефоне это почти никогда не выполнялось: подпись
       там шириной во весь экран минус поля, и «поместиться по горизонтали»
       она могла, только если вырез стоит ровно посередине. Шесть шагов
       из десяти уезжали в запасной угол внизу — без стрелки и, на высоких
       целях, поверх самого выреза. */
    for(var i = 0; i < order.length; i++){
      var p = order[i], x, y, fits;
      if(p === "bottom"){
        x = box.x + box.w / 2 - bw / 2; y = box.y + box.h + gap;
        fits = y + bh <= H - m;
      }else if(p === "top"){
        x = box.x + box.w / 2 - bw / 2; y = box.y - bh - gap;
        fits = y >= m;
      }else if(p === "right"){
        x = box.x + box.w + gap; y = box.y + box.h / 2 - bh / 2;
        fits = x + bw <= W - m;
      }else{
        x = box.x - bw - gap; y = box.y + box.h / 2 - bh / 2;
        fits = x >= m;
      }
      if(fits) return put(x, y, p, box);
    }
    /* Ничего не подошло — значит вырез занимает почти весь экран.
       Тогда подпись просто садится в нижний угол и стрелки не рисует. */
    return put(Math.max(m, W / 2 - bw / 2), H - bh - m, null, box);
  }

  function put(x, y, place, box){
    x = Math.min(Math.max(10, x), window.innerWidth - bubble.offsetWidth - 10);
    y = Math.min(Math.max(10, y), window.innerHeight - bubble.offsetHeight - 10);
    bubble.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    bubble.dataset.place = place || "none";
    if(!place){ arrow.hidden = true; return; }
    arrow.hidden = false;
    /* Стрелка смотрит в центр выреза, а не в центр подписи: подпись
       может быть сдвинута краем экрана, и стрелка, прибитая к её
       середине, показывала бы мимо. */
    if(place === "top" || place === "bottom"){
      arrow.style.left = Math.round(
        Math.min(Math.max(14, box.x + box.w / 2 - x), bubble.offsetWidth - 14)) + "px";
      arrow.style.top = "";
    }else{
      arrow.style.top = Math.round(
        Math.min(Math.max(14, box.y + box.h / 2 - y), bubble.offsetHeight - 14)) + "px";
      arrow.style.left = "";
    }
  }

  /* ---------- шаг ---------- */
  function paint(){
    var step = route[at];
    var node = target(step);
    if(!node){ /* цель исчезла на ходу — пропускаем шаг */
      if(at < route.length - 1) return go(at + 1);
      return stop();
    }
    count.textContent = t("tour.count", { n:at + 1, total:route.length });
    title.textContent = t("tour." + step.key + ".h");
    text.textContent  = t("tour." + step.key + ".p");
    backBtn.hidden = at === 0;
    skipBtn.hidden = at === route.length - 1;
    nextBtn.textContent = t(at === route.length - 1 ? "tour.done" : "tour.next");
    backBtn.textContent = t("tour.back");
    skipBtn.textContent = t("tour.skip");

    Array.prototype.forEach.call(dots.children, function(d, i){
      d.className = "tour-dot" + (i === at ? " is-on" : i < at ? " is-done" : "");
    });

    var box = frame(step, node);
    say(box, step.place);
  }

  /* Цель может быть за пределами экрана — тогда сначала прокрутка, и
     только следующим кадром замер: getBoundingClientRect во время
     плавной прокрутки отдаёт координаты, которые устареют через
     полсекунды. */
  function go(i){
    at = Math.min(Math.max(0, i), route.length - 1);
    var step = route[at];
    var node = target(step);
    if(node && !fullyVisible(node)){
      /* Цель, которая выше экрана, «по центру» не встаёт никак: у неё
         и верх, и низ за краем. Показываем её начало — это то место,
         по которому её узнают. */
      var tall = node.getBoundingClientRect().height > window.innerHeight - 140;
      node.scrollIntoView({ behavior:reduced() ? "auto" : "smooth",
                            block:tall ? "start" : "center" });
      setTimeout(paint, reduced() ? 0 : 420);
      /* Промежуточный кадр, чтобы вырез не висел на прежнем месте всё
         время прокрутки: он переезжает вместе со страницей. */
      if(!reduced()) setTimeout(paint, 120);
    }else{
      paint();
    }
  }

  function fullyVisible(node){
    var r = node.getBoundingClientRect();
    return r.top >= 70 && r.bottom <= window.innerHeight - 70;
  }

  /* ---------- запуск и остановка ---------- */
  function start(){
    if(running) return;
    build();

    /* Тур идёт по компасу: остальные вкладки в маршруте не участвуют,
       но если человек позвал обучение с теста, вернуть его на компас
       обязаны мы, а не он сам. */
    if(PC.nav && PC.nav.current() !== "compass") PC.nav.go("compass");

    /* Маршрут собирается заново на каждый запуск: набор доступных узлов
       зависит от настроек и от данных, и запомненный с прошлого раза
       он бы соврал. */
    route = STEPS.filter(function(s){ return !!target(s); });
    if(!route.length) return;

    dots.innerHTML = route.map(function(){ return '<span class="tour-dot"></span>'; }).join("");

    running = true;
    if(hideTimer){ clearTimeout(hideTimer); hideTimer = null; }
    lastFocus = document.activeElement;
    layer.hidden = false;
    document.body.classList.add("sheet-lock", "tour-on");
    /* Первый шаг раскладывается сразу, а не в следующем кадре: слой уже
       не скрыт, значит измеряется, а откладывать нечего. Отложенным этот
       вызов был до 2.4.3, и повторный запуск обучения показывал на кадр
       тот шаг, на котором его закрыли в прошлый раз. */
    at = 0;
    go(0);
    requestAnimationFrame(function(){
      layer.classList.add("is-on");
      nextBtn.focus({ preventScroll:true });
    });
  }

  function stop(){
    if(!running) return;
    running = false;
    layer.classList.remove("is-on");
    document.body.classList.remove("sheet-lock", "tour-on");
    var done = function(){
      hideTimer = null;
      layer.hidden = true;
      if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
      lastFocus = null;
    };
    if(reduced()) done(); else hideTimer = setTimeout(done, 240);
  }

  function init(){
    var open = document.getElementById("setTour");
    if(open) open.addEventListener("click", function(){
      if(PC.settings) PC.settings.close();
      setTimeout(start, 260);
    });

    /* Дважды: сразу и ещё раз через кадр. Первый пересчёт попадает в
       момент, когда подпись ещё не переразложилась по новой ширине
       (её собственная ширина задана через 100vw и медиазапрос), и
       прижать её к краю экрана по устаревшему размеру значит промахнуться
       — на узком экране она уезжала правым краем за границу. */
    window.addEventListener("resize", function(){
      if(!running) return;
      paint();
      requestAnimationFrame(paint);
    });
    window.addEventListener("scroll", function(){ if(running) paint(); }, { passive:true });

    document.addEventListener("keydown", function(e){
      if(!running) return;
      if(e.key === "Escape"){ e.preventDefault(); stop(); return; }
      if(e.key === "ArrowRight"){
        e.preventDefault();
        if(at >= route.length - 1) stop(); else go(at + 1);
      }else if(e.key === "ArrowLeft"){
        e.preventDefault();
        go(at - 1);
      }
      /* Фокус заперт внутри подписи: под слоем лежит вся страница, и
         уйти в неё табом из модального диалога нельзя. */
      if(e.key === "Tab"){
        var list = Array.prototype.filter.call(
          bubble.querySelectorAll("button:not([hidden])"),
          function(n){ return !n.disabled; });
        if(!list.length) return;
        var first = list[0], last = list[list.length - 1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });
  }

  PC.tour = { init:init, start:start, stop:stop, STEPS:STEPS };
})(window.PC = window.PC || {});
