/* ============ SRPC: полноэкранный разбор конвейера (2.4.2.1) ============

   Схема в «О проекте» — это витрина: шесть звеньев в ряд, чистый CSS,
   ни одного скрипта (css/chain.css). Здесь — рабочий стол: те же шесть
   звеньев, но карточками, которые можно разложить руками, с текстом
   про каждый этап и живыми связями между карточками.

   Почему это отдельный модуль, а не расширение схемы. Схема обязана
   существовать без JavaScript: она стоит внутри карточки «Как это
   устроено» и объясняет ровно то, чем страница является. Перетаскивание
   без скрипта не делается, и вписать его в ту же разметку значило бы
   сделать витрину зависимой от модуля, который к ней отношения не имеет.
   Поэтому стол живёт сам по себе: удаление этого файла убирает кнопку
   в настройках и больше ничего.

   ---------- как хранится раскладка ----------

   Не в пикселях, а долями стороны стола. Пиксели пережили бы ровно одно
   окно: стол занимает весь экран, и сохранённые координаты с ноутбука
   на телефоне увели бы половину карточек за край. Доли переживают и
   поворот экрана, и смену окна, и зум.

   ---------- почему связи рисуются скриптом ----------

   Связь между двумя карточками — это кривая между их краями, и обе
   точки меняются на каждом кадре перетаскивания. Ни одно правило CSS
   не знает, где сейчас стоит соседняя карточка, поэтому путь считается
   здесь. Цвет и прозрачность связи при этом по-прежнему из CSS: за них
   отвечают те же @keyframes, что и у схемы в «О проекте», и скрипт в
   сюжет с аварией не вмешивается вовсе — он только двигает геометрию.

   ---------- что здесь намеренно не делается ----------

   Ни одного действия, кроме перетаскивания и сброса: стол ничего не
   настраивает и ничего не сохраняет, кроме координат шести карточек.
   Тумблер «Демонстрация сбоя» из настроек сюда не смотрит — сюжет с
   ошибкой в третьем звене здесь идёт всегда, потому что за ним сюда
   и приходят. ============ */
