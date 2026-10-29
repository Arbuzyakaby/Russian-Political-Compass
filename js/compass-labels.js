/* ============ Компас: раскладка подписей без наложений ============
   Вынесено из js/compass.js в 5.0. Модуль хранит список занятых зон поля
   (подписи осей, точки, уже размещённые ярлыки) и подбирает каждой
   подписи сторону и отступ так, чтобы она ни на что не легла. Сам он
   ничего не рисует, кроме поводка: текст создаёт компас, а здесь
   решается только, где ему стоять. ============ */
(function(PC){
  "use strict";
  var SIZE = PC.geom.SIZE, el = PC.utils.el;

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
  /* На телефоне края поля обрезаны (js/map-controls.js, inset): подпись у
     самой кромки там не видна, поэтому и запас от края там больше. */
  function inside(a){
    var e = 6 + (PC.mapControls && PC.mapControls.inset ? PC.mapControls.inset() : 0);
    return a.x1 >= e && a.x2 <= SIZE - e && a.y1 >= e && a.y2 <= SIZE - e;
  }

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

  PC.compassLabels = {
    /* новый кадр: список зон начинается заново (подписи осей кладёт board) */
    reset:function(list){ obstacles = list || []; },
    add:function(rect){ obstacles.push(rect); },
    rectOf:rectOf, place:placeLabel, leader:leaderLine
  };
})(window.PC = window.PC || {});
