/* ============ Боковая панель: список партий и карточка партии ============

   Карточка партии — главное содержание проекта: цифра на компасе без
   объяснения ничего не стоит, спорить можно только с аргументом. Поэтому
   здесь собрано всё, из чего выведена точка: тезисы, обоснование
   координат, разложение на шесть под-осей, история сдвигов, практика
   голосований фракции и ближайшие соседи по полю. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, fmt = U.fmt, esc = U.esc;
  var t = PC.t, L = PC.L;
  var body, title, countEl;

  function init(){
    body    = document.getElementById("sideBody");
    title   = document.getElementById("sideTitle");
    countEl = document.getElementById("count");
  }

  function econLabel(x){ return t(x < -3 ? "side.labels.left" : x > 3 ? "side.labels.right" : "side.labels.centre"); }
  function stateLabel(y){ return t(y < -3 ? "side.labels.lib" : y > 3 ? "side.labels.stat" : "side.labels.centre"); }

  function renderList(list, activeId){
    var sorted = list.slice().sort(function(a, b){ return PC.seatsOf(b) - PC.seatsOf(a); });
    countEl.textContent = sorted.length;
    countEl.hidden = false;
    title.textContent = t("side.listTitle", { conv:L(PC.convocationInfo(), "label") });

    if(!sorted.length){
      body.innerHTML = '<div class="empty">' + t("side.empty") + '</div>';
      return;
    }
    body.innerHTML = '<div class="plist">' + sorted.map(function(p, i){
      var seats = PC.seatsOf(p);
      return '<button type="button" class="pitem' + (p.id === activeId ? " active" : "") + '"' +
             ' data-id="' + esc(p.id) + '" style="animation-delay:' + (i * 35) + 'ms">' +
               '<span class="sw" style="background:' + esc(p.color) + '"></span>' +
               '<span class="nm">' + esc(L(p, "name")) + '<small>' + esc(L(p, "ideology")) + '</small></span>' +
               '<span class="mandates"><b>' + seats + '</b>' + esc(PC.i18n.pl(seats, "word.seat")) + '</span>' +
             '</button>';
    }).join("") + '</div>';

    body.querySelectorAll(".pitem").forEach(function(b){
      b.addEventListener("click", function(){ PC.select(b.dataset.id); });
    });
    body.scrollTop = 0;
  }

  /* Мини-график: мандаты партии по всем созывам. Столбец без заливки —
     созыв, в котором партии не существовало; ноль — участвовала, но
     не прошла барьер. */
  function histBlock(p){
    var convs = PC.convsAsc();
    var vals = convs.map(function(c){ return PC.seatsAt(p, c.id); });
    var max = Math.max.apply(null, vals.map(function(v){ return v || 0; }).concat([1]));
    var any = vals.some(function(v){ return v; });
    return '<div class="sect"><h4>' + esc(t("side.byConv")) + '</h4>' +
      '<div class="hist">' + convs.map(function(c, i){
        var v = vals[i];
        var h = v ? Math.max(4, v / max * 58) : 3;
        return '<div class="col">' +
          '<span class="num">' + (v === null ? "—" : v) + '</span>' +
          '<span class="bar-v' + (v ? "" : " none") + '" data-h="' + h.toFixed(1) + '"' +
            ' style="background:' + esc(p.color) + '"></span>' +
          '<span class="lbl">' + esc(L(c, "label").split(" ")[0]) + '</span></div>';
      }).join("") + '</div>' +
      '<div class="hist-note">' +
        esc(any ? t("side.maxSeats", { n:max, seats:PC.i18n.pl(max, "word.seat") })
                : t("side.neverSeats")) +
        esc(t("side.dashNote")) + "</div></div>";
  }

  /* ---------- разложение координаты на под-оси ----------
     Полоса рисуется от нуля в сторону полюса — так же, как в блоке
     «идеологический спектр», чтобы одинаковые величины на разных экранах
     выглядели одинаково. Значения под-осей в среднем дают координату
     партии, и это видно: три полосы одной половины всегда «окружают»
     итоговое число. */
  function subBlock(p){
    if(!p.sub) return "";
    function group(axis, coord){
      var rows = PC.SUBAXES.filter(function(ax){ return ax.axis === axis; }).map(function(ax){
        var v = p.sub[ax.id];
        var w = Math.abs(v) / 10 * 50, left = v < 0 ? 50 - w : 50;
        return '<div class="sub-row" title="' + esc(t("sub." + ax.id + ".d")) + '">' +
          '<div class="sub-lab">' + esc(t("sub." + ax.id)) + '<b>' + fmt(v) + '</b></div>' +
          '<div class="track"><span class="fill" data-left="' + left.toFixed(2) + '" data-w="' + w.toFixed(2) +
            '" style="left:50%;background:' + esc(p.color) + '"></span></div>' +
          '<div class="sub-poles"><span>' + esc(t("sub." + ax.id + ".lo")) + '</span>' +
            '<span>' + esc(t("sub." + ax.id + ".hi")) + '</span></div></div>';
      }).join("");
      return '<div class="sub-group"><div class="sub-head">' +
        esc(t(axis === "x" ? "res.break.axisX" : "res.break.axisY")) +
        '<b>' + fmt(coord) + '</b></div>' + rows + '</div>';
    }
    return '<div class="sect sub-sect"><h4>' + esc(t("side.subaxes")) + '</h4>' +
      group("x", p.x) + group("y", p.y) +
      '<div class="hist-note">' + esc(t("side.subaxesNote")) + '</div></div>';
  }

  /* ---------- соседи по полю ----------
     Расстояние по прямой отвечает на вопрос, который у карточки партии
     возникает первым и на который сам компас отвечает плохо: кто рядом.
     На поле с одиннадцатью точками глаз путает близость по одной оси
     с близостью вообще. */
  function neighbourBlock(p){
    var others = PC.PARTIES.filter(function(o){ return o.id !== p.id; }).map(function(o){
      var dx = o.x - p.x, dy = o.y - p.y;
      return { p:o, d:Math.sqrt(dx * dx + dy * dy) };
    }).sort(function(a, b){ return a.d - b.d; });
    if(!others.length) return "";

    var near = others.slice(0, 3);
    var far = others[others.length - 1];
    function row(r, cls){
      return '<button type="button" class="nb-row ' + (cls || "") + '" data-id="' + esc(r.p.id) + '">' +
        '<i style="background:' + esc(r.p.color) + '"></i>' +
        '<span class="n">' + esc(L(r.p, "short")) + '</span>' +
        '<span class="d">' + r.d.toFixed(1) + '</span></button>';
    }
    return '<div class="sect nb-sect"><h4>' + esc(t("side.neighbours")) + '</h4>' +
      '<div class="nb-list">' + near.map(function(r){ return row(r); }).join("") + '</div>' +
      '<div class="nb-far"><span class="k">' + esc(t("side.farthest")) + '</span>' + row(far, "far") + '</div>' +
      '<div class="hist-note">' + esc(t("side.neighboursNote")) + '</div></div>';
  }

  /* Траектория партии словами: те же точки, что рисует слой «Траектории»
     на компасе, но здесь их видно без включения слоя и с полным текстом
     пояснения — на поле оно доступно только по наведению. */
  function trailBlock(p){
    if(!p.history || p.history.length < 2) return "";
    var from = p.history[0], to = p.history[p.history.length - 1];
    var dx = to.x - from.x, dy = to.y - from.y;
    function move(d, negKey, posKey){
      if(Math.abs(d) < .5) return t("side.noShift");
      return t(d < 0 ? negKey : posKey, { d:Math.abs(d).toFixed(1) });
    }
    return '<div class="sect trail-sect"><h4>' + esc(t("side.trail")) + '</h4>' +
      '<ol class="tline">' + p.history.map(function(h){
        return '<li><span class="y">' + h.year + '</span>' +
          '<span class="c">' + fmt(h.x) + ' / ' + fmt(h.y) + '</span>' +
          '<p>' + esc(L(h, "note")) + '</p></li>';
      }).join("") + '</ol>' +
      '<div class="hist-note">' + esc(t("side.trailSum", {
        from:from.year, to:to.year,
        dx:move(dx, "side.left", "side.right"),
        dy:move(dy, "side.down", "side.up")
      })) + '</div></div>';
  }

  function renderDetail(p, animate){
    countEl.hidden = true;
    title.textContent = t("side.cardTitle");
    var seats = PC.seatsOf(p);
    var conv = PC.convocationInfo();
    var pct = seats / PC.TOTAL_SEATS * 100;

    /* Положение на шкале −10…+10 полосой от нуля к полюсу — та же
       механика, что у спектра и у результата теста: число читается
       вместе с направлением и расстоянием до края, а не отдельно. */
    function pos(v){
      var w = Math.abs(v) / 10 * 50, l = v < 0 ? 50 - w : 50;
      return '<div class="coord-bar" aria-hidden="true"><i style="left:' + l.toFixed(2) + '%;width:' +
             Math.max(1.5, w).toFixed(2) + '%;background:' + esc(p.color) + '"></i></div>';
    }

    body.innerHTML =
      '<div class="detail' + (animate === false ? " no-anim" : "") + '" style="--party:' + esc(p.color) + '">' +
        '<button type="button" class="back" id="back">' + esc(t("side.back")) + '</button>' +
        '<div class="d-head">' +
          '<div class="d-badge" style="background:' + esc(p.color) + ';--glow:' + esc(p.color) + '">' +
            esc(L(p, "name").trim().charAt(0)) + '</div>' +
          '<div><h3>' + esc(L(p, "name")) + '</h3><div class="ideo">' + esc(L(p, "ideology")) + '</div></div>' +
        '</div>' +
        /* Сводка стоит выше координат сознательно: пока читатель не знает,
           что это за партия, числа «−8.0 / 4.8» ему не о чем. */
        (L(p, "summary")
          ? '<p class="d-summary">' + esc(L(p, "summary")) + '</p>'
          : "") +
        '<div class="leader"><span class="k">' + esc(t("side.leader")) + '</span><span class="v">' +
          esc(L(p, "leader")) + '</span></div>' +
        '<div class="coords">' +
          '<div class="coord"><div class="k">' + esc(t("side.econ")) + '</div><div class="v">' + fmt(p.x) + '</div>' +
            '<div class="d">' + esc(econLabel(p.x)) + '</div>' + pos(p.x) + '</div>' +
          '<div class="coord"><div class="k">' + esc(t("side.state")) + '</div><div class="v">' + fmt(p.y) + '</div>' +
            '<div class="d">' + esc(stateLabel(p.y)) + '</div>' + pos(p.y) + '</div>' +
        '</div>' +
        '<div class="mandate-box">' +
          '<div class="mandate-top">' +
            '<span class="k">' + esc(t("side.duma", { conv:L(conv, "label") })) + '</span>' +
            '<span class="v">' + seats + ' <small>' + esc(t("side.ofSeats", { n:PC.TOTAL_SEATS })) + '</small></span>' +
          '</div>' +
          '<div class="bar"><i id="bar" style="background:' + esc(p.color) + '"></i></div>' +
          '<div class="mandate-note">' +
            esc(seats ? t("side.pctOfHouse", { p:pct.toFixed(1) }) : t("side.noSeats")) +
          '</div>' +
        '</div>' +
        histBlock(p) +
        '<div class="sect"><h4>' + esc(t("side.theses")) + '</h4><ul>' +
          L(p, "theses").map(function(x){ return "<li>" + esc(x) + "</li>"; }).join("") +
        '</ul></div>' +
        '<div class="sect"><h4>' + esc(t("side.why")) + '</h4>' +
          '<div class="note"><p>' + esc(L(p, "why")) + '</p></div></div>' +
        subBlock(p) +
        neighbourBlock(p) +
        (PC.votes ? PC.votes.partyBlock(p) : "") +
        trailBlock(p) +
      '</div>';

    body.scrollTop = 0;
    document.getElementById("back").addEventListener("click", function(){ PC.select(null); });
    body.querySelectorAll(".nb-row").forEach(function(b){
      b.addEventListener("click", function(){ PC.select(b.dataset.id); });
    });

    /* ширина полос задаётся в следующем кадре, чтобы сработал transition */
    requestAnimationFrame(function(){
      var bar = document.getElementById("bar");
      if(bar) bar.style.width = Math.max(seats ? 2 : 0, pct) + "%";
      body.querySelectorAll(".hist .bar-v").forEach(function(b){ b.style.height = b.dataset.h + "px"; });
      body.querySelectorAll(".sub-row .fill").forEach(function(f){
        f.style.left = f.dataset.left + "%";
        f.style.width = Math.max(1.5, Number(f.dataset.w)) + "%";
      });
    });
  }

  PC.sidebar = { init:init, renderList:renderList, renderDetail:renderDetail };
})(window.PC = window.PC || {});
