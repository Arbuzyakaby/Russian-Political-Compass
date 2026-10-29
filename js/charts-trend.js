/* ============ Аналитика: динамика мандатов по созывам ============
   Вынесено из js/charts.js в 5.0. Линии фракций по созывам IV–IX,
   легенда со скрытием серий, таблица данных и переключатель шкалы
   «мандаты / доля палаты». ============ */
(function(PC){
  "use strict";
  var U = PC.utils, el = U.el, esc = U.esc;
  var seatsAt = PC.seatsAt;
  var t = PC.t, L = PC.L;
  var C = PC.charts, host = C.host, chartColor = C.chartColor, niceScale = C.niceScale;
  var active = C.active;

  var trendOff = {};      /* серии, скрытые кликом по легенде */
  var trendMode = "seats";/* seats | share — что на оси Y графика динамики */

  /* Линии графика прорисовываются слева направо: длина пути уходит в
     stroke-dasharray, а смещение штриха возвращается к нулю. Делается
     только на первой отрисовке — иначе линии перерисовывались бы при
     каждом переключении созыва, скрытии серии и смене темы. Длину пути
     можно спросить только у элемента в документе, поэтому вызов идёт
     после вставки svg в контейнер. */
  var trendDrawn = false;
  var bandX = null, bandW0 = null;   /* где стояла полоса созыва и при какой ширине */
  function drawIn(lines, marks, card){
    if(trendDrawn) return;
    /* график, построенный в скрытой вкладке, имеет нулевые размеры:
       считать такую отрисовку первой значило бы навсегда потерять
       анимацию — она бы «проигралась» там, где её никто не видит */
    if(!card || !card.getClientRects().length) return;
    trendDrawn = true;
    if(!window.requestAnimationFrame || !PC.motion || PC.motion.reduced()) return;

    lines.forEach(function(path, i){
      var len;
      try{ len = path.getTotalLength(); }catch(e){ return; }
      if(!len) return;
      path.style.strokeDasharray = len + " " + len;
      path.style.strokeDashoffset = len;
      path.style.transition = "stroke-dashoffset .85s cubic-bezier(.25,.85,.35,1) " + (i * 70) + "ms";
    });
    marks.forEach(function(dot){
      dot.style.opacity = "0";
      dot.style.transition = "opacity .4s ease 480ms";
    });

    /* спуск ждёт появления карточки: график строится при загрузке
       страницы, а увидят его только после прокрутки */
    PC.motion.whenRevealed(card, function(){
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          lines.forEach(function(path){ path.style.strokeDashoffset = "0"; });
          marks.forEach(function(dot){ dot.style.opacity = "1"; });
        });
      });
    });
  }

  /* ---------- 2. Динамика мандатов по созывам ---------- */
  function renderTrend(){
    var box = host.trend;
    var convs = PC.convsAsc();
    var share = trendMode === "share";
    var series = PC.PARTIES.filter(function(p){
      return convs.some(function(c){ return seatsAt(p, c.id) > 0; });
    });

    /* значение серии в созыве в единицах выбранного режима */
    function val(p, id){
      var s = seatsAt(p, id);
      if(s === null) return null;
      return share ? s / PC.TOTAL_SEATS * 100 : s;
    }
    /* в долях «20%» читается лучше, чем «20.0%», но дробная часть нужна
       там, где она есть: 2.9% фракции «Новых людей» до целого не округлить */
    function label(v){
      if(!share) return String(v);
      var near = Math.abs(v - Math.round(v)) < .05;
      return (near ? String(Math.round(v)) : v.toFixed(1)) + "%";
    }

    var W = Math.max(260, box.clientWidth || 320);
    var narrow = W < 460;
    var H = narrow ? 260 : 300;
    var pl = share ? 40 : 34, pr = narrow ? 12 : 16, pt = 16, pb = narrow ? 42 : 46;
    var iw = W - pl - pr, ih = H - pt - pb;

    var max = 0;
    series.forEach(function(p){
      convs.forEach(function(c){ max = Math.max(max, val(p, c.id) || 0); });
    });
    var scale = niceScale(max, narrow ? 5 : 7);

    function X(i){ return pl + (convs.length === 1 ? iw/2 : iw*i/(convs.length-1)); }
    function Y(v){ return pt + ih - ih*v/scale.max; }

    var svg = el("svg", { viewBox:"0 0 " + W + " " + H, width:W, height:H, role:"img",
      "aria-label":t("ch.trend.aria", {
        what: share ? t("ch.trend.share").toLowerCase() : t("ch.trend.seats").toLowerCase() }) });

    /* мягкая заливка под выделенной серией — она же метка «вот эта линия» */
    var defs = el("defs");
    var grad = el("linearGradient", { id:"trendFill", x1:"0", y1:"0", x2:"0", y2:"1" });
    /* заливка высотой во весь график из двух стопов полосит заметнее
       любого CSS-градиента — разбиваем затухание на кривую */
    [[0, ".28"], [.34, ".15"], [.62, ".06"], [.84, ".015"], [1, "0"]].forEach(function(s){
      grad.appendChild(el("stop", { offset:(s[0]*100) + "%",
        "stop-color":"currentColor", "stop-opacity":s[1] }));
    });
    defs.appendChild(grad);
    svg.appendChild(defs);

    /* полоса выбранного созыва — тот же созыв, что выбран над компасом */
    var picked = PC.convocationInfo().id;
    var pickedIdx = convs.map(function(c){ return c.id; }).indexOf(picked);
    if(pickedIdx > -1){
      /* у крайних созывов половина полосы уходила бы за поле графика —
         SVG рисует с overflow:visible, и она вылезала за карточку */
      var bandW = convs.length > 1 ? iw/(convs.length-1) : iw;
      var bx1 = Math.max(pl, X(pickedIdx) - bandW/2);
      var bx2 = Math.min(pl + iw, X(pickedIdx) + bandW/2);
      var band = el("rect", {
        x:bx1.toFixed(1), y:pt, width:(bx2 - bx1).toFixed(1), height:ih,
        fill:"var(--accent-soft)", rx:6
      });
      svg.appendChild(band);
      /* полоса переезжает к новому созыву, а не появляется на новом месте */
      if(bandX !== null && Math.abs(bandX - bx1) > .5 && bandW0 === W &&
         window.requestAnimationFrame && PC.motion && !PC.motion.reduced()){
        band.style.transform = "translateX(" + (bandX - bx1).toFixed(1) + "px)";
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            band.style.transition = "transform .5s var(--ease-out)";
            band.style.transform = "none";
          });
        });
      }
      bandX = bx1; bandW0 = W;
    }

    /* сетка и ось Y */
    for(var v = 0; v <= scale.max + 1e-9; v += scale.step){
      svg.appendChild(el("line", { x1:pl, x2:W-pr, y1:Y(v), y2:Y(v),
        stroke:v === 0 ? "var(--chart-axis)" : "var(--chart-grid)", "stroke-width":1 }));
      svg.appendChild(el("text", { x:pl-8, y:Y(v)+3.5, "text-anchor":"end",
        "font-size":10, fill:"var(--muted-2)" }, label(v)));
    }
    svg.appendChild(el("text", { x:pl-8, y:pt-5, "text-anchor":"end", "font-size":9,
      fill:"var(--muted-2)", "letter-spacing":".06em" },
      t(share ? "ch.trend.axisShare" : "ch.trend.axisSeats")));

    /* ось X: римский номер созыва и год выборов, оба кликабельны */
    convs.forEach(function(c, i){
      var on = c.id === picked;
      svg.appendChild(el("text", { x:X(i), y:H-pb+18, "text-anchor":"middle",
        "font-size":11, "font-weight":on ? 750 : 650,
        fill:on ? "var(--accent)" : "var(--muted)" }, L(c, "label").split(" ")[0]));
      svg.appendChild(el("text", { x:X(i), y:H-pb+32, "text-anchor":"middle",
        "font-size":9.5, fill:on ? "var(--accent)" : "var(--muted-2)" }, c.years.split("–")[0]));
    });

    /* линии: разрыв там, где партии ещё/уже не было */
    var order = series.slice().sort(function(a, b){
      return (seatsAt(b, PC.CURRENT_CONVOCATION) || 0) - (seatsAt(a, PC.CURRENT_CONVOCATION) || 0);
    });
    var visible = order.filter(function(p){ return !trendOff[p.id]; });
    var labels = [];      /* прямые подписи собираем и расставляем после линий */
    var dots = {};        /* id -> кружки серии, чтобы подсвечивать при наведении */
    var lines = [], marks = [];   /* плоские списки для анимации прорисовки */

    visible.forEach(function(p){
      var col = chartColor(p.color);
      var on = active() === p.id, faded = active() && !on;
      var segs = [], cur = [];
      convs.forEach(function(c, i){
        var s = val(p, c.id);
        if(s === null){ if(cur.length) segs.push(cur); cur = []; }
        else cur.push({ x:X(i), y:Y(s), v:s });
      });
      if(cur.length) segs.push(cur);

      var g = el("g", { "data-id":p.id, class:"trend-series" + (faded ? " faded" : ""), color:col });
      segs.forEach(function(seg){
        if(seg.length > 1){
          var d = "M" + seg.map(function(q){ return q.x.toFixed(1) + " " + q.y.toFixed(1); }).join("L");
          if(on){
            g.appendChild(el("path", {
              class:"trend-area",
              d:d + "L" + seg[seg.length-1].x.toFixed(1) + " " + (pt+ih) + "L" + seg[0].x.toFixed(1) + " " + (pt+ih) + "Z",
              fill:"url(#trendFill)"
            }));
          }
          var line = el("path", { class:"trend-line", d:d, fill:"none", stroke:col,
            "stroke-width":on ? 3 : 2, "stroke-linejoin":"round", "stroke-linecap":"round" });
          g.appendChild(line);
          lines.push(line);
        }
        seg.forEach(function(q){
          var dot = el("circle", { class:"trend-dot", cx:q.x, cy:q.y, r:on ? 5 : 3.6, fill:col,
            stroke:"var(--chart-surface)", "stroke-width":2 });
          g.appendChild(dot);
          marks.push(dot);
          (dots[p.id] || (dots[p.id] = [])).push(dot);
        });
      });
      svg.appendChild(g);

      /* прямая подпись у последней точки — для крупных фракций */
      var last = segs.length ? segs[segs.length-1][segs[segs.length-1].length-1] : null;
      if(last && !narrow && (seatsAt(p, PC.CURRENT_CONVOCATION) || 0) >= 20){
        labels.push({ x:last.x - 8, y:last.y - 9, text:L(p, "short"), faded:faded });
      }
    });

    /* Подписи расставляем снизу вверх: каждая следующая уходит выше
       предыдущей, поэтому их порядок совпадает с порядком самих линий —
       иначе подпись меньшей фракции всплывала бы над большей. */
    labels.sort(function(a, b){ return b.y - a.y; });
    var prevY = Infinity;
    labels.forEach(function(L){
      var y = Math.min(L.y, prevY - 15);
      prevY = y;
      svg.appendChild(el("text", { x:L.x, y:y, "text-anchor":"end",
        "font-size":10.5, "font-weight":650, fill:"var(--text)",
        "paint-order":"stroke", stroke:"var(--tag-halo)", "stroke-width":3.2,
        "stroke-linejoin":"round", opacity:L.faded ? .4 : 1 }, L.text));
    });

    /* слой наведения: вертикальный курсор и подсказка по созыву */
    var cursor = el("line", { y1:pt, y2:pt+ih, stroke:"var(--accent-line)", "stroke-width":1,
      "stroke-dasharray":"4 4", opacity:0 });
    svg.appendChild(cursor);
    var focusDot = el("circle", { r:6.5, fill:"none", stroke:"var(--text)", "stroke-width":2, opacity:0 });
    svg.appendChild(focusDot);
    var hit = el("rect", { x:pl, y:pt, width:iw, height:ih, fill:"transparent", style:"cursor:pointer" });
    svg.appendChild(hit);

    box.innerHTML = "";
    box.appendChild(svg);
    drawIn(lines, marks, box.closest(".chart-card"));
    var tip = document.createElement("div");
    tip.className = "c-tip";
    box.appendChild(tip);

    /* Индекс точки под курсором по координате X. */
    function at(clientX){
      var r = svg.getBoundingClientRect();
      if(!r.width) return 0;
      var rel = (clientX - r.left) / r.width * W;
      var i = Math.round((rel - pl) / (iw / Math.max(1, convs.length-1)));
      return Math.max(0, Math.min(convs.length-1, i));
    }
    /* серия, к линии которой курсор ближе всего по вертикали в этом созыве —
       её строка в подсказке выделяется, а точка обводится */
    function nearestSeries(i, clientY){
      var r = svg.getBoundingClientRect();
      if(!r.height) return null;
      var my = (clientY - r.top) / r.height * H;
      var best = null, bestD = Infinity;
      visible.forEach(function(p){
        var s = val(p, convs[i].id);
        if(s === null) return;
        var d = Math.abs(Y(s) - my);
        if(d < bestD){ bestD = d; best = p; }
      });
      return bestD < ih * .2 ? best : null;
    }

    /* Показывает подсказку у курсора. */
    function show(clientX, clientY){
      var i = at(clientX), c = convs[i];
      var near = nearestSeries(i, clientY);
      cursor.setAttribute("x1", X(i)); cursor.setAttribute("x2", X(i));
      cursor.setAttribute("opacity", 1);

      if(near){
        focusDot.setAttribute("cx", X(i));
        focusDot.setAttribute("cy", Y(val(near, c.id)));
        focusDot.setAttribute("opacity", 1);
      }else focusDot.setAttribute("opacity", 0);

      var prev = i > 0 ? convs[i-1] : null;
      var rows = visible.filter(function(p){ return val(p, c.id) !== null; })
        .sort(function(a, b){ return val(b, c.id) - val(a, c.id); })
        .map(function(p){
          var now = val(p, c.id);
          var was = prev ? val(p, prev.id) : null;
          var delta = "";
          if(was !== null){
            var d = now - was;
            var sign = d > 0 ? "▲ +" : d < 0 ? "▼ −" : "= ";
            delta = '<u class="' + (d > 0 ? "up" : d < 0 ? "down" : "flat") + '">' + sign +
              (d === 0 ? "0" : label(Math.abs(d))) + '</u>';
          }else delta = '<u class="new">' + esc(t("ch.trend.first")) + '</u>';
          return '<div class="r' + (near && near.id === p.id ? " on" : "") + '">' +
                 '<i style="background:' + esc(chartColor(p.color)) + '"></i>' +
                 esc(L(p, "short")) + '<b>' + label(now) + '</b>' + delta + '</div>';
        }).join("");

      tip.innerHTML = '<div class="t">' + esc(L(c, "label")) + ' · ' + esc(c.years) + '</div>' + rows +
        '<div class="f">' + esc(t("ch.trend.click")) + '</div>';
      var bw = box.clientWidth, tw = tip.offsetWidth;
      var left = X(i) / W * bw;
      tip.style.left = Math.min(Math.max(left, tw/2 + 4), Math.max(tw/2 + 4, bw - tw/2 - 4)) + "px";
      tip.style.top = (pt + ih*.45) + "px";
      tip.classList.add("show");
    }
    function hide(){
      tip.classList.remove("show");
      cursor.setAttribute("opacity", 0);
      focusDot.setAttribute("opacity", 0);
    }
    hit.addEventListener("mousemove", function(e){ show(e.clientX, e.clientY); });
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("click", function(e){ PC.setConvocation(convs[at(e.clientX)].id); });
    hit.addEventListener("touchstart", function(e){ show(e.touches[0].clientX, e.touches[0].clientY); }, { passive:true });
    hit.addEventListener("touchmove", function(e){ show(e.touches[0].clientX, e.touches[0].clientY); }, { passive:true });
    hit.addEventListener("touchend", hide);

    /* легенда — переключатель серий; число рядом с названием делает
       её ещё и сводкой по выбранному созыву */
    host.trendLegend.innerHTML = order.map(function(p){
      var s = seatsAt(p, picked);
      return '<button type="button" class="tleg' + (trendOff[p.id] ? " off" : "") +
        '" data-id="' + esc(p.id) + '" aria-pressed="' + (!trendOff[p.id]) + '">' +
        '<i style="background:' + esc(chartColor(p.color)) + '"></i>' +
        esc(L(p, "short")) + '<b>' + (s === null ? "—" : s) + '</b></button>';
    }).join("");
    host.trendLegend.querySelectorAll(".tleg").forEach(function(b){
      b.addEventListener("click", function(){
        trendOff[b.dataset.id] = !trendOff[b.dataset.id];
        renderTrend();
      });
    });

    /* таблица данных: тот же ряд без опоры на цвет */
    host.trendTable.innerHTML =
      '<table class="data-table"><caption class="sr-only">' + esc(t("ch.trend.tableCap")) + '</caption>' +
      '<thead><tr><th scope="col">' + esc(t("ch.trend.party")) + '</th>' +
      convs.map(function(c){ return '<th scope="col">' + esc(L(c, "label").split(" ")[0]) + "</th>"; }).join("") +
      '</tr></thead><tbody>' +
      order.map(function(p){
        return '<tr><th scope="row">' + esc(L(p, "short")) + "</th>" + convs.map(function(c){
          var s = seatsAt(p, c.id);
          return "<td>" + (s === null ? "—" : s) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }

  /* переключатель шкалы: абсолютные мандаты или доля палаты. В долях
     созывы сравнимы напрямую — размер Думы менялся по составу фракций,
     но не по числу мест, зато доля читается без деления в уме. */
  /* только кнопки со шкалой: класс .trend-mode носят и кнопки песочницы
     коалиций, и без [data-mode] клик по «Как в жизни» ставил графику
     шкалу undefined и отмечал кнопки песочницы как нажатые */
  function bindModes(){
    document.querySelectorAll(".trend-mode[data-mode]").forEach(function(b){
      b.addEventListener("click", function(){
        if(trendMode === b.dataset.mode) return;
        trendMode = b.dataset.mode;
        document.querySelectorAll(".trend-mode[data-mode]").forEach(function(o){
          o.setAttribute("aria-pressed", String(o.dataset.mode === trendMode));
        });
        renderTrend();
      });
    });
  }

  C.renderTrend = renderTrend;
  C.bindTrendModes = bindModes;
})(window.PC = window.PC || {});
