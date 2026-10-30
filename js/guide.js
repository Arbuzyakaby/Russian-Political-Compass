/* ============ Обучение 5.1: «Быстрый старт» и «Полный тур» ============

   Написано заново в 5.1: от тура 2.4–5.0 не осталось ни строки, ни ключа
   словаря. Два маршрута по живой странице — короткий (пять шагов, от
   компаса до «О проекте») и полный (двенадцать: созыв, аналитика,
   дуэль, «Голосую сам», палитра, экспорт, настройки).

   Как устроено:
   - затемнение — один SVG во весь экран, в котором путь с правилом
     evenodd вырезает скруглённое окно над целью; поверх окна —
     обводка .guide-ring цветом акцента;
   - подпись — карточка рядом с целью на широком экране и нижний лист
     над панелью вкладок на телефоне (панель остаётся видна, когда
     шаг рассказывает про её кнопку);
   - шаг сам переключает вкладку и ждёт, пока цель займёт место на
     экране; цели нет за отведённое время — шаг пропускается в ту
     сторону, куда человек шёл;
   - прогресс пишется в pc-tour после каждого шага: перезагрузка
     посреди тура продолжает его с того же места.

   Тур ничего не нажимает за человека и не меняет настроек: только
   переключает вкладку и прокручивает страницу. ============ */
