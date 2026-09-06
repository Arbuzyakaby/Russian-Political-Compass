/* ============ АНАЛИТИКА: KPI, парламент, динамика, спектр ============
   Графики рисуются в реальных пикселях контейнера (viewBox совпадает с
   размером), а не в условной системе координат: иначе на телефоне вместе
   с шириной ужимался бы и шрифт подписей. Отсюда перерисовка по resize.

   Цвет партии — идентичность, а не палитра под задачу: два синих и два
   красных различимы не всегда, поэтому цвет нигде не единственный код —
   рядом всегда название и число (прямая подпись, строка легенды или
   таблица данных). ============ */
(function(PC){
  "use strict";
  var U = PC.utils, el = U.el, esc = U.esc, fmt = U.fmt;
  var seatsAt = PC.seatsAt;

  var host = {};          /* ссылки на контейнеры */
  var trendOff = {};      /* серии, скрытые кликом по легенде */
  var trendMode = "seats";/* seats | share — что на оси Y графика динамики */
  var activeId = null;
  var lastKey = null;     /* последнее состояние, на котором графики уже отрисованы */

  /* ---------- цвет марок ---------- */
  function hexToRgb(h){
    h = h.replace("#", "");
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  function rgbToHsl(r, g, b){
    r/=255; g/=255; b/=255;
    var mx = Math.max(r,g,b), mn = Math.min(r,g,b), h = 0, s = 0, l = (mx+mn)/2, d = mx-mn;
    if(d){
      s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
      h = mx === r ? ((g-b)/d + (g<b?6:0)) : mx === g ? (b-r)/d + 2 : (r-g)/d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToCss(h, s, l){
    return "hsl(" + (h*360).toFixed(1) + " " + (s*100).toFixed(1) + "% " + (l*100).toFixed(1) + "%)";
  }

  /* Тёмные фирменные цвета (бордовый, тёмно-синий) на почти чёрном фоне
     дают контраст ниже 3:1 — поднимаем светлоту, сохраняя тон. В светлой
     теме наоборот ограничиваем сверху, чтобы жёлтый не выцветал. */
  function chartColor(hex){
    var dark = document.documentElement.dataset.theme !== "light";
    var hsl = rgbToHsl.apply(null, hexToRgb(hex));
    var l = hsl[2];
    if(dark) l = Math.max(l, .48);
    else     l = Math.min(l, .55);
    return hslToCss(hsl[0], hsl[1], l);
  }

  /* ---------- выборки по данным ---------- */
  function inDuma(conv){
    return PC.PARTIES.filter(function(p){ return seatsAt(p, conv) > 0; });
  }
  function existing(conv){
    return PC.PARTIES.filter(function(p){ return seatsAt(p, conv) !== null; });
  }

  /* «Круглый» шаг сетки: 1 · 2 · 5 · 10 … — чтобы подписи оси были
     читаемыми при любом максимуме, а не всегда кратными 50. */
  function niceScale(max, targetSteps){
    if(max <= 0) return { max:1, step:1 };
    var raw = max / (targetSteps || 5);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm > 5 ? 10 : norm > 2 ? 5 : norm > 1 ? 2 : 1) * mag;
    return { max: Math.ceil(max / step) * step, step: step };
  }

  /* ---------- KPI-плитки ---------- */
  function renderStats(){
    var conv = PC.convocationInfo(), c = conv.id;
    var duma = inDuma(c).sort(function(a, b){ return seatsAt(b,c) - seatsAt(a,c); });
    var top = duma[0];
    var total = duma.reduce(function(s, p){ return s + seatsAt(p,c); }, 0);
    var wx = 0, wy = 0;
    duma.forEach(function(p){ var s = seatsAt(p,c); wx += p.x*s; wy += p.y*s; });
    wx = total ? wx/total : 0; wy = total ? wy/total : 0;

    /* data-count — цель для счётчика из js/motion.js; в разметку кладём
       уже конечное число, чтобы страница оставалась правильной, даже если
       анимация не запустится (нет наблюдателя, отключены анимации). */
    function num(v, signed){
      return '<span data-count="' + v + '"' + (signed ? ' data-count-fmt="signed"' : "") + '>' +
             (signed ? fmt(v) : v) + '</span>';
    }

    var tiles = [
      { k:"Партий на компасе", v:num(PC.PARTIES.length),
        d:"в выбранном созыве существовали " + existing(c).length },
      { k:"Фракций в Госдуме", v:num(duma.length), d:conv.label + " · " + conv.years },
      { k:"Крупнейшая фракция", v:num(top ? seatsAt(top,c) : 0),
        vs:" / " + PC.TOTAL_SEATS,
        d:(top ? esc(top.short) + " · " + (seatsAt(top,c)/PC.TOTAL_SEATS*100).toFixed(1) + "% палаты" : "нет данных") },
      { k:"Центр тяжести палаты",
        body:'<div class="stat-dual">' +
               '<div><span class="lbl">Гос. контроль</span><span class="num">' + num(Number(wy.toFixed(1)), true) + '</span></div>' +
               '<div><span class="lbl">Экономика</span><span class="num">' + num(Number(wx.toFixed(1)), true) + '</span></div>' +
             '</div>',
        d:"взвешено по мандатам" }
    ];
    host.stats.innerHTML = tiles.map(function(t){
      return '<div class="stat" data-reveal><div class="k">' + t.k + '</div>' +
             (t.body ? t.body : '<div class="v">' + t.v + (t.vs ? '<small>' + t.vs + '</small>' : '') + '</div>') +
             '<div class="d">' + t.d + '</div></div>';
    }).join("");
    if(PC.motion) PC.motion.scan(host.stats);
  }

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
      role:"img", "aria-label":"Состав Госдумы " + conv.label + ": " + PC.TOTAL_SEATS + " мест по фракциям" });

    var groups = {};
    pts.forEach(function(pt, i){
      var p = owners[i];
      var dot = el("circle", {
        class:"seat", cx:pt.x.toFixed(2), cy:pt.y.toFixed(2), r:dotR.toFixed(2),
        fill:p ? chartColor(p.color) : "var(--chart-empty)",
        stroke:"var(--chart-surface)", "stroke-width":1.2        /* зазор между соседними местами */
      });
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

    var hero = document.createElement("div");
    hero.className = "hemi-center";
    hero.style.width = Math.round(r0 * 1.6) + "px";
    box.appendChild(hero);

    function setHero(p){
      hero.innerHTML = p
        ? '<div class="big" style="color:' + esc(chartColor(p.color)) + '">' + seatsAt(p,c) + '</div>' +
          '<div class="sub">' + esc(p.short) + ' · ' + (seatsAt(p,c)/PC.TOTAL_SEATS*100).toFixed(1) + '% палаты</div>'
        : '<div class="big">' + PC.TOTAL_SEATS + '</div>' +
          '<div class="sub">мест · ' + esc(conv.label) + ' · ' + duma.length + ' фракц' +
            (duma.length === 1 ? "ия" : duma.length < 5 ? "ии" : "ий") + '</div>';
    }
    setHero(activeId ? duma.filter(function(p){ return p.id === activeId; })[0] : null);

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
      highlight(p ? p.id : activeId);
      hit.style.cursor = p ? "pointer" : "default";
    });
    hit.addEventListener("mouseleave", function(){
      hovered = null;
      highlight(activeId);
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
        var s = seatsAt(p, c);
        return '<button type="button" class="hleg' + (p.id === activeId ? " active" : "") +
          '" data-id="' + esc(p.id) + '">' +
          '<i style="background:' + esc(chartColor(p.color)) + '"></i>' +
          '<span class="n">' + esc(p.name) + '</span>' +
          '<span class="s">' + s + '</span>' +
          '<span class="p">' + (s/PC.TOTAL_SEATS*100).toFixed(1) + '%</span></button>';
      }).join("") || '<div class="hist-note">В этом созыве нет данных о фракциях.</div>';

    /* остаток мест — самовыдвиженцы и депутаты вне фракций; серые точки
       на диаграмме без этой строки читались бы как ошибка */
    var held = duma.reduce(function(a, p){ return a + seatsAt(p,c); }, 0);
    if(held < PC.TOTAL_SEATS && duma.length){
      var rest = PC.TOTAL_SEATS - held;
      host.hemiLegend.insertAdjacentHTML("beforeend",
        '<div class="hleg static"><i style="background:var(--chart-empty)"></i>' +
        '<span class="n">Вне фракций и самовыдвиженцы</span>' +
        '<span class="s">' + rest + '</span>' +
        '<span class="p">' + (rest/PC.TOTAL_SEATS*100).toFixed(1) + '%</span></div>');
    }

    host.hemiLegend.querySelectorAll(".hleg[data-id]").forEach(function(b){
      b.addEventListener("click", function(){ PC.select(b.dataset.id); });
      b.addEventListener("mouseenter", function(){ highlight(b.dataset.id); });
      b.addEventListener("mouseleave", function(){ highlight(hovered ? hovered.id : activeId); });
    });

    if(activeId) highlight(activeId);
  }

  /* Линии графика прорисовываются слева направо: длина пути уходит в
     stroke-dasharray, а смещение штриха возвращается к нулю. Делается
     только на первой отрисовке — иначе линии перерисовывались бы при
     каждом переключении созыва, скрытии серии и смене темы. Длину пути
     можно спросить только у элемента в документе, поэтому вызов идёт
     после вставки svg в контейнер. */
  var trendDrawn = false;
  function drawIn(lines, marks, card){
    if(trendDrawn) return;
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
      "aria-label":"Динамика " + (share ? "доли мест" : "мандатов") + " партий по созывам Госдумы IV–VIII" });

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
      svg.appendChild(el("rect", {
        x:bx1.toFixed(1), y:pt, width:(bx2 - bx1).toFixed(1), height:ih,
        fill:"var(--accent-soft)", rx:6
      }));
    }

    /* сетка и ось Y */
    for(var v = 0; v <= scale.max + 1e-9; v += scale.step){
      svg.appendChild(el("line", { x1:pl, x2:W-pr, y1:Y(v), y2:Y(v),
        stroke:v === 0 ? "var(--chart-axis)" : "var(--chart-grid)", "stroke-width":1 }));
      svg.appendChild(el("text", { x:pl-8, y:Y(v)+3.5, "text-anchor":"end",
        "font-size":10, fill:"var(--muted-2)" }, label(v)));
    }
    svg.appendChild(el("text", { x:pl-8, y:pt-5, "text-anchor":"end", "font-size":9,
      fill:"var(--muted-2)", "letter-spacing":".06em" }, share ? "% МЕСТ" : "МЕСТ"));

    /* ось X: римский номер созыва и год выборов, оба кликабельны */
    convs.forEach(function(c, i){
      var on = c.id === picked;
      svg.appendChild(el("text", { x:X(i), y:H-pb+18, "text-anchor":"middle",
        "font-size":11, "font-weight":on ? 750 : 650,
        fill:on ? "var(--accent)" : "var(--muted)" }, c.label.split(" ")[0]));
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
      var on = activeId === p.id, faded = activeId && !on;
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
        labels.push({ x:last.x - 8, y:last.y - 9, text:p.short, faded:faded });
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
          }else delta = '<u class="new">впервые</u>';
          return '<div class="r' + (near && near.id === p.id ? " on" : "") + '">' +
                 '<i style="background:' + esc(chartColor(p.color)) + '"></i>' +
                 esc(p.short) + '<b>' + label(now) + '</b>' + delta + '</div>';
        }).join("");

      tip.innerHTML = '<div class="t">' + esc(c.label) + ' · ' + esc(c.years) + '</div>' + rows +
        '<div class="f">Клик — переключить созыв</div>';
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
        esc(p.short) + '<b>' + (s === null ? "—" : s) + '</b></button>';
    }).join("");
    host.trendLegend.querySelectorAll(".tleg").forEach(function(b){
      b.addEventListener("click", function(){
        trendOff[b.dataset.id] = !trendOff[b.dataset.id];
        renderTrend();
      });
    });

    /* таблица данных: тот же ряд без опоры на цвет */
    host.trendTable.innerHTML =
      '<table class="data-table"><caption class="sr-only">Мандаты партий по созывам Госдумы</caption>' +
      '<thead><tr><th scope="col">Партия</th>' +
      convs.map(function(c){ return '<th scope="col">' + esc(c.label.split(" ")[0]) + "</th>"; }).join("") +
      '</tr></thead><tbody>' +
      order.map(function(p){
        return '<tr><th scope="row">' + esc(p.short) + "</th>" + convs.map(function(c){
          var s = seatsAt(p, c.id);
          return "<td>" + (s === null ? "—" : s) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }

  /* ---------- 3. Идеологический спектр ---------- */
  function specColumn(key, title, left, right){
    var list = PC.PARTIES.slice().sort(function(a, b){ return a[key] - b[key]; });
    return '<div class="spec-col"><h4>' + title + '</h4>' +
      '<div class="poles"><span>' + left + '</span><span>' + right + '</span></div>' +
      list.map(function(p){
        var v = p[key], w = Math.abs(v)/10*50, l = v < 0 ? 50 - w : 50;
        return '<div class="srow' + (p.id === activeId ? " hi" : "") + '" data-id="' + esc(p.id) + '">' +
          '<div class="lab">' + esc(p.short) + '<b>' + fmt(v) + '</b></div>' +
          '<div class="track"><span class="fill" data-left="' + l.toFixed(2) + '" data-w="' + w.toFixed(2) + '"' +
            ' style="left:50%;background:' + esc(chartColor(p.color)) + '"></span></div></div>';
      }).join("") +
      '<div class="spec-scale"><span>−10</span><span>0</span><span>+10</span></div></div>';
  }
  function renderSpectrum(){
    host.spectrum.innerHTML =
      specColumn("x", "Экономика", "плановая", "рыночная") +
      specColumn("y", "Отношение к государству", "свободы", "этатизм");
    host.spectrum.querySelectorAll(".srow").forEach(function(row){
      row.style.cursor = "pointer";
      row.addEventListener("click", function(){ PC.select(row.dataset.id); });
    });
    requestAnimationFrame(function(){
      host.spectrum.querySelectorAll(".fill").forEach(function(f){
        f.style.left = f.dataset.left + "%";
        f.style.width = Math.max(1.5, Number(f.dataset.w)) + "%";
      });
    });
  }

  /* ---------- сборка ---------- */
  function init(){
    host.stats       = document.getElementById("stats");
    host.hemi        = document.getElementById("hemi");
    host.hemiLegend  = document.getElementById("hemiLegend");
    host.trend       = document.getElementById("trend");
    host.trendLegend = document.getElementById("trendLegend");
    host.trendTable  = document.getElementById("trendTable");
    host.spectrum    = document.getElementById("spectrum");

    var toggle = document.getElementById("trendTableBtn");
    var wrap   = document.getElementById("trendTableWrap");
    if(toggle && wrap){
      toggle.addEventListener("click", function(){
        var open = wrap.hasAttribute("hidden");
        if(open) wrap.removeAttribute("hidden"); else wrap.setAttribute("hidden", "");
        toggle.textContent = open ? "Скрыть таблицу данных" : "Показать таблицу данных";
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    /* переключатель шкалы: абсолютные мандаты или доля палаты. В долях
       созывы сравнимы напрямую — размер Думы менялся по составу фракций,
       но не по числу мест, зато доля читается без деления в уме. */
    document.querySelectorAll(".trend-mode").forEach(function(b){
      b.addEventListener("click", function(){
        if(trendMode === b.dataset.mode) return;
        trendMode = b.dataset.mode;
        document.querySelectorAll(".trend-mode").forEach(function(o){
          o.setAttribute("aria-pressed", String(o.dataset.mode === trendMode));
        });
        renderTrend();
      });
    });

    var t = null;
    window.addEventListener("resize", function(){
      clearTimeout(t);
      t = setTimeout(function(){    /* размер в ключ не входит — перерисовываем напрямую */
        if(!host.hemi.clientWidth) return;
        renderHemicycle();
        renderTrend();
      }, 180);
    });
  }

  /* Графики зависят только от созыва и выбранной партии — поиск и фильтры
     на них не влияют. Без этой проверки каждое нажатие клавиши в поиске
     перерисовывало бы 450 точек парламента и сбрасывало подсветку. */
  function render(active){
    if(!host.stats) return;
    activeId = active || null;
    var key = PC.convocationInfo().id + "|" + activeId + "|" + document.documentElement.dataset.theme;
    if(key === lastKey) return;
    lastKey = key;
    renderStats();
    renderHemicycle();
    renderTrend();
    renderSpectrum();
  }

  /* Сброс кэша: после возврата на вкладку компаса размеры контейнеров
     изменились, хотя ключ состояния прежний. */
  function invalidate(){ lastKey = null; }

  PC.charts = { init:init, render:render, invalidate:invalidate, chartColor:chartColor };
})(window.PC = window.PC || {});
