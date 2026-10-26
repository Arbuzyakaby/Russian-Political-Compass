/* ============ Оболочка приложения на телефоне (4.1) ============
   Нижний лист закрывается так же, как в мобильных приложениях: его
   стягивают вниз за шапку. Закрытие идёт через собственную кнопку
   листа — у настроек и карточки человека свои обработчики закрытия
   (возврат фокуса, снятие блокировки прокрутки), и повторять их здесь
   значило бы завести второй путь, который однажды разойдётся с первым.
   Раскладку самой панели вкладок и листов описывает css/app.css. ============ */
(function(PC){
  "use strict";
  var CLOSE_AT = 110;      /* px: дальше этого лист закрывается */
  var FLICK = 0.6;         /* px/мс: быстрый смахивающий жест закрывает и короче */

  function phone(){ return window.matchMedia("(max-width:720px),(pointer:coarse) and (max-width:1050px)").matches; }

  function bind(sheet){
    var head = sheet.querySelector(".sheet-head");
    var close = sheet.querySelector(".sheet-close");
    if(!head || !close) return;
    var drag = null;
    head.addEventListener("pointerdown", function(e){
      if(!phone() || e.button > 0 || e.target.closest("button,a,input,select,textarea")) return;
      drag = { id:e.pointerId, y:e.clientY, t:performance.now(), dy:0 };
      head.setPointerCapture(e.pointerId);
      sheet.classList.add("is-dragging");
    });
    head.addEventListener("pointermove", function(e){
      if(!drag || e.pointerId !== drag.id) return;
      /* вверх лист не тянется: над ним нечего показывать, а резиновое
         сопротивление на четверть хода сообщает, что жест понят */
      var dy = e.clientY - drag.y;
      drag.dy = dy > 0 ? dy : dy / 4;
      sheet.style.setProperty("--sheet-drag", Math.round(drag.dy) + "px");
    });
    function end(e){
      if(!drag || e.pointerId !== drag.id) return;
      var speed = drag.dy / Math.max(1, performance.now() - drag.t);
      var shut = drag.dy > CLOSE_AT || (drag.dy > 30 && speed > FLICK);
      drag = null;
      sheet.classList.remove("is-dragging");
      sheet.style.removeProperty("--sheet-drag");
      if(shut) close.click();
    }
    head.addEventListener("pointerup", end);
    head.addEventListener("pointercancel", end);
  }

  function init(){
    Array.prototype.forEach.call(document.querySelectorAll(".sheet"), bind);
  }

  PC.appShell = { init:init };
})(window.PC = window.PC || {});
