/* ============ Палитра команд и справка по клавишам (4.0, разобрано в 4.2) ============

   Ctrl+K или «/» открывает поиск по всему сайту: разделы, партии, люди,
   голосования, пункты настроек. «?» показывает справку по клавишам.
   Раньше этот код жил в js/tisza.js вместе с резервными копиями и
   жестами карты; теперь у него свой файл, а PC.tisza только зовёт init(). */
(function(PC){
  "use strict";

  var SECTIONS = ["compass", "quiz", "votes", "about"];
  var MAX_RESULTS = 40;
  var dialog, results, query, commands = [], picked = 0, lastFocus;

  function t(key, vars){ return PC.t(key, vars); }

  function el(tag, cls, text){
    var node = document.createElement(tag);
    if(cls) node.className = cls;
    if(text != null) node.textContent = text;
    return node;
  }

  function button(text, onClick){
    var b = el("button", "btn small", text);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  /* Пока курсор в поле ввода, «/» и «?» — обычные символы, а не команды. */
  function typing(){
    var active = document.activeElement;
    return !!active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable);
  }

  /* Строки настроек берём из живой разметки листа: так в палитре всегда
     те пункты, которые сейчас есть в интерфейсе, без второго списка. */
  function settingCommands(){
    var list = [];
    document.querySelectorAll("#setSheet .set-row").forEach(function(row){
      var name = row.querySelector(".set-name,.set-lab b,.set-label") || row.querySelector("label");
      if(!name) return;
      var group = row.closest("[data-panel]");
      list.push({
        label:name.textContent,
        type:t("settings.title"),
        run:function(){
          PC.settings.open();
          if(group) PC.settings.selectPanel(group.dataset.panel);
          row.scrollIntoView({ block:"center" });
          var control = row.querySelector("button,input,select");
          if(control) requestAnimationFrame(function(){ control.focus(); });
        }
      });
    });
    return list;
  }

  /* Всё, что можно найти: порядок здесь — порядок групп в результатах. */
  function collect(){
    var list = [];
    SECTIONS.forEach(function(tab){
      list.push({ label:t("tab." + tab), type:t("tabs.label"), run:function(){ PC.nav.go(tab); } });
    });
    PC.PARTIES.forEach(function(p){
      list.push({
        label:PC.L(p, "name"),
        color:p.color,
        more:[p.name, p.short, p.tag, p.en && p.en.name, p.en && p.en.short].join(" "),
        type:t("side.title"),
        run:function(){
          PC.nav.go("compass");
          if(PC.activeId() === p.id) PC.select(null);
          PC.select(p.id);
        }
      });
    });
    PC.PEOPLE.forEach(function(p){
      list.push({ label:PC.L(p, "name"), more:p.name, type:t("people.title"), run:function(){ PC.people.open(p.id); } });
    });
    PC.VOTES.forEach(function(v){
      list.push({
        label:PC.L(v, "title"),
        more:v.title,
        type:t("tab.votes"),
        run:function(){ PC.nav.go("votes"); PC.votes.focusVote(v.id); }
      });
    });
    list = list.concat(settingCommands());
    list.push({ label:t("srpc.title"), type:"SRPC", run:function(){ PC.srpc.open(); } });
    list.push({ label:t("duel.title"), type:t("duel.type"), run:function(){ PC.lazy.run("duel", function(){ PC.duel.open(); }); } });
    list.push({ label:t("sv.h"), type:t("duel.type"), run:function(){
      PC.nav.go("votes");
      PC.loadSelfVote().then(function(){
        setTimeout(function(){
          var s = document.getElementById("selfVote");
          if(!s) return;
          s.scrollIntoView({ block:"start" });
          var title = document.getElementById("svTitle") || document.getElementById("svHead");
          if(title){ title.tabIndex = -1; title.focus({ preventScroll:true }); }
        }, 60);
      });
    } });
    /* 5.1: обучение и главы книги — в конце, чтобы «дуэль» сначала находила саму дуэль */
    list.push({ label:t("guide.mode.quick"), type:t("set.guide"), run:function(){ PC.guide.start("quick"); } });
    list.push({ label:t("guide.mode.full"), type:t("set.guide"), run:function(){ PC.guide.start("full"); } });
    if(PC.book) PC.book.CHAPTERS.forEach(function(c){
      list.push({ label:t("bk." + c.id + ".t"), more:t("bk." + c.id + ".d"), type:t("bk.toc"),
        run:function(){ PC.nav.go("about", { silent:true }); location.hash = "#/about/" + c.id; } });
    });
    return list;
  }

  /* 4.1: результаты сгруппированы по типу — разделы, партии, люди,
     голосования, настройки — с подписью группы над каждой. В 4.0 тип
     стоял мелким шрифтом справа у каждой строки и повторялся сорок раз. */
  function paintResults(){
    var q = query.value.trim().toLowerCase();
    commands = collect().filter(function(c){
      return !q || (c.label + " " + (c.more || "")).toLowerCase().indexOf(q) !== -1;
    }).slice(0, MAX_RESULTS);
    picked = 0;
    results.replaceChildren();
    var lastType = null;
    commands.forEach(function(c, i){
      if(c.type !== lastType){
        lastType = c.type;
        var head = el("div", "palette-group", c.type);
        head.setAttribute("role", "presentation");
        results.appendChild(head);
      }
      var row = button("", function(){ close(); c.run(); });
      row.className = "palette-result";
      row.id = "palette-option-" + i;
      row.setAttribute("role", "option");
      var mark = el("i", "palette-mark");
      mark.setAttribute("aria-hidden", "true");
      if(c.color) mark.style.setProperty("--mark", c.color);
      else mark.classList.add("palette-mark--plain");
      row.append(mark, el("span", "", c.label), el("small", "", c.type));
      row.addEventListener("pointerenter", function(){ picked = i; highlight(); });
      results.appendChild(row);
    });
    if(!commands.length) results.appendChild(el("p", "palette-empty", t("side.empty")));
    highlight();
  }

  function highlight(){
    results.querySelectorAll(".palette-result").forEach(function(b, i){
      b.setAttribute("aria-selected", String(i === picked));
    });
    if(commands.length) query.setAttribute("aria-activedescendant", "palette-option-" + picked);
    else query.removeAttribute("aria-activedescendant");
  }

  function close(){
    if(!dialog || !dialog.open) return;
    dialog.close();
    if(lastFocus && lastFocus.isConnected) lastFocus.focus();
  }

  function onQueryKey(e){
    if(e.key === "ArrowDown" || e.key === "ArrowUp"){
      e.preventDefault();
      if(commands.length) picked = (picked + (e.key === "ArrowDown" ? 1 : -1) + commands.length) % commands.length;
      highlight();
      var option = document.getElementById("palette-option-" + picked);
      if(option) option.scrollIntoView({ block:"nearest" });
    }
    if(e.key === "Enter" && commands[picked]){
      e.preventDefault();
      var action = commands[picked];
      close();
      action.run();
    }
  }

  /* Диалог строится при первом открытии: до него страница не платит
     за разметку, которой может никто не воспользоваться. */
  function build(){
    dialog = el("dialog", "command-palette");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "paletteTitle");
    var title = el("h2", "", t("palette.title"));
    title.id = "paletteTitle";
    query = el("input");
    query.type = "search";
    query.placeholder = t("palette.placeholder");
    query.setAttribute("role", "combobox");
    query.setAttribute("aria-expanded", "true");
    query.setAttribute("aria-controls", "paletteResults");
    query.setAttribute("aria-autocomplete", "list");
    query.setAttribute("aria-label", t("palette.title"));
    results = el("div", "palette-results");
    results.id = "paletteResults";
    results.setAttribute("role", "listbox");
    var field = el("div", "palette-field"), esc = el("kbd", "", "Esc");
    esc.setAttribute("aria-hidden", "true");
    field.append(query, esc);
    dialog.append(title, field, results, el("p", "palette-hint", t("palette.hint")));
    document.body.appendChild(dialog);
    query.addEventListener("input", paintResults);
    query.addEventListener("keydown", onQueryKey);
    /* щелчок по подложке: у <dialog> фон — сам элемент, поэтому «мимо»
       определяем по координатам относительно его рамки */
    dialog.addEventListener("click", function(e){
      if(e.target !== dialog) return;
      var r = dialog.getBoundingClientRect();
      if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    });
  }

  function open(){
    if(!dialog) build();
    if(PC.utils.modalOpen() && !dialog.open) return;
    lastFocus = document.activeElement;
    if(!dialog.open) dialog.showModal();
    query.value = "";
    paintResults();
    query.focus();
  }

  /* Справка по клавишам разбирается из той же фразы словаря: «клавиши —
     действие; …». Отдельной таблицы нет, поэтому перевод и справка
     не разойдутся. */
  function helpRows(){
    var rows = el("dl", "key-rows");
    t("keys.help").replace(/\.$/, "").split(/;\s*/).forEach(function(part){
      var m = part.match(/^(.+?)(?:\s+—\s+|:\s+)(.+)$/);
      if(!m) return;
      var keys = el("dt");
      m[1].split(/\s+(?:или|or)\s+/).forEach(function(k, j){
        if(j) keys.append(" / ");
        keys.appendChild(el("kbd", "", k));
      });
      rows.append(keys, el("dd", "", m[2]));
    });
    return rows;
  }

  function showKeys(){
    var help = el("dialog", "command-palette key-help");
    help.setAttribute("aria-modal", "true");
    help.setAttribute("aria-label", t("keys.title"));
    help.append(el("h2", "", t("keys.title")), helpRows(), button(t("keys.close"), function(){ help.close(); help.remove(); }));
    document.body.appendChild(help);
    help.addEventListener("close", function(){ help.remove(); });
    help.showModal();
  }

  function init(){
    document.addEventListener("keydown", function(e){
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){
        e.preventDefault();
        open();
        return;
      }
      if(typing() || PC.utils.modalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if(e.key === "/"){ e.preventDefault(); open(); }
      if(e.key === "?"){ e.preventDefault(); showKeys(); }
    });
  }

  PC.palette = { init:init, open:open, close:close, collect:collect };
})(window.PC = window.PC || {});
