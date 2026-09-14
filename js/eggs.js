/* ============ Пасхалки ============

   Пять штук, все выключаются одним переключателем в настройках
   (data-eggs на <html>), потому что шутка, от которой нельзя
   отказаться, — уже не шутка.

   1. Портал вместо кнопки «наверх». Сам портал нарисован в CSS:
      овальная кромка с отсветом, как у оранжевого портала в Portal.
      Здесь только вспышка при нажатии: кнопка на миг синеет — вход
      оранжевый, выход синий, — и лишь потом страница уезжает вверх.
      Логика кнопки осталась в js/ui.js: это по-прежнему возврат
      наверх, просто выглядит иначе.

   2. Могила Horse Update. Пасхалку про лошадей из Minecraft 1.6
      убрали в версии 1.6.2, и в подвале от неё осталась роза. Теперь
      рядом с розой есть и могила: плита, накрытая белорусской
      вышиванкой — красный геометрический орнамент по белому полотну.
      Сцена лежит в углу страницы и проявляется только когда человек
      долистал до самого низа: это награда за внимание, а не элемент
      интерфейса, и мешать она не должна никому.

   3. Уловка-22 (2.2). «22» в поиске партий — и интерфейс начинает
      вращаться; остановить можно, только стерев запрос из того же
      поля, которое само в это время крутится.

   4. Юбилей (2.3.2). «50» в поиске партий — пятидесятый коммит
      проекта — запускает конфетти цветами самих партий и тост с
      мелкой числовой шуткой. Механика та же, что у Уловки-22: то же
      поле, тот же принцип «сработало один раз, пока не сотрут цифры».

   5. Код Konami (2.3.2). Классическая последовательность
      ↑↑↓↓←→←→ в любом месте страницы на секунду пускает точки
      партий на компасе в разноцветный пляс — сдвиг оттенка через
      CSS-фильтр, без переигровки самих цветов данных. Работает поверх
      обычных стрелок навигации (тест, панель настроек, свой
      выпадающий список): preventDefault здесь нарочно не вызывается,
      чтобы не мешать им, а совпасть с их нажатиями случайно длинная
      точная последовательность не может.

   Все пять живут отдельно от остальной страницы: ни один другой
   модуль про них не знает, и удаление этого файла ничего не
   сломает, кроме самих шуток. ============ */
