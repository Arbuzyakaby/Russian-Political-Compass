/* ============ Пасхалки ============

   Тринадцать штук, все выключаются одним переключателем в настройках
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

   6. Тиса / Висла в поиске: волна на компасе и река в подвале.
   7. Пять кликов по версии: лента имён выпусков.
   8. Абсолютный центр / четыре угла своей партии.
   9. Одинаковые ответы на все вопросы теста.
   10. Шесть звеньев SRPC в ровную линию: золотые связи и бесконечность.
   11. Клавиша `: терминал help, parties, whoami, rivers, exit.
   12. #/teapot: самовар и HTTP-шутка 418.
   13. Ночная смена с 03:00 до 04:00 местного времени.

   Все пасхалки живут отдельно от остальной страницы: ни один другой
   модуль про них не знает, и удаление этого файла ничего не
   сломает, кроме самих шуток. ============ */
(function(PC){
  "use strict";

  var grave = null;

  function on(){ return document.documentElement.dataset.eggs === "on"; }
  var IDS = ["portal", "grave", "22", "50", "konami", "river", "rivers", "centre", "agree", "pipeline", "terminal", "teapot", "night"];
  function found(id){
    if(!on() || IDS.indexOf(id) < 0) return;
    var saved = PC.store.getJSON("pc-eggs-found", []);
    if(!Array.isArray(saved)) saved = [];
    saved = saved.filter(function(s){ return IDS.indexOf(s) >= 0; });
    if(saved.indexOf(id) < 0){ saved.push(id); PC.store.setJSON("pc-eggs-found", saved); }
    var counter = document.getElementById("eggsFound"); if(counter) counter.textContent = PC.t("set.found", { n:saved.length, m:IDS.length });
  }

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
      if(!on()) return;
      found("portal"); if(reduced()) return;
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
    grave.addEventListener("click", function(){ found("grave"); });

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
      if(hit && !root.classList.contains("catch22") && PC.ui){ found("22"); PC.ui.toast(PC.t("egg.c22")); }
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
        found("50");
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
    found("konami");
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
    initTisza();
  }

  var riverTimer = null, aligned = false, consoleDialog = null, teapot = null;
  function river(){
    if(!on()) return; found("river");
    var root = document.documentElement; root.classList.remove("egg-river");
    if(!reduced()){ void root.offsetWidth; root.classList.add("egg-river"); }
    if(PC.ui) PC.ui.toast(PC.t("eggs.rivers"));
    clearTimeout(riverTimer); riverTimer = setTimeout(function(){ root.classList.remove("egg-river"); }, 5000);
  }
  function party(p){
    if(!on()) return;
    if(Math.abs(p.x) < .00001 && Math.abs(p.y) < .00001){ found("centre"); PC.ui.toast(PC.t("eggs.centre")); }
    else if(Math.abs(p.x) === 10 && Math.abs(p.y) === 10){ found("centre"); PC.ui.toast(PC.t("eggs.corner." + ((p.y > 0 ? 0 : 2) + (p.x > 0 ? 1 : 0)))); }
  }
  function quiz(answers){
    if(!on()) return; var values = Object.keys(answers).map(function(k){ return answers[k]; });
    if(values.length >= 20 && values.every(function(v){ return v === values[0]; })){ found("agree"); PC.ui.toast(PC.t("eggs.agree")); }
  }
  function pipeline(cards, canvas){
    if(!on() || cards.length !== 6) return;
    function coordinate(c,key){var n=parseFloat(c.style&&c.style[key]);return isFinite(n)?n:key==="left"?c.offsetLeft:c.offsetTop;}
    var sorted=cards.slice().sort(function(a,b){return coordinate(a,"left")-coordinate(b,"left");}),y=sorted.map(function(c){return coordinate(c,"top");});
    var gaps=sorted.slice(1).map(function(c,i){return coordinate(c,"left")-coordinate(sorted[i],"left");});
    var hit = Math.max.apply(null,y)-Math.min.apply(null,y)<=4 && Math.min.apply(null,gaps)>sorted[0].offsetWidth && Math.max.apply(null,gaps)-Math.min.apply(null,gaps)<=4;
    if(hit && !aligned){
      found("pipeline"); if(!reduced()) canvas.classList.add("egg-golden");
      var infinity = document.createElement("span"); infinity.className="egg-infinity"; infinity.textContent="∞"; canvas.appendChild(infinity);
      setTimeout(function(){ canvas.classList.remove("egg-golden"); infinity.remove(); },1200);
    } aligned=hit;
  }
  function terminal(){
    if(!on() || PC.utils.modalOpen()) return; found("terminal");
    if(!consoleDialog){
      consoleDialog=document.createElement("dialog");consoleDialog.className="egg-terminal";consoleDialog.setAttribute("aria-modal","true");consoleDialog.setAttribute("aria-label",PC.t("eggs.terminal"));
      var title=document.createElement("h2");title.textContent=PC.t("eggs.terminal");var output=document.createElement("pre"),form=document.createElement("form"),input=document.createElement("input");input.autocomplete="off";input.spellcheck=false;input.setAttribute("aria-label",PC.t("eggs.terminal"));form.appendChild(input);consoleDialog.append(title,output,form);document.body.appendChild(consoleDialog);
      form.addEventListener("submit",function(e){
        e.preventDefault(); var command=input.value.trim().toLowerCase(),response=""; input.value="";
        if(command==="exit"){consoleDialog.close();return;}
        if(command==="help")response="help · parties · whoami · rivers · exit";
        else if(command==="parties")response=PC.allParties().map(function(p){return PC.L(p,"short")+"  "+PC.utils.fmt(p.x)+" / "+PC.utils.fmt(p.y);}).join("\n");
        else if(command==="whoami"){var r=PC.quiz.result();response=r?"X "+PC.utils.fmt(r.x)+" / Y "+PC.utils.fmt(r.y):"—";}
        else if(command==="rivers")response=PC.t("eggs.rivers");else response="? help";
        output.textContent=(output.textContent+"\n> "+command+"\n"+response).slice(-12000);output.scrollTop=output.scrollHeight;
      });
    } consoleDialog.showModal();consoleDialog.querySelector("input").focus();
  }
  function showTeapot(){
    if(location.hash!=="#/teapot" || !on()){if(teapot){teapot.remove();teapot=null;}return;}found("teapot");if(teapot)return;
    teapot=document.createElement("dialog");teapot.className="egg-teapot";teapot.setAttribute("aria-modal","true");teapot.setAttribute("aria-label",PC.t("eggs.teapot"));
    var h=document.createElement("h2");h.textContent="418";var art=PC.utils.el("svg",{viewBox:"0 0 200 180","aria-hidden":"true",fill:"none",stroke:"currentColor","stroke-width":4});
    art.appendChild(PC.utils.el("path",{d:"M65 50h70v70q-35 30-70 0Zm-5 0h80M80 40h40M100 25v15M82 135v20m36-20v20M70 157h60M135 65q55-20 35 40l-35 8M65 70 30 60l20 40 15 5M85 60v60m15-60v68m15-68v60"}));
    var p=document.createElement("p");p.textContent=PC.t("eggs.teapot");var b=document.createElement("button");b.className="btn";b.textContent=PC.t("party.close");b.addEventListener("click",function(){location.hash="#/compass";});teapot.append(h,art,p,b);document.body.appendChild(teapot);teapot.addEventListener("cancel",function(){location.hash="#/compass";});teapot.showModal();
  }
  function night(){
    var existing=document.querySelector(".egg-night"),hour=new Date().getHours();if(existing)existing.remove();
    if(on()&&hour>=3&&hour<4){found("night");var p=document.createElement("p");p.className="egg-night";p.textContent="🦉 "+PC.t("eggs.night");document.querySelector(".site-footer").appendChild(p);}
  }
  function initTisza(){
    var q=document.getElementById("q");if(q)q.addEventListener("input",function(){if(/^(тиса|tisza|висла|vistula)$/i.test(q.value.trim()))river();});
    var version=document.querySelector(".foot-version"),clicks=0,last=0;
    if(version){version.tabIndex=0;version.addEventListener("click",function(){if(!on())return;var now=Date.now();clicks=now-last>2000?1:clicks+1;last=now;if(clicks===5){found("rivers");PC.ui.toast(PC.t("eggs.rivers"));clicks=0;}});version.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();version.click();}});}
    document.addEventListener("keydown",function(e){if(e.key!=="`"||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;e.preventDefault();terminal();});
    var count=document.createElement("p");count.id="eggsFound";count.className="party-meta";document.getElementById("setPanel-general").appendChild(count);
    function sync(){var saved=PC.store.getJSON("pc-eggs-found",[]);count.textContent=PC.t("set.found",{n:Array.isArray(saved)?new Set(saved.filter(function(id){return IDS.indexOf(id)>=0;})).size:0,m:IDS.length});night();showTeapot();if(!on()){document.documentElement.classList.remove("catch22","egg-river");if(consoleDialog&&consoleDialog.open)consoleDialog.close();document.querySelectorAll(".egg-infinity").forEach(function(n){n.remove();});}}
    document.addEventListener("pc:settings",function(e){if(e.detail.key==="eggs")sync();});window.addEventListener("hashchange",showTeapot);sync();
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

  PC.eggs = { init:init, party:party, quiz:quiz, pipeline:pipeline, found:found, IDS:IDS };
})(window.PC = window.PC || {});
