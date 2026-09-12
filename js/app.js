/* ============ Состояние, фильтры, вкладки, инициализация ============ */
(function(PC){
  "use strict";

  var state = { active:null, filter:"all", query:"", convocation:PC.CURRENT_CONVOCATION };
  var rendered = null;   // что сейчас в панели: "list" или id партии

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

  function syncNodes(){
    var ids = new Set(visible().map(function(p){ return p.id; }));
    PC.compass.syncNodes(ids, state.active);
  }

  /* Перерисовывает панель, но только если её содержимое действительно
     изменилось — иначе на каждое нажатие клавиши в поиске заново
     проигрывались бы анимации карточки. */
  function renderSide(force){
    if(state.active){
      if(force || rendered !== state.active){
        /* Переход между карточками двух РАЗНЫХ партий (например, при
           просмотре траекторий одной за другой) — это обновление данных,
           а не первое открытие карточки: полный стартовый разъезд полей
           анимацией здесь неуместен, он выглядит как перезагрузка панели. */
        var freshOpen = !rendered || rendered === "list";
        PC.sidebar.renderDetail(PC.partyById(state.active), freshOpen);
        rendered = state.active;
      }
    }else{
      PC.sidebar.renderList(visible(), state.active);
      rendered = "list";
    }
  }

  /* Выбор партии. Повторный клик по той же партии снимает выделение;
     select(null) просто возвращает список. */
  function select(id){
    state.active = (id && state.active === id) ? null : id;
    syncNodes();
    renderSide(true);
    PC.charts.render(state.active);
  }

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

    /* Слой траекторий: выбор запоминается, потому что это режим просмотра,
       а не разовое действие — вернувшись, человек ожидает увидеть поле
       таким, каким оставил. */
    var trailBtn = document.getElementById("trailBtn");
    if(trailBtn){
      if(!PC.compass.hasTrails()){
        trailBtn.hidden = true;
      }else{
        var trailsOn = PC.store.get("pc-trails", "0") === "1";
        PC.compass.setTrails(trailsOn);
        trailBtn.setAttribute("aria-pressed", String(trailsOn));
        trailBtn.addEventListener("click", function(){
          trailsOn = !trailsOn;
          PC.store.set("pc-trails", trailsOn ? "1" : "0");
          PC.compass.setTrails(trailsOn);
          trailBtn.setAttribute("aria-pressed", String(trailsOn));
        });
      }
    }

    PC.exporter.init();

    document.addEventListener("keydown", function(e){
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
        input.focus();
      }
    });
  }

  /* ---------- запуск ---------- */
  function init(){
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
    PC.ui.init();
    /* до первой отрисовки блоков: иначе плитки KPI и экраны теста успели бы
       зарегистрироваться, когда наблюдателя ещё нет, и появились бы разом */
    PC.motion.init();
    PC.tip.init();
    PC.sidebar.init();
    PC.charts.init();
    PC.coalition.init();
    /* до первой отрисовки компаса: drawUser() спрашивает у теста сохранённый
       результат, и при обратном порядке точка «Вы» появлялась бы на поле
       только после первого переключения вкладок */
    PC.quiz.init();
    /* после теста: карточка партии показывает блок голосований, а
       модуль голосований ничего не знает про состояние компаса */
    PC.votes.init();
    /* Число на ярлыке вкладки берётся из данных: написанное в разметке
       руками отстало бы от набора при первом же новом голосовании. */
    var votesBadge = document.querySelector("#tab-votes .tab-badge");
    if(votesBadge) votesBadge.textContent = String(PC.VOTES.length);
    /* Те же два числа стоят в подвале. Написанные руками, они разошлись
       бы с набором при первой же новой партии или голосовании — а подвал
       читают как справку о масштабе данных, и врать ему нельзя. */
    var footParties = document.getElementById("footParties");
    if(footParties) footParties.textContent = String(n);
    var footVotes = document.getElementById("footVotes");
    if(footVotes) footVotes.textContent = String(PC.VOTES.length);
    PC.compass.onDraw(syncNodes);
    PC.compass.draw();
    syncNodes();
    renderSide(true);
    PC.charts.render(state.active);
    initControls();
    /* После initControls: переключатель траекторий в настройках зеркалит
       состояние чипа над компасом, а чип поднимает это состояние из
       хранилища именно там. */
    PC.settings.init();
    /* Нативные списки подменяются своими только после того, как модули
       разложили в них варианты: до этого оформленной оказалась бы пустая
       кнопка, а варианты доехали бы в скрытый <select>. */
    PC.dropdown.init();

    /* Смена темы (в том числе системной, из настроек ОС) меняет расчёт
       цвета марок — графики пересобираем. */
    PC.theme.onChange(function(){
      PC.charts.render(state.active);
    });

    /* Скрытая вкладка выпадает из раскладки: у контейнеров нулевая ширина,
       а getBBox() внутри display:none возвращает нули. Поэтому компас и
       графики пересобираются при каждом возврате на вкладку. */
    PC.nav.onChange(function(tab){
      if(tab !== "compass") return;
      PC.charts.invalidate();
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
    console.log("%c1.6%c — ни счётчиков, ни запросов наружу; всё, что видно, посчитано здесь",
      "font:700 13px monospace;color:#f0b25f;", "color:inherit;");
  }

  PC.select = select;
  PC.visible = visible;
  PC.seatsOf = seatsOf;
  PC.convocationInfo = convocationInfo;
  PC.setConvocation = setConvocation;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
})(window.PC = window.PC || {});
