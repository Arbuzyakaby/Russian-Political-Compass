/* ============ Оформление уровня страницы ============

   Слой, который не относится ни к данным, ни к отдельному виджету:
   полоса прочтения, «липкие» вкладки, подсветка карточки под курсором,
   кнопка возврата наверх и всплывающие уведомления об экспорте.

   Всё здесь — дополнение к уже работающей странице: при выключенном
   JS или отключённых анимациях содержимое остаётся тем же, пропадает
   только украшение. Прокрутка обрабатывается одним слушателем с
   привязкой к кадру: несколько независимых обработчиков scroll на
   странице — верный способ уронить плавность на слабой машине. ============ */
(function(PC){
  "use strict";

  var reduced = function(){
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };
  var fine = function(){
    return !!(window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches);
  };

  var bar, topBtn, toasts, sentinel, tabs;
  var ticking = false;

  /* ---------- полоса прочтения ---------- */
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var y = window.scrollY || doc.scrollTop || 0;
      var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if(bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      if(topBtn) topBtn.classList.toggle("show", y > 700);
    });
  }

  /* ---------- «липкие» вкладки ---------- */
  /* Сторож высотой в пиксель прямо перед полосой вкладок: пока он виден,
     вкладки стоят на своём месте, ушёл за верхнюю кромку — вкладки
     прилипли, и им добавляется тень с плотным фоном. Это дешевле, чем
     сравнивать scrollY с координатой, которая меняется от переносов
     заголовка на узком экране. */
  function initSticky(){
    tabs = document.querySelector(".tabs");
    if(!tabs || !("IntersectionObserver" in window)) return;
    sentinel = document.createElement("div");
    sentinel.className = "tabs-sentinel";
    sentinel.setAttribute("aria-hidden", "true");
    tabs.parentNode.insertBefore(sentinel, tabs);
    new IntersectionObserver(function(entries){
      tabs.classList.toggle("is-stuck", !entries[0].isIntersecting);
    }, { threshold:1 }).observe(sentinel);
  }

  /* ---------- подсветка карточки под курсором ---------- */
  /* Мягкое пятно света следует за указателем: карточка перестаёт быть
     плоской заливкой и получает объём. Только для мыши — на тач-экране
     «наведения» нет, а координаты последнего касания застыли бы пятном
     посреди карточки. */
  function initSpotlight(){
    if(!fine() || reduced()) return;
    var raf = null, pending = null;
    document.addEventListener("pointermove", function(e){
      if(e.pointerType !== "mouse") return;
      var card = e.target.closest ? e.target.closest(".card") : null;
      pending = card ? { card:card, x:e.clientX, y:e.clientY } : null;
      if(raf) return;
      raf = requestAnimationFrame(function(){
        raf = null;
        if(!pending) return;
        var box = pending.card.getBoundingClientRect();
        pending.card.style.setProperty("--mx", (pending.x - box.left).toFixed(1) + "px");
        pending.card.style.setProperty("--my", (pending.y - box.top).toFixed(1) + "px");
      });
    }, { passive:true });
  }

  /* ---------- возврат наверх ---------- */
  function initTop(){
    topBtn = document.createElement("button");
    topBtn.type = "button";
    topBtn.className = "to-top";
    topBtn.title = PC.t("ui.top");
    topBtn.setAttribute("aria-label", PC.t("ui.topAria"));
    topBtn.innerHTML = '<span aria-hidden="true">↑</span>';
    topBtn.addEventListener("click", function(){
      window.scrollTo({ top:0, behavior:reduced() ? "auto" : "smooth" });
      var first = document.querySelector(".tab[aria-selected='true']");
      if(first) first.focus({ preventScroll:true });
    });
    document.body.appendChild(topBtn);
  }

  /* ---------- уведомления ---------- */
  /* Экспорт и сохранение карточки — единственные действия, у которых
     нет видимого результата на самой странице: файл уходит в загрузки
     браузера молча. Короткая плашка закрывает эту дыру в обратной связи.
     role="status" — сообщение читается скринридером, но не перебивает
     текущую фразу, как это делает alert. */
  function initToasts(){
    toasts = document.createElement("div");
    toasts.className = "toasts";
    toasts.setAttribute("role", "status");
    toasts.setAttribute("aria-live", "polite");
    document.body.appendChild(toasts);
  }

  function toast(text, bad){
    if(!toasts) return;
    var t = document.createElement("div");
    t.className = "toast" + (bad ? " bad" : "");
    t.textContent = text;
    toasts.appendChild(t);
    /* больше трёх плашек одновременно — это уже стена: самые старые
       уходят, не дожидаясь своего таймера */
    while(toasts.children.length > 3) toasts.removeChild(toasts.firstChild);
    var kill = function(){
      t.classList.add("out");
      setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 320);
    };
    setTimeout(kill, bad ? 5200 : 3600);
    t.addEventListener("click", kill);
  }

  function init(){
    bar = document.createElement("div");
    bar.className = "read-bar";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    initTop();
    initToasts();
    initSticky();
    initSpotlight();

    window.addEventListener("scroll", onScroll, { passive:true });
    window.addEventListener("resize", onScroll, { passive:true });
    onScroll();
  }

  PC.ui = { init:init, toast:toast };
})(window.PC = window.PC || {});
