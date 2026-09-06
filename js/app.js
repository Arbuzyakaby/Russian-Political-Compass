/* ============ Состояние, фильтры, тема, инициализация ============ */
(function(PC){
  "use strict";

  var state = { active:null, filter:"all", query:"", convocation:8 };
  var rendered = null;   // что сейчас в панели: "list" или id партии

  function byId(id){
    return PC.PARTIES.filter(function(p){ return p.id === id; })[0] || null;
  }

  /* Мандаты партии в текущем выбранном созыве. null — партия в этом
     созыве не участвовала / не существовала. */
  function seatsOf(p){
    if(state.convocation === 8) return p.seats;
    return (p.seatsBy && state.convocation in p.seatsBy) ? p.seatsBy[state.convocation] : null;
  }

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
    if(state.active && seatsOf(byId(state.active)) === null) state.active = null;
    PC.compass.draw();
    syncNodes();
    renderSide(true);
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
        PC.sidebar.renderDetail(byId(state.active));
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

    document.addEventListener("keydown", function(e){
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

  /* ---------- тема ---------- */
  function initTheme(){
    var btn  = document.getElementById("themeBtn");
    var icon = document.getElementById("themeIcon");

    function iconFor(t){ return t === "dark" ? "☀️" : "🌙"; }
    icon.textContent = iconFor(document.documentElement.dataset.theme);

    btn.addEventListener("click", function(){
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      icon.style.transform = "rotate(180deg) scale(.3)";
      setTimeout(function(){
        icon.textContent = iconFor(next);
        icon.style.transform = "none";
      }, 170);
      try{ localStorage.setItem("pc-theme", next); }catch(e){}
    });
  }

  /* ---------- запуск ---------- */
  function init(){
    /* подписи, зависящие от данных, — чтобы число партий не расходилось с массивом */
    var n = PC.PARTIES.length;
    var lead = document.getElementById("lead");
    if(lead) lead.textContent = n + " " + partyWord(n) +
      " на двух осях: экономика и отношение к власти государства";

    PC.tip.init();
    PC.sidebar.init();
    PC.compass.draw();
    syncNodes();
    renderSide(true);
    initControls();
    initTheme();
  }

  function partyWord(n){
    var a = n % 10, b = n % 100;
    if(a === 1 && b !== 11) return "партия";
    if(a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "партии";
    return "партий";
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
