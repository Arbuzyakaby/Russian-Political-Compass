/* Release 4.0 interface: command palette, settings, backups and map gestures. */
(function(PC){
  "use strict";
  var root = document.documentElement, palette, results, query, commands = [], picked = 0, lastFocus;
  var SETTINGS = {
    dotSize:["interface", ["S", "M", "L"], ["small", "normal", "large"]],
    labelMode:["interface", ["set.all", "set.duma", "set.selected"], ["all", "duma", "selected"]],
    bubbles:["interface"], myParties:["interface"],
    startTab:["nav", ["tab.compass", "set.last", "tab.quiz", "tab.votes", "tab.party", "tab.about"], ["compass", "last", "quiz", "votes", "party", "about"]],
    convDefault:["nav", PC.CONVOCATIONS.map(function(c){ return PC.L(c, "label"); }), PC.CONVOCATIONS.map(function(c){ return String(c.id); })],
    quizMode:["general", ["20", "40", "90"], ["short", "full", "long"]], autoNext:["general"], confirmReset:["general"],
    colorblind:["readability"], lineheight:["readability", ["set.normal", "set.increased"], ["normal", "increased"]],
    exportFormat:["general", ["PNG", "SVG"], ["png", "svg"]], exportScale:["general", ["1×", "2×", "3×"], ["1", "2", "3"]], transparent:["general"],
    srpcStage:["srpc", ["1", "2", "3", "4", "5", "6"], ["1", "2", "3", "4", "5", "6"]]
  };
  function t(k, vars){ return PC.t(k, vars); }
  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function btn(text, fn){ var b = el("button", "btn small", text); b.type = "button"; b.addEventListener("click", fn); return b; }
  function editable(){ return document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement && document.activeElement.isContentEditable; }
  function collect(){
    var list = [];
    ["compass", "quiz", "votes", "party", "about"].forEach(function(tab){ list.push({ label:t("tab." + tab), type:t("tabs.label"), run:function(){ PC.nav.go(tab); } }); });
    PC.allParties().forEach(function(p){ list.push({ label:PC.L(p, "name"), more:[p.name, p.short, p.tag, p.en && p.en.name, p.en && p.en.short].join(" "), type:t(/^u/.test(p.id) ? "party.user" : "tab.compass"), run:function(){ PC.nav.go("compass"); if(PC.activeId() === p.id) PC.select(null); PC.select(p.id); } }); });
    PC.PEOPLE.forEach(function(p){ list.push({ label:PC.L(p, "name"), more:p.name, type:t("people.title"), run:function(){ PC.people.open(p.id); } }); });
    PC.VOTES.forEach(function(v){ list.push({ label:PC.L(v, "title"), more:v.title, type:t("tab.votes"), run:function(){ PC.nav.go("votes"); PC.votes.focusVote(v.id); } }); });
    document.querySelectorAll("#setSheet .set-row").forEach(function(row){ var name=row.querySelector(".set-name,.set-lab b,.set-label")||row.querySelector("label");if(!name)return;var group=row.closest("[data-panel]");list.push({label:name.textContent,type:t("settings.title"),run:function(){PC.settings.open();if(group)PC.settings.selectPanel(group.dataset.panel);row.scrollIntoView({block:"center"});var control=row.querySelector("button,input,select");if(control)requestAnimationFrame(function(){control.focus();});}});});
    list.push({ label:t("srpc.title"), type:"SRPC", run:function(){ PC.srpc.open(); } });
    return list;
  }
  function paintResults(){
    var q = query.value.trim().toLowerCase(); commands = collect().filter(function(c){ return !q || (c.label + " " + (c.more || "")).toLowerCase().indexOf(q) !== -1; }).slice(0, 40); picked = 0; results.replaceChildren();
    commands.forEach(function(c, i){ var b = btn("", function(){ closePalette(); c.run(); }); b.className = "palette-result"; b.id = "palette-option-" + i; b.setAttribute("role", "option"); b.append(el("span", "", c.label), el("small", "", c.type)); b.addEventListener("pointerenter", function(){ picked = i; highlight(); }); results.appendChild(b); });
    if(!commands.length) results.appendChild(el("p", "party-meta", t("side.empty"))); highlight();
  }
  function highlight(){ results.querySelectorAll("button").forEach(function(b, i){ b.setAttribute("aria-selected", String(i === picked)); }); if(commands.length) query.setAttribute("aria-activedescendant", "palette-option-" + picked); else query.removeAttribute("aria-activedescendant"); }
  function closePalette(){ if(palette && palette.open){ palette.close(); if(lastFocus && lastFocus.isConnected) lastFocus.focus(); } }
  function openPalette(){
    if(!palette){
      palette = el("dialog", "command-palette"); palette.setAttribute("aria-modal", "true"); palette.setAttribute("aria-labelledby", "paletteTitle");
      var h = el("h2", "", t("palette.title")); h.id = "paletteTitle"; query = el("input"); query.type = "search"; query.placeholder = t("palette.placeholder"); query.setAttribute("role", "combobox"); query.setAttribute("aria-expanded", "true"); query.setAttribute("aria-controls", "paletteResults"); query.setAttribute("aria-autocomplete", "list"); query.setAttribute("aria-label", t("palette.title"));
      results = el("div", "palette-results"); results.id = "paletteResults"; results.setAttribute("role", "listbox"); palette.append(h, query, results, el("p", "palette-hint", t("palette.hint"))); document.body.appendChild(palette);
      query.addEventListener("input", paintResults); query.addEventListener("keydown", function(e){ if(e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); if(commands.length) picked = (picked + (e.key === "ArrowDown" ? 1 : -1) + commands.length) % commands.length; highlight(); var option = document.getElementById("palette-option-" + picked); if(option) option.scrollIntoView({ block:"nearest" }); } if(e.key === "Enter" && commands[picked]){ e.preventDefault(); var action = commands[picked]; closePalette(); action.run(); } });
      palette.addEventListener("click", function(e){ if(e.target === palette){ var r = palette.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closePalette(); } });
    }
    if(PC.utils.modalOpen() && !palette.open) return; lastFocus = document.activeElement; if(!palette.open) palette.showModal(); query.value = ""; paintResults(); query.focus();
  }
  function backup(){
    var data = {}; try{ for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(/^pc-/.test(k)) data[k] = localStorage.getItem(k); } }catch(e){ return null; }
    return { format:"politcompass-backup", v:1, version:PC.VERSION, created:new Date().toISOString(), data:data };
  }
  function validateBackup(data){
    function object(v){return !!v&&typeof v==="object"&&!Array.isArray(v);}
    function point(v){return object(v)&&typeof v.x==="number"&&isFinite(v.x)&&Math.abs(v.x)<=10&&typeof v.y==="number"&&isFinite(v.y)&&Math.abs(v.y)<=10;}
    function answers(v){return object(v)&&Object.keys(v).every(function(id){return PC.quiz.questionsFor("long").some(function(q){return q.id===id;})&&Number.isInteger(v[id])&&v[id]>=-2&&v[id]<=2;});}
    if(!data || data.format !== "politcompass-backup" || data.v !== 1 || !data.data || typeof data.data !== "object" || Array.isArray(data.data)) return false;
    return Object.keys(data.data).length <= 100 && Object.keys(data.data).every(function(k){
      var value = data.data[k]; if(!/^pc-[a-z0-9-]+$/.test(k) || typeof value !== "string" || value.length > 2000000) return false;
      try{
        if(k === "pc-my-parties"){ var p=JSON.parse(value);if(!p||p.v!==1||!Array.isArray(p.list)||p.list.length>6||!p.list.every(PC.partyModel.valid)||!p.list.every(function(r){return /^u[1-6]$/.test(r.id);})||new Set(p.list.map(function(r){return r.id;})).size!==p.list.length)return false; }
        if(k === "pc-party-draft"){var d=JSON.parse(value);if(!d||d.v!==1||!PC.partyModel.valid(d.party)||!Number.isInteger(d.step)||d.step<1||d.step>6||!(d.editId===null||/^u[1-6]$/.test(d.editId)))return false;}
        if(k === "pc-settings"){ var s = JSON.parse(value); if(!s || Array.isArray(s) || typeof s !== "object" || !Object.keys(s).every(function(key){ return PC.settings.valid(key,s[key]); })) return false; }
        if(k === "pc-lang" && value !== "ru" && value !== "en") return false;
        if(k === "pc-quiz-answers"&&!answers(JSON.parse(value)))return false;
        if(k === "pc-quiz-result"){var r=JSON.parse(value);if(!point(r)||!answers(r.answers)||["short","full","long"].indexOf(r.mode)<0)return false;}
        if(k === "pc-quiz-history"){var h=JSON.parse(value);if(!Array.isArray(h)||h.length>100||!h.every(point))return false;}
        if(k === "pc-quiz-mode"&&["short","full","long"].indexOf(value)<0)return false;
        if(k === "pc-theme"&&["system","dark","light","paper","alaska","neon","fireplace"].indexOf(value)<0)return false;
        if(k === "pc-eggs-found"){var eggs=JSON.parse(value);if(!Array.isArray(eggs)||!eggs.every(function(id){return PC.eggs.IDS.indexOf(id)>=0;}))return false;}
        if(k === "pc-srpc-layout"){var layout=JSON.parse(value);if(Array.isArray(layout))layout={c:3,p:layout};if(!object(layout)||!Array.isArray(layout.p)||layout.p.length!==6||!layout.p.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(n){return typeof n==="number"&&isFinite(n)&&n>=0&&n<=1;});})||!Number.isInteger(layout.c)||layout.c<1||layout.c>6||(layout.layout!==undefined&&["snake","line","column","circle"].indexOf(layout.layout)<0)||(layout.scale!==undefined&&(typeof layout.scale!=="number"||!isFinite(layout.scale)||layout.scale<.2||layout.scale>2)))return false;}
      }catch(e){ return false; } return true;
    });
  }
  function restore(data){
    if(!validateBackup(data)) return false;
    var before = backup(); if(!before) return false;
    try{
      Object.keys(before.data).forEach(function(k){ localStorage.removeItem(k); });
      Object.keys(data.data).forEach(function(k){ localStorage.setItem(k, data.data[k]); }); return true;
    }catch(e){ try{ Object.keys(data.data).forEach(function(k){ localStorage.removeItem(k); }); Object.keys(before.data).forEach(function(k){ localStorage.setItem(k, before.data[k]); }); }catch(ignore){} return false; }
  }
  function settings(){
    var sheet = document.getElementById("setSheet"), search = el("input", "settings-search"); search.type = "search"; search.placeholder = t("set.search"); search.setAttribute("aria-label", t("set.search"));
    var panels = document.getElementById("setPanels"); panels.prepend(search);
    Object.keys(SETTINGS).forEach(function(key){
      var def = SETTINGS[key], group = document.querySelector('#setPanels [data-panel="' + def[0] + '"]'), row = el("div", "set-row tisza-setting"); row.dataset.setting = key;
      var label = el("label", "set-name", t(key === "srpcStage" ? "srpc.failure" : "set." + key)); label.htmlFor = "setting-" + key;
      var control = el("select"); control.id = "setting-" + key;
      var values = def[2] || ["off", "on"], labels = def[1] || ["set.off", "set.on"];
      values.forEach(function(value, i){ var labelText = PC.i18nDict[labels[i]] ? t(labels[i]) : labels[i]; var option = el("option", "", labelText); option.value = value; control.appendChild(option); });
      control.value = PC.settings.get(key); control.addEventListener("change", function(){ PC.settings.set(key, control.value); }); row.append(label, control); group.appendChild(row);
    });
    function changed(){
      sheet.querySelectorAll(".set-row").forEach(function(row){
        var controls = Array.from(row.querySelectorAll("[data-set-switch],[data-set-seg]"));
        var diff = row.dataset.setting ? PC.settings.get(row.dataset.setting) !== PC.settings.DEFAULTS[row.dataset.setting] : controls.some(function(c){ var k = c.dataset.setSwitch || c.dataset.setSeg; return PC.settings.get(k) !== PC.settings.DEFAULTS[k]; });
        row.classList.toggle("is-modified", diff); row.title = diff ? t("set.modified") : "";
      });
      Object.keys(SETTINGS).forEach(function(k){ var c = document.getElementById("setting-" + k); if(c) c.value = PC.settings.get(k); });
    }
    document.addEventListener("pc:settings", changed);
    document.querySelectorAll("#setPanels .set-group").forEach(function(group){
      group.appendChild(btn(t("set.resetSection"), function(){
        var previous = {};
        group.querySelectorAll("[data-set-switch],[data-set-seg],[data-setting]").forEach(function(c){ var k = c.dataset.setSwitch || c.dataset.setSeg || c.dataset.setting; previous[k] = PC.settings.get(k); PC.settings.set(k, PC.settings.DEFAULTS[k]); });
        PC.ui.toast(t("set.resetDone"), false, { label:t("party.undo"), duration:5000, action:function(){ Object.keys(previous).forEach(function(k){ PC.settings.set(k, previous[k]); }); } });
      }));
    });
    search.addEventListener("input", function(){
      var value = search.value.trim().toLowerCase();
      document.querySelectorAll("#setPanels .set-group").forEach(function(group){
        var matches = false; group.querySelectorAll(".set-row").forEach(function(row){ row.hidden = !!value && row.textContent.toLowerCase().indexOf(value) < 0; if(!row.hidden) matches = true; });
        if(value) group.hidden = !matches;
      });
      if(!value){ var active = sheet.querySelector('.setm-tab[aria-selected="true"]'); if(active) PC.settings.selectPanel(active.dataset.panel); }
    });
    var general = document.getElementById("setPanel-general"), actions = el("div", "party-actions");
    actions.append(btn(t("set.backup"), function(){ var data = backup(); if(data) PC.exporter.download(new Blob([JSON.stringify(data, null, 2)], { type:"application/json" }), "politcompass-backup.json"); }), btn(t("set.restore"), function(){ input.click(); }));
    var input = el("input"); input.type = "file"; input.accept = ".json,application/json"; input.hidden = true; input.id = "backupImport";
    input.addEventListener("change", async function(){ var file = input.files[0]; if(!file) return; var data; try{ if(file.size > 5000000) throw Error(); data = JSON.parse(await file.text()); }catch(e){ PC.ui.toast(t("set.badBackup"), true); return; } if(!restore(data)){ PC.ui.toast(t("set.badBackup"), true); return; } PC.ui.toast(t("set.restored")); setTimeout(function(){ location.reload(); }, 600); });
    general.append(actions, input);
    var privacy = document.getElementById("setPanel-privacy"); privacy.appendChild(el("p", "party-meta", "pc-my-parties · pc-party-draft · pc-settings · pc-eggs-found"));
    privacy.appendChild(btn(t("set.eraseAll"), function(){
      var before = backup(); if(!before) return;
      Object.keys(before.data).forEach(function(k){ PC.store.remove(k); }); PC.partyModel.load(); PC.partyBuilder.clearLocal();PC.quiz.clearLocal();PC.settings.reset();PC.compass.redraw();PC.refresh();
      PC.ui.toast(t("set.resetDone"), false, { label:t("party.undo"), duration:5000, action:function(){ if(restore(before)) location.reload(); } });
    })); changed();
  }
  function compassControls(){
    var svg = document.getElementById("svg"), plot = document.getElementById("plot"), scale = 1, x = 0, y = 0, pointers = new Map(), gesture = null;
    var tools = document.getElementById("mapControls");
    function apply(){ svg.setAttribute("viewBox", x + " " + y + " " + (660 / scale) + " " + (660 / scale)); svg.style.touchAction = scale > 1 ? "none" : "pan-y pinch-zoom";svg.style.overflow=scale>1?"hidden":""; }
    function zoom(amount){ var before = 660 / scale; scale = Math.max(1, Math.min(4, amount)); x += (before - 660 / scale) / 2; y += (before - 660 / scale) / 2; apply(); }
    var reset=document.getElementById("mapReset");reset.addEventListener("click",function(){scale=1;x=0;y=0;apply();});
    var mode=document.getElementById("mapList");mode.addEventListener("click",function(){plot.classList.toggle("map-as-list");list.hidden=!plot.classList.contains("map-as-list");mode.textContent=t(list.hidden?"compass.list":"compass.map");if(!list.hidden)renderList();});
    var list = el("div", "map-coordinate-list"); list.hidden = true;
    function renderList(){ list.replaceChildren(); PC.visible().forEach(function(p){ var b = btn("", function(){ PC.select(p.id); }); b.append(el("span", "", PC.L(p, "short")), el("b", "", PC.utils.fmt(p.x) + " / " + PC.utils.fmt(p.y))); list.appendChild(b); }); }
    document.getElementById("mapMinus").addEventListener("click",function(){zoom(scale-.25);});document.getElementById("mapPlus").addEventListener("click",function(){zoom(scale+.25);});plot.appendChild(list);
    svg.addEventListener("pointerdown", function(e){
      if(e.pointerType === "mouse" && scale === 1) return;
      pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(pointers.size === 2){ var p = Array.from(pointers.values()); gesture = { distance:Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y), scale:scale }; }
      else if(scale > 1){ gesture = { pan:true, px:e.clientX, py:e.clientY, x:x, y:y }; svg.setPointerCapture(e.pointerId); }
    });
    svg.addEventListener("pointermove", function(e){
      if(!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(pointers.size === 2 && gesture && !gesture.pan){ var p = Array.from(pointers.values()); zoom(gesture.scale * Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) / Math.max(1, gesture.distance)); }
      else if(gesture && gesture.pan){ var r = svg.getBoundingClientRect(); x = gesture.x - (e.clientX - gesture.px) / r.width * 660 / scale; y = gesture.y - (e.clientY - gesture.py) / r.height * 660 / scale; apply(); }
    });
    function end(e){ pointers.delete(e.pointerId); gesture = null; } svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
    svg.addEventListener("wheel", function(e){ if(!e.ctrlKey) return; e.preventDefault(); zoom(scale + (e.deltaY < 0 ? .2 : -.2)); }, { passive:false });
    PC.compass.onDraw(function(){ apply(); if(!list.hidden) renderList(); decorateMarkers(); });
    var chip=document.getElementById("myPartiesLayer");chip.addEventListener("click",function(){PC.settings.set("myParties",PC.settings.get("myParties")==="on"?"off":"on");});chip.setAttribute("aria-pressed",String(PC.settings.get("myParties")!=="off"));
    document.getElementById("q").addEventListener("input",function(){if(!list.hidden)renderList();});document.querySelectorAll(".chips [data-filter]").forEach(function(c){c.addEventListener("click",function(){if(!list.hidden)renderList();});});
    var pinch;
    svg.addEventListener("touchstart",function(e){if(e.touches.length===2){e.preventDefault();var a=e.touches[0],b=e.touches[1];pinch={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),scale:scale};}},{passive:false});
    svg.addEventListener("touchmove",function(e){if(pinch&&e.touches.length===2){e.preventDefault();var a=e.touches[0],b=e.touches[1];zoom(pinch.scale*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/Math.max(1,pinch.distance));}},{passive:false});
    svg.addEventListener("touchend",function(){pinch=null;});svg.addEventListener("touchcancel",function(){pinch=null;});
  }
  function decorateMarkers(){
    document.querySelectorAll('#svg .node:not(.you):not(.person):not(.my-party)').forEach(function(g, i){
      var dot = g.querySelector(".dot"); if(!dot) return;
      var p = PC.partyById(g.dataset.id), base = PC.settings.get("bubbles") === "on" ? PC.geom.radius(PC.seatsOf(p)) : 11;
      var r = base * (PC.settings.get("dotSize") === "small" ? .75 : PC.settings.get("dotSize") === "large" ? 1.3 : 1); dot.setAttribute("r", r);
      if(PC.settings.get("colorblind") === "on"){
        var path = g.querySelector(".accessible-mark"); if(!path){ path = PC.utils.el("path", { "class":"accessible-mark", fill:p.color, stroke:"var(--dot-stroke)", "stroke-width":1.8 }); g.insertBefore(path, dot); }
        var d = i % 4 === 0 ? "M0-" + r + " " + r + " " + r + "-" + r + " " + r + "Z" : i % 4 === 1 ? "M-"+r+"-"+r+"H"+r+"V"+r+"H-"+r+"Z" : i % 4 === 2 ? "M0-"+r+" "+r+" 0 0 "+r+"-"+r+" 0Z" : "M-"+r+" 0H"+r+"M0-"+r+"V"+r;
        path.setAttribute("d", d); dot.style.opacity = "0";
        var hatch = g.querySelector(".accessible-hatch"); if(!hatch){ hatch = PC.utils.el("path", { "class":"accessible-hatch", d:"M-5 2 2-5M-2 5 5-2", stroke:"var(--bg)", "stroke-width":1.2, "pointer-events":"none" }); g.appendChild(hatch); }
      }
    });
  }
  function init(){
    settings(); compassControls(); decorateMarkers();
    document.addEventListener("keydown", function(e){
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); openPalette(); return; }
      if(editable() || PC.utils.modalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if(e.key === "/"){ e.preventDefault(); openPalette(); }
      if(e.key === "?"){ e.preventDefault(); var dialog = el("dialog", "command-palette key-help"); dialog.setAttribute("aria-modal", "true"); dialog.setAttribute("aria-label", t("keys.title")); dialog.append(el("h2", "", t("keys.title")), el("p", "", t("keys.help")), btn(t("party.close"), function(){ dialog.close(); dialog.remove(); })); document.body.appendChild(dialog); dialog.addEventListener("close", function(){ dialog.remove(); }); dialog.showModal(); }
    });
    document.addEventListener("pc:settings", function(e){
      if(["*", "dotSize", "labelMode", "bubbles", "myParties", "colorblind"].indexOf(e.detail.key) !== -1){ PC.compass.redraw(); var chip = document.getElementById("myPartiesLayer"); if(chip) chip.setAttribute("aria-pressed", String(PC.settings.get("myParties") === "on")); }
    });
    var stored = PC.store.getJSON("pc-settings", {}), conv = Number(stored.convDefault); if(PC.CONVOCATIONS.some(function(c){ return c.id === conv; })) PC.setConvocation(conv);
    if(!location.hash) PC.nav.go(PC.nav.current());
    if(location.hash === "#/srpc") PC.srpc.open();
    var about = document.querySelector(".srpc-chain") || document.querySelector(".chain"); if(about) about.parentNode.appendChild(btn(t("srpc.open"), function(){ PC.srpc.open(); }));
  }
  PC.tisza = { init:init, openPalette:openPalette, backup:backup, validateBackup:validateBackup, restore:restore };
})(window.PC = window.PC || {});
