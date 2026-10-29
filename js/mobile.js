/* Касание выбирает ближайшую точку компаса, не отнимая у страницы прокрутку и щипок. */
(function(PC){
  "use strict";
  var svg, start, ignoreClickUntil = 0;
  var coarse = function(){ return window.matchMedia("(pointer:coarse)").matches; };

  function resizeTargets(){
    if(!svg) return;
    svg.querySelectorAll(".node").forEach(function(node){
      var matrix = node.getScreenCTM();
      if(!matrix || !matrix.a) return;
      var hit = node.querySelector(".touch-hit");
      if(!hit){
        hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hit.setAttribute("class", "touch-hit");
        hit.setAttribute("fill", "transparent");
        node.insertBefore(hit, node.firstChild);
      }
      hit.setAttribute("r", coarse() ? 22 / Math.hypot(matrix.a, matrix.b) : 0);
    });
  }

  function nearest(x, y){
    var found = null, distance = Infinity;
    svg.querySelectorAll('.node:not(.muted)').forEach(function(node){
      var style = getComputedStyle(node);
      if(style.pointerEvents === "none" || style.visibility === "hidden" || style.display === "none") return;
      var m = node.getScreenCTM();
      if(!m) return;
      var d = Math.hypot(m.e - x, m.f - y);
      if(d <= 24 && d < distance){ found = node; distance = d; }
    });
    return found;
  }

  function dismiss(){
    if(PC.tip) PC.tip.hide();
    if(PC.compass) PC.compass.hideCross();
    if(svg) svg.querySelectorAll(".is-focus,.has-focus").forEach(function(n){ n.classList.remove("is-focus", "has-focus"); });
  }

  var PHONE = "(max-width:720px), (pointer:coarse) and (max-width:1050px)";
  function phone(){ return window.matchMedia(PHONE).matches; }

  /* ---------- отклик вибрацией (5.0) ----------
     Короткий толчок под пальцем на переключение вкладки, выбор партии,
     ответ в тесте и смену настройки — как в нативных приложениях.
     Работает там, где браузер умеет navigator.vibrate (Android); iOS
     этого не даёт, и там ничего не происходит. Выключается в настройках
     («Доступность» → «Вибрация») и сам молчит при уменьшенном движении. */
  function haptic(ms){
    if(!coarse() || !navigator.vibrate) return;
    if(PC.settings && PC.settings.get("haptics") === "off") return;
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try{ navigator.vibrate(ms || 8); }catch(e){ /* браузер запретил — не страшно */ }
  }

  /* ---------- карточка партии нижним листом (5.0) ----------
     До 5.0 карточка открывалась на месте списка, и страница прыгала к ней
     прокруткой; закрыть её можно было только кнопкой «Все партии» где-то
     вверху. Теперь это лист снизу, как в приложениях: его стягивают вниз
     за шапку, закрывают касанием по затемнению или Escape, а список под
     ним остаётся на своём месте.

     Лист — тот же узел .side: пока он открыт, на его месте в потоке стоит
     пустышка той же высоты, иначе страница под листом дёрнулась бы вверх. */
  var side, holder, scrim, sheetTimer = null;
  function quiet(){
    return document.documentElement.dataset.motion === "off" ||
           window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function sheet(open){
    if(!side) return;
    clearTimeout(sheetTimer);
    if(open){
      if(!side.classList.contains("is-sheet")){
        holder.style.height = side.offsetHeight + "px";
        holder.hidden = false;
        side.classList.add("is-sheet");
        scrim.hidden = false;
        document.body.classList.add("sheet-lock");
        side.scrollTop = 0;
        requestAnimationFrame(function(){ requestAnimationFrame(function(){
          side.classList.add("is-open");
          scrim.classList.add("is-open");
        }); });
      }
      return;
    }
    if(!side.classList.contains("is-sheet")) return;
    side.classList.remove("is-open");
    scrim.classList.remove("is-open");
    document.body.classList.remove("sheet-lock");
    var done = function(){
      side.classList.remove("is-sheet");
      holder.hidden = true;
      scrim.hidden = true;
    };
    if(quiet()) done(); else sheetTimer = setTimeout(done, 340);
  }

  function selected(id){
    dismiss();
    if(!phone()) return;
    if(id){
      haptic();
      sheet(true);
      /* Ждём кадр: сначала браузер выполняет совместимые click и focus
         для этого касания, и фокус нужно ставить уже после них. */
      requestAnimationFrame(function(){
        var back = document.getElementById("sideBack");
        if(back && !back.hidden) back.focus({ preventScroll:true });
      });
    }else{
      sheet(false);
    }
  }

  function initSheet(){
    side = document.querySelector(".side");
    if(!side) return;
    holder = document.createElement("div");
    holder.className = "side-holder";
    holder.hidden = true;
    holder.setAttribute("aria-hidden", "true");
    side.parentNode.insertBefore(holder, side);
    scrim = document.createElement("div");
    scrim.className = "side-scrim";
    scrim.hidden = true;
    document.body.appendChild(scrim);
    scrim.addEventListener("click", function(){ PC.select(null); });
    /* стянуть вниз за шапку — тот же жест, что у остальных листов */
    if(PC.appShell && PC.appShell.bind) PC.appShell.bind(side, side.querySelector(".side-head"), document.getElementById("sideBack"));
    /* поворот в широкий экран и уход на другую вкладку закрывают лист */
    var query = window.matchMedia(PHONE);
    var onLayout = function(){ if(!phone()) sheet(false); };
    if(query.addEventListener) query.addEventListener("change", onLayout);
    PC.nav.onChange(function(){ if(PC.activeId && PC.activeId()) PC.select(null); });
  }

  function init(){
    svg = document.getElementById("svg");
    if(!svg) return;
    svg.addEventListener("pointerdown", function(e){
      if(e.pointerType !== "touch" && e.pointerType !== "pen") return;
      if(start){ start.cancelled = true; return; }
      start = { id:e.pointerId, x:e.clientX, y:e.clientY, cancelled:false };
    }, { passive:true });
    svg.addEventListener("pointermove", function(e){
      if(start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) start.cancelled = true;
    }, { passive:true });
    svg.addEventListener("pointercancel", function(){ start = null; dismiss(); });
    svg.addEventListener("pointerup", function(e){
      if(!start || start.id !== e.pointerId) return;
      var tap = !start.cancelled;
      start = null;
      ignoreClickUntil = performance.now() + 700;
      if(tap){
        var target = nearest(e.clientX, e.clientY);
        if(target) target.dispatchEvent(new MouseEvent("click", { bubbles:true }));
        else dismiss();
      }
    });
    svg.addEventListener("click", function(e){
      if(e.isTrusted && performance.now() < ignoreClickUntil){ e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    PC.compass.onDraw(function(){ requestAnimationFrame(resizeTargets); });
    if(window.ResizeObserver) new ResizeObserver(resizeTargets).observe(svg);
    var root = document.documentElement;
    var tabs = document.querySelector(".tabs");
    if(tabs && window.ResizeObserver){
      new ResizeObserver(function(){
        root.style.setProperty("--mobile-nav-offset", Math.ceil(tabs.getBoundingClientRect().height + 16) + "px");
      }).observe(tabs);
    }
    if(window.visualViewport){
      var viewport = function(){
        root.style.setProperty("--mobile-viewport-height", window.visualViewport.height + "px");
        root.style.setProperty("--mobile-viewport-top", window.visualViewport.offsetTop + "px");
      };
      window.visualViewport.addEventListener("resize", viewport, { passive:true });
      window.visualViewport.addEventListener("scroll", viewport, { passive:true });
      viewport();
    }
    window.addEventListener("scroll", function(){ if(coarse()) dismiss(); }, { passive:true });
    PC.nav.onChange(dismiss);
    initSheet();
    /* толчок на смену вкладки и на переключатель в настройках */
    PC.nav.onChange(function(){ haptic(6); });
    document.addEventListener("pc:settings", function(e){ if(e.detail && e.detail.key !== "*") haptic(6); });
    resizeTargets();
  }
  PC.haptic = haptic;
  PC.mobile = { init:init, selected:selected, dismiss:dismiss, sheet:sheet };
})(window.PC = window.PC || {});
