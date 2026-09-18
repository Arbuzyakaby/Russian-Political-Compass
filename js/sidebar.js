/* ============ Боковая панель: список партий и карточка партии ============

   Карточка партии — главное содержание проекта: цифра на компасе без
   объяснения ничего не стоит, спорить можно только с аргументом. Поэтому
   здесь собрано всё, из чего выведена точка: тезисы, обоснование
   координат, разложение на шесть под-осей, история сдвигов, практика
   голосований фракции и ближайшие соседи по полю.

   ---------- что изменилось в 2.4.3 ----------

   Панель переписана в трёх местах, и все три — про одно и то же: она
   слишком много переделывала на каждый чих.

   Первое — события. Список и карточка собираются строкой и вставляются
   через innerHTML; до 2.4.3 после каждой такой вставки навешивались
   обработчики на каждую строку списка, на каждого соседа по полю и на
   кнопку возврата. Одиннадцать партий, десяток перерисовок за минуту
   поиска — и это десятки подписок, которые живут ровно до следующей
   перерисовки. Теперь обработчик один и стоит на самой панели: он
   спрашивает у события, во что попали, а не у каждой кнопки, нажали
   ли её. Разметку это не усложняет — data-id на строках и так был.

   Второе — заголовок панели. Он всегда на виду (стоит вне прокручиваемой
   части) и до 2.4.3 говорил «Карточка партии», пока сама карточка
   рассказывала про КПРФ на полторы тысячи пикселей вниз. Теперь в нём
   имя партии, её цвет и возврат к списку — то есть и ответ на «чью
   карточку я читаю», и выход, которые раньше приходилось искать
   прокруткой в самый верх.

   Третье — клавиатура. По списку партий теперь ходят стрелками, как по
   любому другому списку в проекте: Tab приводит в него один раз, дальше
   ↑/↓, Home/End. Одиннадцать остановок табуляции подряд вместо одной —
   ровно то, ради чего придуман roving tabindex. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, fmt = U.fmt, esc = U.esc;
  var t = PC.t, L = PC.L;
  var body, title, countEl, backBtn, dotEl;
  var mode = "list";          /* что сейчас в панели: "list" или "detail" */

  function init(){
    body    = document.getElementById("sideBody");
    title   = document.getElementById("sideTitle");
    countEl = document.getElementById("count");
    backBtn = document.getElementById("sideBack");
    dotEl   = document.getElementById("sideDot");
    if(!body) return;

    /* ---------- один обработчик на всю панель ----------
       Всё, что в панели нажимается ради выбора партии, помечено data-id:
       строка списка, сосед по полю, самая дальняя партия. Кнопке возврата
       ничего не нужно — её узнают по классу. */
    body.addEventListener("click", function(e){
      var hit = e.target.closest ? e.target.closest("[data-id]") : null;
      if(hit && body.contains(hit)) PC.select(hit.dataset.id);
    });
    body.addEventListener("keydown", listKeys);
    if(backBtn) backBtn.addEventListener("click", function(){ PC.select(null); });
  }

  /* Стрелки по списку партий. Список — не набор отдельных кнопок, а один
     элемент управления с курсором внутри: в него входят табом один раз. */
  function listKeys(e){
    if(mode !== "list") return;
    var step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    var jump = e.key === "Home" ? "first" : e.key === "End" ? "last" : null;
    if(!step && !jump) return;
    var items = Array.prototype.slice.call(body.querySelectorAll(".pitem"));
    if(!items.length) return;
    var here = items.indexOf(document.activeElement);
    var next = jump === "first" ? 0
             : jump === "last"  ? items.length - 1
             : here < 0 ? 0 : (here + step + items.length) % items.length;
    e.preventDefault();
    items.forEach(function(b, i){ b.tabIndex = i === next ? 0 : -1; });
    items[next].focus();
  }

  function econLabel(x){ return t(x < -3 ? "side.labels.left" : x > 3 ? "side.labels.right" : "side.labels.centre"); }
  function stateLabel(y){ return t(y < -3 ? "side.labels.lib" : y > 3 ? "side.labels.stat" : "side.labels.centre"); }

  /* ---------- заголовок панели ----------
     Он вне прокрутки и виден всегда, поэтому именно он отвечает на
     вопрос «где я»: имя партии с её цветом, когда открыта карточка,
     и название списка с числом строк, когда открыт список. */
  function head(p){
    mode = p ? "detail" : "list";
    if(backBtn) backBtn.hidden = !p;
    if(dotEl){
      dotEl.hidden = !p;
      if(p) dotEl.style.background = p.color;
    }
    if(p){
      countEl.hidden = true;
      title.textContent = L(p, "name");
    }else{
      title.textContent = t("side.listTitle", { conv:L(PC.convocationInfo(), "label") });
    }
  }

  function renderList(list, activeId){
    var sorted = list.slice().sort(function(a, b){ return PC.seatsOf(b) - PC.seatsOf(a); });
    head(null);
    countEl.textContent = sorted.length;
    countEl.hidden = false;

    if(!sorted.length){
      body.innerHTML = '<div class="empty">' + esc(t("side.empty")) + '</div>';
      return;
    }

    /* Доля мест в зале показана полоской под названием: она отвечает на
       вопрос, который число мандатов задаёт, но не закрывает, — много
       это или мало. Считается от всей Думы, а не от максимума в списке:
       «треть зала» — величина, а «столько же, сколько у лидера» — нет.
       У партии без мандатов дорожка остаётся, но пустая. */
    body.innerHTML = '<div class="plist">' + sorted.map(function(p, i){
      var seats = PC.seatsOf(p);
      var share = seats / PC.TOTAL_SEATS * 100;
      return '<button type="button" class="pitem' +
             (p.id === activeId ? " active" : "") + '"' +
             ' data-id="' + esc(p.id) + '" tabindex="' + (i === 0 ? "0" : "-1") + '"' +
             /* Ступенька въезда обрывается на восьмой строке: одиннадцатая
                иначе ждала бы почти полсекунды, а это уже не «список
                появился», а «список тормозит». */
             ' style="animation-delay:' + Math.min(i, 8) * 32 + 'ms">' +
               '<span class="sw" style="background:' + esc(p.color) + '"></span>' +
               '<span class="nm">' + esc(L(p, "name")) +
                 '<small>' + esc(L(p, "ideology")) + '</small>' +
                 '<span class="share" aria-hidden="true"><i style="width:' +
                   Math.max(seats ? 1.5 : 0, share).toFixed(2) + '%;background:' + esc(p.color) +
                 '"></i></span>' +
               '</span>' +
               '<span class="mandates"><b>' + seats + '</b>' +
                 esc(PC.i18n.pl(seats, "word.seat")) + '</span>' +
             '</button>';
    }).join("") + '</div>';
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
    var others = PC.calc.rankParties(p, p.id);
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

  /* ---------- сравнение с другой партией ----------
     Тот же расчётный слой, что у соседей по полю (PC.calc), только
     разница показана не одним числом-расстоянием, а по каждой оси и
     под-оси отдельно — читатель видит не «насколько далеко», а «в чём
     именно» расходятся две партии. Выбор партии для сравнения не
     сохраняется: при возврате на карточку читатель начинает заново,
     и это правильно — вопрос «с кем сравнить» каждый раз новый. */
  function compareRow(label, a, b){
    return '<div class="cmp-row"><span class="cmp-lab">' + esc(label) + '</span>' +
      '<span class="cmp-a">' + (a == null ? "—" : fmt(a)) + '</span>' +
      '<span class="cmp-b">' + (b == null ? "—" : fmt(b)) + '</span></div>';
  }

  function renderCompare(a, b){
    var box = document.getElementById("cmpResult");
    if(!box) return;
    if(!b){ box.innerHTML = ""; return; }
    var rows = [compareRow(t("side.econ"), a.x, b.x), compareRow(t("side.state"), a.y, b.y)]
      .concat(PC.calc.subaxisDelta(a, b).map(function(d){
        return compareRow(t("sub." + d.axis.id), d.a, d.b);
      }));
    box.innerHTML =
      '<div class="cmp-row cmp-head">' +
        '<span class="cmp-lab"></span>' +
        '<span class="cmp-a" style="color:' + esc(a.color) + '">' + esc(L(a, "short")) + '</span>' +
        '<span class="cmp-b" style="color:' + esc(b.color) + '">' + esc(L(b, "short")) + '</span>' +
      '</div>' + rows.join("");
  }

  function compareBlock(p){
    var others = PC.PARTIES.filter(function(o){ return o.id !== p.id; });
    return '<div class="sect cmp-sect"><h4>' + esc(t("side.compare")) + '</h4>' +
      '<p class="hist-note">' + esc(t("side.compare.d")) + '</p>' +
      '<select id="cmpSelect" aria-label="' + esc(t("side.compare")) + '">' +
        '<option value="">' + esc(t("side.compare.pick")) + '</option>' +
        others.map(function(o){
          /* Короткое имя (то же, что в заголовке таблицы сравнения ниже),
             а не полное: у нескольких партий полное название — три-четыре
             слова, и в узкой колонке списка сравнения оно не влезало
             целиком даже с учётом кастомной раскладки js/select.js. */
          return '<option value="' + esc(o.id) + '">' + esc(L(o, "short")) + '</option>';
        }).join("") +
      '</select>' +
      '<div id="cmpResult"></div></div>';
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
    head(p);
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
        compareBlock(p) +
        (PC.votes ? PC.votes.partyBlock(p) : "") +
        trailBlock(p) +
      '</div>';

    body.scrollTop = 0;
    var cmpSelect = document.getElementById("cmpSelect");
    if(cmpSelect){
      if(PC.dropdown) PC.dropdown.init(body);
      cmpSelect.addEventListener("change", function(){
        renderCompare(p, cmpSelect.value ? PC.partyById(cmpSelect.value) : null);
      });
    }

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
