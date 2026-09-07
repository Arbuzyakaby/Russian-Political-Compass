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
        var hay = (p.name + " " + p.short + " " + p.tag + " " + p.ideology).toLowerCase();
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
    if(sel && sel.value !== String(id)) sel.value = String(id);   /* созыв можно выбрать и с графика */

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
        PC.sidebar.renderDetail(PC.partyById(state.active));
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

    var chips = document.querySelectorAll(".chip");
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
        return '<option value="' + c.id + '">' + c.label + " · " + c.years + "</option>";
      }).join("");
      convSelect.value = String(state.convocation);
      convSelect.addEventListener("change", function(){ setConvocation(convSelect.value); });
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
    /* подписи, зависящие от данных, — чтобы число партий не расходилось с массивом */
    var n = PC.PARTIES.length;
    var lead = document.getElementById("lead");
    if(lead) lead.textContent = n + " " + PC.utils.word(n, ["партия", "партии", "партий"]) +
      " на двух осях: экономика и отношение к власти государства";

    PC.nav.init();
    PC.theme.init();
    /* до первой отрисовки блоков: иначе плитки KPI и экраны теста успели бы
       зарегистрироваться, когда наблюдателя ещё нет, и появились бы разом */
    PC.motion.init();
    PC.tip.init();
    PC.sidebar.init();
    PC.charts.init();
    PC.compass.onDraw(syncNodes);
    PC.compass.draw();
    syncNodes();
    renderSide(true);
    PC.charts.render(state.active);
    initControls();
    PC.quiz.init();

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
