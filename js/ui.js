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

  /* ---------- оглавление раздела «О проекте» ----------
     Тринадцать текстовых карточек подряд — это объём, по которому
     нужно уметь перемещаться, а не только листать. Чипы собираются
     из заголовков самих карточек: список, написанный в разметке
     руками, пришлось бы держать в двух языках и править на каждый
     новый раздел — и однажды он бы отстал от карточек.

     Якоря проставляются здесь же, по порядковому номеру: id вида
     ab-sec-3 ничего не обещает про содержание и потому не соврёт,
     если разделы поменяются местами. */
  function initAboutNav(){
    var nav = document.getElementById("aboutNav");
    if(!nav) return;
    var cards = document.querySelectorAll(".about-card:not(.about-hero)");
    if(!cards.length) return;

    var label = document.createElement("span");
    label.className = "ab-nav-lab";
    label.textContent = PC.t("ab.nav.h");
    nav.appendChild(label);

    cards.forEach(function(card, i){
      var h = card.querySelector("h3");
      if(!h) return;
      if(!card.id) card.id = "ab-sec-" + (i + 1);
      var a = document.createElement("a");
      a.href = "#" + card.id;
      a.textContent = h.textContent.trim();
      /* Штатная прокрутка по якорю прыгает, и при включённых анимациях
         это единственное резкое движение на всей странице. Плюс hash
         в адресе: #ab-sec-3 перебил бы маршрут вкладки (#/about),
         и возврат по истории увёл бы на компас. */
      a.addEventListener("click", function(e){
        e.preventDefault();
        card.scrollIntoView({ behavior:reduced() ? "auto" : "smooth", block:"start" });
        card.setAttribute("tabindex", "-1");
        card.focus({ preventScroll:true });
      });
      nav.appendChild(a);
    });
    nav.hidden = false;
  }

  /* Числа проекта в плитках раздела: те же значения, что и в подвале,
     и по той же причине — написанные руками, они разойдутся с данными.

     Подпись собирается здесь же, а не берётся из разметки: пять созывов
     и два языка требуют разных форм одного слова, и склонять их обязан
     тот, кто знает число. */
  function put(id, count, wordKey, labelKey){
    var node = document.getElementById(id);
    if(!node) return;
    node.textContent = String(count);
    var label = node.nextElementSibling;
    if(label) label.textContent = PC.t(labelKey, { w:PC.i18n.pl(count, wordKey) });
  }

  function fillAboutStats(){
    if(!document.getElementById("abStParties")) return;
    put("abStParties", PC.PARTIES.length, "word.party", "ab.st.parties");
    /* Набор утверждений, а не активная версия теста: плитка говорит про
       размер проекта, а не про то, какую длину человек выбрал сейчас. */
    put("abStQuiz", PC.QUIZ.QUESTIONS.length, "word.statement", "ab.st.quiz");
    put("abStVotes", PC.VOTES.length, "word.vote", "ab.st.votes");
    /* Заготовленные впрок созывы (draft) в счёт не идут: данных по ним
       нет, и на странице их тоже нет. */
    put("abStConv", PC.CONVOCATIONS.filter(function(c){ return !c.draft; }).length,
        "word.convocation", "ab.st.conv");
    put("abStSub", PC.SUBAXES.length, "word.subaxis", "ab.st.sub");
    put("abStLangs", PC.i18n.LANGS.length, "word.language", "ab.st.langs");
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
    initAboutNav();
    fillAboutStats();

    window.addEventListener("scroll", onScroll, { passive:true });
    window.addEventListener("resize", onScroll, { passive:true });
    onScroll();
  }

  PC.ui = { init:init, toast:toast };
})(window.PC = window.PC || {});