(function(PC){
  "use strict";

  var grave = null;

  function on(){ return document.documentElement.dataset.eggs !== "off"; }

  function reduced(){
    return document.documentElement.dataset.motion === "off" ||
           !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ---------- вспышка портала ---------- */
  /* Вешается на кнопку «наверх», созданную в ui.js. Класс снимается по
     таймеру, а не по animationend: при выключенных анимациях события
     не будет вовсе, и класс остался бы на кнопке навсегда. */
  function initPortal(btn){
    if(!btn) return;
    btn.addEventListener("click", function(){
      if(!on() || reduced()) return;
      btn.classList.remove("fired");
      /* перезапуск анимации: без принудительной перерисовки браузер
         склеит снятие и возврат класса в одно ничего */
      void btn.offsetWidth;
      btn.classList.add("fired");
      setTimeout(function(){ btn.classList.remove("fired"); }, 700);
    });
  }

  /* ---------- могила ---------- */
  var GRAVE_SVG =
    '<svg viewBox="0 0 120 118" role="img" aria-hidden="true">' +
      /* земля */
      '<ellipse class="g-ground" cx="60" cy="106" rx="44" ry="7"/>' +
      /* плита: скруглённый сверху камень */
      '<path class="g-stone" d="M36 106V60a24 24 0 0 1 48 0v46z"/>' +
      /* подкова на открытой части плиты: единственная отсылка к тому,
         кого хоронили, и единственное место, где она уместна */
      '<path class="g-shoe" d="M53 55a7.5 9 0 1 1 14 0" />' +
      '<circle class="g-shoe-nail" cx="52.6" cy="56.5" r="1.5"/>' +
      '<circle class="g-shoe-nail" cx="67.4" cy="56.5" r="1.5"/>' +
      /* вышиванка: полотно поперёк плиты, с провисом и бахромой */
      '<path class="g-cloth" d="M28 70h64v22q-32 7-64 0z"/>' +
      '<g class="g-orn">' +
        /* верхняя и нижняя каймы */
        '<path d="M30 73.5h60M30 88.4q30 6 60 0" stroke-width="1.4"/>' +
        /* восьмиконечная звезда посередине — узел «алатырь» */
        '<path d="M60 76.5v9M55.5 81h9M56.8 77.8l6.4 6.4M63.2 77.8l-6.4 6.4" stroke-width="1.5"/>' +
        /* ромбы по сторонам от звезды */
        '<path d="M43 81l4-4 4 4-4 4zM69 81l4-4 4 4-4 4" stroke-width="1.2"/>' +
        /* крайние метки каймы */
        '<path d="M34 79.5v3M86 79.5v3" stroke-width="1.2"/>' +
      '</g>' +
      /* бахрома по нижнему краю полотна */
      '<path class="g-fringe" d="M31 91.6v4M37 92.8v4M43 93.7v4M49 94.3v4M55 94.6v4' +
        'M61 94.6v4M67 94.3v4M73 93.7v4M79 92.8v4M85 91.6v4"/>' +
      /* роза у подножия — та самая, что осталась в подвале */
      '<path class="g-stem" d="M97 106q1-9 -4-15"/>' +
      '<circle class="g-rose" cx="92.4" cy="89.6" r="4.2"/>' +
      '<path class="g-leaf" d="M95 97q5-1 6-5-5 0-6 5z"/>' +
    '</svg>' +
    '<span class="g-epitaph"></span>';

  function initGrave(){
    var footer = document.querySelector(".site-footer");
    if(!footer) return;

    grave = document.createElement("div");
    grave.className = "horse-grave";
    grave.innerHTML = GRAVE_SVG;
    grave.querySelector(".g-epitaph").textContent = PC.t("egg.grave.epitaph");
    grave.title = PC.t("egg.grave.tip");
    /* Не кнопка и не ссылка: нажимать не на что, и роль ей ни к чему.
       Подпись для скринридера даёт сама сцена — img с aria-label. */
    grave.querySelector("svg").setAttribute("aria-label", PC.t("egg.grave.tip"));
    document.body.appendChild(grave);

    /* Появляется, когда подвал дошёл до низа экрана. Наблюдатель, а не
       обработчик прокрутки: ui.js уже слушает scroll, и второй слушатель
       ради одного класса — лишняя работа на каждый кадр. */
    if(!("IntersectionObserver" in window)){
      grave.classList.add("show");
      return;
    }
    new IntersectionObserver(function(entries){
      grave.classList.toggle("show", entries[0].isIntersecting);
    }, { rootMargin:"0px 0px -40px 0px" }).observe(footer.lastElementChild || footer);
  }

  /* ---------- 3. Уловка-22 (2.2) ----------
     «22» в поиске партий — и весь интерфейс начинает вращаться. Чтобы
     остановить, нужно стереть запрос в поле, которое тоже крутится. */
  function initCatch22(){
    var q = document.getElementById("q");
    if(!q) return;
    var root = document.documentElement;
    q.addEventListener("input", function(){
      var hit = on() && !reduced() && q.value.trim() === "22";
      if(hit && !root.classList.contains("catch22") && PC.ui) PC.ui.toast(PC.t("egg.c22"));
      root.classList.toggle("catch22", hit);
    });
  }

  /* ---------- 4. Юбилей: 50-й коммит (2.3.2) ----------
     Тот же приём, что у Уловки-22: слушаем то же поле поиска и то же
     событие input, срабатываем один раз на переход «стало 50» — а не
     на каждую отдельную клавишу, — и сбрасываем метку, когда запрос
     перестаёт быть «50», чтобы можно было сыграть снова. */
  var jubilee50Fired = false;
  function spawnConfetti(){
    var colors = PC.PARTIES.map(function(p){ return p.color; });
    var host = document.createElement("div");
    host.className = "egg-confetti";
    host.setAttribute("aria-hidden", "true");
    for(var i = 0; i < 28; i++){
      var bit = document.createElement("i");
      bit.style.left = (Math.random() * 100).toFixed(1) + "%";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * .4).toFixed(2) + "s";
      bit.style.animationDuration = (1.1 + Math.random() * .6).toFixed(2) + "s";
      host.appendChild(bit);
    }
    document.body.appendChild(host);
    setTimeout(function(){ host.remove(); }, 2200);
  }
  function initJubilee50(){
    var q = document.getElementById("q");
    if(!q) return;
    q.addEventListener("input", function(){
      var hit = on() && q.value.trim() === "50";
      if(hit && !jubilee50Fired){
        if(PC.ui) PC.ui.toast(PC.t("egg.c50"));
        if(!reduced()) spawnConfetti();
      }
      jubilee50Fired = hit;
    });
  }

  /* ---------- 5. Код Konami (2.3.2) ----------
     Буфер держит только индекс следующей ожидаемой клавиши, а не всю
     историю нажатий: длиннее, чем восемь шагов, последовательность
     никогда не бывает, и сравнивать есть с чем — с одной клавишей за
     раз. Несовпадение сбрасывает счётчик, но не глухо: если сама
     нажатая клавиша — первая клавиша кода, отсчёт стартует заново с
     неё же, а не требует полной паузы перед новой попыткой. */
  var KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
                "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"];
  var konamiStep = 0;
  function fireKonami(){
    if(PC.ui) PC.ui.toast(PC.t("egg.konami"));
    if(reduced()) return;
    var svg = document.getElementById("svg");
    if(!svg) return;
    svg.classList.remove("egg-disco");
    void svg.offsetWidth;
    svg.classList.add("egg-disco");
    setTimeout(function(){ svg.classList.remove("egg-disco"); }, 1500);
  }
  function initKonami(){
    document.addEventListener("keydown", function(e){
      if(!on()){ konamiStep = 0; return; }
      if(e.key === KONAMI[konamiStep]){
        konamiStep++;
        if(konamiStep === KONAMI.length){
          konamiStep = 0;
          fireKonami();
        }
      }else{
        konamiStep = e.key === KONAMI[0] ? 1 : 0;
      }
    });
  }

  function init(){
    initPortal(document.querySelector(".to-top"));
    initGrave();
    initCatch22();
    initJubilee50();
    initKonami();
  }

  /* ---------- 3D-пролёт над компасом (2.2) ----------
     Не пасхалка, но живёт здесь же: чисто декоративный эффект, о котором
     не знает ни один другой модуль. force — повтор из настроек. */
  PC.flyover = function(){
    var plot = document.getElementById("plot");
    if(!plot || reduced()) return;
    if(PC.nav && PC.nav.current && PC.nav.current() !== "compass") return;
    plot.scrollIntoView({ block:"center", behavior:"smooth" });
    plot.classList.remove("flyover");
    void plot.offsetWidth;
    plot.classList.add("flyover");
    setTimeout(function(){ plot.classList.remove("flyover"); }, 3000);
  };

  PC.eggs = { init:init };
})(window.PC = window.PC || {});
