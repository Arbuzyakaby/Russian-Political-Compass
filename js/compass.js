/* ============ Отрисовка компаса: сетка, оси, точки партий ============ */
(function(PC){
  "use strict";
  var G = PC.geom, U = PC.utils;
  var t = PC.t, L = PC.L;
  var SIZE = G.SIZE, C = G.C, px = G.px, el = U.el;
  /* Радиус круга по числу мест. */
  function radius(seats){
    var s=PC.settings,size=s&&s.get("dotSize"),bubbles=s&&s.get("bubbles");
    return (bubbles==="off"?11:G.radius(seats))*(size==="small"?.75:size==="large"?1.3:1);
  }

  var svg, cross, claims;
  var Lb = PC.compassLabels, B = PC.compassBoard, M = PC.compassMarks;
  var claimsOn = true;
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
      Lb.add(ownBox[p.id]);
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
      Lb.add(ownBox[person.id]);
    });
    var userRes = PC.quiz && PC.quiz.result();
    if(userRes){
      var uc = px(userRes.x, userRes.y), ur = 9 + 4;
      ownBox.you = { x1:uc.sx - ur, y1:uc.sy - ur, x2:uc.sx + ur, y2:uc.sy + ur };
      Lb.add(ownBox.you);
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
        if(colorblind) M.accessibleMark(g, g.querySelector(".dot"), p.color, r, shapeIndex++);
        layer.appendChild(g);

        var place = Lb.place(tag, seat, c.sx, c.sy, r, p.lp, ownBox[p.id]);
        Lb.leader(g, place, r, p.color);
        Lb.add(place.rect);

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

    M.people(layer, ownBox);
    M.user(layer, ownBox.you);
  }

  function draw(){
    svg = document.getElementById("svg");
    svg.textContent = "";
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
    B.defs(svg);
    B.board(svg);
    B.captions(svg);
    drawNodes();
    drawClaims();
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

  PC.compass = { draw:draw, sealSVG:M.sealSVG, redraw:redraw, showCross:showCross, onDraw:onDraw, syncNodes:syncNodes, hideCross:hideCross,
                 setClaims:setClaims, hasClaims:hasClaims, gapOf:gapOf,
                 claimsOn:function(){ return claimsOn; } };
})(window.PC = window.PC || {});
