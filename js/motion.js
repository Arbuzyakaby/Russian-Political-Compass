/* ============ Появление при прокрутке и счётчики ============

   Один IntersectionObserver на всю страницу вместо обработчика scroll:
   браузер сам решает, когда элемент попал в вид, и не дёргает JS на
   каждый кадр прокрутки. Элемент проявляется один раз и отписывается —
   повторное появление при обратной прокрутке выглядело бы мельтешением.

   Разметка: элементу ставится атрибут data-reveal, соседям внутри одной
   группы — переменная --i, дающая ступенчатую задержку. Числа с атрибутом
   data-count досчитываются от нуля до целевого значения.

   При включённом prefers-reduced-motion модуль ничего не анимирует:
   всё сразу получает конечное состояние. ============ */
(function(PC){
  "use strict";
  var U = PC.utils;

  var STEP = 60;          /* мс между соседями в группе */
  var MAX_STEP = 6;       /* дальше ступеньку не наращиваем: ждать дольше вредно */
  var COUNT_MS = 750;

  var io = null;
  var seen = new WeakSet();
  var pending = [];       /* зарегистрированные, но ещё не проявленные */
  var sweeping = false;

  function reduced(){
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ---------- счётчик ---------- */
  /* data-count — целевое число; data-count-fmt="signed" печатает знак и
     десятую долю через общий форматтер, чтобы «+7.1» в плитке центра
     тяжести выглядел так же, как везде на странице. */
  function countUp(node){
    var target = Number(node.dataset.count);
    if(!isFinite(target)) return;
    var signed = node.dataset.countFmt === "signed";
    var print = function(v){ node.textContent = signed ? U.fmt(v) : String(Math.round(v)); };

    if(reduced() || !window.requestAnimationFrame){ print(target); return; }

    var t0 = null;
    function frame(ts){
      if(t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / COUNT_MS);
      var eased = 1 - Math.pow(1 - p, 3);          /* ease-out-cubic */
      print(target * eased);
      if(p < 1) requestAnimationFrame(frame);
      else print(target);                          /* точное значение в конце */
    }
    print(0);
    requestAnimationFrame(frame);
  }

  /* ---------- проявление ---------- */
  var hooks = new WeakMap();      /* узел -> что запустить при его появлении */

  function reveal(node){
    if(node.classList.contains("in-view")) return;
    node.classList.add("in-view");
    var i = pending.indexOf(node);
    if(i > -1) pending.splice(i, 1);
    if(io) io.unobserve(node);
    if(node.dataset.count !== undefined) countUp(node);
    node.querySelectorAll("[data-count]").forEach(countUp);
    var fns = hooks.get(node);
    if(fns){
      hooks.delete(node);
      fns.forEach(function(fn){ fn(); });
    }
  }

  /* Запустить собственную анимацию блока ровно тогда, когда он попал
     в вид. Нужно графикам: они строятся на загрузке страницы, но их
     карточки лежат ниже сгиба, и прорисовка линий без этой привязки
     заканчивалась бы задолго до того, как читатель до них доскроллит. */
  function whenRevealed(node, fn){
    if(!node || !io || reduced() || node.classList.contains("in-view")){ fn(); return; }
    var fns = hooks.get(node);
    if(fns) fns.push(fn); else hooks.set(node, [fn]);
  }

  /* Подстраховка к наблюдателю. Если прокрутка перепрыгнула элемент —
     переход по якорю, восстановление позиции при возврате назад, резкий
     свайп, — он может так и не побывать «пересекающимся», и наблюдатель
     о нём не сообщит вовсе. Тогда содержимое осталось бы прозрачным
     навсегда. Проход по списку ожидающих проявляет всё, что уже выше
     нижней кромки экрана; он снимается, как только список опустел. */
  function sweep(){
    sweeping = false;
    for(var i = pending.length - 1; i >= 0; i--){
      var node = pending[i];
      var box = node.getBoundingClientRect();
      if(!box.width && !box.height) continue;          /* скрытая вкладка */
      if(box.top < window.innerHeight * .92) reveal(node);
    }
    if(!pending.length) window.removeEventListener("scroll", onScroll);
  }
  function onScroll(){
    if(sweeping) return;
    sweeping = true;
    requestAnimationFrame(sweep);
  }

  /* Индекс внутри группы: ступенчатая задержка считается по позиции
     среди соседей с data-reveal, а не по порядку регистрации, — иначе
     перерисованный блок начинал бы отсчёт с нуля посреди страницы. */
  function stagger(node){
    if(node.style.getPropertyValue("--i")) return;
    var parent = node.parentNode;
    if(!parent || !parent.querySelectorAll) return;
    var group = parent.querySelectorAll(":scope > [data-reveal]");
    var i = Array.prototype.indexOf.call(group, node);
    node.style.setProperty("--i", String(Math.min(MAX_STEP, i < 0 ? 0 : i)));
  }

  /* Регистрирует ещё не виденные элементы. Вызывается и после
     перерисовки блоков, которые строит JS (плитки KPI, экраны теста). */
  function scan(root){
    var scope = root || document;
    var nodes = scope.querySelectorAll("[data-reveal]");
    nodes.forEach(function(node){
      if(seen.has(node)) return;
      seen.add(node);
      stagger(node);
      if(!io){ reveal(node); return; }
      pending.push(node);
      io.observe(node);
    });
    if(io && pending.length){
      window.addEventListener("scroll", onScroll, { passive:true });
    }
  }

  function init(){
    document.documentElement.style.setProperty("--reveal-step", STEP + "ms");

    if(reduced() || !("IntersectionObserver" in window)){
      /* без наблюдателя элементы просто показываются: класс тот же,
         поэтому стили остаются одни на оба случая */
      io = null;
      scan();
      return;
    }

    io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        /* второе условие ловит элементы, оставшиеся выше экрана: при
           первом же сообщении наблюдателя они уже прокручены, и ждать
           от них «пересечения» бессмысленно */
        if(e.isIntersecting || e.boundingClientRect.bottom < 0) reveal(e.target);
      });
    }, { rootMargin:"0px 0px -8% 0px", threshold:.12 });

    scan();
  }

  PC.motion = { init:init, scan:scan, reduced:reduced, whenRevealed:whenRevealed };
})(window.PC = window.PC || {});
