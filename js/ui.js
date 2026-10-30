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
    topBtn.innerHTML = '<span aria-hidden="true">' + PC.icon("up") + '</span>';
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

  var toastQueue = [], toastCount = 0;
  function toast(text, bad, options){
    if(!toasts) return;
    options = options || {};
    if(toastCount >= 3){ toastQueue.push([text, bad, options]); return; }
    toastCount++;
    var t = document.createElement("div");
    t.className = "toast" + (bad ? " bad" : "");
    t.innerHTML = PC.icon(bad ? "alert" : "check-circle");
    t.appendChild(document.createTextNode(text));
    toasts.appendChild(t);
    var killed = false, timer;
    var kill = function(){
      if(killed) return;
      killed = true; clearTimeout(timer);
      t.classList.add("out");
      setTimeout(function(){
        if(t.parentNode) t.parentNode.removeChild(t);
        toastCount--; if(toastQueue.length) toast.apply(null, toastQueue.shift());
      }, 320);
    };
    if(options.action){
      var action = document.createElement("button"); action.type = "button"; action.className = "btn small ghost"; action.textContent = options.label;
      action.addEventListener("click", function(){ if(killed) return; options.action(); kill(); }); t.appendChild(action);
    }
    timer = setTimeout(kill, options.duration || (bad ? 5200 : 3600));
  }

  /* Переход к разделу «О проекте» снаружи. С 5.1 раздел — книга
     (js/book.js), и старые якоря карточек ab-* ведут на её главы. */
  function aboutNavGo(id){
    return !!(PC.book && PC.book.openAnchor(id));
  }

  /* ---------- дерево версий (2.5, с 4.1 — дерево вместо ленты) ----------
     Данные — js/data-history.js (вехи и все выпуски из CHANGELOG),
     раскладка и отрисовка — js/history-tree.js. Здесь остаётся только
     связка: найти узлы в разметке и отдать их модулю. Итог под деревом
     (сколько выпусков, веток и дней) считается из самих данных: написанный
     словами, он разошёлся бы с деревом на первой же новой записи. */
  function initHistory(){
    var host = document.getElementById("abHistory");
    if(!host || !PC.historyTree || !PC.RELEASES || !PC.RELEASES.length) return;
    PC.historyTree.mount(host, document.getElementById("abHistorySum"));
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
    initHistory();
    fillAboutStats();

    window.addEventListener("scroll", onScroll, { passive:true });
    window.addEventListener("resize", onScroll, { passive:true });
    onScroll();
  }

  PC.ui = { init:init, toast:toast, aboutNavGo:aboutNavGo };
})(window.PC = window.PC || {});
