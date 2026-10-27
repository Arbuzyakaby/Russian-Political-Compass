/* ============ Дерево версий (4.1) ============

   История проекта в разделе «О проекте» как граф веток в духе git:
   новые выпуски сверху, ствол слева, боковая линия RPC ответвляется от
   2.4.3 и вливается в 3.0. Данные — PC.ARCS и PC.RELEASES из
   js/data-history.js, длинные тексты вех — PC.HISTORY оттуда же.

   Модуль состоит из двух слоёв.
     1. Чистая раскладка — buildGraph / layout / stats. Не знает ни про
        DOM, ни про язык: из списка выпусков получает координаты узлов и
        пути рёбер в «единицах строки». Поэтому её и проверяют тестом
        (tests/history-tree.test.js): ошибка в раскладке — это узлы друг
        на друге, а заметить её на глаз можно только в браузере.
     2. Отрисовка — mount. Линии рисует SVG, а узлы и подписи — обычные
        кнопки: у кнопки есть фокус, имя для скринридера и нормальная
        область касания, и всё это не надо изобретать заново на <g>.

   Как сходятся SVG и строки. Все строки одной высоты, поэтому SVG растянут
   на весь список (preserveAspectRatio="none"), а его viewBox задан в
   тех же единицах, в каких считает раскладка. Масштаб по горизонтали
   всегда 1 — ширина дорожек задана в пикселях, — а по вертикали он
   следует за строкой: при крупном тексте (--text-k) строки растут, и
   линии растут вместе с ними. Кружки узлов поэтому не в SVG: их
   растянуло бы в овалы. ============ */
