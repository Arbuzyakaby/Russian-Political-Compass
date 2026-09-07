/* ============ Боковая панель: список партий и карточка партии ============ */
(function(PC){
  "use strict";
  var U = PC.utils, fmt = U.fmt, esc = U.esc;
  var body, title, countEl;

  function init(){
    body    = document.getElementById("sideBody");
    title   = document.getElementById("sideTitle");
    countEl = document.getElementById("count");
  }

  function econLabel(x){ return x < -3 ? "левые" : x > 3 ? "правые" : "центр"; }
  function stateLabel(y){ return y < -3 ? "либертарианство" : y > 3 ? "этатизм" : "центр"; }

  function renderList(list, activeId){
    var sorted = list.slice().sort(function(a, b){ return PC.seatsOf(b) - PC.seatsOf(a); });
    countEl.textContent = sorted.length;
    countEl.hidden = false;
    title.textContent = "Партии · мандаты в ГД · " + PC.convocationInfo().label;

    if(!sorted.length){
      body.innerHTML = '<div class="empty">Ничего не найдено.<br>Попробуйте изменить запрос.</div>';
      return;
    }
    body.innerHTML = '<div class="plist">' + sorted.map(function(p, i){
      var seats = PC.seatsOf(p);
      return '<button type="button" class="pitem' + (p.id === activeId ? " active" : "") + '"' +
             ' data-id="' + esc(p.id) + '" style="animation-delay:' + (i * 35) + 'ms">' +
               '<span class="sw" style="background:' + esc(p.color) + '"></span>' +
               '<span class="nm">' + esc(p.name) + '<small>' + esc(p.ideology) + '</small></span>' +
               '<span class="mandates"><b>' + seats + '</b>мандат' + U.plural(seats) + '</span>' +
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
    return '<div class="sect"><h4>Мандаты по созывам</h4>' +
      '<div class="hist">' + convs.map(function(c, i){
        var v = vals[i];
        var h = v ? Math.max(4, v / max * 58) : 3;
        return '<div class="col">' +
          '<span class="num">' + (v === null ? "—" : v) + '</span>' +
          '<span class="bar-v' + (v ? "" : " none") + '" data-h="' + h.toFixed(1) + '"' +
            ' style="background:' + esc(p.color) + '"></span>' +
          '<span class="lbl">' + esc(c.label.split(" ")[0]) + '</span></div>';
      }).join("") + '</div>' +
      '<div class="hist-note">' +
        (any ? "Максимум за период — " + max + " мандат" + U.plural(max)
             : "Партия ни разу не получала мандатов в Госдуме") +
        ". «—» — партии в том созыве не существовало.</div></div>";
  }

  /* Траектория партии словами: те же точки, что рисует слой «Траектории»
     на компасе, но здесь их видно без включения слоя и с полным текстом
     пояснения — на поле оно доступно только по наведению. */
  function trailBlock(p){
    if(!p.history || p.history.length < 2) return "";
    var from = p.history[0], to = p.history[p.history.length - 1];
    var dx = to.x - from.x, dy = to.y - from.y;
    function move(d, neg, pos){
      if(Math.abs(d) < .5) return "почти без сдвига";
      return (d < 0 ? neg : pos) + " на " + Math.abs(d).toFixed(1);
    }
    return '<div class="sect trail-sect"><h4>Как менялась позиция</h4>' +
      '<ol class="tline">' + p.history.map(function(h){
        return '<li><span class="y">' + h.year + '</span>' +
          '<span class="c">' + fmt(h.x) + ' / ' + fmt(h.y) + '</span>' +
          '<p>' + esc(h.note) + '</p></li>';
      }).join("") + '</ol>' +
      '<div class="hist-note">С ' + from.year + " по " + to.year + ": экономика — " +
        move(dx, "влево", "вправо") + ", отношение к государству — " +
        move(dy, "вниз к свободам", "вверх к этатизму") + ".</div></div>";
  }

  function renderDetail(p, animate){
    countEl.hidden = true;
    title.textContent = "Карточка партии";
    var seats = PC.seatsOf(p);
    var conv = PC.convocationInfo();
    var pct = seats / PC.TOTAL_SEATS * 100;

    body.innerHTML =
      '<div class="detail' + (animate === false ? " no-anim" : "") + '">' +
        '<button type="button" class="back" id="back">← Все партии</button>' +
        '<div class="d-head">' +
          '<div class="d-badge" style="background:' + esc(p.color) + ';--glow:' + esc(p.color) + '">' +
            esc(p.name.trim().charAt(0)) + '</div>' +
          '<div><h3>' + esc(p.name) + '</h3><div class="ideo">' + esc(p.ideology) + '</div></div>' +
        '</div>' +
        '<div class="leader"><span class="k">Лидер партии</span><span class="v">' + esc(p.leader) + '</span></div>' +
        '<div class="coords">' +
          '<div class="coord"><div class="k">Экономика</div><div class="v">' + fmt(p.x) + '</div>' +
            '<div class="d">' + econLabel(p.x) + '</div></div>' +
          '<div class="coord"><div class="k">Гос. контроль</div><div class="v">' + fmt(p.y) + '</div>' +
            '<div class="d">' + stateLabel(p.y) + '</div></div>' +
        '</div>' +
        '<div class="mandate-box">' +
          '<div class="mandate-top">' +
            '<span class="k">Госдума ' + esc(conv.label) + '</span>' +
            '<span class="v">' + seats + ' <small>/ ' + PC.TOTAL_SEATS + ' мест</small></span>' +
          '</div>' +
          '<div class="bar"><i id="bar" style="background:' + esc(p.color) + '"></i></div>' +
          '<div class="mandate-note">' +
            (seats ? pct.toFixed(1) + "% состава палаты"
                   : "Партия не преодолела барьер и не получила мандатов") +
          '</div>' +
        '</div>' +
        histBlock(p) +
        '<div class="sect"><h4>Ключевые тезисы</h4><ul>' +
          p.theses.map(function(t){ return "<li>" + esc(t) + "</li>"; }).join("") +
        '</ul></div>' +
        '<div class="sect"><h4>Почему такие координаты</h4>' +
          '<div class="note"><p>' + esc(p.why) + '</p></div></div>' +
        trailBlock(p) +
      '</div>';

    body.scrollTop = 0;
    document.getElementById("back").addEventListener("click", function(){ PC.select(null); });

    /* ширина полосы задаётся в следующем кадре, чтобы сработал transition */
    requestAnimationFrame(function(){
      var bar = document.getElementById("bar");
      if(bar) bar.style.width = Math.max(seats ? 2 : 0, pct) + "%";
      body.querySelectorAll(".hist .bar-v").forEach(function(b){ b.style.height = b.dataset.h + "px"; });
    });
  }

  PC.sidebar = { init:init, renderList:renderList, renderDetail:renderDetail };
})(window.PC = window.PC || {});
