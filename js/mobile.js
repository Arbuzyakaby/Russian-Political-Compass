/* Touch selects the nearest point, without stealing scrolling or pinch zoom. */
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

  function selected(id){
    dismiss();
    if(!window.matchMedia("(max-width:720px), (pointer:coarse) and (max-width:1050px)").matches) return;
    var side = document.querySelector(".side");
    if(!side) return;
    if(id){
      // Run after the browser's compatibility click/focus for this touch.
      requestAnimationFrame(function(){
        var back = document.getElementById("sideBack");
        if(!back || back.hidden) return;
        side.scrollIntoView({ block:"start", behavior:"instant" });
        back.focus({ preventScroll:true });
      });
    }
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
    resizeTargets();
  }
  PC.mobile = { init:init, selected:selected, dismiss:dismiss };
})(window.PC = window.PC || {});
