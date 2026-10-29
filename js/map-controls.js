/* ============ Управление картой: масштаб, перетаскивание, список (4.0, 4.2) ============

   Компас рисуется в SVG, а «приближение» — это смена его viewBox.
   Всё движение идёт через одну точку, render(), которая записывает
   текущий вид в атрибут; остальной код только решает, каким вид должен
   стать.

   Плавность (4.2). Раньше каждая кнопка и каждое колесо прыгали на
   фиксированный шаг, щипок масштабировал вокруг центра, а не вокруг
   пальцев, а при отпускании карта останавливалась как вкопанная.
   Теперь:
   - кнопки, колесо и сброс не переключают вид, а плавно подтягивают его
     к цели (glideTo): каждый кадр проходится доля оставшегося пути;
   - жесты (щипок, перетаскивание) применяются сразу, но не чаще одного
     раза за кадр, чтобы палец не опережал отрисовку;
   - щипок держит под пальцами ту же точку карты и заодно двигает карту
     вслед за серединой между пальцами;
   - после броска пальцем карта доезжает по инерции;
   - пока вид движется, у карты стоит класс is-moving: пульсация
     выбранной точки на это время выключена, лишние перерисовки
     тяжёлого SVG только мешают.
   При отключённой анимации (настройка «Анимации» или системное
   «уменьшить движение») всё это сводится к мгновенной смене вида. */
