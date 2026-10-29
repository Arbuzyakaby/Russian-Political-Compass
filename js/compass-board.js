/* ============ Компас: поле — стекло, сетка, оси и подписи ============
   Вынесено из js/compass.js в 5.0: всё, что рисуется под точками и не
   зависит от данных. Каждая функция получает SVG компаса и дописывает в
   него свой слой; занятые подписями осей и четвертей зоны уходят в
   раскладчик ярлыков (js/compass-labels.js). ============ */
(function(PC){
  "use strict";
  var G = PC.geom, U = PC.utils, t = PC.t;
  var SIZE = G.SIZE, PAD = G.PAD, C = G.C, px = G.px, el = U.el;
  var labels = PC.compassLabels;

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
  function drawDefs(svg){
    var defs = el("defs");

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

  function drawBoard(svg){
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

  function drawCaptions(svg){
    svg.appendChild(el("text", { x:C, y:PAD - 30, class:"axis-cap", "text-anchor":"middle" },
      t("cap.top")));
    svg.appendChild(el("text", { x:C, y:SIZE - PAD + 42, class:"axis-cap", "text-anchor":"middle" },
      t("cap.bottom")));
    svg.appendChild(el("text", { class:"axis-cap", "text-anchor":"middle", x:PAD - 40, y:C + 4,
      transform:"rotate(-90 " + (PAD - 40) + " " + C + ")" }, t("cap.left")));
    svg.appendChild(el("text", { class:"axis-cap", "text-anchor":"middle", x:SIZE - PAD + 40, y:C + 4,
      transform:"rotate(90 " + (SIZE - PAD + 40) + " " + C + ")" }, t("cap.right")));

    labels.reset([
      /* повёрнутые подписи осей: getBBox отдаёт размеры до поворота,
         поэтому их зоны задаём вручную */
      { x1:PAD - 54, y1:PAD, x2:PAD - 26, y2:SIZE - PAD },
      { x1:SIZE - PAD + 26, y1:PAD, x2:SIZE - PAD + 54, y2:SIZE - PAD }
    ]);
    svg.querySelectorAll(".axis-cap").forEach(function(t){
      if(!t.getAttribute("transform")) labels.add(labels.rectOf(t, 0, 0, 5));
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
      labels.add(labels.rectOf(label, 0, 0, 12));
    });
  }

  PC.compassBoard = { defs:drawDefs, board:drawBoard, captions:drawCaptions, roundRect:roundRect };
})(window.PC = window.PC || {});