(function(PC){
  "use strict";

  var KEY = "pc-srpc-layout";
  var N = 6;

  var stage, board, wires, cards = [], lastFocus = null, built = false;
  var paths = [], hatch = null;

  /* Раскладка по умолчанию — две строки по три, долями стола. Порядок
     чтения тот же, что у схемы: слева направо, сверху вниз. */
  var HOME = [
    [0.055, 0.10], [0.385, 0.10], [0.715, 0.10],
    [0.055, 0.56], [0.385, 0.56], [0.715, 0.56]
  ];
  var pos = HOME.map(function(p){ return p.slice(); });

  function t(key){ return PC.t ? PC.t(key) : key; }

  function load(){
    var saved = PC.store ? PC.store.getJSON(KEY, null) : null;
    if(!Array.isArray(saved) || saved.length !== N) return;
    for(var i = 0; i < N; i++){
      var p = saved[i];
      if(!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") return;
      /* Чужая или испорченная запись не должна уводить карточку за край
         стола: за пределы 0…1 доля не выходит по определению. */
      pos[i] = [Math.min(1, Math.max(0, p[0])), Math.min(1, Math.max(0, p[1]))];
    }
  }
  function save(){ if(PC.store) PC.store.setJSON(KEY, pos); }

  /* ---------- построение ---------- */
  function build(){
    if(built) return;
    built = true;

    board = document.getElementById("srpcBoard");
    wires = document.getElementById("srpcWires");
    if(!board || !wires) return;

    for(var i = 1; i <= N; i++){
      var card = document.createElement("article");
      card.className = "srpcf-card";
      card.dataset.ix = String(i);
      card.tabIndex = 0;
      card.setAttribute("role", "group");
      card.innerHTML =
        '<div class="srpcf-top">' +
          '<span class="srpcf-led" aria-hidden="true"></span>' +
          '<span class="srpcf-ix" aria-hidden="true">' + (i < 10 ? "0" : "") + i + '</span>' +
          '<span class="srpcf-grip" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '</div>' +
        '<h3 data-i18n="ab.chain.s' + i + '"></h3>' +
        '<span class="srpcf-file" data-i18n="ab.chain.s' + i + 'f"></span>' +
        '<p data-i18n="srpc.d' + i + '"></p>';
      card.querySelector("h3").textContent = t("ab.chain.s" + i);
      card.querySelector(".srpcf-file").textContent = t("ab.chain.s" + i + "f");
      card.querySelector("p").textContent = t("srpc.d" + i);
      card.setAttribute("aria-label", t("ab.chain.s" + i));
      board.appendChild(card);
      cards.push(card);
      drag(card, i - 1);
      keys(card, i - 1);
    }

    /* Пять связей между шестью карточками плюс один штриховой проход
       поверх третьей — он и показывает аварию насечкой, а не цветом. */
    var NS = "http://www.w3.org/2000/svg";
    for(var k = 1; k <= N - 1; k++){
      var path = document.createElementNS(NS, "path");
      path.setAttribute("class", "srpcf-wire");
      path.setAttribute("data-ix", String(k));
      wires.appendChild(path);
      paths.push(path);
    }
    hatch = document.createElementNS(NS, "path");
    hatch.setAttribute("class", "srpcf-wire-hatch");
    hatch.setAttribute("data-ix", "3");
    wires.appendChild(hatch);
  }

  /* ---------- раскладка ---------- */
  function place(){
    if(!board) return;
    var bw = board.clientWidth, bh = board.clientHeight;
    cards.forEach(function(card, i){
      /* Доля отсчитывается от свободного места, а не от всей стороны:
         иначе карточка с долей 1 встала бы левым краем в правый край
         стола и вылезла бы наружу целиком. */
      var free = { x:Math.max(0, bw - card.offsetWidth), y:Math.max(0, bh - card.offsetHeight) };
      card.style.left = Math.round(pos[i][0] * free.x) + "px";
      card.style.top  = Math.round(pos[i][1] * free.y) + "px";
    });
    drawWires();
  }

  /* Связь идёт от края одной карточки к краю другой. Направление
     выбирается по тому, как карточки стоят друг к другу: если сосед
     заметно правее — выходим вбок, если ниже — вниз. Кривая Безье с
     горизонтальными или вертикальными ручками, чтобы линия отходила
     от карточки перпендикулярно её кромке, а не наискосок из угла. */
  function anchors(a, b){
    var ar = { x:a.offsetLeft, y:a.offsetTop, w:a.offsetWidth, h:a.offsetHeight };
    var br = { x:b.offsetLeft, y:b.offsetTop, w:b.offsetWidth, h:b.offsetHeight };
    var acx = ar.x + ar.w / 2, acy = ar.y + ar.h / 2;
    var bcx = br.x + br.w / 2, bcy = br.y + br.h / 2;
    var dx = bcx - acx, dy = bcy - acy;

    if(Math.abs(dx) >= Math.abs(dy)){
      var right = dx >= 0;
      return {
        x1:right ? ar.x + ar.w : ar.x, y1:acy,
        x2:right ? br.x : br.x + br.w, y2:bcy,
        h:Math.max(28, Math.abs(dx) * 0.4), v:0
      };
    }
    var down = dy >= 0;
    return {
      x1:acx, y1:down ? ar.y + ar.h : ar.y,
      x2:bcx, y2:down ? br.y : br.y + br.h,
      h:0, v:Math.max(28, Math.abs(dy) * 0.4)
    };
  }

  function wirePath(a, b){
    var p = anchors(a, b);
    var sign1 = p.h ? (p.x2 >= p.x1 ? 1 : -1) : 0;
    var sign2 = p.v ? (p.y2 >= p.y1 ? 1 : -1) : 0;
    return "M" + p.x1 + "," + p.y1 +
           "C" + (p.x1 + sign1 * p.h) + "," + (p.y1 + sign2 * p.v) +
           " " + (p.x2 - sign1 * p.h) + "," + (p.y2 - sign2 * p.v) +
           " " + p.x2 + "," + p.y2;
  }

  function drawWires(){
    for(var i = 0; i < paths.length; i++){
      var d = wirePath(cards[i], cards[i + 1]);
      paths[i].setAttribute("d", d);
      if(i === 2 && hatch) hatch.setAttribute("d", d);
    }
  }

  /* ---------- перетаскивание ----------
     Pointer Events, а не отдельно мышь и отдельно касания: один набор
     событий покрывает мышь, палец и перо, а setPointerCapture избавляет
     от вечной проблемы «курсор ушёл с карточки быстрее, чем пришёл
     следующий кадр, и карточка осталась прилипшей к мыши». */
  function drag(card, i){
    var from = null;

    card.addEventListener("pointerdown", function(e){
      if(e.button != null && e.button !== 0) return;
      from = {
        px:e.clientX, py:e.clientY,
        x:card.offsetLeft, y:card.offsetTop
      };
      card.classList.add("is-drag");
      card.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    card.addEventListener("pointermove", function(e){
      if(!from) return;
      var bw = board.clientWidth, bh = board.clientHeight;
      var x = Math.min(Math.max(0, from.x + e.clientX - from.px), Math.max(0, bw - card.offsetWidth));
      var y = Math.min(Math.max(0, from.y + e.clientY - from.py), Math.max(0, bh - card.offsetHeight));
      card.style.left = Math.round(x) + "px";
      card.style.top  = Math.round(y) + "px";
      remember(i, card);
      drawWires();
    });

    var stop = function(e){
      if(!from) return;
      from = null;
      card.classList.remove("is-drag");
      if(e && e.pointerId != null && card.hasPointerCapture && card.hasPointerCapture(e.pointerId)){
        card.releasePointerCapture(e.pointerId);
      }
      save();
    };
    card.addEventListener("pointerup", stop);
    card.addEventListener("pointercancel", stop);
  }

  /* Карточку можно двигать и с клавиатуры: стрелки по восемь пикселей,
     с Shift — по сорок. Перетаскивание мышью, недоступное иначе, —
     ровно тот случай, когда клавиатурная замена обязательна. */
  function keys(card, i){
    card.addEventListener("keydown", function(e){
      var dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      var dy = e.key === "ArrowDown"  ? 1 : e.key === "ArrowUp"   ? -1 : 0;
      if(!dx && !dy) return;
      e.preventDefault();
      var step = e.shiftKey ? 40 : 8;
      var bw = board.clientWidth, bh = board.clientHeight;
      var x = Math.min(Math.max(0, card.offsetLeft + dx * step), Math.max(0, bw - card.offsetWidth));
      var y = Math.min(Math.max(0, card.offsetTop  + dy * step), Math.max(0, bh - card.offsetHeight));
      card.style.left = Math.round(x) + "px";
      card.style.top  = Math.round(y) + "px";
      remember(i, card);
      drawWires();
      save();
    });
  }

  function remember(i, card){
    var fx = Math.max(1, board.clientWidth  - card.offsetWidth);
    var fy = Math.max(1, board.clientHeight - card.offsetHeight);
    pos[i] = [card.offsetLeft / fx, card.offsetTop / fy];
  }

  function reset(){
    pos = HOME.map(function(p){ return p.slice(); });
    if(PC.store) PC.store.remove(KEY);
    place();
    if(PC.ui) PC.ui.toast(t("srpc.reset.done"));
  }

  /* Перезапуск цикла: класс снимается и возвращается через кадр —
     иначе браузер склеит оба состояния и анимация не начнётся заново. */
  function replay(){
    cards.forEach(function(card){
      card.style.animation = "none";
      void card.offsetWidth;
      card.style.animation = "";
    });
    paths.concat(hatch ? [hatch] : []).forEach(function(p){
      p.style.animation = "none";
      void p.getBoundingClientRect().width;
      p.style.animation = "";
    });
  }

  /* ---------- открытие и закрытие ---------- */
  function open(){
    stage = document.getElementById("srpcStage");
    if(!stage || !stage.hidden) return;
    build();
    lastFocus = document.activeElement;
    stage.hidden = false;
    stage.removeAttribute("aria-hidden");
    document.body.classList.add("sheet-lock");
    requestAnimationFrame(function(){
      stage.classList.add("is-open");
      place();
    });
    var close = document.getElementById("srpcClose");
    if(close) close.focus({ preventScroll:true });
  }

  function close(){
    if(!stage || stage.hidden) return;
    stage.classList.remove("is-open");
    document.body.classList.remove("sheet-lock");
    var done = function(){
      stage.hidden = true;
      stage.setAttribute("aria-hidden", "true");
      if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
      lastFocus = null;
    };
    var reduced = document.documentElement.dataset.motion === "off" ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if(reduced) done(); else setTimeout(done, 220);
  }

  function init(){
    stage = document.getElementById("srpcStage");
    if(!stage) return;
    load();

    var open_ = document.getElementById("srpcOpen");
    if(open_) open_.addEventListener("click", function(){
      if(PC.settings) PC.settings.close();
      setTimeout(open, 200);
    });
    var closeBtn = document.getElementById("srpcClose");
    if(closeBtn) closeBtn.addEventListener("click", close);
    var resetBtn = document.getElementById("srpcReset");
    if(resetBtn) resetBtn.addEventListener("click", reset);
    var replayBtn = document.getElementById("srpcReplay");
    if(replayBtn) replayBtn.addEventListener("click", replay);

    window.addEventListener("resize", function(){ if(!stage.hidden) place(); });
    document.addEventListener("keydown", function(e){
      if(stage.hidden || e.key !== "Escape") return;
      e.preventDefault();
      close();
    });
  }

  PC.srpc = { init:init, open:open, close:close, reset:reset };
})(window.PC = window.PC || {});
