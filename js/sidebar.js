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
    var sorted = list.slice().sort(function(a, b){ return b.seats - a.seats; });
    countEl.textContent = sorted.length;
    countEl.hidden = false;
    title.textContent = "Партии · мандаты в ГД";

    if(!sorted.length){
      body.innerHTML = '<div class="empty">Ничего не найдено.<br>Попробуйте изменить запрос.</div>';
      return;
    }
    body.innerHTML = '<div class="plist">' + sorted.map(function(p, i){
      return '<button type="button" class="pitem' + (p.id === activeId ? " active" : "") + '"' +
             ' data-id="' + esc(p.id) + '" style="animation-delay:' + (i * 35) + 'ms">' +
               '<span class="sw" style="background:' + esc(p.color) + '"></span>' +
               '<span class="nm">' + esc(p.name) + '<small>' + esc(p.ideology) + '</small></span>' +
               '<span class="mandates"><b>' + p.seats + '</b>мандат' + U.plural(p.seats) + '</span>' +
             '</button>';
    }).join("") + '</div>';

    body.querySelectorAll(".pitem").forEach(function(b){
      b.addEventListener("click", function(){ PC.select(b.dataset.id); });
    });
    body.scrollTop = 0;
  }

  function renderDetail(p){
    countEl.hidden = true;
    title.textContent = "Карточка партии";
    var pct = p.seats / PC.TOTAL_SEATS * 100;

    body.innerHTML =
      '<div class="detail">' +
        '<button type="button" class="back" id="back">← Все партии</button>' +
        '<div class="d-head">' +
          '<div class="d-badge" style="background:' + esc(p.color) + ';color:' + esc(p.color) + '">' +
            esc(p.name.trim().charAt(0)) + '</div>' +
          '<div><h3>' + esc(p.name) + '</h3><div class="ideo">' + esc(p.ideology) + '</div></div>' +
        '</div>' +
        '<div class="coords">' +
          '<div class="coord"><div class="k">Экономика</div><div class="v">' + fmt(p.x) + '</div>' +
            '<div class="d">' + econLabel(p.x) + '</div></div>' +
          '<div class="coord"><div class="k">Гос. контроль</div><div class="v">' + fmt(p.y) + '</div>' +
            '<div class="d">' + stateLabel(p.y) + '</div></div>' +
        '</div>' +
        '<div class="mandate-box">' +
          '<div class="mandate-top">' +
            '<span class="k">Госдума VIII созыва</span>' +
            '<span class="v">' + p.seats + ' <small>/ ' + PC.TOTAL_SEATS + ' мест</small></span>' +
          '</div>' +
          '<div class="bar"><i id="bar" style="background:' + esc(p.color) + '"></i></div>' +
          '<div class="mandate-note">' +
            (p.seats ? pct.toFixed(1) + "% состава палаты"
                     : "Партия не преодолела барьер и не получила мандатов") +
          '</div>' +
        '</div>' +
        '<div class="sect"><h4>Ключевые тезисы</h4><ul>' +
          p.theses.map(function(t){ return "<li>" + esc(t) + "</li>"; }).join("") +
        '</ul></div>' +
        '<div class="sect"><h4>Почему такие координаты</h4>' +
          '<div class="note"><p>' + esc(p.why) + '</p></div></div>' +
      '</div>';

    body.scrollTop = 0;
    document.getElementById("back").addEventListener("click", function(){ PC.select(null); });

    /* ширина полосы задаётся в следующем кадре, чтобы сработал transition */
    requestAnimationFrame(function(){
      var bar = document.getElementById("bar");
      if(bar) bar.style.width = Math.max(p.seats ? 2 : 0, pct) + "%";
    });
  }

  PC.sidebar = { init:init, renderList:renderList, renderDetail:renderDetail };
})(window.PC = window.PC || {});
