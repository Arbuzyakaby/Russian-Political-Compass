/* ============ SRPC: полноэкранный разбор конвейера ============

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

   ---------- стол больше экрана (2.4.3) ----------

   В 2.4.2.1 карточки раскладывались долями видимой части стола, и на
   телефоне это разваливалось нацело: шесть карточек по 240 пикселей не
   помещаются в 375 ни в каком порядке, и все шесть вставали друг на
   друга. Теперь стол — холст, который не обязан помещаться в экран:
   его размер считается от размера карточек, а не от размера окна, и
   всё, что не влезло, прокручивается. Заодно это отвечает на вопрос
   «а если карточку утащить за край»: за край холста она не уходит —
   там её ждёт упор, — а сам холст всегда можно долистать.

   Число колонок выбирается по ширине стола: три на широком экране,
   две на планшете, одна на телефоне. Одна колонка — это не ухудшенная
   раскладка, а самая честная: конвейер и есть последовательность, и
   сверху вниз она читается ровно так, как работает.

   ---------- как хранится раскладка ----------

   Не в пикселях, а долями свободного места холста, и вместе с числом
   колонок, при котором её разложили. Пиксели пережили бы ровно одно
   окно. Доли без числа колонок пережили бы окно, но не поворот экрана:
   разложенное в три колонки, пересчитанное на одну, даёт три пары
   слипшихся карточек. Поэтому раскладка с чужим числом колонок не
   применяется — вместо неё берётся стандартная для нынешнего, а
   сохранённая ждёт возвращения на прежний экран.

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
  var GAP = 24;          /* зазор между карточками и до края холста */
  var EDGE = 44;         /* полоса у края стола, в которой он подкручивается */

  var stage, board, canvas, wires, cards = [], lastFocus = null, built = false;
  var paths = [], hatch = null;
  var saved = null;      /* { c:колонок, p:[[fx,fy], …] } из хранилища */
  var grid = 0;          /* колонок сейчас */
  var pos = [];          /* активные доли свободного места холста */
  var closeTimer = null;

  function t(key){ return PC.t ? PC.t(key) : key; }

  /* ---------- хранилище ----------
     Формат 2.4.2.1 — голый массив пар: он писался, когда колонки всегда
     были тремя. Такую запись читаем как «разложено в три колонки»,
     чтобы раскладка, сделанная до обновления, не пропала. */
  function load(){
    var raw = PC.store ? PC.store.getJSON(KEY, null) : null;
    var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.p) ? raw.p : null);
    var cols = Array.isArray(raw) ? 3 : (raw && raw.c);
    if(!list || list.length !== N || !(cols >= 1 && cols <= 3)) return;
    var out = [];
    for(var i = 0; i < N; i++){
      var p = list[i];
      if(!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") return;
      if(p[0] !== p[0] || p[1] !== p[1]) return;   /* NaN из чужой записи */
      out.push([Math.min(1, Math.max(0, p[0])), Math.min(1, Math.max(0, p[1]))]);
    }
    saved = { c:cols, p:out };
  }
  function save(){
    /* До первой раскладки сохранять нечего: запись из полупустого pos
       вернулась бы в следующий заход как «раскладка на ноль колонок». */
    if(!grid || pos.length !== N) return;
    saved = { c:grid, p:pos.map(function(p){ return p.slice(); }) };
    if(PC.store) PC.store.setJSON(KEY, saved);
  }

  /* ---------- построение ---------- */
  function build(){
    if(built) return;
    built = true;

    board = document.getElementById("srpcBoard");
    wires = document.getElementById("srpcWires");
    if(!board || !wires) return;

    /* Холст — отдельный слой внутри стола: стол прокручивается, холст
       задаёт систему координат. Карточки и связи лежат в нём, поэтому
       offsetLeft/offsetTop у карточки — это сразу координата на холсте,
       без поправок на прокрутку. */
    canvas = document.createElement("div");
    canvas.className = "srpcf-canvas";
    board.appendChild(canvas);
    canvas.appendChild(wires);

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
      canvas.appendChild(card);
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

  /* ---------- размеры холста ----------
     Считаются от карточек, а не от окна: холст обязан вместить сетку
     целиком, даже если экран её не вмещает. Ширина карточки задана в
     CSS и одинакова у всех, высота разная — для сетки берётся самая
     высокая, иначе строки наезжали бы друг на друга. */
  function cardW(){ return cards.length ? cards[0].offsetWidth : 240; }
  function cardH(){
    var h = 0;
    cards.forEach(function(c){ h = Math.max(h, c.offsetHeight); });
    return h || 180;
  }

  function colsFor(){
    var w = board.clientWidth, cw = cardW();
    if(w >= cw * 3 + GAP * 4) return 3;
    if(w >= cw * 2 + GAP * 3) return 2;
    return 1;
  }

  /* Сколько места сетке нужно на самом деле — без оглядки на окно. */
  function need(n){
    var cw = cardW(), ch = cardH(), rows = Math.ceil(N / n);
    return { w:n * cw + (n + 1) * GAP, h:rows * ch + (rows + 1) * GAP };
  }

  /* Стандартная раскладка для n колонок, сразу долями свободного места:
     в этих же величинах живёт и то, что двигал человек. Сетка стоит
     посередине холста: на широком мониторе холст заметно больше сетки,
     и прижатая к левому верхнему углу цепочка читалась бы как остаток
     после чего-то, а не как разложенная схема. */
  function home(n, W, H){
    var cw = cardW(), ch = cardH(), rows = Math.ceil(N / n);
    var offX = Math.max(GAP, (W - (n * cw + (n - 1) * GAP)) / 2);
    var offY = Math.max(GAP, (H - (rows * ch + (rows - 1) * GAP)) / 2);
    return cards.map(function(card, i){
      /* Строки идут змейкой: первая слева направо, вторая справа налево.
         При обычной раскладке «каждая строка с начала» переход с конца
         одной строки на начало следующей — это связь через весь стол
         наискосок, поверх всех промежуточных карточек. Змейка ставит
         четвёртое звено ровно под третьим, и ни одна связь не
         пересекает ни одной карточки. */
      var row = Math.floor(i / n), col = i % n;
      if(row % 2) col = n - 1 - col;
      var x = offX + col * (cw + GAP);
      var y = offY + row * (ch + GAP);
      return [
        x / Math.max(1, W - cw),
        y / Math.max(1, H - card.offsetHeight)
      ];
    });
  }

  function place(force){
    if(!board || !canvas || !cards.length) return;
    var n = colsFor(), q = need(n);
    /* Холст меньше стола не бывает, но и «ровно как стол в пикселях» —
       плохая мера: полоса прокрутки съедает у стола десяток пикселей,
       холст оказывается на них шире, и появляется вторая полоса, которая
       съедает ещё. Поэтому пока сетка помещается, холст задан процентами
       и подгоняется под стол сам. */
    canvas.style.width  = q.w > board.clientWidth  ? q.w + "px" : "100%";
    canvas.style.height = q.h > board.clientHeight ? q.h + "px" : "100%";
    var W = canvas.clientWidth, H = canvas.clientHeight;

    if(force || n !== grid || pos.length !== N){
      grid = n;
      pos = (saved && saved.c === n)
        ? saved.p.map(function(p){ return p.slice(); })
        : home(n, W, H);
    }

    cards.forEach(function(card, i){
      /* Доля отсчитывается от свободного места, а не от всей стороны:
         иначе карточка с долей 1 встала бы левым краем в правый край
         холста и вылезла бы наружу целиком. */
      card.style.left = Math.round(pos[i][0] * Math.max(0, W - card.offsetWidth)) + "px";
      card.style.top  = Math.round(pos[i][1] * Math.max(0, H - card.offsetHeight)) + "px";
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
        x:card.offsetLeft, y:card.offsetTop,
        sx:board.scrollLeft, sy:board.scrollTop
      };
      card.classList.add("is-drag");
      card.setPointerCapture(e.pointerId);
      /* preventDefault на pointerdown отменяет и выделение текста, и
         установку фокуса, а фокус здесь нужен: с него начинается
         клавиатурная раскладка стрелками. Поэтому ставим руками. */
      e.preventDefault();
      card.focus({ preventScroll:true });
    });

    card.addEventListener("pointermove", function(e){
      if(!from) return;
      /* Подкрутка стола, когда карточку тащат к его краю: без неё
         утащить карточку в непоказанную часть холста нечем. */
      var br = board.getBoundingClientRect();
      if(e.clientX > br.right - EDGE)      board.scrollLeft += 14;
      else if(e.clientX < br.left + EDGE)  board.scrollLeft -= 14;
      if(e.clientY > br.bottom - EDGE)     board.scrollTop += 14;
      else if(e.clientY < br.top + EDGE)   board.scrollTop -= 14;

      /* Прокрутка стола сдвигает холст под курсором, и её надо учесть:
         иначе карточка уезжала бы от пальца ровно на прокрученное. */
      var cw = canvas.clientWidth, ch = canvas.clientHeight;
      var dx = e.clientX - from.px + (board.scrollLeft - from.sx);
      var dy = e.clientY - from.py + (board.scrollTop  - from.sy);
      var x = Math.min(Math.max(0, from.x + dx), Math.max(0, cw - card.offsetWidth));
      var y = Math.min(Math.max(0, from.y + dy), Math.max(0, ch - card.offsetHeight));
      card.style.left = Math.round(x) + "px";
      card.style.top  = Math.round(y) + "px";
      remember(i, card);
      drawWires();
    });

    var release = function(e){
      if(!from) return;
      from = null;
      card.classList.remove("is-drag");
      if(e && e.pointerId != null && card.hasPointerCapture && card.hasPointerCapture(e.pointerId)){
        card.releasePointerCapture(e.pointerId);
      }
      save();
    };
    card.addEventListener("pointerup", release);
    card.addEventListener("pointercancel", release);
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
      var cw = canvas.clientWidth, ch = canvas.clientHeight;
      var x = Math.min(Math.max(0, card.offsetLeft + dx * step), Math.max(0, cw - card.offsetWidth));
      var y = Math.min(Math.max(0, card.offsetTop  + dy * step), Math.max(0, ch - card.offsetHeight));
      card.style.left = Math.round(x) + "px";
      card.style.top  = Math.round(y) + "px";
      remember(i, card);
      drawWires();
      save();
      /* Холст больше экрана, и уехать карточкой за его видимый край с
         клавиатуры проще всего: догоняем её столом. */
      card.scrollIntoView({ block:"nearest", inline:"nearest" });
    });
  }

  function remember(i, card){
    var fx = Math.max(1, canvas.clientWidth  - card.offsetWidth);
    var fy = Math.max(1, canvas.clientHeight - card.offsetHeight);
    pos[i] = [card.offsetLeft / fx, card.offsetTop / fy];
  }

  function reset(){
    saved = null;
    if(PC.store) PC.store.remove(KEY);
    place(true);
    board.scrollTo({ left:0, top:0, behavior:"auto" });
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
    if(!canvas) return;
    /* Закрытие ещё доигрывает — его отложенная уборка спрятала бы стол
       обратно уже после открытия. */
    if(closeTimer){ clearTimeout(closeTimer); closeTimer = null; }
    lastFocus = document.activeElement;
    stage.hidden = false;
    stage.removeAttribute("aria-hidden");
    document.body.classList.add("sheet-lock");
    /* Раскладка считается сразу: стол уже не скрыт, значит измеряется.
       Отложить её до следующего кадра — значит показать кадр, в котором
       шесть карточек лежат в левом верхнем углу друг на друге, и на
       этот же кадр отдать столу нажатия, пока раскладки ещё нет.
       Пересобираем от нынешнего экрана: разложить карточки могли на
       другом устройстве или в другой ориентации. */
    place(true);
    requestAnimationFrame(function(){ stage.classList.add("is-open"); });
    var btn = document.getElementById("srpcClose");
    if(btn) btn.focus({ preventScroll:true });
  }

  function close(){
    if(!stage || stage.hidden) return;
    stage.classList.remove("is-open");
    document.body.classList.remove("sheet-lock");
    var done = function(){
      closeTimer = null;
      stage.hidden = true;
      stage.setAttribute("aria-hidden", "true");
      if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
      lastFocus = null;
    };
    if(reduced()) done(); else closeTimer = setTimeout(done, 220);
  }

  function reduced(){
    return document.documentElement.dataset.motion === "off" ||
      !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* Фокус заперт внутри стола: под ним лежит вся страница, и уйти в неё
     табом из модального окна нельзя. Кроме кнопок в списке участвуют
     сами карточки — они и есть главное содержимое экрана. */
  function trap(e){
    var list = Array.prototype.filter.call(
      stage.querySelectorAll("button, .srpcf-card"),
      function(n){ return !n.disabled && n.offsetWidth; });
    if(!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  function init(){
    stage = document.getElementById("srpcStage");
    if(!stage) return;
    load();

    var opener = document.getElementById("srpcOpen");
    if(opener) opener.addEventListener("click", function(){
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
      if(stage.hidden) return;
      if(e.key === "Escape"){ e.preventDefault(); close(); return; }
      if(e.key === "Tab") trap(e);
    });
  }

  PC.srpc = { init:init, open:open, close:close, reset:reset };
})(window.PC = window.PC || {});
