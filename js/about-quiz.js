/* ============ Тест по разделу «О проекте» ============

   Двенадцать вопросов о том, как устроен компас; сами вопросы лежат
   в js/data-quiz-about.js, здесь только экраны и состояние.

   Чем он не является. Это не второй политический тест: координат он не
   считает, на поле ничего не ставит и ссылки на результат у него нет
   намеренно. Ссылка нужна там, где результат — это про вас и им есть
   смысл поделиться; здесь результат — отметка о прочтении раздела, и
   делиться ею не с кем. По той же причине он не попадает ни в экспорт,
   ни в JSON: это не данные проекта.

   Зачем он вообще. Раздел «О проекте» — одиннадцать текстовых карточек
   подряд, и дочитавший его до конца обычно не может сказать, что
   осталось. Вопрос с тремя вариантами отвечает на это лучше, чем ещё
   один абзац: ошибка показывает, какую карточку стоит перечитать, и
   ведёт к ней ссылкой, а не советом «посмотрите выше».

   Разметка строится здесь, а не лежит в index.html. Причина та же, что
   у рельса оглавления: двенадцать вопросов по три варианта — это тридцать шесть
   строк, которые пришлось бы держать в двух языках и править вместе
   с набором.

   Клавиатура. Варианты — настоящая радиогруппа: одна остановка
   табуляции на всю группу, стрелки ходят по вариантам, Enter и пробел
   отвечают. Это не украшение: двенадцать вопросов по три кнопки дают
   тридцать шесть остановок табуляции, и без группировки дойти клавишами до
   кнопки «Дальше» значило бы протабулировать весь тест. ============ */