(function(PC){
  "use strict";

  var ROW = 50;          /* высота строки в единицах viewBox; в CSS — --ht-row */
  var LANE_GAP = 22;     /* расстояние между дорожками, px */
  var PAD_X = 14;        /* поле слева и справа от крайних дорожек, px */
  var DAY = 86400000;
  var NS = "http://www.w3.org/2000/svg";

  /* ---------- чистая раскладка ---------- */

  /* Узел остаётся в режиме «только вехи», если это веха, текущая
     версия или развилка. */
  function isKey(r){ return !!(r.ms || r.cur || r.pin); }

  /* Родители по данным: предыдущий выпуск той же линии; у первого
     выпуска линии — from; плюс merge, если в него влилась другая ветка. */
  function buildGraph(releases){
    var byId = {}, lastOfArc = {}, nodes = [];
    releases.forEach(function(r, i){
      var parents = [];
      if(lastOfArc[r.arc]) parents.push(lastOfArc[r.arc]);
      else if(r.from) parents.push(r.from);
      if(r.merge) parents.push(r.merge);
      lastOfArc[r.arc] = r.v;
      var n = { id:r.v, rel:r, order:i, parents:parents };
      byId[r.v] = n;
      nodes.push(n);
    });
    return { nodes:nodes, byId:byId };
  }

  /* Рёбра рисуются от дочернего узла (выше на экране) к родителю.
     Одна дорожка — прямая; ответвление — прямая по боковой дорожке и
     плавный S-изгиб у родителя; слияние — изгиб у дочернего узла и
     прямая дальше. Вертикальные касательные на концах дают то
     плавное вхождение в узел, по которому граф и узнаётся как git. */
  function edgePath(c, p, row){
    var d, k;
    if(c.lane === p.lane){
      return "M" + c.x + " " + c.y + "L" + p.x + " " + p.y;
    }
    k = row * 0.9;
    if(c.lane > p.lane){
      var ys = Math.max(c.y, p.y - k), ym = (ys + p.y) / 2;
      d = "M" + c.x + " " + c.y + (ys > c.y ? "L" + c.x + " " + ys : "") +
          "C" + c.x + " " + ym + " " + p.x + " " + ym + " " + p.x + " " + p.y;
    }else{
      var ye = Math.min(p.y, c.y + k), me = (c.y + ye) / 2;
      d = "M" + c.x + " " + c.y +
          "C" + c.x + " " + me + " " + p.x + " " + me + " " + p.x + " " + ye +
          (ye < p.y ? "L" + p.x + " " + p.y : "");
    }
    return d;
  }

  function layout(releases, arcs, opts){
    opts = opts || {};
    var row = opts.row || ROW, gap = opts.laneGap || LANE_GAP, padX = opts.padX || PAD_X;
    var g = buildGraph(releases);
    var arcOf = {}, maxLane = 0;
    arcs.forEach(function(a){ arcOf[a.id] = a; if(a.lane > maxLane) maxLane = a.lane; });

    var visible = g.nodes.filter(function(n){ return !opts.keyOnly || isKey(n.rel); });
    var vis = {};
    visible.forEach(function(n){ vis[n.id] = true; });

    /* Скрытый родитель заменяется ближайшим видимым предком по первой
       цепочке: так в режиме «только вехи» линия не рвётся. */
    function resolve(id){
      var n = g.byId[id], guard = 0;
      while(n && !vis[n.id] && guard++ < 1000) n = g.byId[n.parents[0]];
      return n ? n.id : null;
    }

    var total = visible.length;
    var nodes = visible.slice().reverse().map(function(n, k){
      var arc = arcOf[n.rel.arc] || { lane:0 };
      return {
        id:n.id, rel:n.rel, arc:n.rel.arc, lane:arc.lane, row:k,
        x:padX + arc.lane * gap, y:k * row + row / 2, parents:[]
      };
    });
    var byId = {};
    nodes.forEach(function(n){ byId[n.id] = n; });

    var edges = [];
    nodes.forEach(function(c){
      var seen = {};
      g.byId[c.id].parents.forEach(function(pid){
        var rid = resolve(pid);
        if(!rid || rid === c.id || seen[rid]) return;
        seen[rid] = true;
        var p = byId[rid];
        if(!p) return;
        c.parents.push(rid);
        /* Цвет ребра: у ответвления и слияния — цвет боковой ветки,
           иначе цвет дочернего выпуска; если линии на одной дорожке
           разные (1.x → 2.x), цвет плавно перетекает от родителя к
           дочернему. */
        var arc = c.lane !== p.lane ? (c.lane > p.lane ? c.arc : p.arc) : c.arc;
        edges.push({
          from:c.id, to:p.id, arc:arc, arc2:p.arc,
          kind:c.lane === p.lane ? "line" : (c.lane > p.lane ? "fork" : "merge"),
          fade:c.lane === p.lane && c.arc !== p.arc,
          y1:c.y, y2:p.y,
          d:edgePath(c, p, row)
        });
      });
    });

    return {
      nodes:nodes, edges:edges, row:row,
      width:padX * 2 + maxLane * gap,
      height:total * row
    };
  }

  /* Сводка: сколько выпусков, веток и дней между первым и последним. */
  function stats(releases, arcs){
    var first = releases[0], last = releases[releases.length - 1];
    var used = {};
    releases.forEach(function(r){ used[r.arc] = true; });
    var days = Math.round((Date.parse(last.date + "T00:00:00Z") -
                           Date.parse(first.date + "T00:00:00Z")) / DAY);
    return {
      releases:releases.length,
      branches:arcs.filter(function(a){ return used[a.id]; }).length,
      days:days
    };
  }

  /* ---------- отрисовка ---------- */

  function el(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs){
    var n = document.createElementNS(NS, tag);
    for(var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* Даты печатаются в UTC, как и в остальных местах проекта: иначе у
     читателя восточнее Лондона «2026-09-06» превратится в пятое. */
  function fmtDate(iso, short){
    var d = new Date(iso + "T00:00:00Z");
    if(isNaN(d)) return iso;
    var o = short ? { day:"numeric", month:"short", timeZone:"UTC" }
                  : { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" };
    return d.toLocaleDateString(PC.i18n.isRu() ? "ru-RU" : "en-GB", o);
  }

  function arcName(a){
    var n = PC.L(a, "name");
    if(!n) return "";
    return PC.i18n.isRu() ? "«" + n + "»" : "“" + n + "”";
  }
  function arcTitle(a){ return a.label + (a.name ? " " + arcName(a) : ""); }

  function mount(host, sumEl){
    if(!host || !PC.RELEASES || !PC.RELEASES.length || !PC.ARCS) return null;

    var RELEASES = PC.RELEASES, ARCS = PC.ARCS;
    var arcById = {};
    ARCS.forEach(function(a){ arcById[a.id] = a; });
    var graph = buildGraph(RELEASES);
    var msByV = {};
    (PC.HISTORY || []).forEach(function(h){ msByV[h.v] = h; });

    var wide = window.matchMedia ? window.matchMedia("(min-width:900px)") : { matches:true };
    var keyOnly = false, arcFilter = null, selId = null, open = false, focusId = null;
    var lay = null, rowsById = {};
    var cur = RELEASES.filter(function(r){ return r.cur; })[0] || RELEASES[RELEASES.length - 1];

    host.textContent = "";
    host.classList.add("ht");
    host.setAttribute("role", "group");
    host.setAttribute("aria-label", PC.t("ab.ht.aria"));

    /* ----- легенда ----- */
    var bar = el("div", "ht-bar");
    var legend = el("div", "ht-legend");
    legend.setAttribute("role", "group");
    legend.setAttribute("aria-label", PC.t("ab.ht.legend"));
    var chips = {};
    ARCS.forEach(function(a){
      var b = el("button", "ht-chip a-" + a.id);
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.title = PC.L(a, "d");
      b.appendChild(el("span", "ht-chip-dot"));
      b.appendChild(el("span", "ht-chip-t", arcTitle(a)));
      b.addEventListener("click", function(){
        arcFilter = arcFilter === a.id ? null : a.id;
        applyFilter();
      });
      legend.appendChild(b);
      chips[a.id] = b;
    });
    var only = el("button", "ht-chip ht-only", PC.t("ab.ht.only"));
    only.type = "button";
    only.setAttribute("aria-pressed", "false");
    only.addEventListener("click", function(){
      keyOnly = !keyOnly;
      only.setAttribute("aria-pressed", String(keyOnly));
      renderTree();
      /* карточка перерисовывается и тогда, когда выбор пережил фильтр:
         её кнопки «новее / старее» указывают на соседей в новом наборе */
      select(selId && rowsById[selId] ? selId : cur.v, { silent:true });
    });
    bar.appendChild(legend);
    bar.appendChild(only);
    host.appendChild(bar);
    host.appendChild(el("p", "ht-hint", PC.t("ab.ht.hint")));

    /* ----- тело: дерево и карточка ----- */
    var body = el("div", "ht-body");
    var treeWrap = el("div", "ht-treewrap");
    var tree = el("div", "ht-tree");
    treeWrap.appendChild(tree);
    var panel = el("aside", "ht-panel");
    panel.setAttribute("aria-live", "polite");
    panel.setAttribute("aria-atomic", "true");
    panel.setAttribute("aria-label", PC.t("ab.ht.panel"));
    body.appendChild(treeWrap);
    body.appendChild(panel);
    host.appendChild(body);

    function rowLabel(n){
      var r = n.rel, a = arcById[r.arc];
      var parts = [r.v + (a && a.name ? " " + arcName(a) : ""), fmtDate(r.date)];
      parts.push(PC.t("ab.ht.branch") + " " + (a ? a.label : ""));
      if(r.ms) parts.push(PC.t("ab.ht.ms"));
      if(r.cur) parts.push(PC.t("ab.ht.cur"));
      return parts.join(", ");
    }

    function renderTree(){
      lay = layout(RELEASES, ARCS, { keyOnly:keyOnly });
      tree.textContent = "";
      rowsById = {};
      tree.style.setProperty("--ht-w", lay.width + "px");

      var s = svg("svg", {
        "class":"ht-svg", width:lay.width, height:"100%",
        viewBox:"0 0 " + lay.width + " " + lay.height,
        preserveAspectRatio:"none", "aria-hidden":"true", focusable:"false"
      });
      var defs = svg("defs", {});
      s.appendChild(defs);
      lay.edges.forEach(function(e, i){
        var stroke = "";
        if(e.fade){
          var id = "htg" + i;
          var gr = svg("linearGradient", { id:id, gradientUnits:"userSpaceOnUse",
            x1:0, y1:e.y1, x2:0, y2:e.y2 });
          /* Переход цвета сжат в середину: на длинном ребре (3.0 → 2.4.3
             минует строку RPC) равномерный градиент давал бы серую
             полосу между розовым и зелёным. */
          gr.appendChild(svg("stop", { offset:"0.3", "class":"s-" + e.arc }));
          gr.appendChild(svg("stop", { offset:"0.7", "class":"s-" + e.arc2 }));
          defs.appendChild(gr);
          stroke = "url(#" + id + ")";
        }
        ["ht-glow", "ht-edge"].forEach(function(cls){
          var p = svg("path", { d:e.d, "class":cls + " a-" + e.arc, "vector-effect":"non-scaling-stroke" });
          p.dataset.arc = e.arc; p.dataset.arc2 = e.arc2;
          if(stroke) p.style.stroke = stroke;
          s.appendChild(p);
        });
      });
      tree.appendChild(s);

      var ol = el("ol", "ht-list");
      lay.nodes.forEach(function(n, k){
        var r = n.rel, a = arcById[r.arc];
        var li = el("li", "ht-li");
        var b = el("button", "ht-row a-" + r.arc +
          (r.ms ? " is-ms" : "") + (r.cur ? " is-cur" : "") + (n.lane ? " is-side" : ""));
        b.type = "button";
        b.dataset.id = r.v;
        b.dataset.arc = r.arc;
        b.style.setProperty("--i", String(Math.min(k, 16)));
        b.setAttribute("aria-label", rowLabel(n));
        b.tabIndex = -1;

        var dot = el("span", "ht-dot");
        dot.style.left = n.x + "px";
        b.appendChild(dot);

        var txt = el("span", "ht-txt");
        var l1 = el("span", "ht-l1");
        l1.appendChild(el("b", "ht-v", r.v));
        if(a && a.name) l1.appendChild(el("span", "ht-nm", arcName(a)));
        if(r.cur) l1.appendChild(el("span", "ht-now", PC.t("ab.ht.cur")));
        l1.appendChild(el("span", "ht-d", fmtDate(r.date, true)));
        txt.appendChild(l1);
        var ms = r.ms && msByV[r.ms];
        if(ms) txt.appendChild(el("span", "ht-l2", PC.L(ms, "h")));
        b.appendChild(txt);

        b.addEventListener("click", function(){ select(r.v, { user:true }); });
        b.addEventListener("focus", function(){ focusId = r.v; syncTab(); });
        li.appendChild(b);
        ol.appendChild(li);
        rowsById[r.v] = b;
      });
      ol.addEventListener("keydown", onKey);
      tree.appendChild(ol);

      if(!focusId || !rowsById[focusId]) focusId = selId && rowsById[selId] ? selId : lay.nodes[0].id;
      syncTab();
      applyFilter();
    }

    /* Один пункт списка в порядке табуляции (roving tabindex): иначе
       сорок узлов подряд — это сорок нажатий Tab, чтобы проехать мимо. */
    function syncTab(){
      Object.keys(rowsById).forEach(function(id){
        rowsById[id].tabIndex = id === focusId ? 0 : -1;
      });
    }

    function applyFilter(){
      host.classList.toggle("has-filter", !!arcFilter);
      Object.keys(chips).forEach(function(id){
        chips[id].setAttribute("aria-pressed", String(arcFilter === id));
      });
      Object.keys(rowsById).forEach(function(id){
        var b = rowsById[id];
        b.classList.toggle("is-dim", !!arcFilter && b.dataset.arc !== arcFilter);
      });
      tree.querySelectorAll(".ht-edge,.ht-glow").forEach(function(p){
        p.classList.toggle("is-dim", !!arcFilter &&
          p.dataset.arc !== arcFilter && p.dataset.arc2 !== arcFilter);
      });
    }

    /* ----- клавиатура ----- */
    function move(to){
      var ids = lay.nodes.map(function(n){ return n.id; });
      var i = ids.indexOf(focusId);
      var j = to === "home" ? 0 : to === "end" ? ids.length - 1 :
              Math.max(0, Math.min(ids.length - 1, i + to));
      var b = rowsById[ids[j]];
      if(!b) return;
      b.focus();
      /* На широком экране карточка следует за фокусом, как в списке;
         на узком она перекрывала бы дерево при каждом нажатии. */
      if(wide.matches) select(ids[j], { silent:true });
    }
    function onKey(e){
      var k = e.key;
      if(k === "ArrowDown" || k === "ArrowRight") move(1);
      else if(k === "ArrowUp" || k === "ArrowLeft") move(-1);
      else if(k === "Home") move("home");
      else if(k === "End") move("end");
      else return;
      e.preventDefault();
    }
    host.addEventListener("keydown", function(e){
      if(e.key === "Escape" && open && !wide.matches){ close(true); }
    });

    /* ----- карточка ----- */
    function chev(down){
      var s = svg("svg", { viewBox:"0 0 16 16", width:14, height:14, "aria-hidden":"true", focusable:"false" });
      s.appendChild(svg("path", { d:down ? "M3.5 6l4.5 4.5L12.5 6" : "M3.5 10L8 5.5l4.5 4.5",
        fill:"none", stroke:"currentColor", "stroke-width":"1.8", "stroke-linecap":"round", "stroke-linejoin":"round" }));
      return s;
    }

    function relations(r, n){
      var out = [];
      var first = graph.byId[r.v].parents[0];
      var par = first && graph.byId[first];
      var isFirst = r.from && par && par.rel.arc !== r.arc;
      if(isFirst){
        var side = (arcById[par.rel.arc] || {}).lane !== (arcById[r.arc] || {}).lane;
        out.push(PC.t(side ? "ab.ht.forked" : "ab.ht.cont", { v:r.from }));
      }
      if(r.merge) out.push(PC.t("ab.ht.merged", { v:r.merge }));
      RELEASES.forEach(function(o){
        if(o.merge === r.v) out.push(PC.t("ab.ht.mergedInto", { v:o.v }));
      });
      return out;
    }

    function renderPanel(n){
      var r = n.rel, a = arcById[r.arc];
      panel.textContent = "";
      panel.className = "ht-panel a-" + r.arc + (open ? " is-open" : "") + (r.cur ? " is-cur" : "");

      var top = el("div", "ht-p-top");
      var tag = el("span", "ht-p-arc");
      tag.appendChild(el("span", "ht-chip-dot"));
      tag.appendChild(document.createTextNode(arcTitle(a)));
      top.appendChild(tag);
      var i = lay.nodes.indexOf(n);
      [[-1, "ab.ht.newer", false], [1, "ab.ht.older", true]].forEach(function(d){
        var tgt = lay.nodes[i + d[0]];
        var b = el("button", "ht-p-go");
        b.type = "button";
        b.disabled = !tgt;
        var name = PC.t(d[1]) + (tgt ? ": " + tgt.id : "");
        b.setAttribute("aria-label", name);
        b.title = name;
        b.appendChild(chev(d[2]));
        if(tgt) b.addEventListener("click", function(){
          select(tgt.id, { user:true });
          var row = rowsById[tgt.id];
          if(row){ focusId = tgt.id; syncTab(); row.scrollIntoView({ block:"nearest", behavior:"auto" }); }
        });
        top.appendChild(b);
      });
      var x = el("button", "ht-p-x");
      x.type = "button";
      x.setAttribute("aria-label", PC.t("ab.ht.close"));
      x.innerHTML = PC.icon("close");
      x.addEventListener("click", function(){ close(true); });
      top.appendChild(x);
      panel.appendChild(top);

      var h = el("h4", "ht-p-v");
      h.appendChild(document.createTextNode(r.v));
      if(a.name) h.appendChild(el("span", "ht-p-nm", arcName(a)));
      if(r.cur) h.appendChild(el("span", "ht-now", PC.t("ab.ht.cur")));
      panel.appendChild(h);
      panel.appendChild(el("p", "ht-p-date", fmtDate(r.date)));
      panel.appendChild(el("p", "ht-p-s", PC.L(r, "s")));

      var ms = r.ms && msByV[r.ms];
      if(ms){
        var box = el("div", "ht-p-ms");
        box.appendChild(el("span", "ht-p-eye", PC.t("ab.ht.ms")));
        box.appendChild(el("b", "ht-p-h", PC.L(ms, "h")));
        box.appendChild(el("p", "ht-p-long", PC.L(ms, "p")));
        panel.appendChild(box);
      }

      var rel = relations(r, n);
      if(rel.length){
        var ul = el("ul", "ht-p-rel");
        rel.forEach(function(t){ ul.appendChild(el("li", "", t)); });
        panel.appendChild(ul);
      }
    }

    function markSelected(){
      Object.keys(rowsById).forEach(function(id){
        var on = id === selId && (wide.matches || open);
        rowsById[id].classList.toggle("is-sel", on);
        if(on) rowsById[id].setAttribute("aria-current", "true");
        else rowsById[id].removeAttribute("aria-current");
      });
    }

    function select(id, o){
      o = o || {};
      var n = lay.nodes.filter(function(x){ return x.id === id; })[0];
      if(!n) return;
      selId = id;
      if(o.user && !wide.matches) open = true;
      if(wide.matches) open = true;
      renderPanel(n);
      panel.classList.toggle("is-open", open);
      markSelected();
      if(o.user && !wide.matches) clearOfSheet(id);
    }

    /* Лист встаёт поверх нижней части экрана и мог бы закрыть ровно ту
       строку, которой коснулись. Поэтому, если строка оказалась под
       листом, страница прокручивается ровно настолько, чтобы она вышла
       из-под него. */
    function clearOfSheet(id){
      var row = rowsById[id];
      if(!row || !window.requestAnimationFrame) return;
      window.requestAnimationFrame(function(){
        /* Верх листа считается из его высоты и отступа снизу, а не
           измеряется: во время появления лист ещё смещён анимацией. */
        var gap = parseFloat(getComputedStyle(panel).bottom) || 0;
        var top = window.innerHeight - gap - panel.offsetHeight;
        var rr = row.getBoundingClientRect();
        var over = rr.bottom - (top - 10);
        if(over > 0 && rr.top > 0) window.scrollBy(0, over);
      });
    }

    function close(refocus){
      open = false;
      panel.classList.remove("is-open");
      var id = selId;
      if(!wide.matches) selId = null;
      markSelected();
      if(refocus && id && rowsById[id]) rowsById[id].focus();
    }

    function onWide(){
      if(wide.matches){ if(!selId || !rowsById[selId]) select(cur.v, { silent:true }); else select(selId, { silent:true }); }
      else close(false);
    }
    if(wide.addEventListener) wide.addEventListener("change", onWide);
    else if(wide.addListener) wide.addListener(onWide);

    /* ----- итог под деревом ----- */
    if(sumEl){
      var st = stats(RELEASES, ARCS);
      sumEl.textContent = PC.t("ab.ht.sum", {
        n:PC.i18n.n(st.releases, "ab.ht.w.rel"),
        m:PC.i18n.n(st.branches, "ab.ht.w.br"),
        k:PC.i18n.n(st.days, "ab.ht.w.day")
      });
    }

    renderTree();
    if(wide.matches) select(cur.v, { silent:true });

    /* Появление: узлы выезжают по очереди, когда дерево попадает в кадр.
       Класс is-in ставится и без IntersectionObserver — без него дерево
       осталось бы невидимым; а при «Анимации: выкл» и
       prefers-reduced-motion переходы в CSS обнуляются. */
    if("IntersectionObserver" in window){
      var io = new IntersectionObserver(function(es){
        if(es.some(function(x){ return x.isIntersecting; })){
          host.classList.add("is-in");
          io.disconnect();
        }
      }, { rootMargin:"0px 0px -8% 0px" });
      io.observe(host);
    }else host.classList.add("is-in");

    return { select:select, render:renderTree };
  }

  PC.historyTree = {
    ROW:ROW, LANE_GAP:LANE_GAP, PAD_X:PAD_X,
    isKey:isKey, buildGraph:buildGraph, layout:layout, stats:stats, mount:mount
  };
})(window.PC = window.PC || {});
