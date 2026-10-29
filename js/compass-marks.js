/* ============ Компас: люди и точка «Вы» ============
   Вынесено из js/compass.js в 5.0. Партии рисует сам компас, а здесь —
   всё остальное, что стоит на поле: печати людей (у них своя форма и своя
   карточка), отметка результата теста и формы точек для режима «для
   дальтоников». Подписи раскладывает js/compass-labels.js. ============ */
(function(PC){
  "use strict";
  var G = PC.geom, U = PC.utils;
  var t = PC.t, L = PC.L;
  var px = G.px, el = U.el;
  var labels = PC.compassLabels;

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
    var place = labels.place(tag, seat, c.sx, c.sy, 13, p.lp || "right", own);
    labels.leader(g, place, 13, p.color);
    labels.add(place.rect);

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
      PC.compass.showCross(c.sx, c.sy, p.color, p.x, p.y);
    }
    function leave(){ PC.tip.hide(); PC.compass.hideCross(); }
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
  /* Рисуется последней: к этому моменту в раскладчике уже лежат все партийные
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
    var place = labels.place(tag, seat, c.sx, c.sy, r, "top", own);
    labels.leader(g, place, r, "var(--accent)");
    labels.add(place.rect);

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
      PC.compass.showCross(c.sx, c.sy, "var(--accent)", res.x, res.y);
    }
    function leave(){ PC.tip.hide(); PC.compass.hideCross(); }
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

  PC.compassMarks = { people:drawPeople, user:drawUser, accessibleMark:accessibleMark, sealSVG:sealSVG };
})(window.PC = window.PC || {});
