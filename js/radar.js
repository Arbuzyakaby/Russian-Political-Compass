/* ============ ДИАГРАММА-ПАУК ПО ПОД-ОСЯМ ============

   Одна точка на компасе — это свёртка: две координаты получены
   усреднением шести более узких шкал, и усреднение по определению
   прячет структуру. Партия с рыночным взглядом на собственность и
   жёстким запросом на перераспределение попадает на компасе туда же,
   куда партия, умеренная в обоих вопросах, — а это разные партии.
   Радар разворачивает свёртку обратно.

   Модуль общий для двух мест: в аналитике он сравнивает партию с
   результатом теста, в результатах теста — результат с партией. Это
   один и тот же рисунок с разным порядком серий, поэтому и код один.

   Геометрия: шесть лучей, значение −10 лежит в центре, +10 на внешнем
   контуре, ноль проходит по средней окружности. Нулевое кольцо выделено
   отдельно — без него читатель не отличает «слегка правее нуля» от
   «слегка левее», а это ровно то различие, ради которого всё рисуется.

   Экономические под-оси идут первыми тремя лучами, политические —
   вторыми тремя: верхняя половина диаграммы соответствует верхней
   половине компаса, и обе картинки читаются одинаково. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, el = U.el, esc = U.esc, fmt = U.fmt;
  var t = PC.t;

  var SIZE = 340, C = SIZE / 2, R = 118;

  function axisName(id){ return t("sub." + id); }

  /* Угол луча. Первый луч смотрит вверх, дальше по часовой стрелке:
     порядок в PC.SUBAXES и порядок на экране обязаны совпадать, иначе
     подпись и значение разъедутся при добавлении седьмой шкалы. */
  function angleOf(i, n){ return -Math.PI / 2 + i * 2 * Math.PI / n; }

  function point(i, n, v){
    var a = angleOf(i, n);
    var r = (U.clamp(v, -10, 10) + 10) / 20 * R;
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
  }

  function polygon(values, axes){
    return axes.map(function(ax, i){
      var p = point(i, axes.length, values[ax.id]);
      return p.x.toFixed(1) + "," + p.y.toFixed(1);
    }).join(" ");
  }

  /* ---------- сетка ---------- */
  function drawGrid(svg, axes){
    var n = axes.length;

    /* Кольца шкалы. Ноль рисуется отдельным классом и толще остальных:
       это единственная линия, относительно которой знак значения читается
       без подсчёта колец. */
    [-10, -5, 0, 5, 10].forEach(function(v){
      var pts = axes.map(function(ax, i){
        var p = point(i, n, v);
        return p.x.toFixed(1) + "," + p.y.toFixed(1);
      }).join(" ");
      svg.appendChild(el("polygon", {
        "class": v === 0 ? "rad-zero" : "rad-ring",
        points: pts
      }));
    });

    axes.forEach(function(ax, i){
      var outer = point(i, n, 10);
      svg.appendChild(el("line", { "class":"rad-spoke", x1:C, y1:C, x2:outer.x.toFixed(1), y2:outer.y.toFixed(1) }));

      /* Подпись луча отодвинута от контура и выровнена по стороне, с
         которой она стоит: подписи слева, прижатые к началу строки,
         наезжали бы на саму диаграмму. */
      var a = angleOf(i, n);
      var lx = C + (R + 20) * Math.cos(a);
      var ly = C + (R + 20) * Math.sin(a);
      var cos = Math.cos(a);
      var anchor = Math.abs(cos) < 0.25 ? "middle" : (cos > 0 ? "start" : "end");
      var dy = Math.sin(a) < -0.7 ? -2 : Math.sin(a) > 0.7 ? 10 : 3.5;

      var label = el("text", {
        "class":"rad-cap", x:lx.toFixed(1), y:(ly + dy).toFixed(1), "text-anchor":anchor
      }, axisName(ax.id));
      svg.appendChild(label);
    });
  }

  /* ---------- серия ---------- */
  function drawSeries(svg, series, axes, index){
    var g = el("g", { "class":"rad-series" + (series.dashed ? " dashed" : ""),
                      "data-i":String(index) });
    g.appendChild(el("polygon", {
      "class":"rad-fill", points:polygon(series.values, axes),
      fill:series.color, stroke:series.color
    }));
    axes.forEach(function(ax, i){
      var p = point(i, axes.length, series.values[ax.id]);
      var dot = el("circle", { "class":"rad-dot", cx:p.x.toFixed(1), cy:p.y.toFixed(1), r:3.6,
                               fill:series.color });
      dot.appendChild(el("title", null, series.label + " · " + axisName(ax.id) + ": " + fmt(series.values[ax.id])));
      g.appendChild(dot);
    });
    svg.appendChild(g);
    return g;
  }

  /* ---------- сборка ---------- */
  /* series: [{ label, color, values:{subId:number}, dashed }].
     Первая серия рисуется снизу — заливка второй ложится поверх, поэтому
     основную (партию) передают первой, а накладываемую (результат теста)
     второй. */
  function render(box, series, opts){
    opts = opts || {};
    var axes = PC.SUBAXES;
    box.innerHTML = "";

    var svg = el("svg", {
      "class":"radar", viewBox:"0 0 " + SIZE + " " + SIZE,
      role:"img", "aria-label":opts.aria || t("ch.radar.aria")
    });
    drawGrid(svg, axes);

    var groups = series.map(function(s, i){ return drawSeries(svg, s, axes, i); });
    box.appendChild(svg);

    /* Прорисовка: контуры проявляются вместе с лёгким раскрытием от
       центра. Масштабирование делается через transform на группе, а не
       на самом svg, — иначе вместе с фигурой поехали бы и подписи. */
    if(PC.motion && !PC.motion.reduced() && window.requestAnimationFrame){
      groups.forEach(function(g, i){
        g.style.opacity = "0";
        g.style.transformOrigin = C + "px " + C + "px";
        g.style.transform = "scale(.72)";
        g.style.transition = "opacity .5s ease " + (i * 120) + "ms, transform .72s cubic-bezier(.22,1,.36,1) " + (i * 120) + "ms";
      });
      var run = function(){
        requestAnimationFrame(function(){
          groups.forEach(function(g){ g.style.opacity = "1"; g.style.transform = "none"; });
        });
      };
      if(PC.motion.whenRevealed) PC.motion.whenRevealed(box.closest(".card") || box, run);
      else run();
    }

    /* Легенда: без неё две наложенные фигуры одного размера неразличимы,
       а цвет партии в тёмной теме легко спутать с акцентом интерфейса. */
    if(series.length && opts.legend !== false){
      var leg = document.createElement("div");
      leg.className = "rad-legend";
      leg.innerHTML = series.map(function(s){
        return '<span class="rl' + (s.dashed ? " dashed" : "") + '">' +
               '<i style="background:' + esc(s.color) + '"></i>' + esc(s.label) + "</span>";
      }).join("");
      box.appendChild(leg);
    }

    if(opts.scaleNote !== false){
      var note = document.createElement("p");
      note.className = "rad-note";
      note.textContent = t("ch.radar.legend");
      box.appendChild(note);
    }
    return svg;
  }

  /* Наибольшее и среднее расхождение двух профилей: именно это читатель
     ищет глазами на наложенных фигурах, и словами оно короче. */
  function compare(a, b){
    var worst = null, sum = 0, n = 0;
    PC.SUBAXES.forEach(function(ax){
      var va = a[ax.id], vb = b[ax.id];
      if(typeof va !== "number" || typeof vb !== "number") return;
      var d = Math.abs(va - vb);
      sum += d; n++;
      if(!worst || d > worst.d) worst = { id:ax.id, d:d };
    });
    return { worst:worst, mean: n ? sum / n : null };
  }

  function summary(a, b){
    var c = compare(a, b);
    if(!c.worst) return "";
    return t("ch.radar.gap", { axis:axisName(c.worst.id), d:c.worst.d.toFixed(1) }) + " " +
           t("ch.radar.match", { d:c.mean.toFixed(1) });
  }

  PC.radar = { render:render, compare:compare, summary:summary, axisName:axisName, SIZE:SIZE };
})(window.PC = window.PC || {});