(function(PC){
  "use strict";

  var KEY = "pc-tour";
  /* ключи, которые могли остаться от обучения до 5.1, — стираются один раз */
  var RETIRED = ["pc-tour-step", "pc-tour-done", "pc-tour-seen", "pc-tour-v"];
  var WAIT_MS = 1600;
  var PHONE = "(max-width:720px),(pointer:coarse) and (max-width:1050px)";

  /* tab — вкладка цели (null — цель видна на любой); sel — список
     селекторов, берётся первый видимый. */
  var ROUTES = {
    quick: [
      { key:"field",  tab:"compass", sel:["#plot"] },
      { key:"party",  tab:"compass", sel:["#svg .node:not(.person)", "#svg .node"] },
      { key:"quiz",   tab:null,      sel:["#tab-quiz"] },
      { key:"votes",  tab:null,      sel:["#tab-votes"] },
      { key:"book",   tab:null,      sel:["#tab-about"] }
    ],
    full: [
      { key:"field",    tab:"compass", sel:["#plot"] },
      { key:"party",    tab:"compass", sel:["#svg .node:not(.person)", "#svg .node"] },
      { key:"conv",     tab:"compass", sel:["#convSelect"], box:".conv-select" },
      { key:"charts",   tab:"compass", sel:["#hemi"], box:".chart-card" },
      { key:"quiz",     tab:null,      sel:["#tab-quiz"] },
      { key:"votes",    tab:null,      sel:["#tab-votes"] },
      { key:"duel",     tab:"votes",   sel:["#duelFromVotes"] },
      { key:"selfvote", tab:"votes",   sel:["#selfVote"] },
      { key:"palette",  tab:"compass", sel:["#searchWrap"] },
      { key:"export",   tab:"compass", sel:["#exportBtn"] },
      { key:"settings", tab:null,      sel:["#settingsBtn"] },
      { key:"book",     tab:null,      sel:["#tab-about"] }
    ]
  };

  var root = document.documentElement;
  var ui = null, mode = "quick", at = 0, running = false, lastFocus = null;
  var waitTimer = 0, frame = 0, ticket = 0;

  function t(key, vars){ return PC.t ? PC.t(key, vars) : key; }
  function still(){
    return root.dataset.motion === "off" ||
      !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function phone(){ return !!(window.matchMedia && window.matchMedia(PHONE).matches); }

  /* ---------- состояние в хранилище ---------- */
  function read(){
    var s = PC.store ? PC.store.getJSON(KEY, null) : null;
    if(!s || typeof s !== "object") s = {};
    return {
      mode: ROUTES[s.mode] ? s.mode : "quick",
      at: Number.isInteger(s.at) && s.at >= 0 ? s.at : 0,
      run: s.run === true,
      done: { quick: !!(s.done && s.done.quick), full: !!(s.done && s.done.full) }
    };
  }
  function write(patch){
    if(!PC.store) return;
    var s = read();
    Object.keys(patch).forEach(function(k){ s[k] = patch[k]; });
    PC.store.set(KEY, JSON.stringify(s));
  }
  function retire(){
    if(!PC.store) return;
    RETIRED.forEach(function(k){ PC.store.remove(k); });
  }

  /* ---------- цель шага ---------- */
  function visible(node){
    if(!node || node.closest("[hidden]")) return false;
    var r = node.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function find(step){
    for(var i = 0; i < step.sel.length; i++){
      var list = document.querySelectorAll(step.sel[i]);
      for(var j = 0; j < list.length; j++){
        if(visible(list[j])) return step.box ? (list[j].closest(step.box) || list[j]) : list[j];
      }
    }
    return null;
  }

  /* ---------- разметка ---------- */
  function svgEl(name){ return document.createElementNS("http://www.w3.org/2000/svg", name); }
  function el(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text != null) n.textContent = text;
    return n;
  }

  function build(){
    if(ui) return ui;
    var wrap = el("div", "guide");
    wrap.hidden = true;

    var veil = svgEl("svg");
    veil.setAttribute("class", "guide-veil");
    veil.setAttribute("aria-hidden", "true");
    var cut = svgEl("path");
    cut.setAttribute("fill-rule", "evenodd");
    veil.appendChild(cut);

    var ring = el("div", "guide-ring");
    ring.setAttribute("aria-hidden", "true");

    var card = el("section", "guide-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "guideTitle");
    card.setAttribute("aria-describedby", "guideText");
    card.tabIndex = -1;

    var grab = el("span", "guide-grab");
    grab.setAttribute("aria-hidden", "true");

    var top = el("div", "guide-top");
    var chip = el("span", "guide-mode");
    var count = el("span", "guide-count");
    count.id = "guideCount";
    var close = el("button", "guide-x");
    close.type = "button";
    close.id = "guideClose";
    close.innerHTML = '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-close"/></svg>';
    top.append(chip, count, close);

    var bar = el("div", "guide-bar");
    bar.setAttribute("aria-hidden", "true");

    var live = el("div", "guide-live");
    live.setAttribute("aria-live", "polite");
    var title = el("h2", "guide-h");
    title.id = "guideTitle";
    var text = el("p", "guide-p");
    text.id = "guideText";
    live.append(title, text);

    var foot = el("div", "guide-foot");
    var skip = el("button", "guide-skip");
    skip.type = "button";
    skip.id = "guideSkip";
    var back = el("button", "btn ghost guide-back");
    back.type = "button";
    back.id = "guideBack";
    var next = el("button", "btn primary guide-next");
    next.type = "button";
    next.id = "guideNext";
    foot.append(skip, back, next);

    var keys = el("p", "guide-keys");
    keys.setAttribute("aria-hidden", "true");

    card.append(grab, top, bar, live, foot, keys);
    wrap.append(veil, ring, card);
    document.body.appendChild(wrap);

    close.addEventListener("click", function(){ stop(false); });
    skip.addEventListener("click", function(){ stop(false); });
    back.addEventListener("click", function(){ move(-1); });
    next.addEventListener("click", function(){ move(1); });
    /* нажатие мимо карточки ничего не делает: страница под туром заперта */
    wrap.addEventListener("click", function(e){ if(e.target === wrap || veil.contains(e.target)) card.focus({ preventScroll:true }); });

    ui = { wrap:wrap, veil:veil, cut:cut, ring:ring, card:card, chip:chip, count:count, close:close,
           bar:bar, title:title, text:text, skip:skip, back:back, next:next, keys:keys };
    return ui;
  }

  /* ---------- раскладка ---------- */
  function roundRect(x, y, w, h, r){
    r = Math.min(r, w / 2, h / 2);
    return "M" + (x + r) + " " + y + "H" + (x + w - r) + "A" + r + " " + r + " 0 0 1 " + (x + w) + " " + (y + r) +
      "V" + (y + h - r) + "A" + r + " " + r + " 0 0 1 " + (x + w - r) + " " + (y + h) +
      "H" + (x + r) + "A" + r + " " + r + " 0 0 1 " + x + " " + (y + h - r) +
      "V" + (y + r) + "A" + r + " " + r + " 0 0 1 " + (x + r) + " " + y + "Z";
  }

  function place(node){
    var W = window.innerWidth, H = window.innerHeight;
    var r = node.getBoundingClientRect();
    var pad = r.width > W * 0.6 ? 6 : 8;
    var box = {
      x: Math.max(4, r.left - pad), y: Math.max(4, r.top - pad),
      w: Math.min(W - 8, r.width + pad * 2), h: Math.min(H - 8, r.height + pad * 2)
    };
    var radius = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 12;
    radius = Math.max(10, Math.min(radius + pad, 28));

    ui.veil.setAttribute("viewBox", "0 0 " + W + " " + H);
    ui.cut.setAttribute("d", "M0 0H" + W + "V" + H + "H0Z" + roundRect(box.x, box.y, box.w, box.h, radius));
    ui.ring.style.width = box.w + "px";
    ui.ring.style.height = box.h + "px";
    ui.ring.style.borderRadius = radius + "px";
    ui.ring.style.transition = still() ? "none" : "";
    ui.ring.style.transform = "translate(" + box.x + "px," + box.y + "px)";

    var card = ui.card;
    if(phone()){
      card.classList.add("is-sheet");
      card.style.left = card.style.top = "";
      return;
    }
    card.classList.remove("is-sheet");
    var cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
    var spots = [
      { x: box.x + box.w + gap, y: box.y, ok: box.x + box.w + gap + cw <= W - 12 },
      { x: box.x, y: box.y + box.h + gap, ok: box.y + box.h + gap + ch <= H - 12 },
      { x: box.x - cw - gap, y: box.y, ok: box.x - cw - gap >= 12 },
      { x: box.x, y: box.y - ch - gap, ok: box.y - ch - gap >= 12 }
    ];
    var spot = spots.filter(function(s){ return s.ok; })[0] ||
      { x: W - cw - 16, y: H - ch - 16 };
    card.style.left = Math.round(Math.max(12, Math.min(spot.x, W - cw - 12))) + "px";
    card.style.top = Math.round(Math.max(12, Math.min(spot.y, H - ch - 12))) + "px";
  }

  function repaint(){
    if(!running) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function(){
      var node = find(route()[at]);
      if(node) place(node);
    });
  }

  /* ---------- шаги ---------- */
  function route(){ return ROUTES[mode]; }

  function paintText(){
    var steps = route(), step = steps[at], n = steps.length;
    ui.chip.textContent = t("guide.mode." + mode);
    ui.count.textContent = t("guide.count", { n:at + 1, total:n });
    ui.title.textContent = t("guide." + step.key + ".h");
    ui.text.textContent = t("guide." + step.key + ".p");
    ui.close.setAttribute("aria-label", t("guide.close"));
    ui.skip.textContent = t("guide.skip");
    ui.back.textContent = t("guide.back");
    ui.back.disabled = at === 0;
    ui.next.textContent = t(at === n - 1 ? "guide.done" : "guide.next");
    ui.keys.textContent = t("guide.keys");
    ui.bar.replaceChildren();
    for(var i = 0; i < n; i++){
      var seg = el("i", i < at ? "is-past" : i === at ? "is-now" : "");
      ui.bar.appendChild(seg);
    }
  }

  function show(index, dir){
    var steps = route();
    if(index < 0) index = 0;
    if(index >= steps.length){ stop(true); return; }
    at = index;
    write({ mode:mode, at:at, run:true });
    var step = steps[at];
    var my = ++ticket;

    if(step.tab && PC.nav && PC.nav.current() !== step.tab){
      PC.nav.go(step.tab, { silent:true, keepScroll:true });
    }
    ui.wrap.classList.add("is-waiting");
    var started = Date.now();

    (function look(){
      if(my !== ticket || !running) return;
      var node = find(step);
      if(!node){
        if(Date.now() - started > WAIT_MS){
          /* цели нет — шаг выпадает, тур идёт дальше в ту же сторону */
          var to = at + (dir < 0 ? -1 : 1);
          if(to < 0) to = at + 1;
          show(to, dir < 0 && at > 0 ? -1 : 1);
          return;
        }
        waitTimer = setTimeout(look, 90);
        return;
      }
      node.scrollIntoView({ block: phone() ? "center" : "nearest", inline:"nearest",
        behavior: still() ? "auto" : "smooth" });
      setTimeout(function(){
        if(my !== ticket || !running) return;
        paintText();
        ui.wrap.classList.remove("is-waiting");
        ui.card.classList.remove("is-in");
        void ui.card.offsetWidth;
        ui.card.classList.add("is-in");
        place(node);
        ui.next.focus({ preventScroll:true });
        /* плавная прокрутка и появление точек компаса могут сдвинуть цель
           уже после первого замера — вырез догоняет её ещё дважды */
        setTimeout(repaint, 420);
        setTimeout(repaint, 1000);
      }, still() ? 0 : 260);
    })();
  }

  function move(dir){
    if(!running) return;
    clearTimeout(waitTimer);
    show(at + dir, dir);
  }

  /* ---------- клавиатура: стрелки, Escape, фокус в карточке ---------- */
  function onKey(e){
    if(!running) return;
    if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); stop(false); return; }
    if(e.key === "ArrowRight"){ e.preventDefault(); move(1); return; }
    if(e.key === "ArrowLeft"){ e.preventDefault(); if(at > 0) move(-1); return; }
    if(e.key !== "Tab") return;
    var list = [ui.close, ui.skip, ui.back, ui.next].filter(function(b){ return !b.disabled; });
    var first = list[0], last = list[list.length - 1];
    if(!ui.card.contains(document.activeElement)){ e.preventDefault(); first.focus(); return; }
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  /* ---------- запуск и остановка ---------- */
  function start(which, from){
    build();
    mode = ROUTES[which] ? which : "quick";
    if(PC.settings && PC.settings.close) PC.settings.close();
    if(PC.palette && PC.palette.close) PC.palette.close();
    lastFocus = running ? lastFocus : document.activeElement;
    running = true;
    ui.wrap.hidden = false;
    ui.wrap.classList.toggle("is-still", still());
    document.body.classList.add("guide-open");
    requestAnimationFrame(function(){ ui.wrap.classList.add("is-on"); });
    show(from || 0, 1);
  }

  function stop(finished){
    if(!running) return;
    running = false;
    ticket++;
    clearTimeout(waitTimer);
    var s = read();
    if(finished) s.done[mode] = true;
    write({ run:false, at:0, done:s.done });
    ui.wrap.classList.remove("is-on");
    document.body.classList.remove("guide-open");
    var end = function(){
      if(running) return;
      ui.wrap.hidden = true;
      if(PC.nav && PC.nav.current() !== "compass" && route().some(function(st){ return st.tab; })) {
        PC.nav.go("compass", { silent:true, keepScroll:true });
      }
      if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
      lastFocus = null;
    };
    if(still()) end(); else setTimeout(end, 220);
    paintStatus();
    if(finished && PC.ui && PC.ui.toast) PC.ui.toast(t("guide.finished"));
  }

  /* ---------- отметка в настройках ---------- */
  function paintStatus(){
    var note = document.getElementById("setGuideState");
    if(!note) return;
    var s = read();
    var key = s.done.full ? "guide.state.full" : s.done.quick ? "guide.state.quick" : "guide.state.none";
    note.textContent = t(key);
    note.dataset.done = String(s.done.quick || s.done.full);
  }

  /* Возобновление после перезагрузки: ждём, пока закроется приветствие,
     если оно открыто, — тур поверх модального окна не начинается. */
  function resume(){
    var s = read();
    if(!s.run) return;
    var tries = 0;
    (function wait(){
      var wel = document.getElementById("welcome");
      if(wel && !wel.hidden && tries++ < 240){ setTimeout(wait, 500); return; }
      start(s.mode, Math.min(s.at, ROUTES[s.mode].length - 1));
    })();
  }

  function init(){
    retire();
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", repaint);
    window.addEventListener("scroll", repaint, { passive:true });
    var quick = document.getElementById("setGuideQuick");
    var full = document.getElementById("setGuideFull");
    if(quick) quick.addEventListener("click", function(){ start("quick"); });
    if(full) full.addEventListener("click", function(){ start("full"); });
    paintStatus();
    setTimeout(resume, 600);
  }

  PC.guide = { init:init, start:start, stop:stop, ROUTES:ROUTES, read:read, KEY:KEY,
    running:function(){ return running; }, step:function(){ return running ? route()[at].key : null; } };
})(window.PC = window.PC || {});
