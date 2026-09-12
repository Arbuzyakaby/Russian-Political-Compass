/* ============ Отрисовка компаса: сетка, оси, точки партий ============ */
(function(PC){
  "use strict";
  var G = PC.geom, U = PC.utils;
  var t = PC.t, L = PC.L;
  var SIZE = G.SIZE, PAD = G.PAD, C = G.C, px = G.px, radius = G.radius, el = U.el;

  var svg, cross, defs, trails;
  var trailsOn = false;
  var obstacles = [];          // занятые зоны: подписи осей, точки, уже размещённые ярлыки
  /* 3px хватало на площадь самого текста, но не на его обводку-halo
     (stroke-width 3–3.4px в compass.css, нужную для читаемости подписи
     на пёстром фоне): два ярлыка, чьи bbox по этой логике не пересекались,
     на экране всё равно соприкасались этой обводкой. */
  var LABEL_PAD = 6;

  /* ---------- геометрия прямоугольников ---------- */
  function rectOf(node, dx, dy, pad){
    var b = node.getBBox();
    pad = pad == null ? LABEL_PAD : pad;
    return { x1:b.x + dx - pad, y1:b.y + dy - pad,
             x2:b.x + b.width + dx + pad, y2:b.y + b.height + dy + pad };
  }
  function union(a, b){
    return { x1:Math.min(a.x1, b.x1), y1:Math.min(a.y1, b.y1),
             x2:Math.max(a.x2, b.x2), y2:Math.max(a.y2, b.y2) };
  }
  function overlaps(a, o){ return !(a.x2 <= o.x1 || a.x1 >= o.x2 || a.y2 <= o.y1 || a.y1 >= o.y2); }
  function collisions(a){
    var n = 0;
    for(var i = 0; i < obstacles.length; i++) if(overlaps(a, obstacles[i])) n++;
    return n;
  }
  function inside(a){ return a.x1 >= 6 && a.x2 <= SIZE - 6 && a.y1 >= 6 && a.y2 <= SIZE - 6; }

  /* ---------- размещение подписи точки ---------- */
  /* x/y — смещение ярлыка от центра точки, seatY — смещение строки с мандатами.
     Значения, зависящие от радиуса точки, дописываются в applyPos. */
  var OFFSETS = {
    top:    { x:0,  y:-11, anchor:"middle", seatY:-23 },
    bottom: { x:0,  y: 18, anchor:"middle", seatY: 30 },
    left:   { x:-8, y:  4, anchor:"end",    seatY: 16 },
    right:  { x: 8, y:  4, anchor:"start",  seatY: 16 }
  };

  function applyPos(tag, seat, dx, dy, r, pos, extra){
    var o = OFFSETS[pos];
    var vertical = (pos === "top" || pos === "bottom");
    extra = extra || 0;
    /* extra отодвигает подпись дальше от точки вдоль той же стороны —
       вертикальные позиции толкает по y, горизонтальные по x. Нужно,
       когда соседняя точка стоит слишком близко и четыре стандартных
       места все заняты хоть немного. */
    var x  = o.x === 0 ? 0 : (o.x < 0 ? o.x - r - (vertical ? 0 : extra) : o.x + r + (vertical ? 0 : extra));
    var y  = vertical ? (o.y < 0 ? o.y - r - extra : o.y + r + extra) : o.y;
    var sy = vertical ? (o.seatY < 0 ? o.seatY - r - extra : o.seatY + r + extra) : o.seatY;

    tag.setAttribute("x", x);  tag.setAttribute("y", y);   tag.setAttribute("text-anchor", o.anchor);
    seat.setAttribute("x", x); seat.setAttribute("y", sy); seat.setAttribute("text-anchor", o.anchor);

    /* строка с мандатами появляется при наведении, но место под неё
       резервируем сразу — иначе она накрывает соседние подписи */
    return union(rectOf(tag, dx, dy), rectOf(seat, dx, dy));
  }

  /* Перебирает стороны: сначала предпочтительную из данных, затем остальные.
     Побеждает вариант без пересечений и целиком внутри поля; если идеального
     нет — тот, у кого меньше конфликтов (раньше брался просто первый). */
  function placeLabel(tag, seat, dx, dy, r, preferred){
    var order = [preferred, "top", "right", "left", "bottom"].filter(function(v, i, a){
      return OFFSETS[v] && a.indexOf(v) === i;
    });
    var best = null;
    for(var i = 0; i < order.length; i++){
      var box = applyPos(tag, seat, dx, dy, r, order[i], 0);
      var score = collisions(box) + (inside(box) ? 0 : 100);
      if(!best || score < best.score) best = { pos:order[i], score:score, extra:0 };
      if(score === 0) break;
    }
    /* Ни одна из четырёх сторон не свободна целиком — на густых участках
       поля (несколько партий рядом) так и бывает. Прежде чем смириться
       с пересечением, пробуем отодвинуть выбранную сторону дальше от
       точки: строка мандатов чаще всего перекрывает подпись соседа
       именно потому, что стоит впритык, а не потому, что рядом вообще
       нет свободного места. */
    if(best.score > 0){
      for(var step = 10; step <= 40; step += 10){
        var box2 = applyPos(tag, seat, dx, dy, r, best.pos, step);
        var score2 = collisions(box2) + (inside(box2) ? 0 : 100);
        if(score2 < best.score){
          best = { pos:best.pos, score:score2, extra:step };
          if(score2 === 0) break;
        }
      }
    }
    return applyPos(tag, seat, dx, dy, r, best.pos, best.extra);
  }

  /* ---------- статичная подложка ---------- */
  function drawDefs(){
    defs = el("defs");
    /* Подсветка квадрантов: два стопа на площади в четверть поля дают
       заметное кольцо там, где градиент упирается в край. Промежуточные
       стопы приближают кривую ease-out, и заливка гаснет незаметно. */
    var QUAD_STOPS = [
      { at:"0%",   o:".20" }, { at:"38%", o:".13" },
      { at:"64%",  o:".075" }, { at:"84%", o:".045" }, { at:"100%", o:".03" }
    ];
    /* Оттенки квадрантов до 1.6 были набором «красный, фиолетовый,
       голубой, жёлтый» без внутренней логики. Теперь цвет следует за
       смыслом четверти и читается парами: верх — принуждение (тёплые
       тона), низ — свобода (холодные); слева плановая экономика,
       справа рыночная. */
    [{ id:"gq1", c:"#d9534f" },   /* лево + государство */
     { id:"gq2", c:"#d99a3f" },   /* право + государство */
     { id:"gq3", c:"#4e9e72" },   /* лево + свобода */
     { id:"gq4", c:"#5b86d6" }    /* право + свобода */
    ].forEach(function(q){
      var g = el("radialGradient", { id:q.id });
      QUAD_STOPS.forEach(function(s){
        g.appendChild(el("stop", { offset:s.at, "stop-color":q.c, "stop-opacity":s.o }));
      });
      defs.appendChild(g);
    });
    var glow = el("filter", { id:"glow", x:"-60%", y:"-60%", width:"220%", height:"220%" });
    glow.appendChild(el("feGaussianBlur", { stdDeviation:"5", result:"b" }));
    var merge = el("feMerge");
    merge.appendChild(el("feMergeNode", { in:"b" }));
    merge.appendChild(el("feMergeNode", { in:"SourceGraphic" }));
    glow.appendChild(merge);
    defs.appendChild(glow);
    svg.appendChild(defs);
  }

  function drawBoard(){
    var H = C - PAD;
    [[PAD, PAD, "gq1"], [C, PAD, "gq2"], [PAD, C, "gq3"], [C, C, "gq4"]].forEach(function(r){
      svg.appendChild(el("rect", { class:"quad", x:r[0], y:r[1], width:H, height:H, fill:"url(#" + r[2] + ")" }));
    });

    var board = el("g");
    for(var v = -10; v <= 10; v++){
      if(!v) continue;
      var p = px(v, v), cls = (v % 5 === 0) ? "grid-major" : "grid-minor";
      board.appendChild(el("line", { class:cls, x1:p.sx, y1:PAD, x2:p.sx, y2:SIZE - PAD }));
      board.appendChild(el("line", { class:cls, x1:PAD, y1:p.sy, x2:SIZE - PAD, y2:p.sy }));
    }
    board.appendChild(el("line", { class:"axis", x1:PAD, y1:C, x2:SIZE - PAD, y2:C }));
    board.appendChild(el("line", { class:"axis", x1:C, y1:PAD, x2:C, y2:SIZE - PAD }));
    board.appendChild(el("rect", { class:"frame", x:PAD, y:PAD, width:SIZE - 2 * PAD, height:SIZE - 2 * PAD, rx:14 }));
    board.appendChild(el("circle", { class:"origin", cx:C, cy:C, r:3.2 }));
    svg.appendChild(board);

    [-10, -5, 5, 10].forEach(function(v){
      var p = px(v, v), label = v > 0 ? "+" + v : String(v);
      svg.appendChild(el("text", { x:p.sx, y:SIZE - PAD + 16, class:"tick", "text-anchor":"middle" }, label));
      svg.appendChild(el("text", { x:PAD - 9, y:p.sy + 3.2, class:"tick", "text-anchor":"end" }, label));
    });
  }

  function drawCaptions(){
    svg.appendChild(el("text", { x:C, y:PAD - 30, class:"axis-cap", "text-anchor":"middle" },
      t("cap.top")));
    svg.appendChild(el("text", { x:C, y:SIZE - PAD + 42, class:"axis-cap", "text-anchor":"middle" },
      t("cap.bottom")));
    svg.appendChild(el("text", { class:"axis-cap", "text-anchor":"middle", x:PAD - 40, y:C + 4,
      transform:"rotate(-90 " + (PAD - 40) + " " + C + ")" }, t("cap.left")));
    svg.appendChild(el("text", { class:"axis-cap", "text-anchor":"middle", x:SIZE - PAD + 40, y:C + 4,
      transform:"rotate(90 " + (SIZE - PAD + 40) + " " + C + ")" }, t("cap.right")));

    obstacles = [
      /* повёрнутые подписи осей: getBBox отдаёт размеры до поворота,
         поэтому их зоны задаём вручную */
      { x1:PAD - 54, y1:PAD, x2:PAD - 26, y2:SIZE - PAD },
      { x1:SIZE - PAD + 26, y1:PAD, x2:SIZE - PAD + 54, y2:SIZE - PAD }
    ];
    svg.querySelectorAll(".axis-cap").forEach(function(t){
      if(!t.getAttribute("transform")) obstacles.push(rectOf(t, 0, 0, 5));
    });

    [{ x:PAD + 16,        y:PAD + 22,        t:t("quad.lt"), a:"start" },
     { x:SIZE - PAD - 16, y:PAD + 22,        t:t("quad.rt"), a:"end" },
     { x:PAD + 16,        y:SIZE - PAD - 16, t:t("quad.lb"), a:"start" },
     { x:SIZE - PAD - 16, y:SIZE - PAD - 16, t:t("quad.rb"), a:"end" }
    ].forEach(function(q){
      var t = el("text", { x:q.x, y:q.y, class:"quad-cap", "text-anchor":q.a }, q.t);
      svg.appendChild(t);
      obstacles.push(rectOf(t, 0, 0, 6));
    });
  }

  /* ---------- траектории партий во времени ---------- */
  /* Необязательный слой: ломаная от самой ранней известной позиции партии
     к нынешней, со стрелкой на конце. Рисуется под точками, чтобы не
     перекрывать их, и не участвует в раскладке подписей — линия тонкая,
     ярлыкам она не мешает, а вот считать её препятствием значило бы
     разогнать половину подписей на пустое место при выключенном слое.

     В 1.5 слой был честным, но нечитаемым: все маршруты рисовались в
     полную силу одновременно, восемь тонких пунктиров сходились в правом
     верхнем углу поля (там, где стоит половина партий) и превращались
     в штриховку, узлы радиусом 3.4 терялись под точками партий, а год
     был подписан только у первой точки — то есть направление движения
     приходилось угадывать.

     Исправлено тремя вещами, каждая из которых решает свою половину
     жалобы «перекрываются и мелкие»:

     1. Подложка. Под цветной линией лежит второй, более широкий штрих
        цветом фона поля. Там, где два маршрута пересекаются, верхний
        прорезает нижний, и глаз видит, какая линия идёт поверх, —
        приём из картографии, где так разводят дороги на развязках.
     2. Фокус. Наведение на маршрут или на точку партии приглушает все
        остальные маршруты. Восемь траекторий сразу читать невозможно
        и не нужно: вопрос у читателя всегда про одну партию.
     3. Масштаб. Узлы крупнее и с собственной обводкой, годы подписаны
        у первой и последней точки постоянно, у остальных — в фокусе.
        Порог растяжки короткого маршрута поднят: 46 экранных единиц
        едва превышали диаметр крупной точки, и «Единая Россия» с её
        пятью шагами внутри одного кружка выглядела кляксой. */
  function trailPath(pts, endR){
    var d = "M" + pts[0].sx.toFixed(1) + "," + pts[0].sy.toFixed(1);
    for(var i = 1; i < pts.length - 1; i++){
      d += " L" + pts[i].sx.toFixed(1) + "," + pts[i].sy.toFixed(1);
    }
    /* последний отрезок укорачиваем на радиус точки: иначе остриё стрелки
       уезжает под кружок партии и его не видно */
    var a = pts[pts.length - 2], b = pts[pts.length - 1];
    var vx = b.sx - a.sx, vy = b.sy - a.sy, len = Math.sqrt(vx * vx + vy * vy) || 1;
    var cut = Math.min(len - 1, endR + 7);
    return d + " L" + (b.sx - vx / len * cut).toFixed(1) + "," + (b.sy - vy / len * cut).toFixed(1);
  }

  function drawTrails(){
    trails = el("g", { "class":"trails" });
    svg.appendChild(trails);

    PC.PARTIES.forEach(function(p){
      var h = p.history;
      if(!h || h.length < 2) return;
      var seats = PC.seatsOf(p);
      if(seats === null) return;

      var pts = h.map(function(step){
        var c = px(step.x, step.y);
        return { sx:c.sx, sy:c.sy, step:step };
      });

      /* Партии с малоподвижной историей (КПРФ и подобные) укладывают все
         точки внутри пары соседних кружков — линия и узлы траектории тонут
         под сплошной заливкой точек и становятся неразличимы. Если самая
         дальняя историческая точка ближе порога к текущей позиции, весь
         маршрут веерно растягивается от текущей точки — форма и порядок
         остаются те же, только масштаб на глаз, а точные цифры остаются
         в подписи года при наведении. */
      var MIN_TRAIL_SPAN = 74;
      (function(){
        var last = pts[pts.length - 1];
        var maxD = 0;
        pts.forEach(function(pt){
          var dx = pt.sx - last.sx, dy = pt.sy - last.sy;
          maxD = Math.max(maxD, Math.sqrt(dx * dx + dy * dy));
        });
        if(maxD > 0 && maxD < MIN_TRAIL_SPAN){
          var k = MIN_TRAIL_SPAN / maxD;
          pts = pts.map(function(pt){
            if(pt === last) return pt;
            return { sx:last.sx + (pt.sx - last.sx) * k, sy:last.sy + (pt.sy - last.sy) * k, step:pt.step };
          });
        }
      })();

      var marker = el("marker", {
        id:"arw-" + p.id, viewBox:"0 0 10 10", refX:"9", refY:"5",
        markerWidth:"5", markerHeight:"5", orient:"auto", markerUnits:"strokeWidth"
      });
      marker.appendChild(el("path", { d:"M0 0.8 L10 5 L0 9.2 L2.6 5 Z", fill:p.color }));
      defs.appendChild(marker);

      var g = el("g", { "class":"trail", "data-id":p.id });
      var d = trailPath(pts, radius(seats));
      /* подложка идёт первой и цветом полотна: она не видна как линия,
         но выгрызает зазор вокруг маршрута там, где его пересекает
         чужой */
      g.appendChild(el("path", { "class":"trail-casing", d:d }));
      g.appendChild(el("path", {
        "class":"trail-line", d:d,
        stroke:p.color, "marker-end":"url(#arw-" + p.id + ")"
      }));

      /* Наведение на любую часть маршрута переводит весь слой в режим
         фокуса: CSS приглушает соседние траектории, а эта поднимается
         над ними. Класс вешается на сам слой, а не на документ, — на
         странице может не быть компаса вовсе. */
      function focusOn(){ trails.classList.add("has-focus"); g.classList.add("is-focus"); }
      function focusOff(){ trails.classList.remove("has-focus"); g.classList.remove("is-focus"); }
      g.addEventListener("mouseenter", focusOn);
      g.addEventListener("mouseleave", focusOff);

      /* узлы маршрута: год и объяснение сдвига по наведению */
      var last = pts.length - 1;
      pts.slice(0, -1).forEach(function(pt, i){
        var dot = el("circle", { "class":"trail-dot", cx:pt.sx, cy:pt.sy, r:4.6,
                                 fill:p.color, stroke:"var(--tag-halo)" });
        g.appendChild(dot);
        /* Год виден постоянно только у начала маршрута: он отвечает на
           вопрос «откуда», а «куда» показывает стрелка. Остальные годы
           проявляются в фокусе — пять подписей на маршрут, помноженные
           на восемь маршрутов, это сорок чисел поверх поля, на котором
           всего одиннадцать точек. */
        g.appendChild(el("text", {
          "class":"trail-year" + (i === 0 ? "" : " dim"),
          x:pt.sx, y:pt.sy - 10, "text-anchor":"middle"
        }, String(pt.step.year)));
        function enter(){
          focusOn();
          PC.tip.showHTML(
            '<div class="tip-top"><span class="tip-dot" style="background:' + U.esc(p.color) + '"></span>' +
            '<span class="tip-name">' + U.esc(L(p, "name")) + ' · ' + pt.step.year + '</span></div>' +
            '<div class="tip-ideo">' + U.esc(L(pt.step, "note")) + '</div>' +
            '<div class="tip-meta">' +
              '<span>' + U.esc(t("side.econ")) + ' <b>' + U.fmt(pt.step.x) + '</b></span>' +
              '<span>' + U.esc(t("side.state")) + ' <b>' + U.fmt(pt.step.y) + '</b></span>' +
            '</div>' +
            '<div class="tip-hint">' + U.esc(t("tip.trail", { x:U.fmt(p.x), y:U.fmt(p.y) })) + '</div>',
            pt.sx, pt.sy);
        }
        dot.addEventListener("mouseenter", enter);
        dot.addEventListener("mouseleave", function(){ PC.tip.hide(); focusOff(); });
      });

      /* год текущей позиции — у самой точки партии, чтобы у маршрута
         был виден не только старт, но и финиш */
      var end = pts[last];
      g.appendChild(el("text", {
        "class":"trail-year trail-year-end dim", x:end.sx, y:end.sy + radius(seats) + 15,
        "text-anchor":"middle"
      }, String(h[h.length - 1].year)));

      trails.appendChild(g);
    });

    svg.classList.toggle("show-trails", trailsOn);
  }

  /* Слой включается без перерисовки поля: ломаные уже построены,
     переключается только их видимость. */
  function setTrails(on){
    trailsOn = !!on;
    if(svg) svg.classList.toggle("show-trails", trailsOn);
    if(!trailsOn) PC.tip.hide();
  }
  function hasTrails(){
    return PC.PARTIES.some(function(p){ return p.history && p.history.length > 1; });
  }

  /* ---------- перекрестие от осей до точки ---------- */
  function showCross(sx, sy){
    var cx = cross.firstChild, cy = cross.lastChild;
    cx.setAttribute("x1", C);  cx.setAttribute("y1", sy); cx.setAttribute("x2", sx); cx.setAttribute("y2", sy);
    cy.setAttribute("x1", sx); cy.setAttribute("y1", C);  cy.setAttribute("x2", sx); cy.setAttribute("y2", sy);
    cross.classList.add("show");
  }
  function hideCross(){ if(cross) cross.classList.remove("show"); }

  /* ---------- точки партий ---------- */
  function drawNodes(){
    cross = el("g", { class:"cross" });
    cross.appendChild(el("line"));
    cross.appendChild(el("line"));
    svg.appendChild(cross);

    var layer = el("g");
    svg.appendChild(layer);

    /* сами точки — препятствия для чужих подписей; партии, отсутствующие
       в выбранном созыве, в отрисовке не участвуют */
    PC.PARTIES.forEach(function(p){
      var seats = PC.seatsOf(p);
      if(seats === null) return;
      var c = px(p.x, p.y), r = radius(seats) + 4;
      obstacles.push({ x1:c.sx - r, y1:c.sy - r, x2:c.sx + r, y2:c.sy + r });
    });

    /* крупные фракции раскладываем первыми — им достаются лучшие места */
    PC.PARTIES.map(function(p, i){ return { p:p, i:i, seats:PC.seatsOf(p) }; })
      .filter(function(item){ return item.seats !== null; })
      .sort(function(a, b){ return b.seats - a.seats; })
      .forEach(function(item){
        var p = item.p, seats = item.seats, c = px(p.x, p.y), r = radius(seats);
        var g = el("g", {
          "class":"node", "data-id":p.id, tabindex:"0", role:"button",
          "aria-label":L(p, "name") + ", " + U.seatsLabel(seats),
          transform:"translate(" + c.sx + "," + c.sy + ")"
        });
        g.appendChild(el("circle", { "class":"pulse", r:14, stroke:p.color }));
        g.appendChild(el("circle", { "class":"ring", r:r + 8, stroke:p.color }));
        g.appendChild(el("circle", { "class":"dot", r:0, fill:p.color, filter:"url(#glow)" }));

        var tag  = el("text", { "class":"tag" }, L(p, "tag"));
        /* «нет мандатов» на экране всплывает по наведению, а в экспортной
           картинке висела бы постоянно у половины партий — отмечаем такие
           строки классом, чтобы экспорт мог их скрыть */
        var seat = el("text", { "class":"seat" + (seats ? "" : " empty") }, U.seatsLabel(seats));
        g.appendChild(tag);
        g.appendChild(seat);
        layer.appendChild(g);

        obstacles.push(placeLabel(tag, seat, c.sx, c.sy, r, p.lp));

        /* Наведение на партию подсвечивает и её траекторию: вопрос
           «куда эта партия двигалась» задают, глядя на точку, а не на
           клубок пунктиров. */
        function focusTrail(on){
          if(!trails) return;
          var line = trails.querySelector('.trail[data-id="' + p.id + '"]');
          if(!line) return;
          trails.classList.toggle("has-focus", on);
          line.classList.toggle("is-focus", on);
        }
        function enter(){ PC.tip.show(p, c.sx, c.sy); showCross(c.sx, c.sy); focusTrail(true); }
        function leave(){ PC.tip.hide(); hideCross(); focusTrail(false); }
        g.addEventListener("mouseenter", enter);
        g.addEventListener("mouseleave", leave);
        g.addEventListener("focus", enter);
        g.addEventListener("blur", leave);
        g.addEventListener("click", function(){ PC.select(p.id); });
        g.addEventListener("keydown", function(e){
          if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
            e.preventDefault();
            PC.select(p.id);
          }
        });

        setTimeout(function(){
          g.classList.add("in");
          g.querySelector(".dot").setAttribute("r", r);
        }, 140 + item.i * 60);
      });

    drawUser(layer);
  }

  /* ---------- точка пользователя по результату теста ---------- */
  /* Рисуется последней: к этому моменту в obstacles уже лежат все партийные
     ярлыки, поэтому подпись «Вы» встаёт в свободное место, а не поверх них. */
  function drawUser(layer){
    var res = PC.quiz && PC.quiz.result();
    if(!res) return;

    var c = px(res.x, res.y), r = 9;
    var g = el("g", {
      "class":"node you", tabindex:"0", role:"button",
      "aria-label":t("node.youAria", { x:U.fmt(res.x), y:U.fmt(res.y) }),
      transform:"translate(" + c.sx + "," + c.sy + ")"
    });
    g.appendChild(el("circle", { "class":"you-halo", r:r + 9 }));
    g.appendChild(el("path", { "class":"you-mark",
      d:"M0 -11 L3.1 -3.6 L11 -3.4 L4.8 1.6 L7 9.2 L0 4.8 L-7 9.2 L-4.8 1.6 L-11 -3.4 L-3.1 -3.6 Z" }));
    var tag  = el("text", { "class":"tag" }, t("node.you"));
    var seat = el("text", { "class":"seat" }, t("node.youSeat"));
    g.appendChild(tag);
    g.appendChild(seat);
    layer.appendChild(g);
    obstacles.push(placeLabel(tag, seat, c.sx, c.sy, r, "top"));

    function enter(){
      var best = PC.quiz.ranking(res)[0];
      PC.tip.showHTML(
        '<div class="tip-top"><span class="tip-dot you"></span>' +
        '<span class="tip-name">' + U.esc(t("tip.you")) + '</span></div>' +
        '<div class="tip-ideo">' + U.esc(t("tip.youSub", { q:PC.quiz.quadrant(res.x, res.y) })) + '</div>' +
        '<div class="tip-meta">' +
          '<span>' + U.esc(t("side.econ")) + ' <b>' + U.fmt(res.x) + '</b></span>' +
          '<span>' + U.esc(t("side.state")) + ' <b>' + U.fmt(res.y) + '</b></span>' +
        '</div>' +
        '<div class="tip-hint">' + U.esc(t("tip.youBest", { name:L(best.p, "name"), m:best.match })) + '</div>',
        c.sx, c.sy);
      showCross(c.sx, c.sy);
    }
    function leave(){ PC.tip.hide(); hideCross(); }
    g.addEventListener("mouseenter", enter);
    g.addEventListener("mouseleave", leave);
    g.addEventListener("focus", enter);
    g.addEventListener("blur", leave);
    g.addEventListener("click", function(){ if(PC.nav) PC.nav.go("quiz"); });
    g.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
        e.preventDefault();
        if(PC.nav) PC.nav.go("quiz");
      }
    });

    setTimeout(function(){ g.classList.add("in"); }, 260);
  }

  function draw(){
    svg = document.getElementById("svg");
    svg.textContent = "";
    obstacles = [];
    /* Разметка ярлыков считается по getBBox() реального текста, а он у
       Chromium не масштабонезависим: на маленьком физическом размере SVG
       (узкий экран телефона) метрики глифов слегка съезжают и алгоритм
       расстановки может выбрать другую сторону, чем на десктопе, — вплоть
       до наезда на подпись квадранта. Поэтому на время построения раскладки
       временно растягиваем сам SVG до полного канонического размера
       (660×660, как в viewBox) за пределами экрана — расчёт получается
       одинаковым независимо от того, во сколько раз он потом отмасштабируется
       CSS для показа. */
    var prevStyle = svg.getAttribute("style");
    svg.style.cssText = "position:fixed;left:-9999px;top:0;width:" + SIZE + "px;height:" + SIZE + "px;visibility:hidden;";
    drawDefs();
    drawBoard();
    drawCaptions();
    drawTrails();
    drawNodes();
    if(prevStyle === null) svg.removeAttribute("style"); else svg.setAttribute("style", prevStyle);
  }

  /* Приводит точки в соответствие с фильтром и выбранной партией.
     Скрытые точки убираются и из порядка обхода Tab.
     Точка пользователя фильтрам не подчиняется — у неё нет data-id. */
  function syncNodes(visibleIds, activeId){
    svg.querySelectorAll(".node:not(.you)").forEach(function(n){
      var muted = !visibleIds.has(n.dataset.id);
      n.classList.toggle("muted", muted);
      n.classList.toggle("active", n.dataset.id === activeId);
      n.setAttribute("tabindex", muted ? "-1" : "0");
      n.setAttribute("aria-hidden", muted ? "true" : "false");
    });
    /* траектория живёт по тем же правилам, что и её точка */
    svg.querySelectorAll(".trail").forEach(function(t){
      t.classList.toggle("muted", !visibleIds.has(t.dataset.id));
      t.classList.toggle("active", t.dataset.id === activeId);
    });
  }

  /* Полная пересборка поля с последующей синхронизацией состояния —
     нужна, когда изменились сами данные отрисовки (результат теста,
     возврат на вкладку компаса, подмена веб-шрифта). Подписчик ставится
     из app.js, чтобы модуль компаса не знал про фильтры и выделение. */
  var drawListeners = [];
  function onDraw(fn){ drawListeners.push(fn); }
  function redraw(){
    if(!document.getElementById("svg")) return;
    draw();
    drawListeners.forEach(function(fn){ fn(); });
  }

  PC.compass = { draw:draw, redraw:redraw, onDraw:onDraw, syncNodes:syncNodes, hideCross:hideCross,
                 setTrails:setTrails, hasTrails:hasTrails,
                 trailsOn:function(){ return trailsOn; } };
})(window.PC = window.PC || {});