(function(PC){
  "use strict";

  var SIZE = 660;          /* сторона viewBox в единицах карты */
  var MAX_SCALE = 4;
  var BUTTON_STEP = 1.4;   /* во сколько раз «+» и «−» меняют масштаб */
  var WHEEL_RATE = .0025;  /* показатель степени на единицу deltaY при Ctrl+колесо */
  var GLIDE_SHARE = .22;   /* доля оставшегося пути за кадр при плавном переходе */
  var FRICTION = .92;      /* затухание инерции за кадр */
  var FLING_MIN = .02;     /* скорость (ед. карты за мс), с которой начинается инерция */

  var svg, plot, view = { x:0, y:0, s:1 };
  var aim = null, glideFrame = 0, paintFrame = 0, fling = null, pan = null, pinch = null;

  function t(key, vars){ return PC.t(key, vars); }

  function el(tag, cls, text){
    var node = document.createElement(tag);
    if(cls) node.className = cls;
    if(text != null) node.textContent = text;
    return node;
  }

  function button(text, onClick){
    var b = el("button", "btn small", text);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  function animated(){
    return PC.settings.get("motion") !== "off" && !window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  }

  /* Вид, приведённый к допустимому: масштаб от 1 до 4, карта не уезжает
     за свои края (при масштабе 1 запас равен нулю, вид всегда 0 0). */
  function clamp(v){
    var s = Math.max(1, Math.min(MAX_SCALE, v.s)), room = SIZE - SIZE / s;
    return { s:s, x:Math.max(0, Math.min(room, v.x)), y:Math.max(0, Math.min(room, v.y)) };
  }

  /* Единственное место, где вид попадает в разметку. touch-action
     меняется вместе с масштабом: на масштабе 1 карта не должна красть
     у страницы вертикальную прокрутку, на увеличенной — палец двигает
     карту, а не страницу. */
  function render(){
    var span = SIZE / view.s;
    svg.setAttribute("viewBox", view.x + " " + view.y + " " + span + " " + span);
    svg.style.touchAction = view.s > 1 ? "none" : "pan-y pinch-zoom";
    svg.style.overflow = view.s > 1 ? "hidden" : "";
  }

  /* Не чаще одного раза за кадр: жест может прислать несколько
     событий между отрисовками. */
  function queueRender(){
    if(paintFrame) return;
    paintFrame = requestAnimationFrame(function(){ paintFrame = 0; render(); });
  }

  function flushRender(){
    if(paintFrame) cancelAnimationFrame(paintFrame);
    paintFrame = 0;
    render();
  }

  function setMoving(on){ plot.classList.toggle("is-moving", on); }

  function stopMotion(){
    if(glideFrame) cancelAnimationFrame(glideFrame);
    glideFrame = 0;
    aim = null;
    fling = null;
  }

  /* Точка карты под курсором или пальцем для заданного вида. */
  function mapPoint(clientX, clientY, from){
    var r = svg.getBoundingClientRect(), span = SIZE / from.s;
    return { x:from.x + (clientX - r.left) / r.width * span, y:from.y + (clientY - r.top) / r.height * span };
  }

  /* Вид с новым масштабом, при котором точка (fx, fy) остаётся на месте. */
  function zoomedAround(from, scale, fx, fy){
    var span = SIZE / from.s, u = (fx - from.x) / span, w = (fy - from.y) / span, next = Math.max(1, Math.min(MAX_SCALE, scale));
    return clamp({ s:next, x:fx - u * SIZE / next, y:fy - w * SIZE / next });
  }

  function centerOf(v){ return { x:v.x + SIZE / v.s / 2, y:v.y + SIZE / v.s / 2 }; }

  function glideStep(){
    glideFrame = 0;
    if(!aim) return;
    view = {
      s:view.s + (aim.s - view.s) * GLIDE_SHARE,
      x:view.x + (aim.x - view.x) * GLIDE_SHARE,
      y:view.y + (aim.y - view.y) * GLIDE_SHARE
    };
    var arrived = Math.abs(aim.s - view.s) < .002 && Math.abs(aim.x - view.x) < .15 && Math.abs(aim.y - view.y) < .15;
    if(arrived){
      view = aim;
      aim = null;
      render();
      setMoving(false);
      return;
    }
    render();
    glideFrame = requestAnimationFrame(glideStep);
  }

  function glideTo(next){
    next = clamp(next);
    if(!animated()){
      stopMotion();
      view = next;
      render();
      setMoving(false);
      return;
    }
    aim = next;
    fling = null;
    setMoving(true);
    if(!glideFrame) glideFrame = requestAnimationFrame(glideStep);
  }

  function zoomBy(factor){
    var base = aim || view, c = centerOf(base);
    glideTo(zoomedAround(base, base.s * factor, c.x, c.y));
  }

  /* Инерция после броска: скорость затухает, у края карты движение
     по этой оси обрывается. */
  function flingStep(){
    glideFrame = 0;
    if(!fling) return;
    var next = clamp({ s:view.s, x:view.x - fling.vx * 16, y:view.y - fling.vy * 16 });
    if(next.x === view.x) fling.vx = 0;
    if(next.y === view.y) fling.vy = 0;
    view = next;
    fling.vx *= FRICTION;
    fling.vy *= FRICTION;
    render();
    if(Math.hypot(fling.vx, fling.vy) < FLING_MIN / 4){
      fling = null;
      setMoving(false);
      return;
    }
    glideFrame = requestAnimationFrame(flingStep);
  }

  /* ---------- перетаскивание: мышь, перо и палец при масштабе больше 1 ---------- */
  function bindPan(){
    svg.addEventListener("pointerdown", function(e){
      if(view.s === 1 || pinch) return;
      stopMotion();
      pan = { id:e.pointerId, px:e.clientX, py:e.clientY, x:view.x, y:view.y, time:e.timeStamp, vx:0, vy:0 };
      svg.setPointerCapture(e.pointerId);
      setMoving(true);
    });
    svg.addEventListener("pointermove", function(e){
      if(!pan || pan.id !== e.pointerId || pinch) return;
      var r = svg.getBoundingClientRect(), span = SIZE / view.s, before = view;
      view = clamp({
        s:view.s,
        x:pan.x - (e.clientX - pan.px) / r.width * span,
        y:pan.y - (e.clientY - pan.py) / r.height * span
      });
      var dt = Math.max(1, e.timeStamp - pan.time);
      /* скорость сглаживается: один резкий кадр не должен задавать бросок */
      pan.vx = pan.vx * .6 + (view.x - before.x) / dt * .4;
      pan.vy = pan.vy * .6 + (view.y - before.y) / dt * .4;
      pan.time = e.timeStamp;
      queueRender();
    });
    function release(e){
      if(!pan || pan.id !== e.pointerId) return;
      var speed = Math.hypot(pan.vx, pan.vy), moved = pan;
      pan = null;
      flushRender();
      if(e.type === "pointerup" && animated() && speed > FLING_MIN){
        fling = { vx:moved.vx, vy:moved.vy };
        glideFrame = requestAnimationFrame(flingStep);
      }else{
        setMoving(false);
      }
    }
    svg.addEventListener("pointerup", release);
    svg.addEventListener("pointercancel", release);
  }

  /* ---------- щипок: события касаний, а не указателей ----------
     На масштабе 1 у карты touch-action: pan-y, и двухпальцевый жест
     принадлежит браузеру: указательные события обрываются через
     pointercancel, а страница увеличивается целиком. Отменить это можно
     только в touchstart с preventDefault — поэтому щипок остаётся на
     касаниях (а в WebKit указательные события для двух пальцев не
     приходят вовсе). Перетаскивание одним пальцем на увеличенной карте —
     уже указательные события (bindPan). */
  function bindPinch(){
    function fingers(e){
      var a = e.touches[0], b = e.touches[1];
      return {
        distance:Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        x:(a.clientX + b.clientX) / 2,
        y:(a.clientY + b.clientY) / 2
      };
    }
    svg.addEventListener("touchstart", function(e){
      if(e.touches.length !== 2) return;
      e.preventDefault();
      stopMotion();
      pan = null;
      var f = fingers(e);
      pinch = { distance:f.distance, scale:view.s, anchor:mapPoint(f.x, f.y, view) };
      setMoving(true);
    }, { passive:false });
    svg.addEventListener("touchmove", function(e){
      if(!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      var f = fingers(e), r = svg.getBoundingClientRect();
      var scale = Math.max(1, Math.min(MAX_SCALE, pinch.scale * f.distance / Math.max(1, pinch.distance)));
      var span = SIZE / scale;
      /* точка карты, взятая в начале жеста, остаётся под серединой пальцев */
      view = clamp({
        s:scale,
        x:pinch.anchor.x - (f.x - r.left) / r.width * span,
        y:pinch.anchor.y - (f.y - r.top) / r.height * span
      });
      queueRender();
    }, { passive:false });
    function end(){
      if(!pinch) return;
      pinch = null;
      flushRender();
      setMoving(false);
    }
    svg.addEventListener("touchend", end);
    svg.addEventListener("touchcancel", end);
  }

  /* Ctrl + колесо (и щипок по трекпаду, который браузер присылает так же):
     масштаб меняется по экспоненте, поэтому и крупный шаг мыши, и
     мелкий шаг трекпада дают ровное движение вокруг курсора. */
  function bindWheel(){
    svg.addEventListener("wheel", function(e){
      if(!e.ctrlKey) return;
      e.preventDefault();
      var base = aim || view, p = mapPoint(e.clientX, e.clientY, base);
      glideTo(zoomedAround(base, base.s * Math.exp(-e.deltaY * WHEEL_RATE), p.x, p.y));
    }, { passive:false });
  }

  /* ---------- режим «список с координатами» ---------- */
  function bindList(){
    var list = el("div", "map-coordinate-list"), mode = document.getElementById("mapList");
    list.hidden = true;
    function renderList(){
      list.replaceChildren();
      PC.visible().forEach(function(p){
        var row = button("", function(){ PC.select(p.id); });
        row.append(el("span", "", PC.L(p, "short")), el("b", "", PC.utils.fmt(p.x) + " / " + PC.utils.fmt(p.y)));
        list.appendChild(row);
      });
    }
    mode.addEventListener("click", function(){
      plot.classList.toggle("map-as-list");
      list.hidden = !plot.classList.contains("map-as-list");
      mode.querySelector("span").textContent = t(list.hidden ? "compass.list" : "compass.map");
      mode.querySelector("use").setAttribute("href", list.hidden ? "#i-list" : "#i-map");
      if(!list.hidden) renderList();
    });
    plot.appendChild(list);
    document.getElementById("q").addEventListener("input", function(){ if(!list.hidden) renderList(); });
    document.querySelectorAll(".chips [data-filter]").forEach(function(chip){
      chip.addEventListener("click", function(){ if(!list.hidden) renderList(); });
    });
    PC.compass.onDraw(function(){ render(); if(!list.hidden) renderList(); });
  }

  function init(){
    svg = document.getElementById("svg");
    plot = document.getElementById("plot");
    document.getElementById("mapMinus").addEventListener("click", function(){ zoomBy(1 / BUTTON_STEP); });
    document.getElementById("mapPlus").addEventListener("click", function(){ zoomBy(BUTTON_STEP); });
    document.getElementById("mapReset").addEventListener("click", function(){ glideTo({ s:1, x:0, y:0 }); });
    bindList();
    bindPan();
    bindPinch();
    bindWheel();
  }

  PC.mapControls = { init:init };
})(window.PC = window.PC || {});
