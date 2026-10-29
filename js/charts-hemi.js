/* ============ Аналитика: парламентская диаграмма ============
   Вынесено из js/charts.js в 5.0. Полукруг на 450 мест, легенда фракций
   и подсветка выбранной партии. Контейнеры, цвет марок и выбранную партию
   даёт js/charts.js; отрисовку по появлению на экране — тоже он. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, el = U.el, esc = U.esc;
  var seatsAt = PC.seatsAt;
  var t = PC.t, L = PC.L;
  var C = PC.charts, host = C.host, chartColor = C.chartColor;
  var active = C.active;
  var inDuma = PC.calc.inDuma;

  /* ---------- 1. Парламентская диаграмма ---------- */
  function hemiSeats(total, rows, r0, r1, cx, cy){
    var radii = [], sum = 0, i, j;
    for(i = 0; i < rows; i++){ var r = r0 + (r1-r0)*i/(rows-1); radii.push(r); sum += r; }
    var counts = radii.map(function(r){ return Math.max(1, Math.round(total*r/sum)); });
    var diff = total - counts.reduce(function(a, b){ return a+b; }, 0);
    for(i = rows-1; diff !== 0 && i >= 0; i--){
      var step = diff > 0 ? 1 : -1;
      counts[i] += step; diff -= step;
      if(diff !== 0 && i === 0) i = rows;      /* второй проход, если не хватило */
    }
    var pts = [];
    radii.forEach(function(r, ri){
      var n = counts[ri];
      for(j = 0; j < n; j++){
        var t = n === 1 ? .5 : (j + .5)/n;
        var a = Math.PI * (1 - t);
        pts.push({ x:cx + r*Math.cos(a), y:cy - r*Math.sin(a), a:a });
      }
    });
    pts.sort(function(p, q){ return q.a - p.a; });   /* слева направо */
    return { pts:pts, gap:(r1-r0)/(rows-1), innerCount:counts[0] };
  }

  /* Полукруг мест в парламенте. */
  function renderHemicycle(){
    var box = host.hemi, conv = PC.convocationInfo(), c = conv.id;
    var W = Math.max(260, box.clientWidth || 320);
    var H = Math.round(W * .54) + 6;
    var cx = W/2, cy = H - 4;
    var r1 = Math.min(W/2 - 6, H - 10), r0 = r1 * .46;
    var rows = W < 380 ? 8 : 11;

    var seats = hemiSeats(PC.TOTAL_SEATS, rows, r0, r1, cx, cy);
    var pts = seats.pts;
    /* точка не должна перекрывать соседей ни по радиусу, ни по дуге:
       берём меньший из двух шагов — радиальный и угловой на внутреннем ряду */
    var step = Math.min(seats.gap, Math.PI * r0 / seats.innerCount);
    var dotR = Math.max(1.6, step * .40);

    /* места раздаются партиям слева направо по экономической оси —
       так дуга читается как политический спектр, а не как рейтинг */
    var duma = inDuma(c).slice().sort(function(a, b){ return a.x - b.x; });
    var owners = new Array(pts.length).fill(null);
    var k = 0;
    duma.forEach(function(p){
      var n = seatsAt(p, c);
      for(var i = 0; i < n && k < owners.length; i++, k++) owners[k] = p;
    });

    var svg = el("svg", { viewBox:"0 0 " + W + " " + H, width:W, height:H,
      role:"img", "aria-label":t("ch.hemi.aria", { conv:L(conv, "label"), n:PC.TOTAL_SEATS }) });

    /* Цвета мест прошлой отрисовки — в порядке мест, а не узлов: узлы
       разложены по группам фракций, и их порядок в документе другой. */
    var oldFill = (box._seatDots && box._seatDots.length === pts.length && box.dataset.conv !== String(c))
      ? box._seatDots.map(function(d){ return d.getAttribute("fill"); }) : null;
    var dots = [];

    /* Дуга проявляется местами слева направо только при самой первой
       отрисовке — редизайн 2.3.1.1. При смене созыва места уже красит
       своя волна (oldFill ниже), а при простом ресайзе окна повторный
       разлёт точек был бы просто миганием без смысла. */
    var firstPaint = !box._seatDots;

    var groups = {};
    pts.forEach(function(pt, i){
      var p = owners[i];
      var dot = el("circle", {
        class:"seat" + (firstPaint ? " seat-in" : ""),
        cx:pt.x.toFixed(2), cy:pt.y.toFixed(2), r:dotR.toFixed(2),
        fill:p ? chartColor(p.color) : "var(--chart-empty)",
        stroke:"var(--chart-surface)", "stroke-width":1.2,       /* зазор между соседними местами */
        style:firstPaint ? "animation-delay:" + Math.round(pt.x / W * 340) + "ms" : ""
      });
      dots.push(dot);
      if(p){
        var g = groups[p.id] || (groups[p.id] = el("g", { "data-id":p.id, class:"seat-group" }));
        g.appendChild(dot);
      }else svg.appendChild(dot);
    });
    duma.forEach(function(p){ if(groups[p.id]) svg.appendChild(groups[p.id]); });

    /* Хитбокс: одна прозрачная плоскость на всю диаграмму вместо кружка
       вокруг каждого места. Точка мандата — это 2–3 пикселя, попасть в неё
       курсором тяжело, а соседние кружки не могли перекрываться, не съедая
       клики друг друга. Здесь фракция определяется по ближайшему месту в
       радиусе REACH шагов, поэтому промежутки между точками и полоса вокруг
       дуги тоже «принадлежат» ближайшей фракции — навести можно уверенным
       движением, без прицеливания. */
    var REACH = 2.6;
    var maxDist = Math.max(14, step * REACH);
    var hit = el("rect", { x:0, y:0, width:W, height:H, fill:"transparent",
      "pointer-events":"all", style:"cursor:pointer" });
    svg.appendChild(hit);

    /* Ближайшая к курсору точка графика. */
    function nearest(clientX, clientY){
      var r = svg.getBoundingClientRect();
      if(!r.width) return null;
      var mx = (clientX - r.left) / r.width * W;
      var my = (clientY - r.top) / r.height * H;
      var best = null, bestD = maxDist * maxDist;
      for(var i = 0; i < pts.length; i++){
        if(!owners[i]) continue;
        var dx = pts[i].x - mx, dy = pts[i].y - my, d = dx*dx + dy*dy;
        if(d < bestD){ bestD = d; best = owners[i]; }
      }
      return best;
    }

    box.innerHTML = "";
    box.appendChild(svg);
    box._seatDots = dots;
    box.dataset.conv = String(c);

    /* Смена созыва перекрашивает места, а не пересобирает дугу на
       глазах: каждое место плавно меняет цвет со старого на новый,
       волной слева направо — видно, какие части спектра перешли
       к другой фракции. */
    if(oldFill && window.requestAnimationFrame && PC.motion && !PC.motion.reduced()){
      dots.forEach(function(d, i){ d.style.fill = oldFill[i]; });
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          dots.forEach(function(d, i){
            d.style.transition = "fill .62s var(--ease-out-soft) " + Math.round(pts[i].x / W * 280) + "ms";
            d.style.fill = "";
          });
          setTimeout(function(){
            dots.forEach(function(d){ d.style.transition = ""; });
          }, 1000);
        });
      });
    }

    var hero = document.createElement("div");
    hero.className = "hemi-center";
    hero.style.width = Math.round(r0 * 1.6) + "px";
    box.appendChild(hero);

    /* Выводит главную карточку партии. */
    function setHero(p){
      hero.innerHTML = p
        ? '<div class="big" style="color:' + esc(chartColor(p.color)) + '">' + seatsAt(p,c) + '</div>' +
          '<div class="sub">' + esc(t("ch.hemi.share", {
            name:L(p, "short"), p:(seatsAt(p,c)/PC.TOTAL_SEATS*100).toFixed(1) })) + '</div>'
        : '<div class="big">' + PC.TOTAL_SEATS + '</div>' +
          '<div class="sub">' + esc(t("ch.hemi.seats", {
            conv:L(conv, "label"), n:duma.length,
            factions:PC.i18n.pl(duma.length, "word.faction") })) + '</div>';
    }
    setHero(active() ? duma.filter(function(p){ return p.id === active(); })[0] : null);

    var shown = null;                 /* фракция, подсвеченная прямо сейчас */
    function highlight(id){
      if(id === shown) return;        /* лишние перерисовки = мигание подсветки */
      shown = id;
      svg.querySelectorAll(".seat-group").forEach(function(g){
        var off = !!id && g.dataset.id !== id;
        g.classList.toggle("dim-group", off);
        g.querySelectorAll(".seat").forEach(function(s){ s.classList.toggle("dim", off); });
      });
      host.hemiLegend.querySelectorAll(".hleg").forEach(function(b){
        b.classList.toggle("active", b.dataset.id === id);
      });
      setHero(id ? duma.filter(function(p){ return p.id === id; })[0] : null);
    }

    var hovered = null;
    hit.addEventListener("mousemove", function(e){
      var p = nearest(e.clientX, e.clientY);
      hovered = p;
      highlight(p ? p.id : active());
      hit.style.cursor = p ? "pointer" : "default";
    });
    hit.addEventListener("mouseleave", function(){
      hovered = null;
      highlight(active());
    });
    hit.addEventListener("click", function(e){
      var p = nearest(e.clientX, e.clientY);
      if(p) PC.select(p.id);
    });
    /* на тач-устройствах наведения нет: касание сразу открывает карточку */
    hit.addEventListener("touchstart", function(e){
      var t = e.touches[0];
      var p = nearest(t.clientX, t.clientY);
      if(p) highlight(p.id);
    }, { passive:true });

    /* легенда = таблица данных: название + число + доля, цвет вторичен */
    host.hemiLegend.innerHTML = duma.slice().sort(function(a, b){ return seatsAt(b,c) - seatsAt(a,c); })
      .map(function(p){
        var s = seatsAt(p, c), color = chartColor(p.color);
        return '<button type="button" class="hleg' + (p.id === active() ? " active" : "") +
          '" data-id="' + esc(p.id) + '" style="--hleg-share:' + (s/PC.TOTAL_SEATS*100).toFixed(1) +
          '%;--hleg-c:' + esc(color) + '">' +
          '<i style="background:' + esc(color) + '"></i>' +
          '<span class="n">' + esc(L(p, "name")) + '</span>' +
          '<span class="s">' + s + '</span>' +
          '<span class="p">' + (s/PC.TOTAL_SEATS*100).toFixed(1) + '%</span></button>';
      }).join("") || '<div class="hist-note">' + esc(t("ch.hemi.nodata")) + '</div>';

    /* остаток мест — самовыдвиженцы и депутаты вне фракций; серые точки
       на диаграмме без этой строки читались бы как ошибка */
    var held = duma.reduce(function(a, p){ return a + seatsAt(p,c); }, 0);
    if(held < PC.TOTAL_SEATS && duma.length){
      var rest = PC.TOTAL_SEATS - held;
      host.hemiLegend.insertAdjacentHTML("beforeend",
        '<div class="hleg static"><i style="background:var(--chart-empty)"></i>' +
        '<span class="n">' + esc(t("ch.hemi.rest")) + '</span>' +
        '<span class="s">' + rest + '</span>' +
        '<span class="p">' + (rest/PC.TOTAL_SEATS*100).toFixed(1) + '%</span></div>');
    }

    host.hemiLegend.querySelectorAll(".hleg[data-id]").forEach(function(b){
      b.addEventListener("click", function(){ PC.select(b.dataset.id); });
      b.addEventListener("mouseenter", function(){ highlight(b.dataset.id); });
      b.addEventListener("mouseleave", function(){ highlight(hovered ? hovered.id : active()); });
    });

    box._highlight = function(id){
      shown = undefined;
      host.hemiLegend.querySelectorAll(".hleg").forEach(function(b){
        b.classList.toggle("active", b.dataset.id === id);
      });
      highlight(id);
    };
    if(active()) highlight(active());
  }

  C.hemiSeats = hemiSeats;
  C.renderHemicycle = renderHemicycle;
})(window.PC = window.PC || {});
