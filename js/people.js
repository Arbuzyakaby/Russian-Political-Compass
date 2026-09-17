/* ============ Карточка человека (2.3.2, обобщена в 2.4) ============

   Единственная карточка на странице, которая не проходит через
   js/sidebar.js: та карточка целиком выстроена вокруг данных партии
   (мандаты, голосования, соседи по полю), которых у людей из
   PC.PEOPLE нет и не будет. Здесь — отдельное всплывающее окно на базе
   того же .sheet/.sheet-scrim, которым уже пользуются настройки
   (js/settings.js): тот же способ открытия, тот же захват фокуса и Esc,
   но с одной панелью вместо рельса разделов и с собственной, более
   «прикольной» версткой (css/people.css).

   До 2.4 этот файл назывался js/putin.js и знал ровно одного человека:
   имя в заголовке стояло в разметке, открытие не принимало аргументов.
   Теперь лист один на всех, а человек приходит параметром open(id) —
   заголовок, печать и акцентный цвет подставляются при отрисовке.
   Добавление четвёртого человека этот файл не трогает вовсе. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc, fmt = U.fmt;
  var t = PC.t, L = PC.L;

  var sheet, scrim, titleEl, lastFocus = null, currentId = null;

  function econLabel(x){ return t(x < -3 ? "side.labels.left" : x > 3 ? "side.labels.right" : "side.labels.centre"); }
  function stateLabel(y){ return t(y < -3 ? "side.labels.lib" : y > 3 ? "side.labels.stat" : "side.labels.centre"); }

  function pos(v, color){
    var w = Math.abs(v) / 10 * 50, l = v < 0 ? 50 - w : 50;
    return '<div class="coord-bar" aria-hidden="true"><i style="left:' + l.toFixed(2) + '%;width:' +
           Math.max(1.5, w).toFixed(2) + '%;background:' + esc(color) + '"></i></div>';
  }

  /* Дата сверки показывается в локали интерфейса, а не как ISO-строка:
     «17 сентября 2026» читается, «2026-09-17» — сверяется. В данных
     лежит вторая форма именно потому, что её удобно сверять глазами
     в дифе. */
  function checked(p){
    if(!p.updatedAt) return "";
    var d = new Date(p.updatedAt + "T00:00:00Z");
    if(isNaN(d.getTime())) return "";
    var loc = PC.i18n.isRu() ? "ru-RU" : "en-GB";
    var human = d.toLocaleDateString(loc, { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" });
    return '<p class="pt-checked"><span class="pt-checked-dot" aria-hidden="true"></span>' +
           esc(t("person.checked", { date:human })) + '</p>';
  }

  function render(p){
    var body = document.getElementById("personBody");
    if(!body || !p) return;
    if(titleEl) titleEl.textContent = L(p, "name");
    body.innerHTML =
      '<div class="detail person-card" style="--party:' + esc(p.color) + '">' +
        '<div class="d-head">' +
          '<div class="d-badge person-badge" style="background:' + esc(p.color) + ';--glow:' + esc(p.color) + '">' +
            PC.compass.sealSVG(p.seal) +
          '</div>' +
          '<div><h3>' + esc(L(p, "name")) + '</h3><div class="ideo">' + esc(L(p, "role")) + '</div></div>' +
        '</div>' +
        '<span class="pt-badge">' + esc(L(p, "badge")) + '</span>' +
        '<p class="d-summary">' + esc(L(p, "summary")) + '</p>' +
        '<div class="coords">' +
          '<div class="coord"><div class="k">' + esc(t("side.econ")) + '</div><div class="v">' + fmt(p.x) + '</div>' +
            '<div class="d">' + esc(econLabel(p.x)) + '</div>' + pos(p.x, p.color) + '</div>' +
          '<div class="coord"><div class="k">' + esc(t("side.state")) + '</div><div class="v">' + fmt(p.y) + '</div>' +
            '<div class="d">' + esc(stateLabel(p.y)) + '</div>' + pos(p.y, p.color) + '</div>' +
        '</div>' +
        '<div class="sect"><h4>' + esc(t("side.theses")) + '</h4><ul>' +
          L(p, "theses").map(function(x){ return "<li>" + esc(x) + "</li>"; }).join("") +
        '</ul></div>' +
        '<div class="sect"><h4>' + esc(t("side.why")) + '</h4>' +
          '<div class="note"><p>' + esc(L(p, "why")) + '</p></div></div>' +
        '<p class="pt-note">' + esc(L(p, "note")) + '</p>' +
        checked(p) +
      '</div>';
  }

  /* ---------- открытие и закрытие: тот же рецепт, что у js/settings.js ---------- */
  function focusables(){
    return Array.prototype.filter.call(
      sheet.querySelectorAll('button:not([tabindex="-1"]),[href],input,select'),
      function(n){ return !n.disabled && n.offsetParent !== null; });
  }

  function open(id){
    var p = PC.personById(id);
    if(!sheet || !sheet.hidden || !p) return;
    currentId = id;
    render(p);
    sheet.dataset.person = id;
    var body = sheet.querySelector(".sheet-body");
    if(body) body.scrollTop = 0;
    lastFocus = document.activeElement;
    sheet.hidden = false;
    scrim.hidden = false;
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        sheet.classList.add("is-open");
        scrim.classList.add("is-open");
      });
    });
    document.body.classList.add("sheet-lock");
    var first = focusables()[0];
    if(first) first.focus({ preventScroll:true });
  }

  function close(){
    if(!sheet || sheet.hidden) return;
    sheet.classList.remove("is-open");
    scrim.classList.remove("is-open");
    document.body.classList.remove("sheet-lock");
    var done = function(){ sheet.hidden = true; scrim.hidden = true; currentId = null; };
    var reduced = document.documentElement.dataset.motion === "off" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(reduced) done(); else setTimeout(done, 300);
    if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
  }

  function init(){
    sheet = document.getElementById("personSheet");
    scrim = document.getElementById("personScrim");
    if(!sheet || !scrim) return;
    titleEl = document.getElementById("personTitle");

    scrim.addEventListener("click", close);
    var closeBtn = document.getElementById("personClose");
    if(closeBtn) closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", function(e){
      if(sheet.hidden) return;
      if(e.key === "Escape"){ e.preventDefault(); close(); return; }
      if(e.key === "Tab"){
        var list = focusables();
        if(!list.length) return;
        var first = list[0], last = list[list.length - 1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });

  }

  PC.people = { init:init, open:open, close:close };
})(window.PC = window.PC || {});
