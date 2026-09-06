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
  var host = {};          /* ссылки на контейнеры */
  var trendOff = {};      /* серии, скрытые кликом по легенде */
  var activeId = null;
  var lastKey = null;     /* последнее состояние, на котором графики уже отрисованы */

  /* ---------- цвет марок ---------- */
  function hexToRgb(h){
    h = h.replace("#","");
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    var mx = Math.max(r,g,b), mn = Math.min(r,g,b), h = 0, s = 0, l = (mx+mn)/2, d = mx-mn;
    if(d){
      s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
      h = mx === r ? ((g-b)/d + (g<b?6:0)) : mx === g ? (b-r)/d + 2 : (r-g)/d + 4;
      h /= 6;
    }
    return [h,s,l];
  }
  function hslToCss(h,s,l){ return "hsl(" + (h*360).toFixed(1) + " " + (s*100).toFixed(1) + "% " + (l*100).toFixed(1) + "%)"; }

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

  /* ---------- данные ---------- */
  function seatsAt(p, conv){
    if(conv === 8) return p.seats;
    return (p.seatsBy && conv in p.seatsBy) ? p.seatsBy[conv] : null;
  }
  function inDuma(conv){
    return PC.PARTIES.filter(function(p){ return seatsAt(p, conv) > 0; });
  }
  function existing(conv){
    return PC.PARTIES.filter(function(p){ return seatsAt(p, conv) !== null; });
  }
  function convsAsc(){
    return PC.CONVOCATIONS.slice().sort(function(a,b){ return a.id - b.id; });
  }

  /* ---------- KPI-плитки ---------- */
  function renderStats(){
    var conv = PC.convocationInfo(), c = conv.id;
    var duma = inDuma(c).sort(function(a,b){ return seatsAt(b,c) - seatsAt(a,c); });
    var top = duma[0];
    var total = duma.reduce(function(s,p){ return s + seatsAt(p,c); }, 0);
    var wx = 0, wy = 0;
    duma.forEach(function(p){ var s = seatsAt(p,c); wx += p.x*s; wy += p.y*s; });
    wx = total ? wx/total : 0; wy = total ? wy/total : 0;

    var tiles = [
      { k:"Партий на компасе", v:PC.PARTIES.length, d:"в выбранном созыве существовали " + existing(c).length },
      { k:"Фракций в Госдуме", v:duma.length, d:conv.label + " · " + conv.years },
      { k:"Крупнейшая фракция", v:(top ? seatsAt(top,c) : 0),
        vs:" / " + PC.TOTAL_SEATS,
        d:(top ? esc(top.short) + " · " + (seatsAt(top,c)/PC.TOTAL_SEATS*100).toFixed(1) + "% палаты" : "нет данных") },
      { k:"Центр тяжести палаты", v:fmt(wy), d:"гос. контроль · экономика " + fmt(wx) + " (взвешено по мандатам)" }
    ];
    host.stats.innerHTML = tiles.map(function(t){
      return '<div class="stat"><div class="k">' + t.k + '</div>' +
             '<div class="v">' + t.v + (t.vs ? '<small>' + t.vs + '</small>' : '') + '</div>' +
             '<div class="d">' + t.d + '</div></div>';
    }).join("");
  }

  /* ---------- 1. Парламентская диаграмма ---------- */
  function hemiSeats(total, rows, r0, r1, cx, cy){
    var radii = [], sum = 0, i, j;
    for(i = 0; i < rows; i++){ var r = r0 + (r1-r0)*i/(rows-1); radii.push(r); sum += r; }
    var counts = radii.map(function(r){ return Math.max(1, Math.round(total*r/sum)); });
    var diff = total - counts.reduce(function(a,b){ return a+b; }, 0);
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
    pts.sort(function(p,q){ return q.a - p.a; });   /* слева направо */
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
    var dotR = Math.max(1.6, Math.min(seats.gap, Math.PI * r0 / seats.innerCount) * .40);

    /* места раздаются партиям слева направо по экономической оси —
       так дуга читается как политический спектр, а не как рейтинг */
    var duma = inDuma(c).slice().sort(function(a,b){ return a.x - b.x; });
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
      var g = p ? (groups[p.id] || (groups[p.id] = el("g", { "data-id":p.id, class:"seat-group" }))) : null;
      var dot = el("circle", {
        class:"seat", cx:pt.x.toFixed(2), cy:pt.y.toFixed(2), r:dotR.toFixed(2),
        fill:p ? chartColor(p.color) : "var(--chart-empty)",
        stroke:"var(--chart-surface)", "stroke-width":1.2        /* зазор между соседними местами */
      });
      if(g) g.appendChild(dot); else svg.appendChild(dot);
    });
    duma.forEach(function(p){ if(groups[p.id]) svg.appendChild(groups[p.id]); });

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
          '<div class="sub">мест · ' + esc(conv.label) + ' · ' + duma.length + ' фракц' + (duma.length === 1 ? "ия" : duma.length < 5 ? "ии" : "ий") + '</div>';
    }
    setHero(activeId ? duma.filter(function(p){ return p.id === activeId; })[0] : null);

    function highlight(id){
      svg.querySelectorAll(".seat-group").forEach(function(g){
        g.classList.toggle("dim-group", !!id && g.dataset.id !== id);
        g.querySelectorAll(".seat").forEach(function(s){ s.classList.toggle("dim", !!id && g.dataset.id !== id); });
      });
      host.hemiLegend.querySelectorAll(".hleg").forEach(function(b){
        b.classList.toggle("active", b.dataset.id === id);
      });
      setHero(id ? duma.filter(function(p){ return p.id === id; })[0] : null);
    }

    duma.forEach(function(p){
      var g = groups[p.id];
      if(!g) return;
      g.style.cursor = "pointer";
      g.addEventListener("mouseenter", function(){ highlight(p.id); });
      g.addEventListener("mouseleave", function(){ highlight(activeId); });
      g.addEventListener("click", function(){ PC.select(p.id); });
    });
    svg.addEventListener("mouseleave", function(){ highlight(activeId); });

    /* легенда = таблица данных: название + число + доля, цвет вторичен */
    host.hemiLegend.innerHTML = duma.slice().sort(function(a,b){ return seatsAt(b,c) - seatsAt(a,c); })
      .map(function(p){
        var s = seatsAt(p,c);
        return '<button type="button" class="hleg' + (p.id === activeId ? " active" : "") + '" data-id="' + esc(p.id) + '">' +
          '<i style="background:' + esc(chartColor(p.color)) + '"></i>' +
          '<span class="n">' + esc(p.name) + '</span>' +
          '<span class="s">' + s + '</span>' +
          '<span class="p">' + (s/PC.TOTAL_SEATS*100).toFixed(1) + '%</span></button>';
      }).join("") || '<div class="hist-note">В этом созыве нет данных о фракциях.</div>';

    /* остаток мест — самовыдвиженцы и депутаты вне фракций; серые точки
       на диаграмме без этой строки читались бы как ошибка */
    var held = duma.reduce(function(a,p){ return a + seatsAt(p,c); }, 0);
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
      b.addEventListener("mouseleave", function(){ highlight(activeId); });
    });

    if(activeId) highlight(activeId);
  }

  /* ---------- 2. Динамика мандатов по созывам ---------- */
  function renderTrend(){
    var box = host.trend;
    var convs = convsAsc();
    var series = PC.PARTIES.filter(function(p){
      return convs.some(function(c){ return seatsAt(p, c.id) > 0; });
    });

    var W = Math.max(260, box.clientWidth || 320);
    var narrow = W < 460;
    var H = narrow ? 250 : 290;
    var pl = 34, pr = narrow ? 12 : 16, pt = 14, pb = narrow ? 40 : 44;
    var iw = W - pl - pr, ih = H - pt - pb;

    var max = 0;
    series.forEach(function(p){ convs.forEach(function(c){ max = Math.max(max, seatsAt(p, c.id) || 0); }); });
    var yMax = Math.ceil(max/50)*50 || 50;

    function X(i){ return pl + (convs.length === 1 ? iw/2 : iw*i/(convs.length-1)); }
    function Y(v){ return pt + ih - ih*v/yMax; }

    var svg = el("svg", { viewBox:"0 0 " + W + " " + H, width:W, height:H,
      role:"img", "aria-label":"Динамика мандатов партий по созывам Госдумы IV–VIII" });

    /* сетка и ось Y */
    for(var v = 0; v <= yMax; v += 50){
      svg.appendChild(el("line", { x1:pl, x2:W-pr, y1:Y(v), y2:Y(v),
        stroke:v === 0 ? "var(--chart-axis)" : "var(--chart-grid)", "stroke-width":1 }));
      svg.appendChild(el("text", { x:pl-8, y:Y(v)+3.5, "text-anchor":"end",
        "font-size":10, fill:"var(--muted-2)" }, String(v)));
    }
    /* ось X: римский номер созыва и год выборов */
    var picked = PC.convocationInfo().id;
    convs.forEach(function(c, i){
      var on = c.id === picked;          /* созыв, выбранный над компасом */
      if(on){
        svg.appendChild(el("line", { x1:X(i), x2:X(i), y1:pt, y2:pt+ih,
          stroke:"var(--accent-line)", "stroke-width":1, opacity:.45 }));
      }
      svg.appendChild(el("text", { x:X(i), y:H-pb+18, "text-anchor":"middle",
        "font-size":11, "font-weight":on ? 750 : 650,
        fill:on ? "var(--accent)" : "var(--muted)" }, c.label.split(" ")[0]));
      svg.appendChild(el("text", { x:X(i), y:H-pb+32, "text-anchor":"middle",
        "font-size":9.5, fill:on ? "var(--accent)" : "var(--muted-2)" }, c.years.split("–")[0]));
    });

    /* линии: разрыв там, где партии ещё/уже не было */
    var order = series.slice().sort(function(a,b){ return (seatsAt(b,8)||0) - (seatsAt(a,8)||0); });
    var labels = [];      /* прямые подписи собираем и расставляем после линий */
    order.forEach(function(p){
      if(trendOff[p.id]) return;
      var col = chartColor(p.color);
      var on = activeId === p.id, faded = activeId && !on;
      var segs = [], cur = [];
      convs.forEach(function(c, i){
        var s = seatsAt(p, c.id);
        if(s === null){ if(cur.length) segs.push(cur); cur = []; }
        else cur.push({ x:X(i), y:Y(s), v:s });
      });
      if(cur.length) segs.push(cur);

      segs.forEach(function(seg){
        if(seg.length > 1){
          svg.appendChild(el("path", {
            d:"M" + seg.map(function(q){ return q.x.toFixed(1) + " " + q.y.toFixed(1); }).join("L"),
            fill:"none", stroke:col, "stroke-width":on ? 3 : 2,
            "stroke-linejoin":"round", "stroke-linecap":"round",
            opacity:faded ? .28 : 1
          }));
        }
        seg.forEach(function(q){
          svg.appendChild(el("circle", { cx:q.x, cy:q.y, r:on ? 5 : 4, fill:col,
            stroke:"var(--chart-surface)", "stroke-width":2, opacity:faded ? .28 : 1 }));
        });
      });

      /* прямая подпись у последней точки — для крупных фракций */
      var last = segs.length ? segs[segs.length-1][segs[segs.length-1].length-1] : null;
      if(last && !narrow && (seatsAt(p,8) || 0) >= 20){
        labels.push({ x:last.x - 8, y:last.y - 9, text:p.short, faded:faded });
      }
    });

    /* Подписи расставляем снизу вверх: каждая следующая уходит выше
       предыдущей, поэтому их порядок совпадает с порядком самих линий —
       иначе подпись меньшей фракции всплывала бы над большей. */
    labels.sort(function(a,b){ return b.y - a.y; });
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
    var hit = el("rect", { x:pl, y:pt, width:iw, height:ih, fill:"transparent", style:"cursor:crosshair" });
    svg.appendChild(hit);

    box.innerHTML = "";
    box.appendChild(svg);
    var tip = document.createElement("div");
    tip.className = "c-tip";
    box.appendChild(tip);

    function at(clientX){
      var r = svg.getBoundingClientRect();
      var rel = (clientX - r.left) / r.width * W;
      var i = Math.round((rel - pl) / (iw / Math.max(1, convs.length-1)));
      return Math.max(0, Math.min(convs.length-1, i));
    }
    function show(clientX){
      var i = at(clientX), c = convs[i];
      cursor.setAttribute("x1", X(i)); cursor.setAttribute("x2", X(i));
      cursor.setAttribute("opacity", 1);
      var rows = order.filter(function(p){ return !trendOff[p.id] && seatsAt(p, c.id) !== null; })
        .sort(function(a,b){ return seatsAt(b,c.id) - seatsAt(a,c.id); })
        .map(function(p){
          return '<div class="r"><i style="background:' + esc(chartColor(p.color)) + '"></i>' +
                 esc(p.short) + '<b>' + seatsAt(p, c.id) + '</b></div>';
        }).join("");
      tip.innerHTML = '<div class="t">' + esc(c.label) + ' · ' + esc(c.years) + '</div>' + rows;
      var bw = box.clientWidth, tw = tip.offsetWidth;
      var left = X(i) / W * bw;
      tip.style.left = Math.min(Math.max(left, tw/2 + 4), bw - tw/2 - 4) + "px";
      tip.style.top = (pt + ih*.45) + "px";
      tip.classList.add("show");
    }
    function hide(){ tip.classList.remove("show"); cursor.setAttribute("opacity", 0); }
    hit.addEventListener("mousemove", function(e){ show(e.clientX); });
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("touchstart", function(e){ show(e.touches[0].clientX); }, { passive:true });
    hit.addEventListener("touchmove", function(e){ show(e.touches[0].clientX); }, { passive:true });
    hit.addEventListener("touchend", hide);

    /* легенда — переключатель серий */
    host.trendLegend.innerHTML = order.map(function(p){
      return '<button type="button" class="tleg' + (trendOff[p.id] ? " off" : "") + '" data-id="' + esc(p.id) + '"' +
        ' aria-pressed="' + (!trendOff[p.id]) + '"><i style="background:' + esc(chartColor(p.color)) + '"></i>' +
        esc(p.short) + '</button>';
    }).join("");
    host.trendLegend.querySelectorAll(".tleg").forEach(function(b){
      b.addEventListener("click", function(){
        trendOff[b.dataset.id] = !trendOff[b.dataset.id];
        renderTrend();
      });
    });

    /* таблица данных: тот же ряд без опоры на цвет */
    host.trendTable.innerHTML =
      '<table class="data-table"><thead><tr><th>Партия</th>' +
      convs.map(function(c){ return "<th>" + esc(c.label.split(" ")[0]) + "</th>"; }).join("") +
      '</tr></thead><tbody>' +
      order.map(function(p){
        return "<tr><td>" + esc(p.short) + "</td>" + convs.map(function(c){
          var s = seatsAt(p, c.id);
          return "<td>" + (s === null ? "—" : s) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }

  /* ---------- 3. Идеологический спектр ---------- */
  function specColumn(key, title, left, right){
    var list = PC.PARTIES.slice().sort(function(a,b){ return a[key] - b[key]; });
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
        if(open) wrap.removeAttribute("hidden"); else wrap.setAttribute("hidden","");
        toggle.textContent = open ? "Скрыть таблицу данных" : "Показать таблицу данных";
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    var t = null;
    window.addEventListener("resize", function(){
      clearTimeout(t);
      t = setTimeout(function(){ renderHemicycle(); renderTrend(); }, 180);   /* размер в ключ не входит */
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

  PC.charts = { init:init, render:render, chartColor:chartColor, seatsAt:seatsAt };
})(window.PC = window.PC || {});
