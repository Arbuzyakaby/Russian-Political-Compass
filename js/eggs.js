/* ============ Пасхалки ============

   Две штуки, обе выключаются одним переключателем в настройках
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

   Обе живут отдельно от остальной страницы: ни один другой модуль
   про них не знает, и удаление этого файла ничего не сломает. ============ */
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

  function init(){
    initPortal(document.querySelector(".to-top"));
    initGrave();
  }

  PC.eggs = { init:init };
})(window.PC = window.PC || {});
