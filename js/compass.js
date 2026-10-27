/* ============ Отрисовка компаса: сетка, оси, точки партий ============ */
(function(PC){
  "use strict";
  var G = PC.geom, U = PC.utils;
  var t = PC.t, L = PC.L;
  var SIZE = G.SIZE, PAD = G.PAD, C = G.C, px = G.px, el = U.el;
  /* Радиус круга по числу мест. */
  function radius(seats){
    var s=PC.settings,size=s&&s.get("dotSize"),bubbles=s&&s.get("bubbles");
    return (bubbles==="off"?11:G.radius(seats))*(size==="small"?.75:size==="large"?1.3:1);
  }

  var svg, cross, defs, claims;
  var claimsOn = true;
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

  /* Размещает подпись партии, избегая наложений. */
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
  var LENS_GAP = 5;     /* зазор линзы от оси — сквозь него видно саму ось */
  var LENS_R = 7;       /* радиус внутренних углов линзы */

  /* Общие определения SVG: градиенты и фильтры. */
  function drawDefs(){
    defs = el("defs");

    /* Подсветка квадрантов. Оттенки следуют за смыслом четверти и
       читаются парами: верх — принуждение (тёплые тона), низ — свобода
       (холодные); слева плановая экономика, справа рыночная. С 2.4.1
       градиент бьёт из внешнего угла поля, а не из угла у центра: у
       линзы должен быть свой источник света, и он приходит снаружи. */
    /* Плотность заливки поднята втрое в 2.4.2.1. Прошлые два подхода
        к редизайну поля (2.4.1 и 2.4.2) трогали стекло — плиту, кромку,
        блик, — то есть то, что лежит НАД данными и по определению
        обязано быть деликатным. Результат честно описан в обеих
        версиях: «редизайн почти не видно». Видно становится тогда,
        когда меняется само поле, а главное на поле — четыре четверти
        с их смыслом. Теперь они читаются как четыре именованные зоны
        с первого взгляда и с двух метров, а не как намёк на оттенок.

        Верхняя граница здесь не эстетическая, а смысловая: поверх
        заливки стоят точки партий своими цветами, и четверть не имеет
        права спорить с ними за внимание. 0.48 в углу — то значение,
        при котором цвет четверти ещё заведомо бледнее любой точки. */
    var QUAD_STOPS = [
      { at:"0%",   o:".48" }, { at:"42%",  o:".30" },
      { at:"70%",  o:".16" }, { at:"100%", o:".05" }
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
      dx:"0", dy:"14", stdDeviation:"18", "flood-color":"#000", "flood-opacity":"0.30"
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

    /* Наконечники на концах осей (2.4.2.1). Ось без наконечника — это
       просто линия: она делит поле, но не говорит, что у неё есть
       направление и что справа «больше», чем слева. Четыре треугольника
       стоят ровно там, где подписи осей называют полюс, и связывают
       подпись с самой шкалой. Рисуются путями, а не <marker>: маркер
       пришлось бы объявлять в defs и красить отдельно, а здесь это
       четыре одинаковых треугольника, которым хватает currentColor. */
    var A = 9;
    [[SIZE - PAD, C, 1, 0], [PAD, C, -1, 0], [C, PAD, 0, -1], [C, SIZE - PAD, 0, 1]]
      .forEach(function(a){
        var x = a[0], y = a[1], dx = a[2], dy = a[3];
        board.appendChild(el("path", { "class":"axis-tip", d:
          "M" + (x + dx * A) + "," + (y + dy * A) +
          "L" + (x - dx * A + dy * A * 0.62) + "," + (y - dy * A + dx * A * 0.62) +
          "L" + (x - dx * A - dy * A * 0.62) + "," + (y - dy * A - dx * A * 0.62) + "Z" }));
      });

    /* Центр поля: не точка, а мишень. Ноль по обеим осям — это
       содержательное место («ни туда, ни сюда»), и до сих пор оно было
       отмечено кружком в три пикселя, который терялся на пересечении
       двух линий. */
    board.appendChild(el("circle", { class:"origin-ring", cx:C, cy:C, r:13 }));
    board.appendChild(el("circle", { class:"origin", cx:C, cy:C, r:4 }));
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

    /* Подписи четвертей встали на плашки (2.4.2.1). Раньше это были
       четыре строки бледных прописных букв поверх заливки: на светлых
       темах они сливались с ней полностью, а на тёмных читались как
       водяной знак. Плашка — рамка в цвет четверти и подложка под
       текстом — стоит ровно столько же места, но делает из украшения
       подпись, которую видно.

       Прямоугольник считается по реальным размерам текста (getBBox), а
       не по числу букв: подписи четвертей в русском и английском
       заметно разной длины, а на настройке «крупнее» — ещё и разной
       высоты. */
    var QC = [{ x:PAD + 18,        y:PAD + 26,        t:t("quad.lt"), a:"start", c:"#d9534f" },
              { x:SIZE - PAD - 18, y:PAD + 26,        t:t("quad.rt"), a:"end",   c:"#d99a3f" },
              { x:PAD + 18,        y:SIZE - PAD - 18, t:t("quad.lb"), a:"start", c:"#4e9e72" },
              { x:SIZE - PAD - 18, y:SIZE - PAD - 18, t:t("quad.rb"), a:"end",   c:"#5b86d6" }];
    QC.forEach(function(q){
      var g = el("g", { "class":"quad-tag" });
      var label = el("text", { x:q.x, y:q.y, class:"quad-cap", "text-anchor":q.a }, q.t);
      svg.appendChild(g);
      g.appendChild(label);
      var b = label.getBBox();
      g.insertBefore(el("rect", {
        "class":"quad-plate", rx:7,
        x:b.x - 9, y:b.y - 5.5, width:b.width + 18, height:b.height + 11,
        stroke:q.c, fill:q.c
      }), label);
      obstacles.push(rectOf(label, 0, 0, 12));
    });
  }

  /* ---------- заявленные позиции (3.0) ----------

     Слой отвечает на вопрос, которого компас раньше не задавал: где
     партия стоит по собственным словам и насколько это далеко от того,
     где она стоит на деле. У каждой партии две точки: сплошная — реальная
     позиция (программа, законы, голосования фракции), полая — заявленная
     (название, устав, предвыборная риторика). Стрелка идёт от слов к делу:
     её длина и есть разрыв.

     Слой заменил траектории, которые жили здесь с 2.2 по RPC 2.5.
     Траектория отвечала на вопрос «как партия двигалась», но каждая её
     точка была такой же оценкой, как нынешняя, — пять оценок подряд
     выглядели измерением, которым не были. Разрыв между словом и делом
     проверяется лучше: вторую его половину можно сверить с таблицей
     голосований на соседней вкладке.

     Стрелка не заходит под кружок партии: она обрывается на его краю,
     и наконечник рисуется отдельным треугольником, а не маркером из
     defs, — маркер на партию означал бы одиннадцать определений ради
     одиннадцати треугольников. Короче двух делений разрыв рисуется без
     наконечника: у стрелки длиной в сам наконечник направления не
     прочесть, и точка просто стоит рядом с кружком. */
  var GAP_ARROW = 1.2;       /* в единицах шкалы: короче — без наконечника */

  function gapOf(p){
    var d = p.declared;
    return d ? Math.sqrt((d.x - p.x) * (d.x - p.x) + (d.y - p.y) * (d.y - p.y)) : 0;
  }

  /* Рисует заявленные позиции партий. */
  function drawClaims(){
    claims = el("g", { "class":"claims" });
    svg.appendChild(claims);

    PC.PARTIES.forEach(function(p){
      var d = p.declared;
      if(!d) return;
      var seats = PC.seatsOf(p);
      if(seats === null) return;

      var from = px(d.x, d.y), to = px(p.x, p.y);
      var vx = to.sx - from.sx, vy = to.sy - from.sy;
      var len = Math.sqrt(vx * vx + vy * vy);
      var g = el("g", { "class":"claim", "data-id":p.id });

      if(len > 1){
        var ux = vx / len, uy = vy / len;
        var rTo = radius(seats) + 2, rFrom = 6.5;
        var arrow = gapOf(p) >= GAP_ARROW && len > rTo + rFrom + 10;
        var head = arrow ? 7 : 0;
        var x1 = from.sx + ux * rFrom, y1 = from.sy + uy * rFrom;
        var x2 = to.sx - ux * (rTo + head), y2 = to.sy - uy * (rTo + head);
        if(len > rTo + rFrom){
          g.appendChild(el("line", { "class":"claim-casing", x1:f(x1), y1:f(y1), x2:f(x2), y2:f(y2) }));
          g.appendChild(el("line", { "class":"claim-line", x1:f(x1), y1:f(y1), x2:f(x2), y2:f(y2), stroke:p.color }));
        }
        if(arrow){
          var tx = to.sx - ux * rTo, ty = to.sy - uy * rTo;
          var bx = tx - ux * head, by = ty - uy * head;
          var nx = -uy * 4.2, ny = ux * 4.2;
          g.appendChild(el("path", {
            "class":"claim-head", fill:p.color,
            d:"M" + f(tx) + "," + f(ty) + "L" + f(bx + nx) + "," + f(by + ny) + "L" + f(bx - nx) + "," + f(by - ny) + "Z"
          }));
        }
      }

      var dot = el("circle", {
        "class":"claim-dot", cx:f(from.sx), cy:f(from.sy), r:"5.2", stroke:p.color, tabindex:"-1"
      });
      g.appendChild(dot);

      function enter(){
        focusOn();
        PC.tip.showHTML(
          '<div class="tip-top"><span class="tip-dot tip-dot--hollow" style="border-color:' + U.esc(p.color) + '"></span>' +
          '<span class="tip-name">' + U.esc(L(p, "name")) + ' · ' + U.esc(t("tip.claim")) + '</span></div>' +
          '<div class="tip-ideo">' + U.esc(L(d, "note")) + '</div>' +
          '<div class="tip-meta">' +
            '<span>' + U.esc(t("side.claimSaid")) + ' <b>' + U.fmt(d.x) + ' / ' + U.fmt(d.y) + '</b></span>' +
            '<span>' + U.esc(t("side.claimDone")) + ' <b>' + U.fmt(p.x) + ' / ' + U.fmt(p.y) + '</b></span>' +
          '</div>' +
          '<div class="tip-hint">' + U.esc(t("tip.claimGap", { d:gapOf(p).toFixed(1) })) + '</div>',
          from.sx, from.sy);
      }
      dot.addEventListener("mouseenter", enter);
      dot.addEventListener("mouseleave", function(){ PC.tip.hide(); focusOff(); });

      /* Пока курсор на одной паре точек, остальные пары гаснут: вопрос
         у читателя всегда про одну партию, а одиннадцать стрелок разом
         сравнить глазом невозможно. */
      function focusOn(){
        claims.classList.add("has-focus");
        g.classList.add("is-focus");
      }
      function focusOff(){
        claims.classList.remove("has-focus");
        g.classList.remove("is-focus");
      }
      g.addEventListener("mouseenter", focusOn);
      g.addEventListener("mouseleave", focusOff);

      claims.appendChild(g);
    });

    svg.classList.toggle("show-claims", claimsOn);
  }
  function f(v){ return Math.round(v * 10) / 10; }

  /* Слой включается без перерисовки поля: стрелки уже построены,
     переключается только их видимость. */
  function setClaims(on){
    claimsOn = !!on;
    if(svg) svg.classList.toggle("show-claims", claimsOn);
    if(PC.partyBuilder)PC.partyBuilder.drawOnCompass();
    if(!claimsOn) PC.tip.hide();
  }
  function hasClaims(){
    return PC.PARTIES.some(function(p){ return !!p.declared; });
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

  /* Показывает перекрестие на позиции партии. */
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
    /* Подпись отодвигается от оси в ту сторону, где стоит точка. Если
       точка почти на самой оси, подписи нет вовсе: у центра поля тесно,
       и число легло бы на чужие кружки — а сказать ему там всё равно
       нечего, координата и так видна нулевой. */
    var nearX = Math.abs(sy - C) < 26, nearY = Math.abs(sx - C) < 30;
    P.valX.setAttribute("x", sx);
    P.valX.setAttribute("y", C + (sy > C ? 17 : -10));
    P.valX.textContent = nearX ? "" : U.fmt(x);
    P.valY.setAttribute("x", C + (sx > C ? -24 : 24));
    P.valY.setAttribute("y", sy + 3.4);
    P.valY.textContent = nearY ? "" : U.fmt(y);

    cross.style.color = color || "";
    cross.classList.add("show");
  }
  function hideCross(){ if(cross) cross.classList.remove("show"); }

  /* ---------- точки партий ---------- */
  function drawNodes(){
    /* Перекрестие строится до слоя точек: оно должно лежать поверх
       сетки и стекла, но под самими точками — иначе линия перечёркивает
       кружок, к которому относится. */
    buildCross();
    var layer = el("g", { "class":"nodes" });
    svg.appendChild(layer);

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

    var colorblind = PC.settings && PC.settings.get("colorblind") === "on", shapeIndex = 0;

    /* крупные фракции раскладываем первыми — им достаются лучшие места */
    PC.PARTIES.map(function(p, i){ return { p:p, i:i, seats:PC.seatsOf(p) }; })
      .filter(function(item){ return item.seats !== null; })
      .sort(function(a, b){ return b.seats - a.seats; })
      .forEach(function(item){
        var p = item.p, seats = item.seats, c = px(p.x, p.y), r = radius(seats);
        var g = el("g", {
          "class":"node" + (seats > 0 ? " duma" : ""), "data-id":p.id, tabindex:"0", role:"button",
          "aria-label":L(p, "name") + ", " + U.seatsLabel(seats),
          transform:"translate(" + c.sx + "," + c.sy + ")"
        });
        /* Постоянный ореол цветом партии (2.4.2.1). До него точка была
           одним кружком с тонкой белой обводкой, и на плотной заливке
           четверти мелкие партии буквально терялись. Ореол не спорит
           с самой точкой — он вдвое бледнее и вдвое шире, — но даёт
           каждой точке собственную «подушку», по которой её видно и
           боковым зрением, и на выгруженной картинке. */
        g.appendChild(el("circle", { "class":"halo", r:r + 7, fill:p.color }));
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
        if(colorblind) accessibleMark(g, g.querySelector(".dot"), p.color, r, shapeIndex++);
        layer.appendChild(g);

        var place = placeLabel(tag, seat, c.sx, c.sy, r, p.lp, ownBox[p.id]);
        leaderLine(g, place, r, p.color);
        obstacles.push(place.rect);

        /* Наведение на партию подсвечивает и её заявленную точку:
           вопрос «а что она сама о себе говорит» задают, глядя на
           кружок, а не на клубок стрелок. */
        function focusClaim(on){
          if(!claims) return;
          var pair = claims.querySelector('.claim[data-id="' + p.id + '"]');
          if(!pair) return;
          claims.classList.toggle("has-focus", on);
          pair.classList.toggle("is-focus", on);
        }
        function enter(){ PC.tip.show(p, c.sx, c.sy); showCross(c.sx, c.sy, p.color, p.x, p.y); focusClaim(true); }
        function leave(){ PC.tip.hide(); hideCross(); focusClaim(false); }
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

  /* Форма точки для режима «для дальтоников» (настройка colorblind).
     Цвет перестаёт быть единственным признаком партии: к нему добавляется
     одна из четырёх форм по порядку точки, а сама точка гасится.
     Раньше формы дорисовывал js/tisza.js после каждой отрисовки и заодно
     переписывал радиус — теперь это делается там, где узел создаётся. */
  function accessibleMark(g, dot, color, r, index){
    var d = [
      "M0-" + r + " " + r + " " + r + "-" + r + " " + r + "Z",
      "M-" + r + "-" + r + "H" + r + "V" + r + "H-" + r + "Z",
      "M0-" + r + " " + r + " 0 0 " + r + "-" + r + " 0Z",
      "M-" + r + " 0H" + r + "M0-" + r + "V" + r
    ][index % 4];
    g.insertBefore(el("path", { "class":"accessible-mark", d:d, fill:color, stroke:"var(--dot-stroke)", "stroke-width":1.8 }), dot);
    dot.style.opacity = "0";
    g.appendChild(el("path", { "class":"accessible-hatch", d:"M-5 2 2-5M-2 5 5-2", stroke:"var(--bg)", "stroke-width":1.2, "pointer-events":"none" }));
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
    var res = PC.quiz && (PC.quiz.compassResult ? PC.quiz.compassResult() : PC.quiz.result());
    if(!res) return;

    var c = px(res.x, res.y), r = 9;
    var g = el("g", {
      "class":"node you", tabindex:"0", role:"button",
      "aria-label":res.shared?t("node.guest")+", X "+U.fmt(res.x)+", Y "+U.fmt(res.y):t("node.youAria", { x:U.fmt(res.x), y:U.fmt(res.y) }),
      transform:"translate(" + c.sx + "," + c.sy + ")"
    });
    g.appendChild(el("circle", { "class":"you-halo", r:r + 9 }));
    g.appendChild(el("path", { "class":"you-mark",
      d:"M0 -11 L3.1 -3.6 L11 -3.4 L4.8 1.6 L7 9.2 L0 4.8 L-7 9.2 L-4.8 1.6 L-11 -3.4 L-3.1 -3.6 Z" }));
    var tag  = el("text", { "class":"tag" }, t(res.shared ? "node.guest" : "node.you"));
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
    drawNodes();
    drawClaims();
    if(prevStyle === null) svg.removeAttribute("style"); else svg.setAttribute("style", prevStyle);
    if(PC.partyBuilder) PC.partyBuilder.drawOnCompass();
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
    /* заявленная точка живёт по тем же правилам, что и реальная */
    svg.querySelectorAll(".claim").forEach(function(t){
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
                 setClaims:setClaims, hasClaims:hasClaims, gapOf:gapOf,
                 claimsOn:function(){ return claimsOn; } };
})(window.PC = window.PC || {});
