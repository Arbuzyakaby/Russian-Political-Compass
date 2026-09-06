/* ============ Отрисовка компаса: сетка, оси, точки партий ============ */
(function(PC){
  "use strict";
  var G = PC.geom, U = PC.utils;
  var SIZE = G.SIZE, PAD = G.PAD, C = G.C, px = G.px, radius = G.radius, el = U.el;

  var svg, cross;
  var obstacles = [];          // занятые зоны: подписи осей, точки, уже размещённые ярлыки
  var LABEL_PAD = 3;

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

  function applyPos(tag, seat, dx, dy, r, pos){
    var o = OFFSETS[pos];
    var vertical = (pos === "top" || pos === "bottom");
    var x  = o.x === 0 ? 0 : (o.x < 0 ? o.x - r : o.x + r);
    var y  = vertical ? (o.y < 0 ? o.y - r : o.y + r) : o.y;
    var sy = vertical ? (o.seatY < 0 ? o.seatY - r : o.seatY + r) : o.seatY;

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
      var box = applyPos(tag, seat, dx, dy, r, order[i]);
      var score = collisions(box) + (inside(box) ? 0 : 100);
      if(!best || score < best.score) best = { pos:order[i], score:score };
      if(score === 0) break;
    }
    return applyPos(tag, seat, dx, dy, r, best.pos);
  }

  /* ---------- статичная подложка ---------- */
  function drawDefs(){
    var defs = el("defs");
    [{ id:"gq1", c:"#ef4444" }, { id:"gq2", c:"#a855f7" },
     { id:"gq3", c:"#38bdf8" }, { id:"gq4", c:"#fbbf24" }].forEach(function(q){
      var g = el("radialGradient", { id:q.id });
      g.appendChild(el("stop", { offset:"0%",   "stop-color":q.c, "stop-opacity":".20" }));
      g.appendChild(el("stop", { offset:"100%", "stop-color":q.c, "stop-opacity":".03" }));
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
      "АВТОРИТАРИЗМ · ЭТАТИЗМ"));
    svg.appendChild(el("text", { x:C, y:SIZE - PAD + 42, class:"axis-cap", "text-anchor":"middle" },
      "ЛИБЕРТАРИАНСТВО · СВОБОДА"));
    svg.appendChild(el("text", { class:"axis-cap", "text-anchor":"middle", x:PAD - 40, y:C + 4,
      transform:"rotate(-90 " + (PAD - 40) + " " + C + ")" }, "ЛЕВЫЕ · СОЦИАЛИЗМ"));
    svg.appendChild(el("text", { class:"axis-cap", "text-anchor":"middle", x:SIZE - PAD + 40, y:C + 4,
      transform:"rotate(90 " + (SIZE - PAD + 40) + " " + C + ")" }, "ПРАВЫЕ · РЫНОК"));

    obstacles = [
      /* повёрнутые подписи осей: getBBox отдаёт размеры до поворота,
         поэтому их зоны задаём вручную */
      { x1:PAD - 54, y1:PAD, x2:PAD - 26, y2:SIZE - PAD },
      { x1:SIZE - PAD + 26, y1:PAD, x2:SIZE - PAD + 54, y2:SIZE - PAD }
    ];
    svg.querySelectorAll(".axis-cap").forEach(function(t){
      if(!t.getAttribute("transform")) obstacles.push(rectOf(t, 0, 0, 5));
    });

    [{ x:PAD + 16,        y:PAD + 22,        t:"лево · государство",  a:"start" },
     { x:SIZE - PAD - 16, y:PAD + 22,        t:"право · государство", a:"end" },
     { x:PAD + 16,        y:SIZE - PAD - 16, t:"лево · свобода",      a:"start" },
     { x:SIZE - PAD - 16, y:SIZE - PAD - 16, t:"право · свобода",     a:"end" }
    ].forEach(function(q){
      var t = el("text", { x:q.x, y:q.y, class:"quad-cap", "text-anchor":q.a }, q.t);
      svg.appendChild(t);
      obstacles.push(rectOf(t, 0, 0, 6));
    });
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
          "aria-label":p.name + ", " + U.seatsLabel(seats),
          transform:"translate(" + c.sx + "," + c.sy + ")"
        });
        g.appendChild(el("circle", { "class":"pulse", r:14, stroke:p.color }));
        g.appendChild(el("circle", { "class":"ring", r:r + 8, stroke:p.color }));
        g.appendChild(el("circle", { "class":"dot", r:0, fill:p.color, filter:"url(#glow)" }));

        var tag  = el("text", { "class":"tag" }, p.tag);
        var seat = el("text", { "class":"seat" }, U.seatsLabel(seats));
        g.appendChild(tag);
        g.appendChild(seat);
        layer.appendChild(g);

        obstacles.push(placeLabel(tag, seat, c.sx, c.sy, r, p.lp));

        function enter(){ PC.tip.show(p, c.sx, c.sy); showCross(c.sx, c.sy); }
        function leave(){ PC.tip.hide(); hideCross(); }
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
  }

  function draw(){
    svg = document.getElementById("svg");
    svg.textContent = "";
    obstacles = [];
    drawDefs();
    drawBoard();
    drawCaptions();
    drawNodes();
  }

  /* Приводит точки в соответствие с фильтром и выбранной партией.
     Скрытые точки убираются и из порядка обхода Tab. */
  function syncNodes(visibleIds, activeId){
    svg.querySelectorAll(".node").forEach(function(n){
      var muted = !visibleIds.has(n.dataset.id);
      n.classList.toggle("muted", muted);
      n.classList.toggle("active", n.dataset.id === activeId);
      n.setAttribute("tabindex", muted ? "-1" : "0");
      n.setAttribute("aria-hidden", muted ? "true" : "false");
    });
  }

  PC.compass = { draw:draw, syncNodes:syncNodes, hideCross:hideCross };
})(window.PC = window.PC || {});
