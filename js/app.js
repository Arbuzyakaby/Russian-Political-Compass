/* ============ Состояние, фильтры, вкладки, инициализация ============ */
(function(PC){
  "use strict";

  var state = { active:null, filter:"all", query:"", convocation:PC.CURRENT_CONVOCATION };
  var rendered = null;   // что сейчас в панели: "list" или id партии
  /* Метки для замера производительности (performance.mark). */
  function mark(name){ if(window.performance && performance.mark) performance.mark(name); }
  function measure(name, start, end){ if(window.performance && performance.measure) performance.measure(name, start, end); }

  /* Мандаты партии в текущем выбранном созыве. null — партия в этом
     созыве не участвовала / не существовала. */
  function seatsOf(p){ return PC.seatsAt(p, state.convocation); }

  /* Партии, проходящие текущий фильтр, поисковый запрос и существовавшие
     в выбранном созыве. */
  function visible(){
    return PC.PARTIES.filter(function(p){
      var seats = seatsOf(p);
      if(seats === null) return false;
      if(state.filter === "duma" && !seats) return false;
      if(state.filter === "nonduma" && seats) return false;
      if(state.query){
        /* Ищем сразу по обоим языкам: человек с английским интерфейсом
           может набрать «КПРФ», а с русским — «Yabloko», и в обоих
           случаях он имеет в виду одну и ту же партию. */
        var hay = [p.name, p.short, p.tag, p.ideology,
                   p.en && p.en.name, p.en && p.en.short,
                   p.en && p.en.tag, p.en && p.en.ideology]
                  .filter(Boolean).join(" ").toLowerCase();
        if(hay.indexOf(state.query) === -1) return false;
      }
      return true;
    });
  }

  /* Текущий созыв для шапки. */
  function convocationInfo(){
    var id = state.convocation;
    return PC.CONVOCATIONS.filter(function(c){ return c.id === id; })[0] || PC.CONVOCATIONS[0];
  }

  function setConvocation(id){
    id = Number(id);
    if(id === state.convocation) return;
    state.convocation = id;
    if(state.active && seatsOf(PC.partyById(state.active)) === null) state.active = null;

    var sel = document.getElementById("convSelect");
    if(sel && sel.value !== String(id)){
      sel.value = String(id);              /* созыв можно выбрать и с графика */
      if(PC.dropdown) PC.dropdown.sync(sel);   /* подпись на кнопке списка отстаёт без этого */
    }

    PC.compass.draw();
    syncNodes();
    renderSide(true);
    PC.charts.render(state.active);
  }

  /* Синхронизирует узлы компаса с данными текущего созыва. */
  function syncNodes(){
    var ids = new Set(visible().map(function(p){ return p.id; }));
    PC.compass.syncNodes(ids, state.active);
  }

  /* Перерисовывает панель, но только если её содержимое действительно
     изменилось — иначе на каждое нажатие клавиши в поиске заново
     проигрывались бы анимации карточки.

     Смена «личности» показанного — список стал карточкой, одна карточка
     стала другой, карточка вернулась в список — переворачивает панель
     целиком (PC.motion.flip, 2.3.1): старое содержимое уходит ребром,
     новое разворачивается на его месте. Перерисовка списка по одному и
     тому же поисковому запросу — не смена личности, и такая не
     переворачивается, иначе каждое нажатие клавиши крутило бы панель. */
  function renderSide(force){
    var nextKey = state.active || "list";
    var identityChanged = rendered !== null && rendered !== nextKey;

    function paint(){
      if(state.active){
        /* Переход между карточками двух РАЗНЫХ партий (например, при
           переходе по соседям на компасе одной за другой) — это обновление данных,
           а не первое открытие карточки: полный стартовый разъезд полей
           анимацией здесь неуместен, он выглядит как перезагрузка панели. */
        var freshOpen = !rendered || rendered === "list";
        PC.sidebar.renderDetail(PC.partyById(state.active), freshOpen);
      }else{
        PC.sidebar.renderList(visible(), state.active);
      }
      rendered = nextKey;
    }

    if(state.active){
      if(!force && rendered === nextKey) return;
    }
    if(identityChanged && PC.motion && !window.matchMedia("(max-width:720px), (pointer:coarse) and (max-width:1050px)").matches){
      PC.motion.flip(document.getElementById("sideFlip"), paint);
    }else{
      paint();
    }
  }

  /* Выбор партии. Повторный клик по той же партии снимает выделение;
     select(null) просто возвращает список. */
  function select(id){
    state.active = (id && state.active === id) ? null : id;
    syncNodes();
    renderSide(true);
    PC.charts.render(state.active);
    if(PC.mobile) PC.mobile.selected(state.active);
  }

  /* Полная перерисовка при смене языка или данных. */
  function refresh(){
    /* если выбранная партия отфильтрована — выделение снимаем */
    if(state.active && !visible().some(function(p){ return p.id === state.active; })){
      state.active = null;
    }
    syncNodes();
    PC.tip.hide();
    PC.compass.hideCross();
    renderSide(false);
    PC.charts.render(state.active);
  }

  /* «Голосую сам» (4.4) подгружается, когда блок приближается к экрану
     (js/lazy.js); PC.loadSelfVote нужен ещё командной палитре. Вкладка
     скрыта атрибутом hidden — пока её не открыли, блок не пересекается
     с экраном и ничего не грузится. */
  var selfVoteReady = null;
  function loadSelfVote(){
    if(!selfVoteReady){
      selfVoteReady = PC.lazy.run("selfvote", function(){ PC.selfVote.init(); }).then(function(){
        if(!PC.lazy.loaded("selfvote")) selfVoteReady = null;     /* не загрузилось — следующая попытка начнётся заново */
      });
    }
    return selfVoteReady;
  }
  function watchSelfVote(){
    PC.loadSelfVote = loadSelfVote;
    var host = document.getElementById("selfVote");
    if(!host) return;
    if(!("IntersectionObserver" in window)){ loadSelfVote(); return; }
    var io = new IntersectionObserver(function(entries){
      if(!entries.some(function(e){ return e.isIntersecting; })) return;
      io.disconnect();
      /* не загрузилось — блок снова ждёт приближения к экрану, повтор при следующей прокрутке */
      loadSelfVote().then(function(){ if(!PC.lazy.loaded("selfvote")) setTimeout(function(){ io.observe(host); }, 4000); });
    }, { rootMargin:"400px 0px" });
    io.observe(host);
  }

  /* Адрес #/duel/<a>-<b> (4.4) открывает окно дуэли. Разбор здесь, а не в
     js/duel.js: модуль подгружается по требованию, и адрес должен его
     вызвать. Идентификаторы партий — латиница и цифры без дефиса. */
  function routeDuel(){
    var m = /^#\/duel\/([a-z0-9]+)-([a-z0-9]+)(?:\?c=(\d))?$/.exec(location.hash);
    if(!m) return;
    /* своя партия (u1–u6) жила только в браузере автора ссылки и удалена
       в 5.0 вместе с разделом: подставлять вместо неё чужую нельзя */
    if(/^u[1-6]$/.test(m[1]) || /^u[1-6]$/.test(m[2])){ retired(); return; }
    PC.lazy.run("duel", function(){ PC.duel.open(m[1], m[2], m[3]); });
  }

  /* Ссылки на «Мою партию» (#/party/…, карточки и гостевой просмотр)
     остались в старых сообщениях. Раздел удалён в 5.0; такая ссылка
     открывает компас и честно говорит, что случилось. */
  function retired(){
    if(history.replaceState) history.replaceState(null, "", location.pathname + location.search + "#/compass");
    PC.ui.toast(PC.t("retired.party"));
  }
  function routeRetired(){
    if(/^#\/?party(?:\/|$)/.test(location.hash)) retired();
  }

  /* ---------- поиск и фильтры ---------- */
  function initControls(){
    var input = document.getElementById("q");
    var wrap  = document.getElementById("searchWrap");

    input.addEventListener("input", function(){
      state.query = input.value.trim().toLowerCase();
      wrap.classList.toggle("has-value", !!input.value);
      refresh();
    });
    document.getElementById("clearBtn").addEventListener("click", function(){
      input.value = "";
      input.dispatchEvent(new Event("input"));
      input.focus();
    });

    /* Только чипы-фильтры: класс .chip носят ещё кнопки «Траектории»
       и «Экспорт», и общий селектор сбрасывал бы выбранный фильтр
       (state.filter становился undefined) при каждом клике по ним. */
    var chips = document.querySelectorAll(".chips .chip[data-filter]");
    chips.forEach(function(chip){
      chip.addEventListener("click", function(){
        state.filter = chip.dataset.filter;
        chips.forEach(function(other){
          other.setAttribute("aria-pressed", String(other === chip));
        });
        refresh();
      });
    });

    var convSelect = document.getElementById("convSelect");
    if(convSelect){
      convSelect.innerHTML = PC.CONVOCATIONS.map(function(c){
        return '<option value="' + c.id + '" data-note="' + c.years + '">' +
               PC.L(c, "label") + " · " + c.years + "</option>";
      }).join("");
      convSelect.value = String(state.convocation);
      convSelect.addEventListener("change", function(){ setConvocation(convSelect.value); });
      if(PC.dropdown) PC.dropdown.sync(convSelect);
    }

    /* Слой заявленных позиций: выбор запоминается, потому что это режим
       просмотра, а не разовое действие — вернувшись, человек ожидает
       увидеть поле таким, каким оставил. В отличие от траекторий, которые
       он заменил, слой включён по умолчанию: разрыв между словом и делом —
       главное, что появилось в 3.0, и прятать его за кнопкой значило бы
       показывать его только тем, кто и так знает, где искать. applyClaims —
       общая точка входа: ею же пользуется PC.resetClaims, чтобы «Сбросить
       настройки» возвращало слой и на самом компасе, а не только в
       localStorage. */
    var claimBtn = document.getElementById("claimBtn");
    var claimsOn = true;
    /* Включает или выключает слой заявок на компасе. */
    function applyClaims(on){
      claimsOn = on;
      PC.store.set("pc-claims", on ? "1" : "0");
      PC.compass.setClaims(on);
      if(claimBtn) claimBtn.setAttribute("aria-pressed", String(on));
    }
    if(claimBtn){
      if(!PC.compass.hasClaims()){
        claimBtn.hidden = true;
      }else{
        applyClaims(PC.store.get("pc-claims", "1") === "1");
        claimBtn.addEventListener("click", function(){ applyClaims(!claimsOn); });
      }
    }
    PC.resetClaims = function(){
      PC.store.remove("pc-claims");
      applyClaims(true);
    };

    mark("pc:export-start"); PC.exporter.init(); mark("pc:export-ready"); measure("pc:stage6","pc:export-start","pc:export-ready");

    document.addEventListener("keydown", function(e){
      if(e.defaultPrevented || PC.utils.modalOpen()) return;
      if(PC.nav.current() !== "compass") return;
      if(e.key === "Escape"){
        if(document.activeElement === input && input.value){
          input.value = "";
          input.dispatchEvent(new Event("input"));
        }else if(state.active){
          select(null);
        }
        return;
      }
      /* «/» — быстрый переход в поиск, но не мешаем набору текста */
      if(e.key === "/" && document.activeElement !== input && !e.ctrlKey && !e.metaKey){
        e.preventDefault();
        if(PC.palette) PC.palette.open(); else input.focus();
      }
    });
  }

  /* ---------- инструменты листа и карты ----------
     До 5.0 это делала тонкая обёртка js/tisza.js — наследие 4.0, где в
     одном файле жили палитра, копии, настройки и жесты. Всё давно
     разъехалось по своим модулям, и порядок запуска вернулся сюда. */
  var REDRAW_KEYS = ["*", "dotSize", "labelMode", "bubbles", "colorblind", "axisNums", "center", "quadLabels"];
  function initTools(){
    PC.settings.extend();
    PC.mapControls.init();
    PC.palette.init();
    /* настройки, меняющие рисунок карты, требуют перерисовки поля */
    document.addEventListener("pc:settings", function(e){
      if(REDRAW_KEYS.indexOf(e.detail.key) !== -1) PC.compass.redraw();
    });
    /* стартовый созыв из настроек действует до первого перехода по ссылке */
    var stored = PC.store.getJSON("pc-settings", {}), convocation = Number(stored.convDefault);
    if(PC.CONVOCATIONS.some(function(c){ return c.id === convocation; })) setConvocation(convocation);
    if(!location.hash) PC.nav.go(PC.nav.current());
    if(location.hash === "#/srpc") PC.srpc.open();
    var about = document.querySelector(".srpc-chain") || document.querySelector(".chain");
    if(!about) return;
    var open = document.createElement("button");
    open.type = "button";
    open.className = "btn small";
    open.textContent = PC.t("srpc.open");
    open.addEventListener("click", function(){ PC.srpc.open(); });
    about.parentNode.appendChild(open);
  }

  /* ---------- запуск ---------- */
  function init(){
    mark("pc:markup"); mark("pc:data");
    /* Язык — самым первым: словарь подменяет текст готовой разметки, а
       все остальные модули строят свою разметку уже через t(). Если бы
       i18n стартовал позже, шапка успела бы показаться по-русски и
       мигнуть на английский. */
    PC.i18n.init();

    /* подписи, зависящие от данных, — чтобы число партий не расходилось с массивом */
    var n = PC.PARTIES.length;
    var lead = document.getElementById("lead");
    if(lead) lead.textContent = PC.t("brand.lead", { n:n, parties:PC.i18n.pl(n, "word.party") });

    PC.nav.init();
    PC.theme.init();
    mark("pc:styles");
    PC.ui.init();
    /* до первой отрисовки блоков: иначе плитки KPI и экраны теста успели бы
       зарегистрироваться, когда наблюдателя ещё нет, и появились бы разом */
    PC.motion.init();
    PC.spring.init();
    PC.tip.init();
    PC.sidebar.init();
    PC.charts.init();
    PC.coalition.init();
    /* до первой отрисовки компаса: drawUser() спрашивает у теста сохранённый
       результат, и при обратном порядке точка «Вы» появлялась бы на поле
       только после первого переключения вкладок */
    PC.settings.init();
    mark("pc:calc-start"); PC.quiz.init(); mark("pc:calc-ready"); measure("pc:stage4","pc:calc-start","pc:calc-ready");
    /* Тест по разделу «О проекте» (2.5). Ставится после PC.ui.init():
       ссылка «читать в разделе» ходит через PC.ui.aboutNavGo, а тот
       знает про рельс оглавления только после того, как рельс собран. */
    if(PC.aboutQuiz) PC.aboutQuiz.init();
    /* после теста: карточка партии показывает блок голосований, а
       модуль голосований ничего не знает про состояние компаса */
    PC.votes.init();
    watchSelfVote();
    var duelBtn = document.getElementById("duelFromVotes");
    if(duelBtn) duelBtn.addEventListener("click", function(){ PC.lazy.run("duel", function(){ PC.duel.open("er", "kprf"); }, duelBtn); });
    PC.people.init();
    /* Число на ярлыке вкладки берётся из данных: написанное в разметке
       руками отстало бы от набора при первом же новом голосовании. */
    var votesBadge = document.querySelector("#tab-votes .tab-badge");
    if(votesBadge) votesBadge.textContent = String(PC.VOTES.length);
    /* Числа в шапке раздела голосований — из того же набора, что и
       ярлык вкладки. Фракции считаются по самим голосованиям, а не по
       списку партий: в таблице стоят только те, у кого позиция вообще
       зафиксирована хоть раз. */
    var vfCount = document.getElementById("vfCount");
    if(vfCount) vfCount.textContent = String(PC.VOTES.length);
    var vfFactions = document.getElementById("vfFactions");
    if(vfFactions){
      var seen = new Set();
      PC.VOTES.forEach(function(v){
        Object.keys(v.pos || {}).forEach(function(id){ seen.add(id); });
      });
      vfFactions.textContent = String(seen.size);
    }
    /* Те же два числа стоят в подвале. Написанные руками, они разошлись
       бы с набором при первой же новой партии или голосовании — а подвал
       читают как справку о масштабе данных, и врать ему нельзя. */
    var footParties = document.getElementById("footParties");
    if(footParties) footParties.textContent = String(n);
    var footVotes = document.getElementById("footVotes");
    if(footVotes) footVotes.textContent = String(PC.VOTES.length);
    document.querySelectorAll("[data-conv-count]").forEach(function(e){ e.textContent = String(PC.CONVOCATIONS.length); });
    var version = document.querySelector(".foot-version");
    if(version) version.textContent = PC.versionLabel();
    /* Мысль дня (5.0): одна строка от автора на день, по кругу из семи.
       День считается по местному времени, чтобы строка менялась в полночь
       читателя, а не по Гринвичу. */
    var thought = document.getElementById("footThought");
    if(thought){
      var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
      thought.textContent = PC.t("foot.thought." + (day % 7 + 1));
      thought.title = PC.t("foot.thought.h");
      thought.hidden = false;
    }
    PC.compass.onDraw(syncNodes);
    mark("pc:draw-start"); PC.compass.draw(); mark("pc:first-draw"); measure("pc:stage5","pc:draw-start","pc:first-draw");
    syncNodes();
    renderSide(true);
    PC.charts.render(state.active);
    initControls();
    /* после settings.init(): обе пасхалки смотрят на data-eggs, который
       выставляет панель настроек, и до неё атрибута на <html> ещё нет */
    PC.eggs.init();
    /* Полноэкранный SRPC и обучение: оба открываются из уже собранной
       панели настроек и оба обязаны существовать к тому моменту, когда
       по кнопке щёлкнут, — но ни один из них при запуске ничего не
       рисует, пока его не позовут. */
    if(PC.srpc) PC.srpc.init();
    if(PC.guide) PC.guide.init();
    if(PC.book) PC.book.init();
    /* Приветствие уже запущено welcome-boot.js. Повторный вызов безопасен
       и остаётся запасным путём при изменении порядка загрузки. */
    PC.welcome.init();
    document.getElementById("welGuide").disabled = false;
    /* Нативные списки подменяются своими только после того, как модули
       разложили в них варианты: до этого оформленной оказалась бы пустая
       кнопка, а варианты доехали бы в скрытый <select>. */
    PC.dropdown.init();
    if(PC.mobile) PC.mobile.init();
    if(PC.appShell) PC.appShell.init();
    initTools();
    if(PC.offline) PC.offline.init();
    if(PC.intro) PC.intro.init();
    window.addEventListener("hashchange", function(){ routeRetired(); routeDuel(); });
    routeRetired();
    routeDuel();

    /* Смена темы (в том числе системной, из настроек ОС) меняет расчёт
       цвета марок — графики пересобираем. */
    PC.theme.onChange(function(){
      PC.charts.render(state.active);
    });

    /* Компас восстанавливает точки после теста; аналитика использует кэш
       данных и пересчитывает геометрию через ResizeObserver. */
    PC.nav.onChange(function(tab){
      if(tab !== "compass") return;
      PC.compass.redraw();
      PC.charts.render(state.active);
    });

    /* подписи компаса раскладываются по реальным размерам текста (getBBox);
       если веб-шрифт ещё не подгрузился, метрики берутся с системного
       фолбэка и после подмены шрифта ярлык может наехать на соседний —
       пересчитываем раскладку, когда шрифты точно готовы */
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){
        if(PC.nav.current() === "compass") PC.compass.redraw();
      });
    }

    /* Единственная строка, которая когда-либо уходит в консоль: в проекте
       нет ни аналитики, ни внешних запросов, и заглянувшему сюда стоит
       сказать об этом прямо. */
    console.log("%c" + (PC.VERSION_LABEL || PC.VERSION) + "%c — no analytics; calculations stay in your browser",
      "font:700 13px monospace;color:#f0b25f;", "color:inherit;");
  }

  PC.select = select;
  PC.activeId = function(){ return state.active; };
  PC.visible = visible;
  PC.refresh = refresh;
  PC.seatsOf = seatsOf;
  PC.convocationInfo = convocationInfo;
  PC.setConvocation = setConvocation;

  /* Приветствие запускается в конце init(), и до 2.1.1 любая ошибка
     в одном из двадцати модулей перед ним молча отменяла экран целиком —
     ещё одна причина, по которой он «то появлялся, то нет». Ошибка
     по-прежнему уходит в консоль, но первого знакомства больше не
     отнимает. Повторный вызов welcome.init() безопасен: модуль сам
     проверяет, что уже запущен. */
  function boot(){
    try{ init(); }
    finally{ if(PC.welcome) PC.welcome.init(); }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})(window.PC = window.PC || {});
