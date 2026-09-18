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
    /* Заполняется ниже, когда рельс собран: обработчик клика написан
       раньше, чем существует сам следящий код, и держать его в
       переменной проще, чем переставлять половину функции местами. */
    var ctl = { pin:function(){} };
    var nav = document.getElementById("aboutNav");
    if(!nav) return;
    var cards = Array.prototype.slice.call(
      document.querySelectorAll(".about-card:not(.about-hero)"));
    if(!cards.length) return;

    var label = document.createElement("span");
    label.className = "ab-nav-lab";
    label.textContent = PC.t("ab.nav.h");

    /* Чипы живут в собственном ряду, а полоса прочитанного — под ним:
       рельс липкий, и складывать то и другое в один горизонтально
       прокручиваемый поток значило бы увозить полосу вбок вместе
       с чипами. */
    var row = document.createElement("div");
    row.className = "ab-nav-row";
    row.appendChild(label);

    /* Подсказка, что чипы кликабельны. Зрячему она не нужна — чипы и так
       выглядят кнопками, — а вот при чтении с экрана рельс иначе звучит
       как список ссылок без объяснения, куда они ведут. */
    var hint = document.createElement("span");
    hint.className = "sr-only";
    hint.textContent = PC.t("ab.nav.hint");
    row.appendChild(hint);

    var links = [];
    cards.forEach(function(card, i){
      var h = card.querySelector("h3");
      if(!h) return;
      if(!card.id) card.id = "ab-sec-" + (i + 1);
      var a = document.createElement("a");
      a.href = "#" + card.id;
      /* Номер повторяет счётчик about-sec из css/about.css: тот же
         порядок, та же ведущая ноль-цифра. CSS-счётчик прочитать
         нельзя, поэтому он считается здесь заново — по тому же
         списку карточек, из которого CSS его и получает. */
      var num = document.createElement("i");
      num.setAttribute("aria-hidden", "true");
      num.textContent = (i + 1 < 10 ? "0" : "") + (i + 1);
      a.appendChild(num);
      a.appendChild(document.createTextNode(h.textContent.trim()));
      /* Штатная прокрутка по якорю прыгает, и при включённых анимациях
         это единственное резкое движение на всей странице. Плюс hash
         в адресе: #ab-sec-3 перебил бы маршрут вкладки (#/about),
         и возврат по истории увёл бы на компас. */
      a.addEventListener("click", function(e){
        e.preventDefault();
        /* Подсветка ставится сразу и на время прокрутки запирается
           (ctl.pin): иначе следящий за прокруткой код успевал бы
           переписать её промежуточными кадрами плавного хода, и
           нажатый чип загорался бы не сразу, а иногда и не тот. */
        ctl.pin(link);
        card.scrollIntoView({ behavior:reduced() ? "auto" : "smooth", block:"start" });
        card.setAttribute("tabindex", "-1");
        card.focus({ preventScroll:true });
      });
      row.appendChild(a);
      var link = { a:a, card:card };
      links.push(link);
    });
    nav.appendChild(row);

    var bar = document.createElement("div");
    bar.className = "ab-nav-bar";
    nav.appendChild(bar);

    nav.hidden = false;
    ctl = trackAboutNav(nav, row, links);
  }

  /* ---------- где мы сейчас в разделе (исправлено в 2.4.1) ----------
     Первая версия рельса вела себя странно ровно по трём причинам,
     и все три исправлены здесь:

     1. Состояние снималось только внутри requestAnimationFrame. Первый
        расчёт приходился на загрузку страницы, когда вкладка «О проекте»
        ещё скрыта, а у скрытого блока все размеры нулевые: рельс
        запоминал заведомо неверный раздел и держал его до первой
        прокрутки. Если читатель заходил сразу на эту вкладку и не
        прокручивал, подсветки не появлялось вовсе.
     2. Пересчёт шёл на каждую прокрутку страницы, даже когда открыта
        другая вкладка. Там размеры снова нулевые, и рельс уходил в
        состояние «прочитано целиком» ещё до того, как его увидят.
     3. Доля прочитанного считалась от полной высоты раздела за вычетом
        одного экрана. На коротком разделе или коротком окне это
        выражение уходило в ноль или в минус, и полоса прыгала сразу
        на сто процентов.

     Теперь пересчёт пропускается, пока раздел не на экране; он
     запускается заново при возврате на вкладку; доля считается от
     реально прокручиваемой части раздела и всегда лежит в 0…1.

     Активным считается последний раздел, чья верхняя кромка уже ушла
     под рельс. Это совпадает с тем, что человек читает, и не мигает на
     границе двух карточек, как мигал бы порог по видимой площади:
     карточки разной высоты, и самая заметная не всегда та, которую
     читают. */
  function trackAboutNav(nav, row, links){
    var current = null, queued = false;
    /* Запертая подсветка (2.4.2.1). Нажатие на чип — это заявление
       «я хочу быть здесь», и оно должно выигрывать у следящего кода
       на всё время плавной прокрутки. Без запора получалось вот что:
       apply() продолжал считать кадры, пока страница едет, подсвечивал
       по дороге каждый проезжающий раздел, а на последних чипах не
       доезжал до нажатого вовсе — ниже последней карточки прокручивать
       уже нечего, её верхняя кромка так и остаётся ниже рельса, и
       активным оставался предпоследний раздел. Со стороны это и
       выглядело как «нажимаешь, а подсвечивается не то». */
    var locked = false, lockTimer = null;

    /* Скрытая вкладка выпадает из раскладки, и getBoundingClientRect
       у всего внутри неё возвращает нули. Считать по таким числам —
       значит записать неверное состояние и показать его при возврате. */
    function visible(){ return nav.offsetParent !== null; }

    function apply(){
      queued = false;
      if(!visible()) return;

      /* Черта, ниже которой раздел считается начатым. Восемь пикселей
         под рельсом, как было до 2.4.2.1, оказались западнёй: нажатый
         чип прокручивает карточку к её scroll-margin-top, то есть
         останавливает её верхнюю кромку ЧУТЬ НИЖЕ рельса — и она не
         дотягивала до черты, поэтому подсвеченным оставался предыдущий
         раздел. Отступ здесь обязан быть не меньше того, на котором
         карточка останавливается после нажатия (css/about.css,
         .about-card scroll-margin-top), и с запасом больше него. */
      var line = nav.getBoundingClientRect().bottom + 34;
      var active = links[0];
      for(var i = 0; i < links.length; i++){
        if(links[i].card.getBoundingClientRect().top <= line) active = links[i];
      }
      /* Конец страницы — особый случай: последние два-три раздела
         физически не могут поднять свою кромку под рельс, потому что
         прокручивать уже нечего. По правилу «последний, кто ушёл под
         рельс» они недостижимы вовсе, и подсветка застревала на
         разделе, который человек давно проехал. Поэтому у самого низа
         активным считается тот раздел, чья нижняя кромка ближе всего
         к низу окна, — то есть тот, который действительно дочитывают. */
      if(window.innerHeight + window.scrollY >=
         document.documentElement.scrollHeight - 4){
        for(var j = links.length - 1; j >= 0; j--){
          if(links[j].card.getBoundingClientRect().top < window.innerHeight * 0.8){
            active = links[j];
            break;
          }
        }
      }

      /* Доля прочитанного — сколько раздела уже прошло под нижней кромкой
         окна. Не по числу пройденных карточек: они разной длины, и полоса
         скакала бы на коротких и стояла на длинных. И не от положения
         самой прокрутки, как считалось до 2.4.1: там в знаменателе стояла
         высота раздела за вычетом экрана, и на высоком окне полоса
         доезжала до конца, когда впереди оставалось ещё два раздела.

         Ноль — когда раздел только показался снизу, единица — когда его
         последняя строка дошла до низа окна, то есть когда всё
         действительно побывало на экране. */
      var first = links[0].card.getBoundingClientRect();
      var last  = links[links.length - 1].card.getBoundingClientRect();
      var span  = Math.max(1, last.bottom - first.top);
      var read  = (window.innerHeight - first.top) / span;
      nav.style.setProperty("--ab-read", Math.min(1, Math.max(0, read)).toFixed(4));

      /* Полоса прочитанного считается всегда — она отвечает на другой
         вопрос («сколько осталось») и от запора не зависит. А вот
         активный чип, пока запор стоит, не трогаем. */
      if(locked) return;
      setCurrent(active);
    }

    function setCurrent(active){
      if(active === current) return;
      if(current) current.a.classList.remove("is-current");
      active.a.classList.add("is-current");
      current = active;

      /* На узком экране рельс прокручивается вбок, и активный чип легко
         оказывается за краем. Подтягиваем его к себе — но только внутри
         самого рельса, не трогая прокрутку страницы. */
      if(row.scrollWidth > row.clientWidth + 4){
        var cr = active.a.getBoundingClientRect(), rr = row.getBoundingClientRect();
        if(cr.left < rr.left + 12 || cr.right > rr.right - 12){
          row.scrollLeft += (cr.left - rr.left) - (rr.width - cr.width) / 2;
        }
      }
    }

    /* Нажали чип: подсвечиваем его немедленно и держим, пока страница
       едет. Запор снимается по тишине в прокрутке, а не по фиксированной
       паузе: длинный перелёт через весь раздел занимает заметно больше
       времени, чем соседний шаг, и одна общая цифра была бы либо
       слишком короткой для первого, либо слишком долгой для второго. */
    function pin(link){
      locked = true;
      setCurrent(link);
      quiet();
    }
    function quiet(){
      if(!locked) return;
      clearTimeout(lockTimer);
      lockTimer = setTimeout(function(){
        locked = false;
        schedule();
      }, 220);
    }

    /* requestAnimationFrame — правильное место для такой работы: она
       читает раскладку и должна попадать в один кадр с прокруткой. Но
       у скрытой вкладки браузер кадры не рисует вовсе, и запрошенный
       обратный вызов не приходит никогда. Раньше из-за этого рельс
       возвращался с другой вкладки с состоянием, снятым до ухода: на
       экране один раздел, подсвечен другой. Поэтому у кадра есть
       страховка таймером — кто успел первым, тот и считает, второй
       видит снятый флаг и молча выходит. */
    function schedule(){
      if(queued) return;
      queued = true;
      requestAnimationFrame(run);
      setTimeout(run, 120);
    }
    function run(){ if(queued) apply(); }

    window.addEventListener("scroll", function(){
      quiet();
      schedule();
    }, { passive:true });
    window.addEventListener("resize", schedule);
    /* Возврат на вкладку: прокрутка та же, но размеры пересчитаны, и
       без этого вызова рельс показал бы состояние, снятое до ухода.
       Состояние сбрасывается, чтобы apply() не счёл раздел прежним и
       не вышел раньше времени. */
    if(PC.nav && PC.nav.onChange){
      PC.nav.onChange(function(tab){
        if(tab !== "about") return;
        current = null;
        locked = false;
        schedule();
      });
    }
    schedule();
    return { pin:pin };
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