(function(PC){
  "use strict";

  var KEY = "pc-about-quiz";
  var t = PC.t;

  var host = null;
  var idx = 0;         /* текущий вопрос */
  var score = 0;
  var answered = false; /* на текущий вопрос уже ответили */
  var marks = [];      /* индексы вопросов, отвеченных неверно */

  function items(){ return PC.ABOUT_QUIZ || []; }
  function total(){ return items().length; }

  function el(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear(){ while(host.firstChild) host.removeChild(host.firstChild); }

  /* ---------- ссылка «читать в разделе» ----------
     Переход идёт через PC.ui.aboutNavGo, а не через href="#ab-tech":
     штатный якорь прыгает, ставит хеш в адрес (и тем перебивает маршрут
     вкладки #/about, из-за чего возврат по истории уводил бы на компас)
     и не трогает подсветку в оглавлении, из-за чего после перехода
     горел бы не тот чип. */
  function rereadLink(card){
    var a = el("button", "aq-go", t("ab.aq.reread"));
    a.type = "button";
    a.addEventListener("click", function(){
      if(PC.ui && PC.ui.aboutNavGo) PC.ui.aboutNavGo(card);
    });
    return a;
  }

  /* ---------- экран вопроса ---------- */
  function render(){
    clear();
    answered = false;
    var q = items()[idx];
    if(!q){ finish(); return; }

    var head = el("div", "aq-head");
    head.appendChild(el("span", "aq-count",
      t("ab.aq.count", { n:idx + 1, total:total() })));

    /* Полоса хода: доля отвеченных вопросов. Ширина задаётся стилем
       прямо на узле — это единственное число, которое меняется на
       каждом шаге, и класс под каждую десятую был бы десятью классами
       ради одного свойства. */
    var track = el("div", "aq-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", t("ab.aq.progress"));
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(total()));
    track.setAttribute("aria-valuenow", String(idx));
    var fill = el("i", "aq-fill");
    fill.style.width = (idx / total() * 100).toFixed(1) + "%";
    track.appendChild(fill);
    head.appendChild(track);
    host.appendChild(head);

    host.appendChild(el("p", "aq-q", PC.L(q, "q")));

    var opts = el("div", "aq-opts");
    opts.setAttribute("role", "radiogroup");
    opts.setAttribute("aria-label", t("ab.aq.aria"));

    var texts = PC.L(q, "a") || q.a;
    var buttons = [];
    texts.forEach(function(text, i){
      var b = el("button", "aq-opt", text);
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", "false");
      /* Вся группа — одна остановка табуляции: активен первый вариант,
         остальные достижимы стрелками. */
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener("click", function(){ answer(i, buttons, q); });
      b.addEventListener("keydown", function(e){
        var step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1
                 : e.key === "ArrowUp"   || e.key === "ArrowLeft"  ? -1 : 0;
        if(!step) return;
        e.preventDefault();
        if(answered) return;
        var next = (i + step + buttons.length) % buttons.length;
        buttons.forEach(function(x){ x.tabIndex = -1; });
        buttons[next].tabIndex = 0;
        buttons[next].focus();
      });
      opts.appendChild(b);
      buttons.push(b);
    });
    host.appendChild(opts);
  }

  /* ---------- ответ ----------
     Подсвечиваются оба варианта — и верный, и выбранный: показать
     только «вы ошиблись», не показав, где правильно, значит отправить
     читателя искать ответ заново. Кнопки после ответа выключаются:
     второй клик по той же кнопке иначе досчитывал бы очко ещё раз. */
  function answer(i, buttons, q){
    if(answered) return;
    answered = true;
    var right = i === q.ok;
    if(right) score++;
    else marks.push(idx);

    buttons.forEach(function(b, n){
      b.disabled = true;
      b.tabIndex = -1;
      b.setAttribute("aria-checked", n === i ? "true" : "false");
      if(n === q.ok) b.classList.add("is-right");
      if(n === i && !right) b.classList.add("is-wrong");
    });

    var box = el("div", "aq-why" + (right ? " ok" : ""));
    box.setAttribute("role", "status");
    box.appendChild(el("b", null, t(right ? "ab.aq.right" : "ab.aq.wrong")));
    box.appendChild(el("p", null, PC.L(q, "why")));

    var acts = el("div", "aq-acts");
    acts.appendChild(rereadLink(q.card));
    var next = el("button", "btn primary aq-next",
      t(idx + 1 < total() ? "ab.aq.next" : "ab.aq.done"));
    next.type = "button";
    next.addEventListener("click", function(){
      idx++;
      if(idx < total()) render(); else finish();
      /* Фокус переезжает на новый вопрос: без этого он остаётся на
         кнопке, которой больше нет, и уходит на <body> — то есть
         в начало страницы. */
      var first = host.querySelector(".aq-opt, .aq-restart");
      if(first) first.focus();
    });
    acts.appendChild(next);
    box.appendChild(acts);
    host.appendChild(box);
    next.focus();
  }

  /* ---------- итог ---------- */
  function finish(){
    remember(score);
    result(score, marks, false);
  }

  /* Экран результата. Один и тот же и сразу после теста, и при возврате
     на страницу — разница только в том, что у сохранённого результата
     нет списка ошибок: хранить, какие именно вопросы были завалены,
     значит хранить лишнее ради экрана, который человек увидит один раз.
     Поэтому saved:true показывает счёт и предлагает пройти заново. */
  function result(n, wrong, saved){
    clear();
    var top = el("div", "aq-res");
    if(saved) top.appendChild(el("span", "aq-eyebrow", t("ab.aq.saved")));
    top.appendChild(el("div", "aq-score", t("ab.aq.score", { n:n, total:total() })));
    var share = n / total();
    top.appendChild(el("p", "aq-verdict",
      t(share === 1 ? "ab.aq.res.h" : share >= 0.6 ? "ab.aq.res.mid" : "ab.aq.res.low")));
    host.appendChild(top);

    if(!saved && wrong.length){
      host.appendChild(el("div", "aq-reread-h", t("ab.aq.reread.h")));
      var list = el("ul", "aq-reread");
      /* Один раздел на список, даже если в нём завалено два вопроса:
         перечитывать карточку дважды не нужно. */
      var seen = {};
      wrong.forEach(function(qi){
        var q = items()[qi];
        if(!q || seen[q.card]) return;
        seen[q.card] = true;
        var li = el("li");
        /* с 5.1 карточки стали главами книги: подпись — название главы */
        var title = PC.book ? PC.book.anchorTitle(q.card) : "";
        var b = el("button", "aq-go", title || t("ab.aq.reread"));
        b.type = "button";
        b.addEventListener("click", function(){
          if(PC.ui && PC.ui.aboutNavGo) PC.ui.aboutNavGo(q.card);
        });
        li.appendChild(b);
        list.appendChild(li);
      });
      host.appendChild(list);
    }

    var again = el("button", "btn aq-restart", t("ab.aq.again"));
    again.type = "button";
    again.addEventListener("click", restart);
    host.appendChild(again);
  }

  function restart(){
    idx = 0; score = 0; marks = []; answered = false;
    render();
    var first = host.querySelector(".aq-opt");
    if(first) first.focus();
  }

  /* Хранится только счёт и когда: по этим двум числам собирается экран
     возврата, а больше ничего от прошлого прохождения не нужно. */
  function remember(n){
    PC.store.setJSON(KEY, { score:n, ts:Date.now() });
  }

  function init(){
    host = document.getElementById("abQuiz");
    if(!host || !total()) return;
    var saved = PC.store.getJSON(KEY, null);
    if(saved && typeof saved.score === "number"){
      score = saved.score;
      result(saved.score, [], true);
    }else{
      render();
    }
  }

  PC.aboutQuiz = { init:init };
})(window.PC = window.PC || {});
