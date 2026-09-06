/* ============ Всплывающая подсказка над точкой партии ============ */
(function(PC){
  "use strict";
  var fmt = PC.utils.fmt, esc = PC.utils.esc;
  var tip, plot, svg;

  function init(){
    tip  = document.getElementById("tip");
    plot = document.getElementById("plot");
    svg  = document.getElementById("svg");
  }

  /* Переводим координаты пользовательского пространства SVG в пиксели
     внутри .plot. Наивное sx/SIZE*width врёт, когда viewBox не совпадает
     по пропорциям с окном просмотра (max-height обрезает поле, и
     preserveAspectRatio="xMidYMid meet" добавляет поля по краям) —
     поэтому берём реальную матрицу преобразования. */
  function toPlotPx(sx, sy){
    var m = svg.getScreenCTM();
    var box = plot.getBoundingClientRect();
    if(!m) return { x: sx / PC.geom.SIZE * box.width, y: sy / PC.geom.SIZE * box.height };
    return {
      x: m.a * sx + m.c * sy + m.e - box.left,
      y: m.b * sx + m.d * sy + m.f - box.top
    };
  }

  function show(p, sx, sy){
    tip.innerHTML =
      '<div class="tip-top"><span class="tip-dot" style="background:' + esc(p.color) + '"></span>' +
      '<span class="tip-name">' + esc(p.name) + '</span></div>' +
      '<div class="tip-ideo">' + esc(p.ideology) + '</div>' +
      '<div class="tip-meta">' +
        '<span>Экономика <b>' + fmt(p.x) + '</b></span>' +
        '<span>Гос. контроль <b>' + fmt(p.y) + '</b></span>' +
        '<span>Госдума VIII <b>' + p.seats + '</b> / ' + PC.TOTAL_SEATS + '</span>' +
      '</div>' +
      '<div class="tip-hint">' +
        (p.seats ? "Есть представительство в Госдуме" : "Нет мандатов в Госдуме VIII созыва") +
        " · клик — подробнее</div>";

    var pos = toPlotPx(sx, sy);
    var box = plot.getBoundingClientRect();
    var w = tip.offsetWidth, h = tip.offsetHeight, GAP = 22, EDGE = 6;

    /* если сверху не помещается — показываем подсказку под точкой */
    tip.classList.toggle("below", pos.y - h - GAP < 0);

    /* подсказка центрирована через translate(-50%), поэтому прижимаем
       её центр так, чтобы края не вылезли за пределы поля */
    var half = w / 2;
    var left = Math.min(Math.max(pos.x, half + EDGE), Math.max(half + EDGE, box.width - half - EDGE));

    tip.style.left = left + "px";
    tip.style.top  = pos.y + "px";
    tip.classList.add("show");
  }

  function hide(){ if(tip) tip.classList.remove("show"); }

  PC.tip = { init:init, show:show, hide:hide };
})(window.PC = window.PC || {});
