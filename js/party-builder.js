/* All user-authored text is inserted as text nodes, including SVG exports. */
(function(PC){
  "use strict";
  var M = PC.partyModel, host, draft, step = 1, editId = null, fresh = true, guest = null;
  var COLORS = ["#a5b4fc", "#f0abfc", "#60a5fa", "#38bdf8", "#2dd4bf", "#34d399", "#a3e635", "#facc15", "#fbbf24", "#fb923c", "#f87171", "#fb7185", "#e879f9", "#c084fc", "#94a3b8", "#f1f5f9"];
  var ICONS = ["M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0", "M5 19C1 9 12 3 21 3c0 9-6 20-16 16Zm0 0L16 8", "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z", "M2 9q5-6 10 0t10 0M2 15q5-6 10 0t10 0", "m2 20 7-14 4 8 3-5 6 11Z", "m16 8-3 5-5 3 3-5ZM12 2v3m0 14v3M2 12h3m14 0h3", "M3 18V8m18 10V8M3 14q9-12 18 0M3 18h18M8 10v8m8-8v8", "M12 21v-9M5 15h14l-4-5h3l-6-8-6 8h3Z", "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z", "M12 2 3 6v6q0 7 9 10 9-3 9-10V6Z", "M12 6Q7 2 3 5v15q5-3 9 0 4-3 9 0V5q-4-3-9 1Zm0 0v14", "M12 21 3 12C-3 3 9-1 12 7 15-1 27 3 21 12Z", "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0ZM2 12h20M12 2q-9 10 0 20 9-10 0-20", "M5 22V3q4-3 8 0t7 0v12q-3 3-7 0t-8 0", "M12 8C5-4-4 12 8 12c-12 7 4 16 4 4 7 12 16-4 4-4 12-7-4-16-4-4Z", "m14 2-10 12h7l-1 8 10-12h-7Z", "m12 2 10 10-10 10L2 12Z", "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z", "M3 12h18m-8-8 8 8-8 8", "M12 7v15M5 12H2q0 10 10 10t10-10h-3M15 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z", "M12 3v18M5 6h14M5 6l-4 9h8Zm14 0-4 9h8ZM7 21h10", "M2 15q6-4 6-11 7 9 14 3-1 12-13 11L3 22l2-6Z", "M12 22V2M12 8q-8 0-8-6 8 0 8 6Zm0 7q-8 0-8-6 8 0 8 6Zm0-7q8 0 8-6-8 0-8 6Zm0 7q8 0 8-6-8 0-8 6Z", "M22 12A10 4 30 1 1 2 12a10 4 30 0 1 20 0ZM22 12A10 4-30 1 1 2 12a10 4-30 0 1 20 0Z"];
  function t(k, vars){ return PC.t(k, vars); }
  function node(tag, cls, value){ var e = document.createElement(tag); if(cls) e.className = cls; if(value != null) e.textContent = value; return e; }
  function append(parent){ Array.prototype.slice.call(arguments, 1).forEach(function(e){ if(e) parent.appendChild(e); }); return parent; }
  function button(label, fn, cls){ var b = node("button", "btn " + (cls || ""), label); b.type = "button"; b.addEventListener("click", fn); return b; }
  function toast(key, bad, vars){ if(PC.ui) PC.ui.toast(t(key, vars), bad); }
  function isOwn(p){ return /^u[1-6]$/.test(p.id); }
  function emblem(p, size){
    var svg = PC.utils.el("svg", { viewBox:"0 0 24 24", width:size || 32, height:size || 32, "aria-hidden":"true", fill:"none", stroke:"currentColor", "stroke-width":"1.5", "stroke-linecap":"round", "stroke-linejoin":"round" });
    if(p.emblem === "mono") svg.appendChild(PC.utils.el("text", { x:12, y:15, "text-anchor":"middle", stroke:"none", fill:"currentColor", "font-size":8, "font-weight":700 }, (p.tag || "MP").slice(0, 3)));
    else svg.appendChild(PC.utils.el("path", { d:ICONS[Math.max(0, M.EMBLEMS.indexOf(p.emblem) - 1)] }));
    return svg;
  }
  function identity(p){
    var e = node("div", "party-identity"), mark = node("span", "party-emblem");
    mark.style.setProperty("--party-color", p.color); mark.appendChild(emblem(p, 36));
    return append(e, mark, append(node("div"), node("span", "eyebrow", t("party.user")), node("h3", "", p.name || t("party.noName")), node("p", "", p.slogan || t("party.family." + p.family))));
  }
  function card(raw, compact){
    var p = M.normalize(raw), c = node("article", "party-card" + (compact ? " compact" : ""));
    c.style.setProperty("--party-color", p.color);
    append(c, identity(p), append(node("div", "party-coords"), node("span", "", "X " + PC.utils.fmt(p.x)), node("span", "", "Y " + PC.utils.fmt(p.y))));
    if(!compact){
      if(p.summary) c.appendChild(node("p", "party-summary", p.summary));
      if(p.ideology) c.appendChild(node("p", "party-ideology", p.ideology));
      var meta = [p.leader, String(p.founded), t("party.kind." + p.kind)].filter(Boolean).join(" · ");
      c.appendChild(node("p", "party-meta", meta));
      if(p.theses.length){ var ul = node("ul", "party-theses"); p.theses.forEach(function(s){ ul.appendChild(node("li", "", s)); }); c.appendChild(ul); }
      if(p.declared) c.appendChild(node("p", "party-meta", t("party.declared") + ": " + PC.utils.fmt(p.declared.x) + " / " + PC.utils.fmt(p.declared.y) + (p.declared.note ? " · " + p.declared.note : "")));
    }
    var near = M.nearest(p, 1)[0];
    if(near) c.appendChild(node("p", "party-neighbor", t("party.nearest") + ": " + PC.L(near.p, "short") + " · " + near.d.toFixed(1)));
    return c;
  }
  function persist(){ PC.store.setJSON(M.DRAFT, { v:1, party:draft, step:step, editId:editId }); }
  function update(){
    var pt = M.fromSub(draft.sub); draft.x = pt.x; draft.y = pt.y; persist();
    var prev = document.getElementById("partyLive"); if(prev) prev.replaceChildren(card(draft, true),mini(M.normalize(draft),false));
    document.querySelectorAll(".party-mini-live").forEach(function(svg){ paintMini(svg, M.normalize(draft)); });
    var near = document.getElementById("partyNearest");
    if(near) near.textContent = M.nearest(draft, 3).map(function(r){ return PC.L(r.p, "short") + " · " + r.d.toFixed(1); }).join(" / ");
    var voteHost = document.getElementById("partyMatches"); if(voteHost) matchRows(voteHost, draft);
  }
  function field(key, label, max, type, parent){
    var wrap = node("label", "party-field"), input = node(type === "textarea" ? "textarea" : "input");
    input.id = "party-" + key; if(type !== "textarea") input.type = type || "text";
    if(max) input.maxLength = max; input.value = draft[key] == null ? "" : draft[key];
    if(type === "number"){ input.min = key === "founded" ? 1990 : 0; input.max = key === "founded" ? 2100 : 450; }
    input.addEventListener("input", function(){ draft[key] = type === "number" ? Number(input.value) : input.value; update(); });
    append(wrap, node("span", "", t(label)), input); parent.appendChild(wrap); return input;
  }
  function select(parent, label, values, value, change){
    var wrap = node("label", "party-field"), s = node("select");
    values.forEach(function(o){ var op = node("option", "", o.label); op.value = o.value; s.appendChild(op); });
    s.value = value; s.addEventListener("change", function(){ change(s.value); });
    append(wrap, node("span", "", label), s); parent.appendChild(wrap); return s;
  }
  function toggle(parent, key, label, fn){
    var l = node("label", "party-toggle"), i = node("input"); i.type = "checkbox"; i.checked = !!draft[key];
    i.addEventListener("change", function(){ fn(i.checked); }); append(l, i, node("span", "", label)); parent.appendChild(l); return i;
  }
  function paintMini(svg, p){
    svg.replaceChildren(); var el = PC.utils.el;
    ["#fb7185", "#60a5fa", "#34d399", "#c084fc"].forEach(function(c, i){ svg.appendChild(el("rect", { x:20 + (i % 2) * 130, y:20 + Math.floor(i / 2) * 130, width:130, height:130, fill:c, opacity:.07 })); });
    for(var j = 20; j <= 280; j += 26){ svg.appendChild(el("path", { d:"M" + j + " 20V280M20 " + j + "H280", stroke:"currentColor", opacity:j === 150 ? .32 : .09, "stroke-width":1 })); }
    PC.PARTIES.forEach(function(r){ var g = el("g", {}); g.appendChild(el("circle", { cx:150 + r.x * 13, cy:150 - r.y * 13, r:3, fill:r.color, opacity:.7 })); g.appendChild(el("title", {}, PC.L(r, "short"))); svg.appendChild(g); });
    if(p.declared){
      svg.appendChild(el("path", { d:"M" + (150 + p.x * 13) + " " + (150 - p.y * 13) + "L" + (150 + p.declared.x * 13) + " " + (150 - p.declared.y * 13), stroke:p.color, "stroke-dasharray":"4 3" }));
      svg.appendChild(el("path", { d:"M0-6 6 0 0 6-6 0Z", transform:"translate(" + (150 + p.declared.x * 13) + "," + (150 - p.declared.y * 13) + ")", stroke:p.color, fill:"none" }));
    }
    var g = el("g", { transform:"translate(" + (150 + p.x * 13) + "," + (150 - p.y * 13) + ")", "class":"party-mini-point" });
    append(g, el("circle", { r:17, fill:p.color, opacity:.13 }), el("path", { d:"M0-9 9 0 0 9-9 0Z", fill:p.color, stroke:"var(--bg)", "stroke-width":2 })); svg.appendChild(g);
    svg.appendChild(el("text", { x:150 + p.x * 13, y:132 - p.y * 13, "text-anchor":"middle", fill:"currentColor", "font-size":10, "font-weight":700 }, p.tag));
    [["−10", 20, 296], ["+10", 266, 296], ["+10", 2, 24], ["−10", 2, 281]].forEach(function(a){ svg.appendChild(el("text", { x:a[1], y:a[2], fill:"currentColor", opacity:.5, "font-size":8 }, a[0])); });
  }
  function mini(p, interactive){
    var svg = PC.utils.el("svg", { viewBox:"0 0 300 300", "class":"party-mini" + (interactive ? " party-mini-live" : ""), role:interactive ? "slider" : "img", "aria-label":t("party.step.3"), "aria-valuemin":-10, "aria-valuemax":10 });
    paintMini(svg, p);
    if(interactive){
      svg.tabIndex = 0; var dragging = false;
      function move(e){
        var r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width * 300 - 150) / 13, y = (150 - (e.clientY - r.top) / r.height * 300) / 13;
        draft.sub = M.toSub(x, y); update(); syncPosition();
      }
      svg.addEventListener("pointerdown", function(e){
        if(e.button != null && e.button !== 0) return;
        /* Only the diamond captures a touch. The rest remains scrollable. */
        if(e.pointerType === "touch" && !e.target.closest(".party-mini-point")) return;
        dragging = true; svg.setPointerCapture(e.pointerId); move(e); e.preventDefault();
      });
      svg.addEventListener("pointermove", function(e){ if(dragging) move(e); });
      function stop(e){ dragging = false; if(svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId); }
      svg.addEventListener("pointerup", stop); svg.addEventListener("pointercancel", stop);
      svg.addEventListener("keydown", function(e){
        var dx = e.key === "ArrowLeft" ? -.5 : e.key === "ArrowRight" ? .5 : 0, dy = e.key === "ArrowUp" ? .5 : e.key === "ArrowDown" ? -.5 : 0;
        if(dx || dy){ e.preventDefault(); draft.sub = M.toSub(draft.x + dx, draft.y + dy); update(); syncPosition(); }
      });
    }
    return svg;
  }
  function syncPosition(){
    PC.SUBAXES.forEach(function(a){ var input = document.getElementById("party-sub-" + a.id); if(input){ input.value = draft.sub[a.id]; input.parentNode.querySelector("output").textContent = PC.utils.fmt(draft.sub[a.id]); } });
    ["x", "y"].forEach(function(k){ var input = document.getElementById("party-direct-" + k); if(input) input.value = draft[k]; });
    var svg = document.querySelector(".party-mini-live"); if(svg) svg.setAttribute("aria-valuetext", "X " + PC.utils.fmt(draft.x) + ", Y " + PC.utils.fmt(draft.y));
  }
  function stepIdentity(body){
    var grid = node("div", "party-fields"); body.appendChild(grid);
    field("name", "party.name", 60, "text", grid).required = true;
    field("short", "party.short", 24, "text", grid); field("tag", "party.tag", 8, "text", grid);
    field("founded", "party.founded", null, "number", grid); field("leader", "party.leader", 80, "text", grid);
    select(grid, t("party.kind"), M.KINDS.map(function(k){ return { value:k, label:t("party.kind." + k) }; }), draft.kind, function(v){ draft.kind = v; update(); });
    field("slogan", "party.slogan", 120, "text", body);
  }
  function colorLab(hex){
    var a = [1, 3, 5].map(function(i){ var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    var x = (a[0]*.4124 + a[1]*.3576 + a[2]*.1805)/.95047, y = a[0]*.2126 + a[1]*.7152 + a[2]*.0722, z = (a[0]*.0193 + a[1]*.1192 + a[2]*.9505)/1.08883;
    function f(v){ return v > .008856 ? Math.cbrt(v) : 7.787*v + 16/116; }
    return [116*f(y)-16, 500*(f(x)-f(y)), 200*(f(y)-f(z)), y];
  }
  function colorWarning(){
    var host = document.getElementById("partyColorWarning"); if(!host) return;
    var a = colorLab(draft.color), scheme = document.documentElement.dataset.scheme, lum = scheme === "light" ? .9 : .005;
    var contrast = (Math.max(a[3], lum) + .05) / (Math.min(a[3], lum) + .05), near = PC.PARTIES.find(function(p){ var b = colorLab(p.color); return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]) < 10; });
    host.textContent = (contrast < 3 ? t("party.contrast") + " " : "") + (near ? t("party.similar", { name:PC.L(near, "short") }) : "");
  }
  function stepAppearance(body){
    body.appendChild(node("h3", "party-subhead", t("party.color")));
    var palette = node("div", "party-palette"); palette.setAttribute("role", "group"); palette.setAttribute("aria-label", t("party.color"));
    COLORS.forEach(function(c){ var b = button("", function(){ draft.color = c; renderWizard(); }, "party-swatch"); b.style.background = c; b.setAttribute("aria-label", c); b.setAttribute("aria-pressed", String(c === draft.color)); palette.appendChild(b); }); body.appendChild(palette);
    var color = field("color", "party.color", null, "color", body); color.addEventListener("input", colorWarning);
    var warning = node("p", "party-warning"); warning.id = "partyColorWarning"; warning.setAttribute("aria-live", "polite"); body.appendChild(warning);
    body.appendChild(node("h3", "party-subhead", t("party.emblem")));
    var icons = node("div", "party-icons");
    M.EMBLEMS.forEach(function(id, i){ var b = button("", function(){ draft.emblem = id; renderWizard(); }, "party-icon"); b.appendChild(emblem({ emblem:id, tag:draft.tag }, 28)); b.setAttribute("aria-label", i ? t("party.icon", { n:i }) : t("party.mono")); b.setAttribute("aria-pressed", String(draft.emblem === id)); icons.appendChild(b); }); body.appendChild(icons);
  }
  function stepPosition(body){
    PC.SUBAXES.forEach(function(a, i){
      var l = node("label", "party-slider"), top = node("span", "party-slider-head"), input = node("input"), output = node("output", "", PC.utils.fmt(draft.sub[a.id]));
      if(i === 0 || i === 3) body.appendChild(node("h3", "party-subhead", t(i ? "side.state" : "side.econ")));
      input.type = "range"; input.min = -10; input.max = 10; input.step = .5; input.value = draft.sub[a.id]; input.id = "party-sub-" + a.id;
      input.setAttribute("aria-describedby", "party-poles-" + a.id); input.title = t("sub." + a.id + ".d");
      input.addEventListener("input", function(){ draft.sub[a.id] = Number(input.value); output.textContent = PC.utils.fmt(draft.sub[a.id]); update(); syncPosition(); });
      var poles = append(node("span", "party-poles"), node("span", "", t("sub." + a.id + ".lo")), node("span", "", t("sub." + a.id + ".hi"))); poles.id = "party-poles-" + a.id;
      append(top, node("span", "", t("sub." + a.id)), output); append(l, top, input, poles); body.appendChild(l);
    });
    var direct = node("details", "party-direct"); direct.appendChild(node("summary", "", t("party.direct")));
    ["x", "y"].forEach(function(k){ var l = node("label", "party-field"), input = node("input"); input.type = "number"; input.min = -10; input.max = 10; input.step = .5; input.value = draft[k]; input.id = "party-direct-" + k; input.addEventListener("input", function(){ draft.sub = M.toSub(k === "x" ? Number(input.value) : draft.x, k === "y" ? Number(input.value) : draft.y); update(); syncPosition(); }); append(l, node("span", "", k.toUpperCase()), input); direct.appendChild(l); }); body.appendChild(direct);
    append(body, mini(draft, true), node("p", "party-meta", t("party.drag")), node("h3", "party-subhead", t("party.nearest")));
    var nearest = node("p", "party-neighbor"); nearest.id = "partyNearest"; body.appendChild(nearest);
  }
  function stepManifesto(body){
    select(body, t("party.family"), M.FAMILIES.map(function(k){ return { value:k, label:t("party.family." + k) }; }), draft.family, function(v){ draft.family = v; update(); });
    field("ideology", "party.ideology", 120, "text", body); field("summary", "party.summary", 600, "textarea", body);
    body.appendChild(node("h3", "party-subhead", t("party.theses")));
    draft.theses.forEach(function(value, i){
      var row = node("div", "party-thesis-row"), input = node("input"); input.value = value; input.maxLength = 160; input.setAttribute("aria-label", t("party.thesis", { n:i + 1 }));
      input.addEventListener("input", function(){ draft.theses[i] = input.value; update(); }); row.appendChild(input);
      function swap(j){ var tmp = draft.theses[j]; draft.theses[j] = draft.theses[i]; draft.theses[i] = tmp; renderWizard(); }
      var up = button("↑", function(){ swap(i - 1); }, "small"); up.disabled = i === 0; up.setAttribute("aria-label", t("party.up"));
      var down = button("↓", function(){ swap(i + 1); }, "small"); down.disabled = i === draft.theses.length - 1; down.setAttribute("aria-label", t("party.down"));
      var del = button("×", function(){ draft.theses.splice(i, 1); renderWizard(); }, "small"); del.setAttribute("aria-label", t("party.delete")); append(row, up, down, del); body.appendChild(row);
    });
    if(draft.theses.length < 8) body.appendChild(button(t("party.addThesis"), function(){ draft.theses.push(""); renderWizard(); }, "ghost small"));
    var l = node("label", "party-toggle"), cb = node("input"); cb.type = "checkbox"; cb.checked = !!draft.declared; cb.addEventListener("change", function(){ if(cb.checked) draft.declared = { x:0, y:0, note:"" }; else delete draft.declared; renderWizard(); }); append(l, cb, node("span", "", t("party.declared"))); body.appendChild(l);
    if(draft.declared){
      ["x", "y", "note"].forEach(function(k){ var wrap = node("label", "party-field"), input = node(k === "note" ? "textarea" : "input"); if(k !== "note"){ input.type = "number"; input.min = -10; input.max = 10; input.step = .5; }else input.maxLength = 300; input.value = draft.declared[k]; input.addEventListener("input", function(){ draft.declared[k] = k === "note" ? input.value : Number(input.value); update(); }); append(wrap, node("span", "", k === "note" ? t("party.note") : k.toUpperCase()), input); body.appendChild(wrap); });
    }
  }
  function matchRows(host, p){
    host.replaceChildren(); M.voteMatch(p).filter(function(r){ return r.common; }).forEach(function(r){ var row = node("div", "party-match"); append(row, node("span", "", PC.L(r.p, "short")), node("b", "", Math.round(r.ratio * 100) + "%"), node("small", "", r.same + " / " + r.common)); host.appendChild(row); });
  }
  function stepVotes(body){
    select(body, t("party.copyVotes"), [{ value:"", label:t("party.copyVotes") }].concat(PC.PARTIES.map(function(p){ return { value:p.id, label:PC.L(p, "short") }; })), "", function(id){ if(!id) return; draft.votes = {}; PC.VOTES.forEach(function(v){ var st = PC.voteStance(v, PC.partyById(id)); if(["for", "against", "abstain", "absent"].indexOf(st) !== -1) draft.votes[v.id] = st; }); renderWizard(); });
    var matches = node("div", "party-matches"); matches.id = "partyMatches"; append(body, node("h3", "party-subhead", t("party.matches")), matches, node("p", "party-meta", t("party.votesHint")));
    PC.VOTES.forEach(function(v){
      var c = node("article", "party-vote"), group = node("div", "party-vote-options");
      append(c, node("small", "", v.date), node("h4", "", PC.L(v, "title")));
      ["for", "against", "abstain", "absent"].forEach(function(st){ var b = button(t("party." + st), function(){ if(draft.votes[v.id] === st) delete draft.votes[v.id]; else draft.votes[v.id] = st; group.querySelectorAll("button").forEach(function(e){ e.setAttribute("aria-pressed", String(e.dataset.stance === draft.votes[v.id])); }); update(); }, "small ghost"); b.dataset.stance = st; b.setAttribute("aria-pressed", String(draft.votes[v.id] === st)); group.appendChild(b); }); group.setAttribute("role", "group"); group.setAttribute("aria-label", PC.L(v, "title")); append(c, group); body.appendChild(c);
    });
  }
  function downloadJSON(p){ var data = { format:"politcompass-parties", v:1, list:[M.normalize(p)] }; PC.exporter.download(new Blob([JSON.stringify(data, null, 2)], { type:"application/json" }), "party.json"); }
  function exportCard(p, format){ if(PC.exporter.partyCard) PC.exporter.partyCard(M.normalize(p), format); }
  async function share(p){
    var data=PC.share.partyData(p);if(!data){toast("party.longLink",true);return;}var url=data.url;
    try{ if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(url); toast("party.copied"); } }
    catch(e){ if(e.name !== "AbortError"){ var wrap = node("label", "party-field"), input = node("input"); input.value = url; input.readOnly = true; append(wrap, node("span", "", t("party.share")), input); host.appendChild(wrap); input.focus(); input.select(); } }
  }
  function save(){
    if(!draft.name.trim()){ step = 1; renderWizard(); document.getElementById("party-name").focus(); toast("party.required", true); return null; }
    if(!draft.short.trim()) draft.short = draft.name.slice(0, 24);
    if(!draft.tag.trim()) draft.tag = draft.short.slice(0, 3).toUpperCase();
    var p = M.save(draft, fresh); if(!p){ toast(M.error() === "limit" ? "party.limit" : "party.storage", true); return null; }
    draft = p; fresh = false; editId = p.id; PC.store.remove(M.DRAFT); toast("party.saved");
    if(PC.eggs && PC.eggs.party) PC.eggs.party(p); return p;
  }
  function showCompass(p){ if(PC.settings) PC.settings.set("myParties", "on"); PC.nav.go("compass"); PC.compass.redraw(); if(PC.activeId() === p.id) PC.select(null); PC.select(p.id); }
  function stepReady(body){
    append(body, card(draft), mini(draft, false));
    field("seats", "party.seats", null, "number", body); toggle(body, "inCoalition", t("party.coalition"), function(v){ draft.inCoalition = v; update(); });
    var actions = node("div", "party-actions");
    append(actions, button(t("party.save"), function(){ if(save()) renderList(); }, "primary"), button(t("party.compass"), function(){ var p = save(); if(p) showCompass(p); }), button(t("party.share"), function(){ share(M.normalize(draft)); }), button(t("party.png"), function(){ exportCard(draft, "png"); }), button(t("party.svg"), function(){ exportCard(draft, "svg"); }), button(t("party.json"), function(){ downloadJSON(draft); })); body.appendChild(actions);
  }
  function renderWizard(focus){
    guest = null; host.replaceChildren(); persist();
    var header = node("div", "party-wizard-head"), title = node("h2", "", t("party.step." + step)); title.id = "partyStepTitle"; title.tabIndex = -1;
    append(header, button("← " + t("party.close"), function(){ routeTo("#/party"); }, "ghost small"), node("span", "party-meta", t("party.draft"))); host.appendChild(header);
    var layout = node("div", "party-workspace"), rail = node("nav", "party-steps"); rail.setAttribute("aria-label", t("party.create"));
    for(var i = 1; i <= 6; i++) (function(n){ var b = button("", function(){ step = n; renderWizard(true); }, "party-step" + (n === step ? " current" : "")); append(b, node("span", "party-step-number", n < step ? "✓" : "0" + n), node("span", "", t("party.step." + n))); if(n === step) b.setAttribute("aria-current", "step"); rail.appendChild(b); })(i);
    var editor = node("section", "party-editor"), progress = node("div", "party-progress"), bar = node("i"); bar.style.width = step / 6 * 100 + "%"; progress.appendChild(bar);
    var announce = node("p", "eyebrow", t("party.step", { n:step })); announce.setAttribute("aria-live", "polite");
    append(editor, progress, announce, title, node("p", "party-step-hint", t("party.hint." + step)));
    var body = node("div", "party-step-body"); [stepIdentity, stepAppearance, stepPosition, stepManifesto, stepVotes, stepReady][step - 1](body); editor.appendChild(body);
    var controls = node("div", "party-wizard-nav"), prev = button(t("party.back"), function(){ step--; renderWizard(true); }); prev.disabled = step === 1; controls.appendChild(prev);
    if(step < 6) controls.appendChild(button(t("party.next") + " →", function(){ if(step === 1 && !draft.name.trim()){ document.getElementById("party-name").reportValidity(); return; } step++; renderWizard(true); }, "primary")); editor.appendChild(controls);
    var aside = node("aside", "party-live"); append(aside, node("p", "eyebrow", t("party.preview"))); var live = node("div"); live.id = "partyLive"; append(aside, live, node("p", "party-meta", t("party.local")));
    append(layout, rail, editor, aside); host.appendChild(layout); update(); colorWarning(); syncPosition(); if(focus) title.focus({ preventScroll:true });
  }
  function routeTo(hash){ if(location.hash === hash) route(); else location.hash = hash; }
  function start(template, id){
    if(!id && M.list().length >= 6){ toast("party.limit", true); return; }
    fresh = !id; editId = id || null; step = 1;
    draft = M.normalize(template || { name:"", tag:t("party.newTag"), sub:M.toSub(0, 0) });
    if(id) draft.id = id; persist(); routeTo(id ? "#/party/edit/" + id : "#/party/new");
  }
  function templateReal(id){
    var real = PC.partyById(id), p = M.normalize(real);
    p.name = PC.L(real, "name").slice(0, 50) + " · " + t("party.copy"); p.short = PC.L(real, "short"); p.tag = PC.L(real, "tag"); p.summary = PC.L(real, "summary"); p.theses = (PC.L(real, "theses") || []).slice(0, 8); p.votes = {};
    PC.VOTES.forEach(function(v){ var s = PC.voteStance(v, real); if(["for", "against", "abstain", "absent"].indexOf(s) !== -1) p.votes[v.id] = s; }); start(p);
  }
  function random(){ var sub = {}; PC.SUBAXES.forEach(function(a){ sub[a.id] = (Math.floor(Math.random() * 41) - 20) / 2; }); var n = Math.floor(Math.random() * 6), name = t("party.random." + n); start({ name:name, short:name.slice(0, 24), tag:name.split(" ").map(function(w){ return w[0]; }).join("").slice(0, 8), sub:sub, color:COLORS[Math.floor(Math.random() * COLORS.length)], emblem:M.EMBLEMS[1 + Math.floor(Math.random() * 24)] }); }
  function fromQuiz(){ var r = PC.quiz.result(); if(!r){ toast("party.noQuiz", true); PC.nav.go("quiz"); return; } start({ name:t("party.noName"), tag:t("party.newTag"), sub:PC.quiz.subScoreOf(r.answers, PC.quiz.questionsFor(r.mode)) }); }
  function remove(p){
    if(!M.remove(p.id)){ toast("party.storage", true); return; } renderList();
    PC.ui.toast(t("party.deleted"), false, { label:t("party.undo"), action:function(){ var restored = M.save(p, true); if(restored) renderList(); else toast("party.limit", true); }, duration:5000 });
  }
  function renderList(){
    guest = null; host.replaceChildren();
    var hero = node("div", "party-hero"), copy = node("div", "party-hero-copy");
    append(copy, node("p", "eyebrow", t("party.kicker")), node("h1", "", t("party.title")), node("p", "party-lead", t("party.lead")), button(t("party.create") + " ↗", function(){ start(); }, "primary"), node("p", "party-meta", t("party.local")));
    var art = node("div", "party-hero-art"); art.setAttribute("aria-hidden", "true"); art.appendChild(mini(M.normalize({ name:"", tag:t("party.newTag"), sub:M.toSub(2, -3), color:"#a5b4fc" }), false)); append(hero, copy, art); host.appendChild(hero);
    var sources = node("div", "party-sources");
    append(sources, button("01  " + t("party.quiz"), fromQuiz, "ghost"), button("02  " + t("party.real"), function(){ var picker = document.getElementById("partyTemplate"); picker.hidden = !picker.hidden; if(!picker.hidden) picker.querySelector("select").focus(); }, "ghost"), button("03  " + t("party.random"), random, "ghost")); host.appendChild(sources);
    var picker = node("div", "party-template"); picker.id = "partyTemplate"; picker.hidden = true;
    select(picker, t("party.real"), [{ value:"", label:t("party.real") }].concat(PC.PARTIES.map(function(p){ return { value:p.id, label:PC.L(p, "short") }; })), "", function(id){ if(id) templateReal(id); }); host.appendChild(picker);
    var savedDraft = PC.store.getJSON(M.DRAFT, null); if(savedDraft && savedDraft.v === 1) host.appendChild(button(t("party.resume"), function(){ draft = M.normalize(savedDraft.party); step = Math.max(1, Math.min(6, savedDraft.step || 1)); editId = savedDraft.editId; fresh = !editId; routeTo(editId ? "#/party/edit/" + editId : "#/party/new"); }, "party-resume"));
    var heading = node("div", "party-collection-head"), actions = node("div", "party-actions");
    append(actions, button(t("party.export"), function(){ PC.exporter.download(new Blob([M.exportJSON()], { type:"application/json" }), "my-parties.json"); }, "small ghost"), button(t("party.import"), function(){ file.click(); }, "small ghost"));
    var file = node("input"); file.type = "file"; file.accept = ".json,application/json"; file.hidden = true; file.id = "partyImport"; file.addEventListener("change", async function(){ var f = file.files[0]; if(!f) return; if(f.size > 1000000){ toast("party.invalidJSON", true); return; } var res = M.importJSON(await f.text()); if(res.error) toast("party.invalidJSON", true); else { renderList(); toast("party.imported", false, { n:res.added, m:res.skipped }); } });
    append(heading, node("h2", "", t("party.collection") + " / " + t("party.count", { n:M.list().length })), actions, file); host.appendChild(heading);
    var grid = node("div", "party-collection");
    M.list().forEach(function(p){
      var c = card(p, true), a = node("div", "party-card-actions");
      append(a, button(t("party.edit"), function(){ start(p, p.id); }, "small"), button(t("party.compass"), function(){ showCompass(p); }, "small"), button(t("party.share"), function(){ share(p); }, "small ghost"), button(t("party.duplicate"), function(){ var dup = M.normalize(p); dup.name = dup.name.slice(0, 50) + " · " + t("party.copy"); if(M.save(dup, true)) renderList(); else toast("party.limit", true); }, "small ghost"), button(t("party.delete"), function(){ remove(p); }, "small ghost")); c.appendChild(a); grid.appendChild(c);
    });
    if(!M.list().length){ var empty = node("div", "party-empty"); append(empty, node("span", "party-empty-mark", "◇"), node("h3", "", t("party.empty")), node("p", "", t("party.empty.hint"))); grid.appendChild(empty); } host.appendChild(grid);
    if(location.hash !== "#/party") history.replaceState(null, "", "#/party");
  }
  function renderGuest(code){
    var p = M.decode(code); if(!p){ renderList(); host.prepend(node("p", "party-warning", t("party.badLink"))); return; }
    guest = p; host.replaceChildren(); append(host, node("p", "eyebrow", t("party.guest")), card(p), mini(p, false));
    var a = node("div", "party-actions"); append(a, button(t("party.saveGuest"), function(){ if(M.save(p, true)){ toast("party.saved"); routeTo("#/party"); }else toast(M.error() === "limit" ? "party.limit" : "party.storage", true); }, "primary"), button(t("party.json"), function(){ downloadJSON(p); }), button(t("party.close"), function(){ routeTo("#/party"); }, "ghost")); host.appendChild(a);
  }
  function route(){
    if(!host || PC.nav.current() !== "party") return;
    var hash = location.hash, match = /^#\/party\/view\/(.*)$/.exec(hash);
    if(match){ renderGuest(match[1]); return; }
    match = /^#\/party\/edit\/(u[1-6])$/.exec(hash);
    if(match){
      if(editId !== match[1]){ var p = M.list().find(function(x){ return x.id === match[1]; }); if(!p){ renderList(); return; } var savedDraft=PC.store.getJSON(M.DRAFT,null),resume=savedDraft&&savedDraft.v===1&&savedDraft.editId===p.id&&M.valid(savedDraft.party); draft=M.normalize(resume?savedDraft.party:p); step=resume?Math.max(1,Math.min(6,savedDraft.step||1)):1; editId=p.id;fresh=false; }
      renderWizard(); return;
    }
    if(hash === "#/party/new"){
      if(!draft || editId){ var saved = PC.store.getJSON(M.DRAFT, null); draft = M.normalize(saved && saved.party); step = saved && saved.step >= 1 && saved.step <= 6 ? saved.step : 1; fresh = true; editId = null; }
      renderWizard(); return;
    }
    renderList();
  }
  function renderSidebar(p){
    var target = document.getElementById("sideBody"); if(!target) return;
    target.replaceChildren(card(p));
    var a = node("div", "party-actions"); append(a, button(t("party.edit"), function(){ start(p, p.id); }), button(t("party.share"), function(){ share(p); }), button(t("party.png"), function(){ exportCard(p, "png"); })); target.appendChild(a);
    var radar = node("div"); target.appendChild(radar); if(PC.radar) PC.radar.render(radar, [{ label:p.short, color:p.color, values:p.sub }]);
    if(p.seats > 0) target.appendChild(node("p", "party-meta", t("party.seats") + ": " + p.seats));
  }
  function drawOnCompass(){
    var svg = document.getElementById("svg"); if(!svg || document.documentElement.dataset.myParties === "off") return;
    var old = svg.querySelector(".my-parties"); if(old) old.remove();
    var layer = PC.utils.el("g", { "class":"my-parties" }); svg.appendChild(layer);
    M.list().forEach(function(p){
      var c = PC.geom.px(p.x, p.y), el = PC.utils.el;
      if(p.declared&&PC.compass.claimsOn()){var d=PC.geom.px(p.declared.x,p.declared.y),dx=d.sx-c.sx,dy=d.sy-c.sy,len=Math.hypot(dx,dy),ux=len?dx/len:0,uy=len?dy/len:0,tx=d.sx-ux*10,ty=d.sy-uy*10;
        append(layer,el("path",{d:"M"+c.sx+" "+c.sy+"L"+tx+" "+ty,stroke:p.color,"stroke-dasharray":"4 3","class":"my-party-declared"}),el("path",{d:"M0-7 7 0 0 7-7 0Z",transform:"translate("+d.sx+","+d.sy+")",stroke:p.color,fill:"none","class":"my-party-declared"}));
        if(len>26)layer.appendChild(el("path",{d:"M"+tx+" "+ty+"L"+(tx-ux*7-uy*3)+" "+(ty-uy*7+ux*3)+"L"+(tx-ux*7+uy*3)+" "+(ty-uy*7-ux*3)+"Z",fill:p.color,"class":"my-party-declared"}));}
      var g = el("g", { "class":"node my-party in", "data-id":p.id, transform:"translate(" + c.sx + "," + c.sy + ")", tabindex:0, role:"button", "aria-label":p.name + ", X " + PC.utils.fmt(p.x) + ", Y " + PC.utils.fmt(p.y) });
      append(g, el("path", { d:"M0-15 15 0 0 15-15 0Z", fill:p.color, stroke:"var(--bg)", "stroke-width":2 }), el("text", { x:20, y:-17, "class":"tag" }, p.tag));
      var mark = emblem(p, 18); mark.setAttribute("x", -9); mark.setAttribute("y", -9); mark.style.color = colorLab(p.color)[3] > .45 ? "#111827" : "#ffffff"; g.appendChild(mark);
      function open(){ PC.select(p.id); } g.addEventListener("click", open); g.addEventListener("keydown", function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } }); layer.appendChild(g);
    });
  }
  function init(){
    host = document.getElementById("partyRoot"); if(!host) return;
    var result = M.load(); if(result.reset) toast("party.corrupt", true);
    PC.nav.onChange(route); window.addEventListener("hashchange", route); PC.compass.onDraw(drawOnCompass);
    document.addEventListener("pc:parties", function(){
      if(PC.quiz&&PC.quiz.refreshParties)PC.quiz.refreshParties();
      if(PC.activeId && PC.activeId() && !PC.partyById(PC.activeId())) PC.select(null);
      PC.compass.redraw(); if(PC.refresh) PC.refresh(); if(PC.charts){ PC.charts.invalidate(); PC.charts.render(PC.activeId()); }
    });
    route();
  }
  function clearLocal(){draft=null;editId=null;fresh=true;guest=null;step=1;PC.store.remove(M.DRAFT);if(PC.nav.current()==="party"){history.replaceState(null,"","#/party");renderList();}}
  PC.partyBuilder = { init:init, card:card, emblem:emblem, start:start, share:share, renderSidebar:renderSidebar, drawOnCompass:drawOnCompass, refresh:route, clearLocal:clearLocal, isOwn:isOwn, guest:function(){ return guest; }, colorLab:colorLab };
})(window.PC = window.PC || {});
