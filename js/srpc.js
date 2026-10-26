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
  var wireFrame = null;
  var layout = "snake", zoomScale = 1, world, toolbar, detail, paused = false, cycleStep = 0, cycleSpeed = 1;

  function t(key){ return PC.t ? PC.t(key) : key; }

  /* ---------- хранилище ----------
     Формат 2.4.2.1 — голый массив пар: он писался, когда колонки всегда
     были тремя. Такую запись читаем как «разложено в три колонки»,
     чтобы раскладка, сделанная до обновления, не пропала. */
  function load(){
    var raw = PC.store ? PC.store.getJSON(KEY, null) : null;
    var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.p) ? raw.p : null);
    var cols = Array.isArray(raw) ? 3 : (raw && raw.c);
    if(!list || list.length !== N || !(cols >= 1 && cols <= 6)) return;
    layout = raw && ["snake", "line", "column", "circle"].indexOf(raw.layout) !== -1 ? raw.layout : "snake";
    zoomScale = raw && typeof raw.scale === "number" && isFinite(raw.scale) ? Math.max(.2, Math.min(2, raw.scale)) : 1;
    var out = [];
    for(var i = 0; i < N; i++){
      var p = list[i];
      if(!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") return;
      if(p[0] !== p[0] || p[1] !== p[1]) return;   /* NaN из чужой записи */
      out.push([Math.min(1, Math.max(0, p[0])), Math.min(1, Math.max(0, p[1]))]);
    }
    saved = { c:cols, p:out, layout:layout, scale:zoomScale };
  }
  function save(){
    /* До первой раскладки сохранять нечего: запись из полупустого pos
       вернулась бы в следующий заход как «раскладка на ноль колонок». */
    if(!grid || pos.length !== N) return;
    saved = { c:grid, p:pos.map(function(p){ return p.slice(); }), layout:layout, scale:zoomScale };
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
    world = document.createElement("div"); world.className = "srpcf-world"; board.appendChild(world); world.appendChild(canvas);
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
      (function(index, c){
        var metric = document.createElement("span"); metric.className = "srpcf-metric"; c.appendChild(metric);
        c.addEventListener("click", function(e){ if(!e.target.closest(".srpcf-grip")) showDetail(index); });
        c.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); showDetail(index); } });
      })(i, card);
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
    buildControls(); updateMetrics(); applyCycle();
    if(window.ResizeObserver){ var resizeObserver=new ResizeObserver(function(){if(stage&&!stage.hidden)place(true);});cards.forEach(function(c){resizeObserver.observe(c);}); }
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
    if(layout === "line") return 6;
    if(layout === "column") return 1;
    var w = board.clientWidth, cw = cardW();
    if(w >= cw * 3 + GAP * 4) return 3;
    if(w >= cw * 2 + GAP * 3) return 2;
    return 1;
  }

  /* Сколько места сетке нужно на самом деле — без оглядки на окно. */
  function need(n){
    var cw = cardW(), ch = cardH(), rows = Math.ceil(N / n);
    if(layout === "circle"){ var r = (cw + ch) * 1.1; return { w:2*r + cw + GAP*2, h:2*r + ch + GAP*2 }; }
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
      if(layout === "circle"){
        var radius = (cw + ch) * 1.1, angle = -Math.PI/2 + i*Math.PI/3;
        return [(W/2 + Math.cos(angle)*radius - cw/2)/Math.max(1, W-cw), (H/2 + Math.sin(angle)*radius - card.offsetHeight/2)/Math.max(1,H-card.offsetHeight)];
      }
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
    canvas.style.width = Math.max(q.w, board.clientWidth) + "px";
    canvas.style.height = Math.max(q.h, board.clientHeight) + "px";
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
    applyZoom();
    if(wireFrame)cancelAnimationFrame(wireFrame);
    wireFrame=requestAnimationFrame(function(){wireFrame=null;drawWires();});
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
        h:Math.max(8, Math.min(80, Math.abs((right ? br.x : br.x + br.w) - (right ? ar.x + ar.w : ar.x)) * .5)), v:0
      };
    }
    var down = dy >= 0;
    return {
      x1:acx, y1:down ? ar.y + ar.h : ar.y,
      x2:bcx, y2:down ? br.y : br.y + br.h,
      h:0, v:Math.max(8, Math.min(80, Math.abs((down ? br.y : br.y + br.h) - (down ? ar.y + ar.h : ar.y)) * .5))
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
      if(i === Math.max(0, Number(PC.settings.get("srpcStage")) - 2) && hatch) hatch.setAttribute("d", d);
    }
    if(PC.eggs && PC.eggs.pipeline) PC.eggs.pipeline(cards, canvas);
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
      if(e.pointerType === "touch" && !e.target.closest(".srpcf-grip")) return;
      if(e.pointerType === "mouse" && !e.target.closest(".srpcf-grip")) return;
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
      var dx = (e.clientX - from.px + (board.scrollLeft - from.sx)) / zoomScale;
      var dy = (e.clientY - from.py + (board.scrollTop - from.sy)) / zoomScale;
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
    layout = "snake"; zoomScale = 1;
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
    applyCycle();
  }

  /* ---------- открытие и закрытие ---------- */
  function open(){
    stage = document.getElementById("srpcStage");
    if(!stage || !stage.hidden) return;
    var stylesheet = document.querySelector('link[href="css/srpc.css"]');
    if(stylesheet){stylesheet.media="all";if(!stylesheet.sheet){stylesheet.addEventListener("load",open,{once:true});return;}}
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
    updateMetrics();
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
      stage.querySelectorAll("button, select, input, .srpcf-card"),
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
      if(PC.settings) PC.settings.close(open); else open();
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
      if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if(e.key.toLowerCase() === "r") replay();
      if(e.key === "0") reset();
      if(e.key.toLowerCase() === "f") fit();
      if(/^[1-6]$/.test(e.key)) cards[Number(e.key)-1].focus();
      if(e.key === "?") PC.ui.toast(t("srpc.keys"));
    });
    document.addEventListener("pc:settings", function(e){ if(e.detail.key === "srpcStage" || e.detail.key === "srpcfail") applyCycle(); });
    window.addEventListener("hashchange", function(){ if(location.hash === "#/srpc") open(); });
  }

  function applyZoom(){
    if(!canvas || !world) return;
    canvas.style.transformOrigin = "0 0"; canvas.style.transform = "scale(" + zoomScale + ")";
    world.style.width = canvas.clientWidth * zoomScale + "px"; world.style.height = canvas.clientHeight * zoomScale + "px";
  }
  function zoom(value){ zoomScale = Math.max(.2, Math.min(2, value)); applyZoom(); save(); }
  function fit(){ if(canvas) zoom(Math.min(1, (board.clientWidth-12)/canvas.clientWidth, (board.clientHeight-12)/canvas.clientHeight)); }
  function setLayout(value){layout=value;saved=null;pos=[];place(true);save();requestAnimationFrame(function(){saved=null;place(true);save();});}
  function applyCycle(){
    if(!stage) return;
    stage.dataset.paused = String(paused); stage.style.setProperty("--srpc-cycle", 16/cycleSpeed + "s");
    var fail = PC.settings && PC.settings.get("srpcfail") === "on", target = Number(PC.settings && PC.settings.get("srpcStage")) || 3;
    cards.forEach(function(c, i){
      c.style.animationDelay = paused ? (-cycleStep * (16/cycleSpeed)/6) + "s" : "";
      c.style.animationName = fail && i + 1 === target ? "srpcL3" : "srpcL" + (i + 1 === 3 ? 2 : i + 1);
      c.dataset.failure = String(fail && i + 1 === target);
    });
    var delay=paused?(-cycleStep*(16/cycleSpeed)/6)+"s":"0s";stage.style.setProperty("--srpc-offset",delay);
    paths.concat(hatch?[hatch]:[]).forEach(function(p){p.style.animationDelay=delay;});
    if(hatch) hatch.style.display = fail ? "" : "none";
    drawWires();
  }
  function resourceGroups(){
    var entries = performance.getEntriesByType("resource").filter(function(r){ return /\.(js|css)(?:\?|$)/.test(r.name); });
    var groups = [[], [], [], [], [], []];
    entries.forEach(function(r){
      var name = r.name.split("/").pop(), indexes = /site\.[a-z0-9]+\.js/.test(name) ? [2,3,4,5] : /\.css/.test(name) ? [1] : /^(data|quiz-data)/.test(name) ? [2] : /calc|party-model/.test(name) ? [3] : /export|share/.test(name) ? [5] : [4];
      indexes.forEach(function(i){ groups[i].push(r); });
    });
    var nav = performance.getEntriesByType("navigation")[0]; if(nav) groups[0].push(nav); return groups;
  }
  function measurements(index){
    var resources = resourceGroups()[index-1] || [], bytes = resources.reduce(function(s,r){ return s+(r.transferSize || r.decodedBodySize || 0); },0);
    var measure = performance.getEntriesByName("pc:stage" + index).slice(-1)[0];
    var duration = measure ? measure.duration : resources.length ? Math.max.apply(null,resources.map(function(r){ return r.responseEnd; })) - Math.min.apply(null,resources.map(function(r){ return r.startTime; })) : null;
    return { resources:resources, bytes:bytes, duration:duration };
  }
  function updateMetrics(){
    cards.forEach(function(c,i){ var m=measurements(i+1), label=c.querySelector(".srpcf-metric"); if(label) label.textContent=(m.duration == null ? t("srpc.unmeasured") : m.duration.toFixed(1)+" ms")+" · "+(m.bytes/1024).toFixed(1)+" KB"; c.setAttribute("aria-label",t("ab.chain.s"+(i+1))); });
  }
  function showDetail(index){
    if(!detail){ detail=document.createElement("aside"); detail.className="srpcf-detail"; board.appendChild(detail); }
    detail.replaceChildren(); detail.hidden=false; var closeBtn=document.createElement("button"); closeBtn.type="button"; closeBtn.className="btn small"; closeBtn.textContent=t("party.close"); closeBtn.addEventListener("click",function(){ detail.hidden=true; cards[index-1].focus(); }); detail.appendChild(closeBtn);
    var h=document.createElement("h3"); h.textContent=t("ab.chain.s"+index); detail.appendChild(h);
    var m=measurements(index), p=document.createElement("p"); p.textContent=(m.duration == null ? t("srpc.unmeasured") : m.duration.toFixed(1)+" ms")+" · "+(m.bytes/1024).toFixed(1)+" KB"; detail.appendChild(p);
    var cap=document.createElement("h4"); cap.textContent=t("srpc.files"); detail.appendChild(cap); var ul=document.createElement("ul");
    m.resources.forEach(function(r){ var li=document.createElement("li"); li.textContent=r.name.split("/").pop()+" · "+((r.transferSize||r.decodedBodySize||0)/1024).toFixed(1)+" KB · "+r.duration.toFixed(1)+" ms"; ul.appendChild(li); }); detail.appendChild(ul);
    var depends=document.createElement("p"); depends.textContent=t("srpc.dependencies")+": "+(index>1?t("ab.chain.s"+(index-1)):"—")+" → "+(index<6?t("ab.chain.s"+(index+1)):"—"); detail.appendChild(depends); closeBtn.focus();
  }
  function buildControls(){
    toolbar=document.createElement("div"); toolbar.className="srpcf-toolbar";
    function button(label,fn){ var b=document.createElement("button"); b.className="btn small"; b.type="button"; b.textContent=label; b.addEventListener("click",fn); toolbar.appendChild(b); return b; }
    var pauseBtn=button(t("srpc.pause"),function(){ paused=!paused; pauseBtn.textContent=t(paused?"srpc.play":"srpc.pause"); applyCycle(); });
    button(t("srpc.step"),function(){ paused=true; cycleStep=(cycleStep+1)%6; pauseBtn.textContent=t("srpc.play"); applyCycle(); });
    function select(label,values,fn,current){ var s=document.createElement("select"); s.setAttribute("aria-label",label); values.forEach(function(v){ var o=document.createElement("option"); o.value=v[0]; o.textContent=v[1]; s.appendChild(o); }); s.value=current; s.addEventListener("change",function(){fn(s.value);}); toolbar.appendChild(s); }
    select(t("srpc.speed"),[["0.5","×0.5"],["1","×1"],["2","×2"]],function(v){cycleSpeed=Number(v);applyCycle();},"1");
    select(t("srpc.layout"),["snake","line","column","circle"].map(function(v){return[v,t("srpc."+v)];}),setLayout,layout);
    select(t("srpc.failure"),["1","2","3","4","5","6"].map(function(v){return[v,v];}),function(v){PC.settings.set("srpcStage",v);PC.settings.set("srpcfail","on");},PC.settings.get("srpcStage"));
    button("−",function(){zoom(zoomScale-.1);}); button("+",function(){zoom(zoomScale+.1);}); button(t("srpc.fit"),fit);
    button("PNG",function(){PC.exporter.srpcBoard(canvas,"png");}); button("SVG",function(){PC.exporter.srpcBoard(canvas,"svg");});
    stage.insertBefore(toolbar,board);
    board.addEventListener("wheel",function(e){if(e.ctrlKey){e.preventDefault();zoom(zoomScale+(e.deltaY<0?.1:-.1));}},{passive:false});
    var touches=new Map(), pinch;
    board.addEventListener("pointerdown",function(e){if(e.pointerType!=="touch")return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){var p=Array.from(touches.values());pinch={d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),z:zoomScale};}});
    board.addEventListener("pointermove",function(e){if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2&&pinch){var p=Array.from(touches.values());zoom(pinch.z*Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)/Math.max(1,pinch.d));}});
    function end(e){touches.delete(e.pointerId);pinch=null;}board.addEventListener("pointerup",end);board.addEventListener("pointercancel",end);
    var nativePinch;
    board.addEventListener("touchstart",function(e){if(e.touches.length===2){e.preventDefault();var a=e.touches[0],b=e.touches[1];nativePinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),z:zoomScale};}},{passive:false});
    board.addEventListener("touchmove",function(e){if(nativePinch&&e.touches.length===2){e.preventDefault();var a=e.touches[0],b=e.touches[1];zoom(nativePinch.z*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/Math.max(1,nativePinch.d));}},{passive:false});
    board.addEventListener("touchend",function(){nativePinch=null;});board.addEventListener("touchcancel",function(){nativePinch=null;});
  }

  PC.srpc = { init:init, open:open, close:close, reset:reset, anchors:anchors, setLayout:setLayout, measurements:measurements };
})(window.PC = window.PC || {});
