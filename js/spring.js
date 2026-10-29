/* ============ Пружинящий отклик (4.3) ============
   После отпускания кнопки, вкладки, чипа или переключателя элемент
   получает класс .is-sprung, и css/motion.css (раздел «Пружины») проигрывает короткий
   подскок свойства scale. Действие кнопки к этому моменту уже
   выполнено: отклик ничего не ждёт и ничего не блокирует.

   Повторное нажатие перезапускает анимацию с начала; прерванный жест
   (pointercancel, уход пальца) пружину не запускает. При уменьшенном
   движении или выключенных анимациях модуль ничего не делает — CSS
   всё равно снял бы анимацию, но лишние классы и перерасчёт не нужны.

   PC.spring.done(элемент) — отклик на успешное действие: «поп»
   и расходящееся кольцо обводки. ============ */
(function(PC){
  "use strict";

  var TARGETS = ".btn,.chip,.tab,.theme-chip,.seg button,.xs-btn,.gear-btn,.sheet-close,.sheet-back," +
    ".sw,.qmode,.aq-opt,.co-tog,.co-preset,.ht-chip,.wel-lang,.party-tile,.party-tpl,.to-top,.sv-choice,.duel-swap";
  var pressed = null;

  function still(){
    if(document.documentElement.dataset.motion === "off") return true;
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function replay(el, cls){
    el.classList.remove(cls);
    void el.offsetWidth;          /* перезапуск анимации при быстром повторном нажатии */
    el.classList.add(cls);
  }

  /* animationend всплывает и от потомков (значок вкладки), поэтому класс
     снимается только по своей анимации. Один и тот же обработчик браузер
     не добавляет дважды. */
  function clear(e){
    if(e.animationName === "pc-release" || e.animationName === "pc-release-soft") e.currentTarget.classList.remove("is-sprung");
    else if(e.animationName === "pc-done-ring") e.currentTarget.classList.remove("pc-done");
  }

  function init(){
    document.addEventListener("pointerdown", function(e){
      if(e.button > 0) return;
      pressed = e.target.closest && e.target.closest(TARGETS);
      if(pressed && pressed.disabled) pressed = null;
    }, { passive:true });
    document.addEventListener("pointerup", function(e){
      var el = pressed;
      pressed = null;
      if(!el || still() || !el.contains(e.target)) return;
      el.addEventListener("animationend", clear);
      replay(el, "is-sprung");
    }, { passive:true });
    document.addEventListener("pointercancel", function(){ pressed = null; }, { passive:true });
  }

  function done(el){
    if(!el || still()) return;
    el.addEventListener("animationend", clear);
    replay(el, "pc-done");
  }

  PC.spring = { init:init, done:done, TARGETS:TARGETS };
})(window.PC = window.PC || {});
