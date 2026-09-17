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
  /* skip — препятствие, которое не считается конфликтом: это собственная
     зона точки, которой подпись и принадлежит. Без этого исключения
     подпись конфликтовала сама с собой: зона точки шире её радиуса на
     четыре пикселя, ярлык отступает от края на одиннадцать, а к его
     рамке прибавляется LABEL_PAD — и нижняя кромка ярлыка залезала в
     собственный кружок. Раскладчик честно видел конфликт и отодвигал
     подпись дальше, из-за чего почти все имена на поле стояли на
     тринадцать пикселей дальше, чем нужно, а ППД с её тесным углом
     уезжала на все двадцать шесть и висела в пустоте. */
  function collisions(a, skip){
    var n = 0;
    for(var i = 0; i < obstacles.length; i++){
      if(obstacles[i] === skip) continue;
      if(overlaps(a, obstacles[i])) n++;
    }
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

  /* Выбор места для подписи (переписано в 2.4.1).

     Раньше это были два прохода: сначала перебор четырёх сторон, потом,
     если ни одна не свободна, попытка отодвинуть выбранную сторону
     всё дальше — до сорока пикселей. Второй проход не сравнивал
     результат с другими сторонами, и получалось так: подпись ППД
     упиралась в зарезервированное место точки Каца, уезжала вверх на
     все сорок пикселей и повисала в пустоте отдельной надписью, хотя
     слева от точки было совершенно свободно.

     Теперь перебор один и по всей решётке «сторона × расстояние», а
     счёт учитывает и то, и другое: пересечение стоит дорого, выход за
     край поля — ещё дороже, а каждый пиксель удаления от точки стоит
     немного. Поэтому свободная соседняя сторона всегда выигрывает у
     далёкого отъезда по прежней, а отъезд остаётся в запасе на случай,
     когда заняты действительно все четыре. */
  var MAX_EXTRA = 26;

  function placeLabel(tag, seat, dx, dy, r, preferred, own){
    var order = [preferred, "top", "right", "left", "bottom"].filter(function(v, i, arr){
      return OFFSETS[v] && arr.indexOf(v) === i;
    });
    var best = null;
    for(var i = 0; i < order.length; i++){
      for(var extra = 0; extra <= MAX_EXTRA; extra += 13){
        var box = applyPos(tag, seat, dx, dy, r, order[i], extra);
        /* Предпочтительная сторона получает небольшую фору: при равном
           счёте подпись остаётся там, где её задумали данные партии. */
        var score = collisions(box, own) * 100 +
                    (inside(box) ? 0 : 1000) +
                    extra * 0.8 +
                    (i === 0 ? 0 : 1.5);
        if(!best || score < best.score) best = { pos:order[i], extra:extra, score:score };
        if(score === 0) break;
      }
      if(best && best.score === 0) break;
    }
    return { rect:applyPos(tag, seat, dx, dy, r, best.pos, best.extra),
             pos:best.pos, extra:best.extra };
  }

  /* Подпись, отодвинутую от точки, нужно к ней привязать: без поводка
     она читается как самостоятельная надпись на поле, а не как имя
     этого кружка. Линия рисуется только когда отрыв заметен. */
  function leaderLine(g, place, r, color){
    if(place.extra < 12) return;
    var o = OFFSETS[place.pos], vertical = (place.pos === "top" || place.pos === "bottom");
    var sign = (o.x < 0 || o.y < 0) ? -1 : 1;
    var from = sign * (r + 3);
    var to   = sign * (r + place.extra + (vertical ? 6 : 4));
    g.insertBefore(el("line", {
      "class":"tag-leader", stroke:color,
      x1:vertical ? 0 : from, y1:vertical ? from : 0,
      x2:vertical ? 0 : to,   y2:vertical ? to   : 0
    }), g.firstChild);
  }

  /* ---------- стеклянная подложка поля (2.4.1) ----------
     До 2.4.1 поле стояло на двух сдвинутых по диагонали слоях позади
     .plot (css/compass.css): стопка листов, которая читалась как тень
     и на светлых темах торчала из-под панели косым краем. Слои убраны
     целиком; вместо них поле само стало стеклянной плитой.

     Материал собран из четырёх вещей, и все четыре живут внутри SVG,
     чтобы экспорт получал их даром вместе с разметкой:
       1. плита  — скруглённый прямоугольник с вертикальным градиентом
                   от светлого верха к тёмному низу;
       2. линзы  — четыре квадранта, вставленные в плиту с зазором по
                   осям: не заливка углов, а четыре отдельных стекла,
                   между которыми видна сама ось;
       3. блик   — диагональная светлая полоса поверх всего, от левого
                   верхнего угла: то, что делает стекло стеклом;
       4. кромка — светлая линия по верху плиты, гаснущая к низу, плюс
                   внутреннее кольцо на полтора пикселя внутрь.

     Ничего не поворачивается и не наклоняется: плита лежит ровно, а
     глубину дают только градиенты. Цвета приходят из тем через
     CSS-переменные (css/compass.css), поэтому смена темы перекрашивает
     стекло без перерисовки поля. */

  /* Прямоугольник со скруглением, разным у каждого угла. Нужен линзам:
     внешние углы повторяют радиус плиты, внутренние — почти острые,
     иначе четыре стекла не сходятся к центру, а расползаются. */
  function roundRect(x, y, w, h, tl, tr, br, bl){
    return "M" + (x + tl) + "," + y +
           "H" + (x + w - tr) + "A" + tr + "," + tr + " 0 0 1 " + (x + w) + "," + (y + tr) +
           "V" + (y + h - br) + "A" + br + "," + br + " 0 0 1 " + (x + w - br) + "," + (y + h) +
           "H" + (x + bl) + "A" + bl + "," + bl + " 0 0 1 " + x + "," + (y + h - bl) +
           "V" + (y + tl) + "A" + tl + "," + tl + " 0 0 1 " + (x + tl) + "," + y + "Z";
  }

  var PLATE_R = 26;     /* радиус углов плиты */
  var LENS_GAP = 3;     /* зазор линзы от оси — сквозь него видно саму ось */
  var LENS_R = 7;       /* радиус внутренних углов линзы */

  function drawDefs(){
    defs = el("defs");

    /* Подсветка квадрантов. Оттенки следуют за смыслом четверти и
       читаются парами: верх — принуждение (тёплые тона), низ — свобода
       (холодные); слева плановая экономика, справа рыночная. С 2.4.1
       градиент бьёт из внешнего угла поля, а не из угла у центра: у
       линзы должен быть свой источник света, и он приходит снаружи. */
    var QUAD_STOPS = [
      { at:"0%",   o:".22" }, { at:"40%",  o:".13" },
      { at:"68%",  o:".07" }, { at:"100%", o:".025" }
    ];
    [{ id:"gq1", c:"#d9534f", fx:"0%",   fy:"0%" },    /* лево + государство */
     { id:"gq2", c:"#d99a3f", fx:"100%", fy:"0%" },    /* право + государство */
     { id:"gq3", c:"#4e9e72", fx:"0%",   fy:"100%" },  /* лево + свобода */
     { id:"gq4", c:"#5b86d6", fx:"100%", fy:"100%" }   /* право + свобода */
    ].forEach(function(q){
      var g = el("radialGradient", { id:q.id, cx:q.fx, cy:q.fy, r:"118%" });
      QUAD_STOPS.forEach(function(st){
        g.appendChild(el("stop", { offset:st.at, "stop-color":q.c, "stop-opacity":st.o }));
      });
      defs.appendChild(g);
    });

    /* Тело плиты: светлее сверху, темнее снизу. Цвета стопов приходят
       классом, а не атрибутом, поэтому переключение темы перекрашивает
       стекло само, без перерисовки поля. */
    var plate = el("linearGradient", { id:"glassPlate", x1:"0", y1:"0", x2:"0", y2:"1" });
    plate.appendChild(el("stop", { offset:"0%",   "class":"gs-plate-hi" }));
    plate.appendChild(el("stop", { offset:"52%",  "class":"gs-plate-mid" }));
    plate.appendChild(el("stop", { offset:"100%", "class":"gs-plate-lo" }));
    defs.appendChild(plate);

    /* Кромка: яркая по верху, почти пропадает к низу — так ведёт себя
       световой блик на торце настоящего стекла. */
    var rim = el("linearGradient", { id:"glassRim", x1:"0", y1:"0", x2:"0.35", y2:"1" });
    rim.appendChild(el("stop", { offset:"0%",   "class":"gs-rim-hi" }));
    rim.appendChild(el("stop", { offset:"45%",  "class":"gs-rim-mid" }));
    rim.appendChild(el("stop", { offset:"100%", "class":"gs-rim-lo" }));
    defs.appendChild(rim);

    /* Диагональный блик. Узкая светлая полоса в верхней левой трети —
       единственное, что на плите не симметрично, и именно поэтому она
       читается как стекло, а не как крашеный прямоугольник. */
    var sheen = el("linearGradient", { id:"glassSheen", x1:"0", y1:"0", x2:"0.9", y2:"1" });
    sheen.appendChild(el("stop", { offset:"0%",   "class":"gs-sheen-a" }));
    sheen.appendChild(el("stop", { offset:"26%",  "class":"gs-sheen-b" }));
    sheen.appendChild(el("stop", { offset:"46%",  "class":"gs-sheen-c" }));
    sheen.appendChild(el("stop", { offset:"100%", "class":"gs-sheen-c" }));
    defs.appendChild(sheen);

    /* Сетка и заливки не должны вылезать за скругление плиты. */
    var clip = el("clipPath", { id:"plateClip" });
    clip.appendChild(el("path", {
      d:roundRect(PAD, PAD, SIZE - 2 * PAD, SIZE - 2 * PAD, PLATE_R, PLATE_R, PLATE_R, PLATE_R)
    }));
    defs.appendChild(clip);

    var glow = el("filter", { id:"glow", x:"-60%", y:"-60%", width:"220%", height:"220%" });
    glow.appendChild(el("feGaussianBlur", { stdDeviation:"5", result:"b" }));
    var merge = el("feMerge");
    merge.appendChild(el("feMergeNode", { in:"b" }));
    merge.appendChild(el("feMergeNode", { in:"SourceGraphic" }));
    glow.appendChild(merge);
    defs.appendChild(glow);

    /* Мягкая тень под плитой: стекло должно висеть над карточкой, а не
       лежать на ней. Один фильтр на всё поле, а не тень у каждой линзы. */
    var drop = el("filter", { id:"plateShadow", x:"-20%", y:"-20%", width:"140%", height:"150%" });
    drop.appendChild(el("feDropShadow", {
      dx:"0", dy:"10", stdDeviation:"14", "flood-color":"#000", "flood-opacity":"0.18"
    }));
    defs.appendChild(drop);

    svg.appendChild(defs);
  }

  function drawBoard(){
    var W = SIZE - 2 * PAD;
    var half = C - PAD;                    /* сторона квадранта до оси */
    var lens = half - LENS_GAP;            /* сторона линзы после зазора */

    var plate = el("g", { "class":"plate" });
    svg.appendChild(plate);

    /* 1. тело плиты */
    plate.appendChild(el("path", {
      "class":"plate-body",
      d:roundRect(PAD, PAD, W, W, PLATE_R, PLATE_R, PLATE_R, PLATE_R),
      fill:"url(#glassPlate)", filter:"url(#plateShadow)"
    }));

    /* 2. четыре линзы. Внешний угол каждой повторяет угол плиты,
       остальные три почти острые — стекло вставлено в раму, а не
       нарисовано поверх неё. */
    [{ x:PAD,          y:PAD,          g:"gq1", r:[PLATE_R - LENS_GAP, LENS_R, LENS_R, LENS_R] },
     { x:C + LENS_GAP, y:PAD,          g:"gq2", r:[LENS_R, PLATE_R - LENS_GAP, LENS_R, LENS_R] },
     { x:PAD,          y:C + LENS_GAP, g:"gq3", r:[LENS_R, LENS_R, LENS_R, PLATE_R - LENS_GAP] },
     { x:C + LENS_GAP, y:C + LENS_GAP, g:"gq4", r:[LENS_R, LENS_R, PLATE_R - LENS_GAP, LENS_R] }
    ].forEach(function(q){
      var d = roundRect(q.x, q.y, lens, lens, q.r[0], q.r[1], q.r[2], q.r[3]);
      plate.appendChild(el("path", { "class":"quad", d:d, fill:"url(#" + q.g + ")" }));
      plate.appendChild(el("path", { "class":"lens-rim", d:d }));
    });

    /* 3. сетка и оси — внутри плиты, обрезаны по её скруглению */
    var board = el("g", { "clip-path":"url(#plateClip)" });
    for(var v = -10; v <= 10; v++){
      if(!v) continue;
      var pt = px(v, v), cls = (v % 5 === 0) ? "grid-major" : "grid-minor";
      board.appendChild(el("line", { class:cls, x1:pt.sx, y1:PAD, x2:pt.sx, y2:SIZE - PAD }));
      board.appendChild(el("line", { class:cls, x1:PAD, y1:pt.sy, x2:SIZE - PAD, y2:pt.sy }));
    }
    board.appendChild(el("line", { class:"axis", x1:PAD, y1:C, x2:SIZE - PAD, y2:C }));
    board.appendChild(el("line", { class:"axis", x1:C, y1:PAD, x2:C, y2:SIZE - PAD }));
    board.appendChild(el("circle", { class:"origin", cx:C, cy:C, r:3.2 }));
    svg.appendChild(board);

    /* 4. блик и кромка — поверх содержимого плиты, но под точками */
    svg.appendChild(el("path", {
      "class":"plate-sheen",
      d:roundRect(PAD, PAD, W, W, PLATE_R, PLATE_R, PLATE_R, PLATE_R),
      fill:"url(#glassSheen)"
    }));
    svg.appendChild(el("path", {
      "class":"frame",
      d:roundRect(PAD, PAD, W, W, PLATE_R, PLATE_R, PLATE_R, PLATE_R),
      stroke:"url(#glassRim)"
    }));
    svg.appendChild(el("path", {
      "class":"frame-inner",
      d:roundRect(PAD + 1.5, PAD + 1.5, W - 3, W - 3,
                  PLATE_R - 1.5, PLATE_R - 1.5, PLATE_R - 1.5, PLATE_R - 1.5)
    }));

    [-10, -5, 5, 10].forEach(function(v){
      var pt = px(v, v), label = v > 0 ? "+" + v : String(v);
      svg.appendChild(el("text", { x:pt.sx, y:SIZE - PAD + 16, class:"tick", "text-anchor":"middle" }, label));
      svg.appendChild(el("text", { x:PAD - 9, y:pt.sy + 3.2, class:"tick", "text-anchor":"end" }, label));
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

  /* ---------- траектории партий во времени (переписано в 2.4.1) ----------

     Необязательный слой: путь партии от самой ранней известной позиции
     к нынешней. Что было не так со старой версией и почему она
     переписана целиком, а не подлатана:

     1. Она врала. Партии с малоподвижной историей (КПРФ, «Единая
        Россия») укладывали все точки внутри пары соседних кружков, и
        прежний код растягивал такой маршрут веером от текущей точки —
        то есть рисовал исторические позиции не там, где они были.
        Проект, который в каждой карточке объясняет, откуда взялась
        координата, не может подменять координаты ради картинки.
        Растяжки больше нет: все узлы стоят ровно на своих числах.
     2. Направление читалось только по стрелке в конце, а стрелка
        требовала своего <marker> в defs на каждую партию — одиннадцать
        определений ради одиннадцати треугольников.
     3. Сорок годов поверх поля. Годы были подписаны текстом прямо на
        маршруте: пять на партию, помноженные на восемь маршрутов,
        на поле, где всего одиннадцать точек.

     Что вместо этого:

     - Путь идёт гладкой кривой (Катмулл-Ром, переведённый в кубические
       Безье), а не ломаной: движение партии — процесс, и угловатая
       ломаная приписывала ему рывки, которых в данных нет.
     - Толщина линии растёт от прошлого к настоящему. Это и есть замена
       стрелке: у «кометного хвоста» направление видно в любой точке
       маршрута, а не только на конце, и читается даже когда маршрут
       короткий. Заодно исчезли одиннадцать маркеров из defs.
     - Узлы тоже растут к настоящему, и год показывает подсказка при
       наведении, а не текст на поле. Поле снова чистое.
     - Короткий маршрут больше не надувается, а честно остаётся
       коротким: «партия почти не двигалась» — это факт о партии, и
       показывать его нужно, а не прятать.
     - Пока курсор на маршруте, весь слой поднимается над точками
       (raiseTrails): иначе короткий путь оказывается под собственной
       точкой партии и его не видно вовсе. Порядок восстанавливается,
       как только фокус снят. */

  /* Гладкая кривая через все точки. Катмулл-Ром с натяжением 0.5:
     кривая проходит ровно через узлы (в отличие от B-сплайна) и не
     даёт выбросов на резких поворотах (в отличие от натяжения 1). */
  function smoothPath(pts){
    if(pts.length < 2) return "";
    if(pts.length === 2){
      return "M" + f(pts[0].sx) + "," + f(pts[0].sy) + "L" + f(pts[1].sx) + "," + f(pts[1].sy);
    }
    var d = "M" + f(pts[0].sx) + "," + f(pts[0].sy);
    for(var i = 0; i < pts.length - 1; i++){
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
      d += "C" + f(p1.sx + (p2.sx - p0.sx) / 6) + "," + f(p1.sy + (p2.sy - p0.sy) / 6) +
           " " + f(p2.sx - (p3.sx - p1.sx) / 6) + "," + f(p2.sy - (p3.sy - p1.sy) / 6) +
           " " + f(p2.sx) + "," + f(p2.sy);
    }
    return d;
  }
  function f(v){ return Math.round(v * 10) / 10; }

  /* Слой траекторий выше точек, пока один из маршрутов в фокусе.
     В SVG порядок рисования задаётся порядком в документе, и z-index
     на него не действует, — поэтому слой переставляется, а не
     перекрашивается. */
  var nodesLayer = null;
  function raiseTrails(on){
    if(!trails || !trails.parentNode) return;
    if(on) svg.appendChild(trails);
    else if(nodesLayer) svg.insertBefore(trails, nodesLayer);
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

      var g = el("g", { "class":"trail", "data-id":p.id });

      /* Путь — не одна линия, а цепочка отрезков нарастающей толщины и
         плотности: это и есть замена стрелке, направление видно в любой
         точке маршрута. Каждый отрезок рисуется по общей кривой и
         показывается только на своём куске (обрезка segmentBand),
         поэтому стыки не толстеют вдвое, а сама кривая остаётся гладкой.

         Под каждым отрезком идёт своя подложка цветом полотна, шире его
         ровно на два с половиной пикселя: там, где два маршрута
         пересекаются, верхний прорезает нижний, и видно, какой идёт
         поверх, — приём из картографии, где так разводят развязки.
         Одна подложка на весь путь не подошла бы: под тонким началом
         маршрута она читалась бы как отдельная широкая серая лента. */
      var N = pts.length - 1;
      var casing = el("g", { "class":"trail-casings" });
      var lines  = el("g");
      g.appendChild(casing);
      g.appendChild(lines);

      for(var i = 0; i < N; i++){
        var seg = smoothPath(pts.slice(Math.max(0, i - 1), Math.min(pts.length, i + 3)));
        var k = N === 1 ? 1 : i / (N - 1);        /* 0 — самый старый отрезок */
        var w = 1.6 + k * 2.4;
        var clip = "url(#trailSeg-" + p.id + "-" + i + ")";
        casing.appendChild(el("path", {
          "class":"trail-casing", d:seg,
          "stroke-width":(w + 2.6).toFixed(2), "clip-path":clip
        }));
        lines.appendChild(el("path", {
          "class":"trail-seg", d:seg, stroke:p.color,
          "stroke-width":w.toFixed(2),
          opacity:(0.5 + k * 0.5).toFixed(2),
          "clip-path":clip
        }));
        var cp = el("clipPath", { id:"trailSeg-" + p.id + "-" + i, clipPathUnits:"userSpaceOnUse" });
        cp.appendChild(el("path", { d:segmentBand(pts, i) }));
        defs.appendChild(cp);
      }

      /* Узлы: чем ближе к сегодняшнему дню, тем крупнее и плотнее. */
      pts.forEach(function(pt, i){
        var k = i / (pts.length - 1);
        var last = i === pts.length - 1;
        if(last) return;                 /* финиш — это сама точка партии */
        var dot = el("circle", {
          "class":"trail-dot", cx:f(pt.sx), cy:f(pt.sy),
          r:(2.6 + k * 1.8).toFixed(2), fill:p.color,
          opacity:(0.55 + k * 0.4).toFixed(2)
        });
        g.appendChild(dot);
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

      /* Наведение на любую часть маршрута переводит весь слой в режим
         фокуса: CSS приглушает соседние траектории, а эта поднимается
         над точками. Класс вешается на сам слой, а не на документ, —
         на странице может не быть компаса вовсе. */
      function focusOn(){
        trails.classList.add("has-focus");
        g.classList.add("is-focus");
        raiseTrails(true);
      }
      function focusOff(){
        trails.classList.remove("has-focus");
        g.classList.remove("is-focus");
        raiseTrails(false);
      }
      g.addEventListener("mouseenter", focusOn);
      g.addEventListener("mouseleave", focusOff);

      trails.appendChild(g);
    });

    svg.classList.toggle("show-trails", trailsOn);
  }

  /* Полоса вокруг i-го отрезка ломаной: прямоугольник по направлению
     отрезка, расширенный настолько, чтобы гладкая кривая на этом куске
     заведомо в него попала. Служит обрезкой для отрезка переменной
     толщины — см. комментарий в drawTrails. */
  function segmentBand(pts, i){
    var a = pts[i], b = pts[i + 1];
    var vx = b.sx - a.sx, vy = b.sy - a.sy;
    var len = Math.sqrt(vx * vx + vy * vy) || 1;
    var ux = vx / len, uy = vy / len;          /* вдоль отрезка */
    var nx = -uy, ny = ux;                     /* поперёк */
    var W = 26;                                /* запас на прогиб кривой */
    var head = (i === pts.length - 2) ? 0 : 0.5;   /* стык делим пополам */
    var tail = (i === 0) ? 0 : 0.5;
    var x1 = a.sx - ux * tail, y1 = a.sy - uy * tail;
    var x2 = b.sx + ux * head, y2 = b.sy + uy * head;
    return "M" + f(x1 + nx * W) + "," + f(y1 + ny * W) +
           "L" + f(x2 + nx * W) + "," + f(y2 + ny * W) +
           "L" + f(x2 - nx * W) + "," + f(y2 - ny * W) +
           "L" + f(x1 - nx * W) + "," + f(y1 - ny * W) + "Z";
  }

  /* Слой включается без перерисовки поля: кривые уже построены,
     переключается только их видимость. */
  function setTrails(on){
    trailsOn = !!on;
    if(svg) svg.classList.toggle("show-trails", trailsOn);
    if(!trailsOn){ PC.tip.hide(); raiseTrails(false); }
  }
  function hasTrails(){
    return PC.PARTIES.some(function(p){ return p.history && p.history.length > 1; });
  }

  /* ---------- перекрестие от осей до точки (переписано в 2.4.1) ----------
     Раньше это были две серые пунктирные линии с бесконечно ползущим
     штрихом, покрашенные в currentColor, то есть в цвет текста: ни к
     какой точке они не относились, а на людях, чьи печати стоят у
     самого края поля, читались как случайные полосы поперёк квадранта.

     Теперь перекрестие принадлежит точке: линии красятся её цветом,
     на осях появляются засечки в тех местах, куда точка проецируется,
     и рядом с каждой засечкой — само число. Это и есть ответ на
     вопрос, ради которого на точку наводятся: «а сколько именно?».
     Ползущий штрих убран — он тянул взгляд на себя, хотя перекрестие
     живёт на экране полторы секунды. */
  var crossParts = null;
  function buildCross(){
    cross = el("g", { "class":"cross" });
    crossParts = {
      h:    cross.appendChild(el("line", { "class":"cross-line" })),
      v:    cross.appendChild(el("line", { "class":"cross-line" })),
      tickX:cross.appendChild(el("circle", { "class":"cross-tick", r:2.8 })),
      tickY:cross.appendChild(el("circle", { "class":"cross-tick", r:2.8 })),
      valX: cross.appendChild(el("text", { "class":"cross-val", "text-anchor":"middle" })),
      valY: cross.appendChild(el("text", { "class":"cross-val", "text-anchor":"middle" }))
    };
    svg.appendChild(cross);
  }

  function showCross(sx, sy, color, x, y){
    if(!crossParts) return;
    var P = crossParts;
    /* Горизонталь идёт от вертикальной оси к точке, вертикаль — от
       горизонтальной: каждая линия показывает вклад своей координаты. */
    P.h.setAttribute("x1", C);  P.h.setAttribute("y1", sy);
    P.h.setAttribute("x2", sx); P.h.setAttribute("y2", sy);
    P.v.setAttribute("x1", sx); P.v.setAttribute("y1", C);
    P.v.setAttribute("x2", sx); P.v.setAttribute("y2", sy);

    P.tickX.setAttribute("cx", sx); P.tickX.setAttribute("cy", C);
    P.tickY.setAttribute("cx", C);  P.tickY.setAttribute("cy", sy);

    /* Подпись отодвигается от оси в ту сторону, где стоит точка, —
       иначе на точках у самого центра число ложится на саму ось. */
    P.valX.setAttribute("x", sx);
    P.valX.setAttribute("y", C + (sy > C ? 15 : -8));
    P.valX.textContent = U.fmt(x);
    P.valY.setAttribute("x", C + (sx > C ? -20 : 20));
    P.valY.setAttribute("y", sy + 3.4);
    P.valY.textContent = U.fmt(y);

    cross.style.color = color || "";
    cross.classList.add("show");
  }
  function hideCross(){ if(cross) cross.classList.remove("show"); }

  /* ---------- точки партий ---------- */
  function drawNodes(){
    var layer = el("g", { "class":"nodes" });
    svg.appendChild(layer);
    nodesLayer = layer;
    /* Перекрестие строится после слоя точек: оно должно лежать поверх
       сетки и стекла, но под самими точками — иначе линия перечёркивает
       кружок, к которому относится. */
    buildCross();
    svg.insertBefore(cross, layer);

    /* сами точки — препятствия для чужих подписей; партии, отсутствующие
       в выбранном созыве, в отрисовке не участвуют */
    var ownBox = {};
    PC.PARTIES.forEach(function(p){
      var seats = PC.seatsOf(p);
      if(seats === null) return;
      var c = px(p.x, p.y), r = radius(seats) + 4;
      ownBox[p.id] = { x1:c.sx - r, y1:c.sy - r, x2:c.sx + r, y2:c.sy + r };
      obstacles.push(ownBox[p.id]);
    });

    /* точки людей и результата теста рисуются позже (drawPeople/drawUser),
       но их место на поле известно заранее — резервируем его здесь же,
       иначе подпись партии, отрисованная раньше, может лечь прямо на
       эти точки: в языках с более длинными названиями партий (например,
       в английской версии, "United Russia" длиннее «Единой России»)
       это было заметно как наезд текста на печать человека */
    (PC.PEOPLE || []).forEach(function(person){
      var pc = px(person.x, person.y), pr = 19 + 4;
      ownBox[person.id] = { x1:pc.sx - pr, y1:pc.sy - pr, x2:pc.sx + pr, y2:pc.sy + pr };
      obstacles.push(ownBox[person.id]);
    });
    var userRes = PC.quiz && PC.quiz.result();
    if(userRes){
      var uc = px(userRes.x, userRes.y), ur = 9 + 4;
      ownBox.you = { x1:uc.sx - ur, y1:uc.sy - ur, x2:uc.sx + ur, y2:uc.sy + ur };
      obstacles.push(ownBox.you);
    }

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

        var place = placeLabel(tag, seat, c.sx, c.sy, r, p.lp, ownBox[p.id]);
        leaderLine(g, place, r, p.color);
        obstacles.push(place.rect);

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
        function enter(){ PC.tip.show(p, c.sx, c.sy); showCross(c.sx, c.sy, p.color, p.x, p.y); focusTrail(true); }
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

    drawPeople(layer, ownBox);
    drawUser(layer, ownBox.you);
  }

  /* ---------- точки людей (2.3.2, обобщено в 2.4) ----------
     Не партии, а отдельные фигуры: своя форма (печать вместо кружка),
     свой цвет и своя карточка — PC.people.open(id), а не PC.select(),
     потому что общая карточка партии ждёт мандаты и голосования,
     которых здесь нет. Данные и разбор — js/data-people.js.

     До 2.4 здесь была функция под одного человека и один путь-константа.
     Теперь путей столько, сколько форм печатей, а сама отрисовка —
     обычный обход PC.PEOPLE: четвёртый человек появится на поле сам,
     как только появится в данных. */
  var SEALS = {
    /* Шестиугольник — печать: замкнутая форма с плоскими гранями,
       так рисуют штампы и гербовые оттиски. */
    hex:   "M0,-12 L10.4,-6 L10.4,6 L0,12 L-10.4,6 L-10.4,-6 Z",
    /* Ромб — поставленный на угол квадрат: самая «беспокойная» из трёх
       фигур, читается как метка на карте, а не как оттиск. */
    rhomb: "M0,-13 L13,0 L0,13 L-13,0 Z",
    /* Щит — единственная форма с кривой: низ скругляется, верх остаётся
       прямым, и на фоне двух угловатых печатей она узнаётся мгновенно. */
    shield:"M0,-12.4 L11,-8.4 L11,2.6 C11,8.8 6.2,12.2 0,13.6 C-6.2,12.2 -11,8.8 -11,2.6 L-11,-8.4 Z"
  };
  function sealPath(key){ return SEALS[key] || SEALS.hex; }

  /* Та же геометрия в 24-пиксельной коробке — для значка в шапке
     карточки (js/people.js). Второй набор путей под ту же форму
     разошёлся бы с первым при первой же правке, поэтому здесь не
     новые координаты, а тот же путь со сдвигом в центр. */
  function sealSVG(key){
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
           '<g transform="translate(12,12) scale(0.86)"><path d="' + sealPath(key) + '"/></g></svg>';
  }

  function drawPeople(layer, ownBox){
    (PC.PEOPLE || []).forEach(function(p, i){ drawPerson(layer, p, i, ownBox[p.id]); });
  }

  function drawPerson(layer, p, index, own){
    var c = px(p.x, p.y);
    var g = el("g", {
      "class":"node person", "data-id":p.id, tabindex:"0", role:"button",
      "aria-label":L(p, "name") + ", " + L(p, "role"),
      transform:"translate(" + c.sx + "," + c.sy + ")"
    });
    g.appendChild(el("circle", { "class":"pulse", r:14, stroke:p.color }));
    g.appendChild(el("circle", { "class":"ring", r:19, stroke:p.color }));
    g.appendChild(el("path", { "class":"dot person-seal", d:sealPath(p.seal), fill:p.color, filter:"url(#glow)" }));
    g.appendChild(el("circle", { "class":"person-seal-core", r:3.6, fill:"var(--glass-bg-2)" }));

    var tag  = el("text", { "class":"tag" }, L(p, "short"));
    var seat = el("text", { "class":"seat" }, L(p, "badge"));
    g.appendChild(tag);
    g.appendChild(seat);
    layer.appendChild(g);
    var place = placeLabel(tag, seat, c.sx, c.sy, 13, p.lp || "right", own);
    leaderLine(g, place, 13, p.color);
    obstacles.push(place.rect);

    function enter(){
      PC.tip.showHTML(
        '<div class="tip-top"><span class="tip-dot" style="background:' + U.esc(p.color) + '"></span>' +
        '<span class="tip-name">' + U.esc(L(p, "name")) + '</span></div>' +
        '<div class="tip-ideo">' + U.esc(L(p, "role")) + ' · ' + U.esc(L(p, "badge")) + '</div>' +
        '<div class="tip-meta">' +
          '<span>' + U.esc(t("side.econ")) + ' <b>' + U.fmt(p.x) + '</b></span>' +
          '<span>' + U.esc(t("side.state")) + ' <b>' + U.fmt(p.y) + '</b></span>' +
        '</div>' +
        '<div class="tip-hint">' + U.esc(t("tip.person")) + '</div>',
        c.sx, c.sy);
      showCross(c.sx, c.sy, p.color, p.x, p.y);
    }
    function leave(){ PC.tip.hide(); hideCross(); }
    function open(){ if(PC.people) PC.people.open(p.id); }
    g.addEventListener("mouseenter", enter);
    g.addEventListener("mouseleave", leave);
    g.addEventListener("focus", enter);
    g.addEventListener("blur", leave);
    g.addEventListener("click", open);
    g.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " " || e.key === "Spacebar"){
        e.preventDefault();
        open();
      }
    });

    setTimeout(function(){ g.classList.add("in"); }, 200 + index * 70);
  }

  /* ---------- точка пользователя по результату теста ---------- */
  /* Рисуется последней: к этому моменту в obstacles уже лежат все партийные
     ярлыки, поэтому подпись «Вы» встаёт в свободное место, а не поверх них. */
  function drawUser(layer, own){
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
    var place = placeLabel(tag, seat, c.sx, c.sy, r, "top", own);
    leaderLine(g, place, r, "var(--accent)");
    obstacles.push(place.rect);

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
      showCross(c.sx, c.sy, "var(--accent)", res.x, res.y);
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
    /* .you и .person не участвуют в фильтрах: у теста нет id в PC.PARTIES,
       у людей — своя карточка вместо PC.select, так что списку
       видимых id взяться неоткуда, а гасить точку как «не найдено
       фильтром» было бы неправдой. */
    svg.querySelectorAll(".node:not(.you):not(.person)").forEach(function(n){
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

  PC.compass = { draw:draw, sealSVG:sealSVG, redraw:redraw, onDraw:onDraw, syncNodes:syncNodes, hideCross:hideCross,
                 setTrails:setTrails, hasTrails:hasTrails,
                 trailsOn:function(){ return trailsOn; } };
})(window.PC = window.PC || {});
