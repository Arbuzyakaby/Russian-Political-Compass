/* Весь пользовательский текст вставляется текстовыми узлами, включая экспорт SVG.
   4.1: переработан раздел «Моя партия»: витрина, шаблоны, мастер в нижней панели,
   шторки. */
(function(PC){
  "use strict";
  var M = PC.partyModel, T = PC.partyTemplates, host, draft, step = 1, editId = null, fresh = true, guest = null;
  var shown = 0, baseId = "scratch", voteConv = 0, sheet = null, campaignFor = null;
  var COLORS = [
    "#a5b4fc", "#f0abfc", "#60a5fa", "#38bdf8", "#2dd4bf", "#34d399", "#a3e635", "#facc15", "#fbbf24", "#fb923c", "#f87171", "#fb7185",
    "#e879f9", "#c084fc", "#94a3b8", "#f1f5f9"
  ];
  var ICONS = [
    "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    "M5 19C1 9 12 3 21 3c0 9-6 20-16 16Zm0 0L16 8", "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
    "M2 9q5-6 10 0t10 0M2 15q5-6 10 0t10 0", "m2 20 7-14 4 8 3-5 6 11Z", "m16 8-3 5-5 3 3-5ZM12 2v3m0 14v3M2 12h3m14 0h3",
    "M3 18V8m18 10V8M3 14q9-12 18 0M3 18h18M8 10v8m8-8v8", "M12 21v-9M5 15h14l-4-5h3l-6-8-6 8h3Z",
    "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z", "M12 2 3 6v6q0 7 9 10 9-3 9-10V6Z",
    "M12 6Q7 2 3 5v15q5-3 9 0 4-3 9 0V5q-4-3-9 1Zm0 0v14", "M12 21 3 12C-3 3 9-1 12 7 15-1 27 3 21 12Z",
    "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0ZM2 12h20M12 2q-9 10 0 20 9-10 0-20", "M5 22V3q4-3 8 0t7 0v12q-3 3-7 0t-8 0",
    "M12 8C5-4-4 12 8 12c-12 7 4 16 4 4 7 12 16-4 4-4 12-7-4-16-4-4Z", "m14 2-10 12h7l-1 8 10-12h-7Z", "m12 2 10 10-10 10L2 12Z",
    "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z", "M3 12h18m-8-8 8 8-8 8",
    "M12 7v15M5 12H2q0 10 10 10t10-10h-3M15 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z", "M12 3v18M5 6h14M5 6l-4 9h8Zm14 0-4 9h8ZM7 21h10",
    "M2 15q6-4 6-11 7 9 14 3-1 12-13 11L3 22l2-6Z",
    "M12 22V2M12 8q-8 0-8-6 8 0 8 6Zm0 7q-8 0-8-6 8 0 8 6Zm0-7q8 0 8-6-8 0-8 6Zm0 7q8 0 8-6-8 0-8 6Z",
    "M22 12A10 4 30 1 1 2 12a10 4 30 0 1 20 0ZM22 12A10 4-30 1 1 2 12a10 4-30 0 1 20 0Z"
  ];
  /* Значки интерфейса: контурные, 24×24, одна толщина линии */
  var UI = {
    back:"m15 18-6-6 6-6", plus:"M12 5v14M5 12h14",
    dice:"M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01",
    quiz:"M9 6h11M9 12h11M9 18h11M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2",
    copy:"M9 9h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2ZM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
    edit:"M4 20h4L19 9l-4-4L4 16ZM13.5 6.5l4 4", compass:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM16 8l-2.2 5.8L8 16l2.2-5.8Z",
    share:"M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7",
    trash:"M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3", flag:"M5 22V3M5 4h13l-2.5 4.5L18 13H5", check:"m5 12 5 5 9-10",
    more:"m9 6 6 6-6 6", close:"M6 6l12 12M18 6 6 18",
    play:"M7 4l13 8-13 8Z",
    spark:"m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z",
    grid:"M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z",
    plusbox:"M12 8v8M8 12h8M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z", clear:"M5 6h14M9 6V4h6v2M7 6l1 14h8l1-14" };
  function t(k, vars){ return PC.t(k, vars); }
  /* Создаёт элемент; текст ставится через textContent, без HTML. */
  function node(tag, cls, value){ var e = document.createElement(tag); if(cls) e.className = cls; if(value != null) e.textContent = value; return e; }
  /* Добавляет дочерние элементы и пропускает пустые значения. */
  function append(parent){ Array.prototype.slice.call(arguments, 1).forEach(function(e){ if(e) parent.appendChild(e); }); return parent; }
  /* Иконка из набора UI: SVG строится программно, без innerHTML. */
  function icon(name, size){
    var svg = PC.utils.el(
      "svg",
      {
        viewBox:"0 0 24 24", width:size || 20, height:size || 20, "aria-hidden":"true", focusable:"false", fill:"none",
        stroke:"currentColor", "stroke-width":"1.8", "stroke-linecap":"round", "stroke-linejoin":"round", "class":"party-ico"
      }
    );
    svg.appendChild(PC.utils.el("path", { d:UI[name] })); return svg;
  }
  /* Кнопка с необязательным значком слева; доступное имя — только текст */
  function button(label, fn, cls, ico){
    var b = node("button", "btn " + (cls || "")); b.type = "button";
    if(ico) b.appendChild(icon(ico, 18));
    if(label) b.appendChild(node("span", "party-btn-text", label));
    b.addEventListener("click", fn); return b;
  }
  function toast(key, bad, vars){ if(PC.ui) PC.ui.toast(t(key, vars), bad); }
  function isOwn(p){ return /^u[1-6]$/.test(p.id); }
  /* Эмблема партии: буквы или значок из набора по выбранному варианту. */
  function emblem(p, size){
    var svg = PC.utils.el(
      "svg",
      {
        viewBox:"0 0 24 24", width:size || 32, height:size || 32, "aria-hidden":"true", fill:"none", stroke:"currentColor",
        "stroke-width":"1.5", "stroke-linecap":"round", "stroke-linejoin":"round"
      }
    );
    if(p.emblem === "mono") svg.appendChild(
      PC.utils.el(
        "text",
        { x:12, y:15, "text-anchor":"middle", stroke:"none", fill:"currentColor", "font-size":8, "font-weight":700 },
        (p.tag || "MP").slice(0, 3)
      )
    );
    else svg.appendChild(PC.utils.el("path", { d:ICONS[Math.max(0, M.EMBLEMS.indexOf(p.emblem) - 1)] }));
    return svg;
  }
  /* Цвет значка поверх заливки цветом партии: тёмный на светлом, светлый на тёмном */
  function ink(hex){ return colorLab(hex)[3] > .4 ? "#0b0d11" : "#ffffff"; }
  /* Круглая плашка с эмблемой и цветом партии. */
  function badge(p, size){
    var mark = node("span", "party-emblem"); mark.style.setProperty("--party-color", p.color); mark.style.setProperty("--party-ink", ink(p.color));
    mark.appendChild(emblem(p, size || 34)); return mark;
  }
  function chip(text, cls){ return node("span", "party-chip" + (cls ? " " + cls : ""), text); }
  /* Крошечная карта позиции: точка на квадрате −10…+10 */
  function pos(p){
    var m = node("span", "party-pos"); m.setAttribute("aria-hidden", "true");
    m.style.setProperty("--px", (p.x + 10) / 20 * 100 + "%");
    m.style.setProperty("--py", (10 - p.y) / 20 * 100 + "%");
    m.style.setProperty("--party-color", p.color);
    m.appendChild(node("i")); return m;
  }
  /* Шапка карточки: эмблема, название и слоган или семья. */
  function identity(p){
    var e = node("div", "party-identity");
    return append(
      e,
      badge(p, 36),
      append(
        node("div", "party-identity-text"),
        node("div", "party-eyebrow", t("party.user")),
        node("h3", "", p.name || t("party.noName")),
        node("p", "", p.slogan || t("party.family." + p.family))
      )
    );
  }
  /* Карточка партии для списка, предпросмотра и гостевого режима. */
  function card(raw, compact){
    var p = M.normalize(raw), c = node("article", "party-card" + (compact ? " compact" : ""));
    c.style.setProperty("--party-color", p.color); c.style.setProperty("--party-ink", ink(p.color));
    append(
      c,
      identity(p),
      append(node("div", "party-chips"), chip(t("party.family." + p.family)), chip(t("party.kind." + p.kind))),
      append(node("div", "party-coords"), node("span", "", "X " + PC.utils.fmt(p.x)), node("span", "", "Y " + PC.utils.fmt(p.y)), pos(p))
    );
    if(!compact){
      if(p.summary) c.appendChild(node("p", "party-summary", p.summary));
      if(p.ideology) c.appendChild(node("p", "party-ideology", p.ideology));
      var meta = [p.leader, String(p.founded)].filter(Boolean).join(" · ");
      c.appendChild(node("p", "party-meta", meta));
      if(p.theses.length){ var ul = node("ul", "party-theses"); p.theses.forEach(function(s){ ul.appendChild(node("li", "", s)); }); c.appendChild(ul); }
      if(p.declared) c.appendChild(
        node(
          "p",
          "party-meta",
          t("party.declared") + ": " + PC.utils.fmt(p.declared.x) + " / " + PC.utils.fmt(p.declared.y) + (
            p.declared.note ? " · " + p.declared.note : ""
          )
        )
      );
    }
    var near = M.nearest(p, 1)[0];
    if(near) c.appendChild(node("p", "party-neighbor", t("party.nearest") + ": " + PC.L(near.p, "short") + " · " + near.d.toFixed(1)));
    return c;
  }
  /* Сохраняет черновик в localStorage, чтобы ввод не терялся при перезагрузке. */
  function persist(){ PC.store.setJSON(M.DRAFT, { v:1, party:draft, step:step, editId:editId }); }
  /* Обновляет предпросмотр и подписи после каждого изменения. */
  function update(){
    var pt = M.fromSub(draft.sub); draft.x = pt.x; draft.y = pt.y; persist();
    var prev = document.getElementById("partyLive"); if(prev) prev.replaceChildren(card(draft, true), mini(M.normalize(draft), false));
    var title = document.getElementById("partyBarTitle"); if(title) title.textContent = draft.name.trim() || t("party.noName");
    document.querySelectorAll(".party-mini-live").forEach(function(svg){ paintMini(svg, M.normalize(draft)); });
    var near = document.getElementById("partyNearest");
    if(near) near.textContent = M.nearest(draft, 3).map(function(r){ return PC.L(r.p, "short") + " · " + r.d.toFixed(1); }).join(" / ");
    var voteHost = document.getElementById("partyMatches"); if(voteHost) matchRows(voteHost, draft);
    var cnt = document.getElementById("partyVoteCount"); if(cnt) voteCount(cnt);
  }
  /* Поле, связанное с черновиком, с проверкой числового диапазона. */
  function field(key, label, max, type, parent){
    var wrap = node("label", "party-field"), input = node(type === "textarea" ? "textarea" : "input");
    input.id = "party-" + key; if(type !== "textarea") input.type = type || "text";
    if(max) input.maxLength = max; input.value = draft[key] == null ? "" : draft[key];
    if(type === "number"){ input.min = key === "founded" ? 1990 : 0; input.max = key === "founded" ? 2100 : 450; input.inputMode = "numeric"; }
    input.addEventListener("input", function(){ draft[key] = type === "number" ? Number(input.value) : input.value; update(); });
    append(wrap, node("span", "", t(label)), input); parent.appendChild(wrap); return input;
  }
  /* Выпадающий список с подписями из переданного набора. */
  function select(parent, label, values, value, change){
    var wrap = node("label", "party-field"), s = node("select");
    values.forEach(function(o){ var op = node("option", "", o.label); op.value = o.value; s.appendChild(op); });
    s.value = value; s.addEventListener("change", function(){ change(s.value); });
    append(wrap, node("span", "", label), s); parent.appendChild(wrap); return s;
  }
  function toggle(parent, key, label, fn){
    var l = node("label", "party-toggle"), i = node("input"); i.type = "checkbox"; i.checked = !!draft[key];
    i.addEventListener("change", function(){ fn(i.checked); }); append(l, node("span", "", label), i); parent.appendChild(l); return i;
  }
  /* ---------- мини-компас ---------- */
  function paintMini(svg, p){
    svg.replaceChildren(); var el = PC.utils.el, S = 13;
    ["#fb7185", "#60a5fa", "#34d399", "#c084fc"].forEach(function(c, i){
      svg.appendChild(el("rect", { x:20 + (i % 2) * 130, y:20 + Math.floor(i / 2) * 130, width:130, height:130, fill:c, opacity:.08 }));

    });
    for(var j = 20; j <= 280; j += 26){
      svg.appendChild(
        el("path", { d:"M" + j + " 20V280M20 " + j + "H280", stroke:"currentColor", opacity:j === 150 ? .34 : .08, "stroke-width":1 })
      );

    }
    PC.PARTIES.forEach(function(r){
      var g = el("g", {});
      g.appendChild(el("circle", { cx:150 + r.x * S, cy:150 - r.y * S, r:3.4, fill:r.color, opacity:.75 }));
      g.appendChild(el("title", {}, PC.L(r, "short")));
      svg.appendChild(g);

    });
    if(p.declared){
      svg.appendChild(
        el(
          "path",
          {
            d:"M" + (150 + p.x * S) + " " + (150 - p.y * S) + "L" + (150 + p.declared.x * S) + " " + (150 - p.declared.y * S),
            stroke:p.color,
            "stroke-dasharray":"4 3"
          }
        )
      );
      svg.appendChild(
        el(
          "path",
          {
            d:"M0-6 6 0 0 6-6 0Z",
            transform:"translate(" + (150 + p.declared.x * S) + "," + (150 - p.declared.y * S) + ")",
            stroke:p.color,
            fill:"none"
          }
        )
      );
    }
    var g = el("g", { transform:"translate(" + (150 + p.x * S) + "," + (150 - p.y * S) + ")", "class":"party-mini-point" });
    append(
      g,
      el("circle", { r:26, fill:"transparent" }),
      el("circle", { r:18, fill:p.color, opacity:.16 }),
      el("path", { d:"M0-10 10 0 0 10-10 0Z", fill:p.color, stroke:"var(--bg)", "stroke-width":2.5 })
    );
    svg.appendChild(g);
    svg.appendChild(
      el(
        "text",
        {
          x:150 + p.x * S, y:128 - p.y * S, "text-anchor":"middle", fill:"currentColor", "font-size":10, "font-weight":700,
          "paint-order":"stroke", stroke:"var(--bg)", "stroke-width":3
        },
        p.tag
      )
    );
    var cap = { fill:"currentColor", opacity:.55, "font-size":8.5, "font-weight":600 };
    svg.appendChild(el("text", Object.assign({ x:24, y:292 }, cap), "← " + t("party.ax.l")));
    svg.appendChild(el("text", Object.assign({ x:276, y:292, "text-anchor":"end" }, cap), t("party.ax.r") + " →"));
    svg.appendChild(el("text", Object.assign({ x:24, y:14 }, cap), "↑ " + t("party.ax.up")));
    svg.appendChild(el("text", Object.assign({ x:276, y:14, "text-anchor":"end" }, cap), t("party.ax.down") + " ↓"));
  }
  /* Мини-компас (SVG) для ввода позиции: перетаскивание меняет X и Y. */
  function mini(p, interactive){
    var svg = PC.utils.el(
      "svg",
      {
        viewBox:"0 0 300 304",
        "class":"party-mini" + (interactive ? " party-mini-live" : ""),
        role:interactive ? "slider" : "img",
        "aria-label":t("party.step.3"),
        "aria-valuemin":-10,
        "aria-valuemax":10
      }
    );
    paintMini(svg, p);
    if(interactive){
      svg.tabIndex = 0; var dragging = false;
      /* Перетаскивание точки по мини-компасу с переводом в координаты. */
      function move(e){
        var r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width * 300 - 150) / 13, y = (150 - (e.clientY - r.top) / r.height * 304) / 13;
        draft.sub = M.toSub(x, y); update(); syncPosition();
      }
      svg.addEventListener("pointerdown", function(e){
        if(e.button != null && e.button !== 0) return;
        /* Касание перехватывает только ромб; остальная область остаётся прокручиваемой. */
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
  /* Заливает ползунок до текущего значения через переменную --f. */
  function fill(input){ input.style.setProperty("--f", (Number(input.value) + 10) / 20 * 100); }
  /* Переставляет точку и подписи по текущей позиции черновика. */
  function syncPosition(){
    PC.SUBAXES.forEach(function(a){
      var input = document.getElementById("party-sub-" + a.id);
      if(input){
        input.value = draft.sub[a.id];
        fill(input);
        input.parentNode.querySelector("output").textContent = PC.utils.fmt(draft.sub[a.id]);

      }
    });
    ["x", "y"].forEach(function(k){ var input = document.getElementById("party-direct-" + k); if(input) input.value = draft[k]; });
    var svg = document.querySelector(".party-mini-live");
    if(svg) svg.setAttribute("aria-valuetext", "X " + PC.utils.fmt(draft.x) + ", Y " + PC.utils.fmt(draft.y));
  }
  /* ---------- «Основа»: шаблоны, реальная партия, случайная ---------- */
  function lang(){ return PC.i18n && !PC.i18n.isRu() ? "en" : "ru"; }
  /* Зерно случайной партии: время и случайное число, чтобы повторы не совпадали. */
  function seedNow(){ return ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0) || 1; }
  function scratch(){ return { name:"", tag:t("party.newTag"), sub:M.toSub(0, 0) }; }
  /* Список реальных партий для выбора базиса. */
  function realList(){
    return PC.PARTIES.slice().sort(function(a, b){ return (PC.seatsAt(b, PC.CURRENT_CONVOCATION) || 0) - (PC.seatsAt(a, PC.CURRENT_CONVOCATION) || 0); });
  }
  /* Базис из результатов квиза: позиция пользователя как исходная точка. */
  function quizBase(){
    var r = PC.quiz.result(); if(!r){ toast("party.noQuiz", true); PC.nav.go("quiz"); return null; }
    return { name:t("party.noName"), tag:t("party.newTag"), sub:PC.quiz.subScoreOf(r.answers, PC.quiz.questionsFor(r.mode)) };
  }
  /* pickBase(kind, arg, apply): apply получает сырую партию и название основы */
  function pickBase(kind, arg, apply){
    if(kind === "scratch") apply(scratch(), t("party.start.scratch"), "scratch");
    else if(kind === "quiz"){ var q = quizBase(); if(q) apply(q, t("party.quiz"), "quiz"); }
    else if(kind === "random"){ var r = T.random(seedNow(), lang()); apply(r, r.name, "random"); }
    else if(kind === "tpl"){ var raw = T.build(arg, lang()); if(raw) apply(raw, raw.name, arg); }
    else if(kind === "real"){ var rp = T.fromReal(arg, lang(), t("party.copy")); if(rp) apply(rp, PC.L(PC.partyById(arg), "short"), "real:" + arg); }
  }
  /* Выбор реальной партии как базиса с подсказкой о совпадении. */
  function realPicker(apply){
    openSheet(t("party.real.pick"), function(body, close){
      body.appendChild(node("p", "party-sheet-hint", t("party.real.hint")));
      var list = node("div", "party-real-list");
      realList().forEach(function(p){
        var b = node("button", "party-real"); b.type = "button"; b.style.setProperty("--party-color", p.color);
        append(
          b,
          node("span", "party-real-dot"),
          append(node("span", "party-real-name"), node("b", "", PC.L(p, "short")), node("small", "", PC.L(p, "ideology") || "")),
          node("span", "party-real-xy", PC.utils.fmt(p.x) + " · " + PC.utils.fmt(p.y)),
          icon("more", 18)
        );
        b.addEventListener("click", function(){ close(); pickBase("real", p.id, apply); });
        list.appendChild(b);
      });
      body.appendChild(list);
    });
  }
  /* Лента основ: «С нуля» + четыре источника + девять шаблонов */
  function bases(apply, selected){
    var row = node("div", "party-bases"); row.setAttribute("role", "group"); row.setAttribute("aria-label", t("party.base"));
    /* Одна кнопка выбора базиса в сетке шаблонов. */
    function one(id, ico, title, sub, color, fn){
      var b = node("button", "party-basecard");
      b.type = "button";
      b.setAttribute("aria-pressed", String(selected === id || (id === "real" && /^real:/.test(selected || ""))));
      var mark = node("span", "party-basemark");
      if(color) mark.style.setProperty("--party-color", color), mark.style.setProperty("--party-ink", ink(color));
      mark.appendChild(typeof ico === "string" ? icon(ico, 22) : ico);
      append(b, mark, node("b", "", title), node("small", "", sub)); b.addEventListener("click", fn); row.appendChild(b); return b;
    }
    one("scratch", "plusbox", t("party.start.scratch"), t("party.start.scratch.d"), null, function(){ pickBase("scratch", null, apply); });
    one("quiz", "quiz", t("party.quiz"), t("party.quiz.d"), null, function(){ pickBase("quiz", null, apply); });
    one("real", "copy", t("party.real"), t("party.real.d"), null, function(){ realPicker(apply); });
    one("random", "dice", t("party.random"), t("party.random.d"), null, function(){ pickBase("random", null, apply); });
    T.LIST.forEach(function(tpl){
      var o = tpl[lang()];
      one(tpl.id, emblem({ emblem:tpl.emblem, tag:o.tag }, 24), o.name, t("party.family." + tpl.family), tpl.color, function(){
        pickBase("tpl", tpl.id, apply);

      });
    });
    return row;
  }
  /* Применяет базис к черновику (позиция, цвет, голоса) с отменой в тосте. */
  function applyBase(raw, label, id){
    var before = JSON.parse(JSON.stringify(draft)), beforeBase = baseId;
    draft = M.normalize(raw); baseId = id; step = 1; renderWizard(true);
    PC.ui.toast(
      t("party.base.applied", { name:label }),
      false,
      { label:t("party.undo"), action:function(){ draft = M.normalize(before); baseId = beforeBase; renderWizard(); }, duration:5000 }
    );
  }
  /* ---------- шаги мастера ---------- */
  function stepIdentity(body){
    if(fresh && !editId){
      var base = node("section", "party-base");
      append(base, node("h3", "party-subhead", t("party.base")), node("p", "party-meta", t("party.base.hint")), bases(applyBase, baseId));
      body.appendChild(base);
    }
    var grid = node("div", "party-fields"); body.appendChild(grid);
    field("name", "party.name", 60, "text", grid).required = true;
    field("short", "party.short", 24, "text", grid); field("tag", "party.tag", 8, "text", grid);
    field("founded", "party.founded", null, "number", grid); field("leader", "party.leader", 80, "text", grid);
    select(grid, t("party.kind"), M.KINDS.map(function(k){ return { value:k, label:t("party.kind." + k) }; }), draft.kind, function(v){
      draft.kind = v;
      update();

    });
    field("slogan", "party.slogan", 120, "text", body);
  }
  /* Перевод HEX в CIE Lab: нужен для контраста текста на цвете партии. */
  function colorLab(hex){
    var a = [1, 3, 5].map(function(i){ var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    var x = (a[0]*.4124 + a[1]*.3576 + a[2]*.1805)/.95047, y = a[0]*.2126 + a[1]*.7152 + a[2]*.0722, z = (a[0]*.0193 + a[1]*.1192 + a[2]*.9505)/1.08883;
    function f(v){ return v > .008856 ? Math.cbrt(v) : 7.787*v + 16/116; }
    return [116*f(y)-16, 500*(f(x)-f(y)), 200*(f(y)-f(z)), y];
  }
  /* Яркость реального фона текущей темы. Раньше брались условные .9 и .005
     по «светлая/тёмная», и на светлых темах слабым считался почти любой
     цвет палитры: она вся пастельная. Фон читаем из --bg через временный
     узел — так значение любого формата (hex, color-mix) приходит как rgb. */
  function backgroundLuminance(){
    var probe = node("i"); probe.style.cssText = "position:absolute;visibility:hidden;background:var(--bg)";
    document.body.appendChild(probe);
    var rgb = (getComputedStyle(probe).backgroundColor.match(/\d+(?:\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
    probe.remove();
    return colorLab("#" + rgb.map(function(v){ return ("0" + Math.round(v).toString(16)).slice(-2); }).join(""))[3];
  }
  /* Порог 1.5, а не 3 из WCAG для значков: у точки на компасе есть обводка
     --dot-stroke, она держит контур, и «слабо выделяется» должно означать
     цвет, который почти сливается с фоном (светло-серый на бумаге, тёмно-синий
     на тёмной теме), а не просто пастельный. */
  var MIN_CONTRAST = 1.5;
  /* Предупреждает, если цвет слишком похож на цвет другой партии. */
  function colorWarning(){
    var host = document.getElementById("partyColorWarning"); if(!host) return;
    var a = colorLab(draft.color), lum = backgroundLuminance();
    var contrast = (Math.max(a[3], lum) + .05) / (Math.min(a[3], lum) + .05);
    var near = PC.PARTIES.find(function(p){ var b = colorLab(p.color); return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]) < 10; });
    host.textContent = (contrast < MIN_CONTRAST ? t("party.contrast") + " " : "") + (near ? t("party.similar", { name:PC.L(near, "short") }) : "");
  }
  function stepAppearance(body){
    body.appendChild(node("h3", "party-subhead", t("party.color")));
    var palette = node("div", "party-palette"); palette.setAttribute("role", "group"); palette.setAttribute("aria-label", t("party.color"));
    /* Обновляет подсветку выбранного цвета и значение поля color. */
    function pressed(){
      palette.querySelectorAll(".party-swatch").forEach(function(b){
        b.setAttribute("aria-pressed", String(b.getAttribute("aria-label") === draft.color));

      });
      var c = document.getElementById("party-color");
      if(c) c.value = draft.color;

    }
    COLORS.forEach(function(c){
      var b = button("", function(){ draft.color = c; pressed(); update(); colorWarning(); }, "party-swatch");
      b.style.background = c;
      b.setAttribute("aria-label", c);
      b.setAttribute("aria-pressed", String(c === draft.color));
      palette.appendChild(b);

    });
    body.appendChild(palette);
    var color = field("color", "party.color", null, "color", body); color.addEventListener("input", function(){ colorWarning(); pressed(); });
    var warning = node("p", "party-warning"); warning.id = "partyColorWarning"; warning.setAttribute("aria-live", "polite"); body.appendChild(warning);
    body.appendChild(node("h3", "party-subhead", t("party.emblem")));
    var icons = node("div", "party-icons");
    M.EMBLEMS.forEach(function(id, i){
      var b = button(
        "",
        function(){
          draft.emblem = id;
          icons.querySelectorAll(".party-icon").forEach(function(x){ x.setAttribute("aria-pressed", String(x.dataset.id === id)); });
          update();

        },
        "party-icon"
      );
      b.dataset.id = id;
      b.appendChild(emblem({ emblem:id, tag:draft.tag }, 28));
      b.setAttribute("aria-label", i ? t("party.icon", { n:i }) : t("party.mono"));
      b.setAttribute("aria-pressed", String(draft.emblem === id));
      icons.appendChild(b);

    });
    body.appendChild(icons);
  }
  function stepPosition(body){
    append(body, mini(draft, true), node("p", "party-meta party-drag", t("party.drag")));
    PC.SUBAXES.forEach(function(a, i){
      var l = node("label", "party-slider"),
      top = node("span", "party-slider-head"),
      input = node("input"),
      output = node("output", "", PC.utils.fmt(draft.sub[a.id]));
      if(i === 0 || i === 3) body.appendChild(node("h3", "party-subhead", t(i ? "side.state" : "side.econ")));
      input.type = "range"; input.min = -10; input.max = 10; input.step = .5; input.value = draft.sub[a.id]; input.id = "party-sub-" + a.id; fill(input);
      input.setAttribute("aria-describedby", "party-poles-" + a.id); input.title = t("sub." + a.id + ".d");
      input.addEventListener("input", function(){
        draft.sub[a.id] = Number(input.value);
        output.textContent = PC.utils.fmt(draft.sub[a.id]);
        fill(input);
        update();
        syncPosition();

      });
      var poles = append(
        node("span", "party-poles"), node("span", "", t("sub." + a.id + ".lo")), node("span", "", t("sub." + a.id + ".hi"))
      );
      poles.id = "party-poles-" + a.id;
      append(top, node("span", "", t("sub." + a.id)), output); append(l, top, input, poles); body.appendChild(l);
    });
    var direct = node("details", "party-direct"); direct.appendChild(node("summary", "", t("party.direct")));
    var row = node("div", "party-fields"); direct.appendChild(row);
    ["x", "y"].forEach(function(k){
      var l = node("label", "party-field"), input = node("input");
      input.type = "number";
      input.min = -10;
      input.max = 10;
      input.step = .5;
      input.inputMode = "decimal";
      input.value = draft[k];
      input.id = "party-direct-" + k;
      input.addEventListener("input", function(){
        draft.sub = M.toSub(k === "x" ? Number(input.value) : draft.x, k === "y" ? Number(input.value) : draft.y);
        update();
        syncPosition();

      });
      append(l, node("span", "", k.toUpperCase()), input);
      row.appendChild(l);

    });
    body.appendChild(direct);
    body.appendChild(node("h3", "party-subhead", t("party.nearest")));
    var nearest = node("p", "party-neighbor"); nearest.id = "partyNearest"; body.appendChild(nearest);
  }
  /* Шаг мастера: тезисы партии с порядком и удалением. */
  function stepManifesto(body){
    select(body, t("party.family"), M.FAMILIES.map(function(k){ return { value:k, label:t("party.family." + k) }; }), draft.family, function(v){
      draft.family = v;
      update();

    });
    field("ideology", "party.ideology", 120, "text", body); field("summary", "party.summary", 600, "textarea", body);
    body.appendChild(node("h3", "party-subhead", t("party.theses")));
    draft.theses.forEach(function(value, i){
      var row = node("div", "party-thesis-row"), input = node("input");
      input.value = value;
      input.maxLength = 160;
      input.setAttribute("aria-label", t("party.thesis", { n:i + 1 }));
      input.addEventListener("input", function(){ draft.theses[i] = input.value; update(); });
      row.appendChild(append(node("span", "party-thesis-n", String(i + 1)), null));
      row.appendChild(input);
      function swap(j){ var tmp = draft.theses[j]; draft.theses[j] = draft.theses[i]; draft.theses[i] = tmp; renderWizard(); }
      var up = button("↑", function(){ swap(i - 1); }, "small party-icon-btn"); up.disabled = i === 0; up.setAttribute("aria-label", t("party.up"));
      var down = button("↓", function(){ swap(i + 1); }, "small party-icon-btn");
      down.disabled = i === draft.theses.length - 1;
      down.setAttribute("aria-label", t("party.down"));
      var del = button("×", function(){ draft.theses.splice(i, 1); renderWizard(); }, "small party-icon-btn");
      del.setAttribute("aria-label", t("party.delete"));
      append(row, up, down, del);
      body.appendChild(row);
    });
    if(draft.theses.length < 8) body.appendChild(button(t("party.addThesis"), function(){ draft.theses.push(""); renderWizard(); }, "ghost party-add", "plus"));
    var l = node("label", "party-toggle"), cb = node("input");
    cb.type = "checkbox";
    cb.checked = !!draft.declared;
    cb.addEventListener("change", function(){
      if(cb.checked) draft.declared = { x:0, y:0, note:"" };
      else delete draft.declared;
      renderWizard();

    });
    append(l, node("span", "", t("party.declared")), cb);
    body.appendChild(l);
    if(draft.declared){
      var dg = node("div", "party-fields"); body.appendChild(dg);
      ["x", "y", "note"].forEach(function(k){
        var wrap = node("label", "party-field"), input = node(k === "note" ? "textarea" : "input");
        if(k !== "note"){
          input.type = "number";
          input.min = -10;
          input.max = 10;
          input.step = .5;
          input.inputMode = "decimal";

        }else{ input.maxLength = 300; wrap.className += " wide"; }
        input.value = draft.declared[k];
        input.addEventListener("input", function(){ draft.declared[k] = k === "note" ? input.value : Number(input.value); update(); });
        append(wrap, node("span", "", k === "note" ? t("party.note") : k.toUpperCase()), input);
        dg.appendChild(wrap);

      });
    }
  }
  /* Строки совпадения с реальными партиями по голосованиям. */
  function matchRows(host, p){
    host.replaceChildren();
    M.voteMatch(p).filter(function(r){ return r.common; }).sort(function(a, b){ return b.ratio - a.ratio; }).forEach(function(r){
      var row = node("div", "party-match"), bar = node("i");
      row.style.setProperty("--party-color", r.p.color);
      bar.style.width = Math.round(r.ratio * 100) + "%";
      append(
        row,
        node("span", "party-match-name", PC.L(r.p, "short")),
        node("b", "", Math.round(r.ratio * 100) + "%"),
        node("small", "", r.same + " / " + r.common),
        append(node("span", "party-match-bar"), bar)
      );
      host.appendChild(row);
    });
  }
  /* Счётчик заполненных голосований для шага голосов. */
  function voteCount(el){
    var n = Object.keys(draft.votes).length, m = PC.VOTES.length;
    el.textContent = t("party.votes.set", { n:n, m:m });
    var bar = el.parentNode && el.parentNode.querySelector(".party-meter i"); if(bar) bar.style.width = n / m * 100 + "%";
  }
  var STANCES = [
    ["for", "party.for", "party.for.s"],
    ["against", "party.against", "party.against.s"],
    ["abstain", "party.abstain", "party.abstain.s"],
    ["absent", "party.absent", "party.absent.s"]
  ];
  /* Список голосований с кнопками позиции: за, против, воздержался, отсутствовал. */
  function voteList(listHost){
    listHost.replaceChildren();
    PC.VOTES.filter(function(v){ return !voteConv || v.conv === voteConv; }).forEach(function(v){
      var c = node("article", "party-vote"), group = node("div", "party-seg");
      append(
        c,
        append(
          node("div", "party-vote-head"),
          node("small", "", v.date),
          node(
            "small",
            "party-vote-conv",
            t(
              "party.votes.conv",
              {
                n:PC.CONVOCATIONS_ALL.filter(function(x){ return x.id === v.conv; }).map(function(x){
                  return x.label.replace(" созыв", "");

                })[0] || v.conv
              }
            )
          )
        ),
        node("h4", "", PC.L(v, "title"))
      );
      STANCES.forEach(function(s){
        var b = button(
          t(s[2]),
          function(){
            if(draft.votes[v.id] === s[0]) delete draft.votes[v.id];
            else draft.votes[v.id] = s[0];
            group.querySelectorAll("button").forEach(function(e){
              e.setAttribute("aria-pressed", String(e.dataset.stance === draft.votes[v.id]));

            });
            update();

          },
          "party-seg-btn"
        );
        b.dataset.stance = s[0];
        b.setAttribute("aria-label", t(s[1]));
        b.setAttribute("aria-pressed", String(draft.votes[v.id] === s[0]));
        group.appendChild(b);
      });
      group.setAttribute("role", "group"); group.setAttribute("aria-label", PC.L(v, "title")); append(c, group); listHost.appendChild(c);
    });
  }
  /* Шаг голосов: позиция партии по каждому голосованию. */
  function stepVotes(body){
    var tools = node("div", "party-votes-tools");
    append(tools,
      button(t("party.votes.fill"), function(){
        draft.votes = T.votesFromPosition(draft.x, draft.y);
        renderWizard();
        toast("party.votes.filled");
      }, "primary", "spark"),
      button(t("party.votes.clear"), function(){ draft.votes = {}; renderWizard(); }, "ghost", "clear")); body.appendChild(tools);
    select(body, t("party.copyVotes"),
      [{ value:"", label:t("party.copyVotes") }].concat(PC.PARTIES.map(function(p){ return { value:p.id, label:PC.L(p, "short") }; })),
      "", function(id){
      if(!id) return;
      draft.votes = {};
      PC.VOTES.forEach(function(v){
        var st = PC.voteStance(v, PC.partyById(id));
        if(["for", "against", "abstain", "absent"].indexOf(st) !== -1) draft.votes[v.id] = st;

      });
      renderWizard();

    });
    var meter = node("div", "party-meter-box"), count = node("span", "", "");
    count.id = "partyVoteCount";
    append(meter, count, append(node("span", "party-meter"), node("i")));
    body.appendChild(meter);
    var matches = node("div", "party-matches");
    matches.id = "partyMatches";
    append(body, node("h3", "party-subhead", t("party.matches")), matches, node("p", "party-meta", t("party.votesHint")));
    var convs = PC.convsAsc(), filters = node("div", "party-filter");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", t("party.votes.convs"));
    var listHost = node("div", "party-vote-list"); listHost.id = "partyVotes";
    [{ id:0, label:t("party.votes.all") }].concat(convs.map(function(c){
      return { id:c.id, label:PC.L(c, "label").replace(/ (созыв|convocation)$/, "") };
    })).forEach(function(c){
      var b = button(
        c.label,
        function(){
          voteConv = c.id;
          filters.querySelectorAll("button").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
          voteList(listHost);

        },
        "party-pill"
      );
      b.setAttribute("aria-pressed", String(voteConv === c.id));
      filters.appendChild(b);
    });
    append(body, filters, listHost); voteList(listHost);
  }
  /* Скачивает партию в JSON формата politcompass-parties. */
  function downloadJSON(p){
    var data = { format:"politcompass-parties", v:1, list:[M.normalize(p)] };
    PC.exporter.download(new Blob([JSON.stringify(data, null, 2)], { type:"application/json" }), "party.json");

  }
  /* Экспорт карточки партии в PNG или SVG. */
  function exportCard(p, format){ if(PC.exporter.partyCard) PC.exporter.partyCard(M.normalize(p), format); }
  /* Делится ссылкой на партию через системное меню или буфер обмена. */
  async function share(p){
    var data=PC.share.partyData(p);if(!data){toast("party.longLink",true);return;}var url=data.url;
    try{ if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(url); toast("party.copied"); } }
    catch(e){
      if(e.name !== "AbortError"){
        var wrap = node("label", "party-field"), input = node("input");
        input.value = url;
        input.readOnly = true;
        append(wrap, node("span", "", t("party.share")), input);
        host.appendChild(wrap);
        input.focus();
        input.select();

      }
    }
  }
  /* Сохраняет черновик как партию; возвращает запись или null при ошибке. */
  function save(){
    if(!draft.name.trim()){ step = 1; renderWizard(); document.getElementById("party-name").focus(); toast("party.required", true); return null; }
    if(!draft.short.trim()) draft.short = draft.name.slice(0, 24);
    if(!draft.tag.trim()) draft.tag = draft.short.slice(0, 3).toUpperCase();
    var p = M.save(draft, fresh); if(!p){ toast(M.error() === "limit" ? "party.limit" : "party.storage", true); return null; }
    draft = p; fresh = false; editId = p.id; PC.store.remove(M.DRAFT); toast("party.saved");
    if(PC.eggs && PC.eggs.party) PC.eggs.party(p); return p;
  }
  /* Открывает компас и выделяет партию на нём. */
  function showCompass(p){
    if(PC.settings) PC.settings.set("myParties", "on");
    PC.nav.go("compass");
    PC.compass.redraw();
    if(PC.activeId() === p.id) PC.select(null);
    PC.select(p.id);

  }
  function campaign(p){ campaignFor = p.id; routeTo("#/party/election/" + p.id); }
  function group(title){ var g = node("section", "party-group"); if(title) g.appendChild(node("h3", "party-subhead", title)); return g; }
  function stepReady(body){
    append(body, card(draft), mini(draft, false));
    var seats = group(t("party.ready.seats"));
    field("seats", "party.seats", null, "number", seats);
    toggle(seats, "inCoalition", t("party.coalition"), function(v){ draft.inCoalition = v; update(); });
    body.appendChild(seats);
    var out = group(t("party.ready.share")), actions = node("div", "party-actions");
    append(
      actions,
      button(t("party.compass"), function(){ var p = save(); if(p) showCompass(p); }, "", "compass"),
      button(t("party.share"), function(){ share(M.normalize(draft)); }, "", "share"),
      button(t("party.png"), function(){ exportCard(draft, "png"); }, "", "grid"),
      button(t("party.svg"), function(){ exportCard(draft, "svg"); }, "", "grid"),
      button(t("party.json"), function(){ downloadJSON(draft); }, "", "grid")
    );
    append(out, actions); body.appendChild(out);
    var camp = node("section", "party-promo party-promo-inline");
    append(
      camp,
      append(node("div"), node("h3", "", t("party.camp.promo.h")), node("p", "", t("party.camp.promo.p"))),
      button(t("party.camp.go"), function(){ var p = save(); if(p) campaign(p); }, "primary", "flag")
    );
    body.appendChild(camp);
  }
  /* Прокручивает мастер к текущему шагу на мобильном экране. */
  function scrollToWizard(editor){
    /* липкая полоса вкладок учитывается, только когда она сверху: на
       телефоне с 4.1 вкладки внизу экрана, и их нижняя кромка — это
       почти высота окна, а не отступ над мастером */
    var tabs = document.querySelector(".tabs"), r = tabs ? tabs.getBoundingClientRect() : null;
    var off = r && r.top < window.innerHeight / 2 ? r.bottom : 0, top = editor.getBoundingClientRect().top;
    if(top < off + 8 || top > window.innerHeight * .7) window.scrollBy({ top:top - off - 12, behavior:"instant" });
  }
  /* Перерисовывает текущий шаг мастера. */
  function renderWizard(focus){
    guest = null; closeSheet(); host.replaceChildren(); persist();
    var prevShown = shown, dir = !shown || shown === step ? "" : step > shown ? "fwd" : "back", animate = !!focus || !shown;
    shown = step;
    var wizard = node("div", "party-wizard");
    var header = node("div", "party-appbar"), barTitle = node("span", "party-appbar-title", draft.name.trim() || t("party.noName"));
    barTitle.id = "partyBarTitle";
    append(
      header,
      button(t("party.close"), function(){ routeTo("#/party"); }, "ghost party-back", "back"),
      barTitle,
      node("span", "party-meta party-saved", t("party.draft"))
    );
    wizard.appendChild(header);
    var layout = node("div", "party-workspace"), rail = node("nav", "party-steps"); rail.setAttribute("aria-label", t("party.create"));
    for(var i = 1; i <= 6; i++) (function(n){
      var b = button(
        "", function(){ step = n; renderWizard(true); }, "party-step" + (n === step ? " current" : "") + (n < step ? " done" : "")
      );
      var num = node("span", "party-step-number");
      if(n < step) num.appendChild(icon("check", 14));
      else num.textContent = String(n);
      append(b, num, node("span", "party-step-label", t("party.step." + n)));
      b.setAttribute("aria-label", t("party.step." + n));
      if(n === step) b.setAttribute("aria-current", "step");
      rail.appendChild(b);

    })(i);
    var editor = node("section", "party-editor"), progress = node("div", "party-progress"), bar = node("i");
    bar.style.width = step / 6 * 100 + "%";
    bar.style.setProperty("--from", prevShown && prevShown !== step ? (prevShown / step).toFixed(3) : "0");
    progress.appendChild(bar);
    var stage = node("div", "party-stage" + (animate && dir ? " is-" + dir : animate ? " is-first" : ""));
    var announce = node("div", "party-eyebrow", t("party.step", { n:step })); announce.setAttribute("aria-live", "polite");
    var title = node("h2", "", t("party.step." + step)); title.id = "partyStepTitle"; title.tabIndex = -1;
    var body = node("div", "party-step-body"); [stepIdentity, stepAppearance, stepPosition, stepManifesto, stepVotes, stepReady][step - 1](body);
    append(stage, announce, title, node("p", "party-step-hint", t("party.hint." + step)), body);
    var controls = node("div", "party-bar party-wizard-nav"),
    prev = button(t("party.back"), function(){ step--; renderWizard(true); }, "party-bar-back", "back");
    prev.disabled = step === 1;
    prev.setAttribute("aria-label", t("party.back"));
    controls.appendChild(prev);
    if(step < 6) controls.appendChild(
      button(
        t("party.next") + " →",
        function(){
          if(step === 1 && !draft.name.trim()){ document.getElementById("party-name").reportValidity(); return; }
          step++;
          renderWizard(true);

        },
        "primary party-bar-next"
      )
    );
    else controls.appendChild(button(t("party.save"), function(){ if(save()) renderList(); }, "primary party-bar-next", "check"));
    append(editor, progress, stage, controls);
    var aside = node("aside", "party-live");
    append(aside, node("div", "party-eyebrow", t("party.preview")));
    var live = node("div", "party-live-card");
    live.id = "partyLive";
    append(aside, live, node("p", "party-meta", t("party.local")));
    append(layout, rail, editor, aside); wizard.appendChild(layout); host.appendChild(wizard); update(); colorWarning(); syncPosition();
    var cur = rail.querySelector(".current");
    if(cur && rail.scrollWidth > rail.clientWidth) rail.scrollLeft = cur.offsetLeft - (rail.clientWidth - cur.offsetWidth) / 2;
    if(focus){ title.focus({ preventScroll:true }); scrollToWizard(editor); }
  }
  function routeTo(hash){ if(location.hash === hash) route(); else location.hash = hash; }
  /* Открывает мастер: новая партия, редактирование или шаблон. */
  function start(template, id){
    if(!id && M.list().length >= 6){ toast("party.limit", true); return; }
    fresh = !id; editId = id || null; step = 1; shown = 0; baseId = id ? null : (template && template.__base) || "scratch";
    draft = M.normalize(template || scratch());
    if(id) draft.id = id; persist(); routeTo(id ? "#/party/edit/" + id : "#/party/new");
  }
  function startBase(raw, label, id){ raw = Object.assign({}, raw); raw.__base = id; start(raw); }
  /* Удаляет партию с возможностью отмены в тосте. */
  function remove(p){
    if(!M.remove(p.id)){ toast("party.storage", true); return; } renderList();
    PC.ui.toast(
      t("party.deleted"),
      false,
      {
        label:t("party.undo"),
        action:function(){ var restored = M.save(p, true); if(restored) renderList(); else toast("party.limit", true); },
        duration:5000
      }
    );
  }
  /* ---------- главный экран ---------- */
  function heroArt(){
    var el = PC.utils.el, svg = el("svg", { viewBox:"0 0 320 320", "class":"party-hero-svg", "aria-hidden":"true", focusable:"false" }), S = 14;
    ["#fb7185", "#60a5fa", "#34d399", "#c084fc"].forEach(function(c, i){
      svg.appendChild(
        el(
          "rect", { x:14 + (i % 2) * 146, y:14 + Math.floor(i / 2) * 146, width:146, height:146, rx:i === 0 ? 30 : 6, fill:c, opacity:.10 }
        )
      );

    });
    for(var j = 14; j <= 306; j += 36.5) svg.appendChild(el("path", { d:"M" + j + " 14V306M14 " + j + "H306", stroke:"currentColor", opacity:.07 }));
    svg.appendChild(el("path", { d:"M160 14V306M14 160H306", stroke:"currentColor", opacity:.22 }));
    PC.PARTIES.forEach(function(r, i){
      var g = el(
        "g",
        {
          "class":"hero-dot",
          style:"--d:" + (i * 0.37).toFixed(2) + "s",
          transform:"translate(" + (160 + r.x * S) + "," + (160 - r.y * S) + ")"
        }
      );
      append(g, el("circle", { r:11, fill:r.color, opacity:.16 }), el("circle", { r:4.6, fill:r.color })); svg.appendChild(g);
    });
    var drift = el("g", { "class":"hero-drift" }), you = el("g", { transform:"translate(160,160)" });
    append(
      you,
      el("circle", { r:30, fill:"var(--accent)", opacity:.14, "class":"hero-halo" }),
      el("path", { d:"M0-17 17 0 0 17-17 0Z", fill:"var(--accent)", stroke:"var(--bg)", "stroke-width":3 }),
      el(
        "path",
        {
          d:UI.spark, transform:"translate(-7,-7) scale(.58)", fill:"none", stroke:"var(--accent-ink)", "stroke-width":2.4,
          "stroke-linecap":"round", "stroke-linejoin":"round"
        }
      )
    );
    drift.appendChild(you); svg.appendChild(drift);
    return svg;
  }
  function savedDraft(){ var d = PC.store.getJSON(M.DRAFT, null); return d && d.v === 1 && M.valid(d.party) ? d : null; }
  function startSection(){
    var sec = node("section", "party-start"), head = node("div", "party-section-head");
    append(head, node("h2", "", t("party.start.h")), node("p", "party-meta", t("party.start.p"))); sec.appendChild(head);
    var tiles = node("div", "party-tiles");
    function tile(ico, title, sub, fn){
      var b = node("button", "party-tile");
      b.type = "button";
      append(
        b,
        append(node("span", "party-tile-ico"), icon(ico, 24)),
        append(node("span", "party-tile-text"), node("b", "", title), node("small", "", sub))
      );
      b.addEventListener("click", fn);
      tiles.appendChild(b);

    }
    tile("plusbox", t("party.start.scratch"), t("party.start.scratch.d"), function(){ start(); });
    tile("quiz", t("party.quiz"), t("party.quiz.d"), function(){ pickBase("quiz", null, startBase); });
    tile("copy", t("party.real"), t("party.real.d"), function(){ realPicker(startBase); });
    tile("dice", t("party.random"), t("party.random.d"), function(){ pickBase("random", null, startBase); });
    sec.appendChild(tiles);
    append(sec, node("h3", "party-subhead", t("party.tpl.h")), node("p", "party-meta", t("party.tpl.hint")));
    var tpls = node("div", "party-tpls");
    T.LIST.forEach(function(tpl){
      var o = tpl[lang()], b = node("button", "party-tpl");
      b.type = "button";
      b.style.setProperty("--party-color", tpl.color);
      b.style.setProperty("--party-ink", ink(tpl.color));
      var mark = node("span", "party-emblem"); mark.appendChild(emblem({ emblem:tpl.emblem, tag:o.tag }, 28));
      append(
        b,
        append(node("span", "party-tpl-top"), mark, pos({ x:tpl.x, y:tpl.y, color:tpl.color })),
        node("b", "", o.name),
        node("small", "", o.ideology),
        append(node("span", "party-chips"), chip(t("party.family." + tpl.family)))
      );
      b.addEventListener("click", function(){ pickBase("tpl", tpl.id, startBase); }); tpls.appendChild(b);
    });
    sec.appendChild(tpls); return sec;
  }
  /* Список партий: карточки, импорт и экспорт, промо кампании. */
  function renderList(){
    guest = null; closeSheet(); shown = 0; host.replaceChildren();
    var list = M.list(), hero = node("div", "party-hero" + (list.length ? " is-compact" : "")), copy = node("div", "party-hero-copy");
    var cta = node("div", "party-hero-cta");
    append(
      cta,
      button(t("party.create") + " ↗", function(){ start(); }, "primary party-cta"),
      button(t("party.random"), function(){ pickBase("random", null, startBase); }, "party-cta-2", "dice")
    );
    append(
      copy,
      node("div", "party-eyebrow", t("party.kicker")),
      node("h1", "", t("party.title")),
      node("p", "party-lead", t("party.lead")),
      cta,
      node("p", "party-meta", t("party.local"))
    );
    var art = node("div", "party-hero-art");
    art.setAttribute("aria-hidden", "true");
    art.appendChild(heroArt());
    append(hero, copy, art);
    host.appendChild(hero);
    var sd = savedDraft();
    if(sd) host.appendChild(
      append(
        node("button", "party-resume"),
        icon("edit", 20),
        append(
          node("span", "party-resume-text"),
          node("b", "", t("party.resume")),
          node("small", "", (sd.party.name || t("party.noName")) + " · " + t("party.step", { n:sd.step }))
        ),
        icon("more", 18)
      )
    ).addEventListener("click", function(){
      draft = M.normalize(sd.party);
      step = Math.max(1, Math.min(6, sd.step || 1));
      editId = sd.editId;
      fresh = !editId;
      shown = 0;
      baseId = null;
      routeTo(editId ? "#/party/edit/" + editId : "#/party/new");

    });
    var heading = node("div", "party-collection-head"), actions = node("div", "party-actions");
    append(
      actions,
      button(
        t("party.export"),
        function(){ PC.exporter.download(new Blob([M.exportJSON()], { type:"application/json" }), "my-parties.json"); },
        "small ghost"
      ),
      button(t("party.import"), function(){ file.click(); }, "small ghost")
    );
    var file = node("input");
    file.type = "file";
    file.accept = ".json,application/json";
    file.hidden = true;
    file.id = "partyImport";
    file.addEventListener("change", async function(){
      var f = file.files[0];
      if(!f) return;
      if(f.size > 1000000){ toast("party.invalidJSON", true); return; }
      var res = M.importJSON(await f.text());
      if(res.error) toast("party.invalidJSON", true);
      else { renderList(); toast("party.imported", false, { n:res.added, m:res.skipped }); }
    });
    append(
      heading,
      append(
        node("h2", ""), document.createTextNode(t("party.collection")), node("span", "party-count", t("party.count", { n:list.length }))
      ),
      actions,
      file
    );
    host.appendChild(heading);
    var grid = node("div", "party-collection");
    list.forEach(function(p){
      var c = card(p, true), a = node("div", "party-card-actions");
      append(
        a,
        button(t("party.edit"), function(){ start(p, p.id); }, "small", "edit"),
        button(t("party.camp.short"), function(){ campaign(p); }, "small accent", "flag"),
        button(t("party.compass"), function(){ showCompass(p); }, "small", "compass"),
        button(t("party.share"), function(){ share(p); }, "small", "share"),
        button(
          t("party.duplicate"),
          function(){
            var dup = M.normalize(p);
            dup.name = dup.name.slice(0, 50) + " · " + t("party.copy");
            if(M.save(dup, true)) renderList();
            else toast("party.limit", true);

          },
          "small",
          "copy"
        ),
        button(t("party.delete"), function(){ remove(p); }, "small danger", "trash")
      );
      c.appendChild(a);
      grid.appendChild(c);
    });
    if(!list.length){
      var empty = node("div", "party-empty");
      append(
        empty,
        append(node("span", "party-empty-mark"), icon("spark", 30)),
        node("h3", "", t("party.empty")),
        node("p", "", t("party.empty.hint"))
      );
      grid.appendChild(empty);

    }
    host.appendChild(grid);
    if(list.length){
      var promo = node("section", "party-promo");
      append(
        promo,
        append(
          node("div"),
          node("div", "party-eyebrow", t("party.camp.kicker")),
          node("h3", "", t("party.camp.promo.h")),
          node("p", "", t("party.camp.promo.p"))
        ),
        button(t("party.camp.go"), function(){ campaign(list[0]); }, "primary", "flag")
      );
      host.appendChild(promo);

    }
    host.appendChild(startSection());
    if(location.hash !== "#/party") history.replaceState(null, "", "#/party");
  }
  /* Гостевой просмотр партии по ссылке с кнопкой сохранения. */
  function renderGuest(code){
    var p = M.decode(code); if(!p){ renderList(); host.prepend(node("p", "party-warning", t("party.badLink"))); return; }
    guest = p;
    closeSheet();
    host.replaceChildren();
    var wrap = node("div", "party-guest");
    append(wrap, node("div", "party-eyebrow", t("party.guest")), card(p), mini(p, false));
    var a = node("div", "party-actions party-guest-actions");
    append(
      a,
      button(
        t("party.saveGuest"),
        function(){
          if(M.save(p, true)){
            toast("party.saved");
            routeTo("#/party");

          }else toast(M.error() === "limit" ? "party.limit" : "party.storage", true);

        },
        "primary"
      ),
      button(t("party.json"), function(){ downloadJSON(p); }, "", "grid"),
      button(t("party.close"), function(){ routeTo("#/party"); }, "ghost", "back")
    );
    wrap.appendChild(a);
    host.appendChild(wrap);
  }
  /* ---------- нижний лист (реальные партии) ---------- */
  function closeSheet(){
    if(!sheet) return; var s = sheet; sheet = null; document.documentElement.classList.remove("party-sheet-open");
    document.removeEventListener("keydown", s.key, true); s.scrim.classList.remove("open");
    setTimeout(function(){ s.scrim.remove(); }, 260); if(s.opener && s.opener.focus) s.opener.focus({ preventScroll:true });
  }
  /* Открывает нижнюю шторку и заполняет её содержимым по запросу. */
  function openSheet(title, fillBody){
    closeSheet();
    var scrim = node("div", "party-scrim"), panel = node("div", "party-sheet"), opener = document.activeElement;
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-label", title);
    var head = node("div", "party-sheet-head"), x = button("", closeSheet, "party-sheet-x", "close"); x.setAttribute("aria-label", t("party.sheet.close"));
    append(head, node("span", "party-sheet-grab"), node("h3", "", title), x);
    var body = node("div", "party-sheet-body"); append(panel, head, body); scrim.appendChild(panel); fillBody(body, closeSheet);
    scrim.addEventListener("click", function(e){ if(e.target === scrim) closeSheet(); });
    /* Клавиатура в шторке: Escape закрывает, Tab не уходит за её пределы. */
    function key(e){
      if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); closeSheet(); return; }
      if(e.key !== "Tab") return;
      var f = panel.querySelectorAll("button:not(:disabled)"); if(!f.length) return; var first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault();
        last.focus();

      } else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", key, true); sheet = { scrim:scrim, key:key, opener:opener };
    document.body.appendChild(scrim); document.documentElement.classList.add("party-sheet-open");
    requestAnimationFrame(function(){ scrim.classList.add("open"); var f = panel.querySelector(".party-real") || x; f.focus({ preventScroll:true }); });
  }
  /* Переход в мастер или на экран выборов из середины длинной страницы
     (плитка шаблона, кнопка «Кампания») оставлял прокрутку прежней, и
     человек видел подвал вместо первого шага. При смене вида раздел
     прокручивается к началу. */
  var lastView = null;
  /* Показывает один из верхних экранов раздела и прячет остальные. */
  function showTop(view){
    if(view === lastView) return;
    lastView = view;
    if(view === "list") return;
    var top = host.getBoundingClientRect().top + window.scrollY - 12;
    if(Math.abs(window.scrollY - top) > 4) window.scrollTo({ top:Math.max(0, top), behavior:"instant" });
  }
  /* Разбирает хеш адреса и выбирает экран раздела. */
  function route(){
    if(!host || PC.nav.current() !== "party"){ closeSheet(); lastView = null; return; }
    var h = location.hash;
    showTop(/^#\/party\/election/.test(h) ? "election" : /^#\/party\/(new|edit\/)/.test(h) ? "wizard" : /^#\/party\/view\//.test(h) ? "guest" : "list");
    var hash = location.hash, match = /^#\/party\/view\/(.*)$/.exec(hash);
    if(match){ renderGuest(match[1]); return; }
    match = /^#\/party\/election(?:\/(u[1-6]))?$/.exec(hash);
    if(match){
      closeSheet(); shown = 0; if(match[1]) campaignFor = match[1];
      if(PC.partyCampaign) PC.partyCampaign.render(host, campaignFor); else renderList();
      return;
    }
    match = /^#\/party\/edit\/(u[1-6])$/.exec(hash);
    if(match){
      if(editId !== match[1]){
        var p = M.list().find(function(x){ return x.id === match[1]; });
        if(!p){ renderList(); return; }
        var savedD=PC.store.getJSON(M.DRAFT,null),resume=savedD&&savedD.v===1&&savedD.editId===p.id&&M.valid(savedD.party);
        draft=M.normalize(resume?savedD.party:p);
        step=resume?Math.max(1,Math.min(6,savedD.step||1)):1;
        editId=p.id;
        fresh=false;
        shown = 0;

      }
      renderWizard(); return;
    }
    if(hash === "#/party/new"){
      if(!draft || editId){
        var saved = PC.store.getJSON(M.DRAFT, null);
        draft = M.normalize(saved && saved.party);
        step = saved && saved.step >= 1 && saved.step <= 6 ? saved.step : 1;
        fresh = true;
        editId = null;
        shown = 0;

      }
      renderWizard(); return;
    }
    renderList();
  }
  /* Пункты партий в боковой панели. */
  function renderSidebar(p){
    var target = document.getElementById("sideBody"); if(!target) return;
    target.replaceChildren(card(p));
    var a = node("div", "party-actions");
    append(
      a,
      button(t("party.edit"), function(){ start(p, p.id); }, "", "edit"),
      button(t("party.share"), function(){ share(p); }, "", "share"),
      button(t("party.png"), function(){ exportCard(p, "png"); }, "", "grid")
    );
    target.appendChild(a);
    var radar = node("div"); target.appendChild(radar); if(PC.radar) PC.radar.render(radar, [{ label:p.short, color:p.color, values:p.sub }]);
    if(p.seats > 0) target.appendChild(node("p", "party-meta", t("party.seats") + ": " + p.seats));
  }
  /* Рисует партии пользователя поверх компаса. */
  function drawOnCompass(){
    var svg = document.getElementById("svg"); if(!svg || document.documentElement.dataset.myParties === "off") return;
    var old = svg.querySelector(".my-parties"); if(old) old.remove();
    var layer = PC.utils.el("g", { "class":"my-parties" }); svg.appendChild(layer);
    M.list().forEach(function(p){
      var c = PC.geom.px(p.x, p.y), el = PC.utils.el;
      if(p.declared&&PC.compass.claimsOn()){
        var d=PC.geom.px(p.declared.x,p.declared.y),dx=d.sx-c.sx,dy=d.sy-c.sy,len=Math.hypot(dx,dy),
          ux=len?dx/len:0,uy=len?dy/len:0,tx=d.sx-ux*10,ty=d.sy-uy*10;
        append(
          layer,
          el("path",{d:"M"+c.sx+" "+c.sy+"L"+tx+" "+ty,stroke:p.color,"stroke-dasharray":"4 3","class":"my-party-declared"}),
          el("path",{d:"M0-7 7 0 0 7-7 0Z",transform:"translate("+d.sx+","+d.sy+")",stroke:p.color,fill:"none","class":"my-party-declared"})
        );
        if(len>26){
          layer.appendChild(el("path",{
            d:"M"+tx+" "+ty+"L"+(tx-ux*7-uy*3)+" "+(ty-uy*7+ux*3)+"L"+(tx-ux*7+uy*3)+" "+(ty-uy*7-ux*3)+"Z",
            fill:p.color,"class":"my-party-declared"
          }));
        }
      }
      var g = el(
        "g",
        {
          "class":"node my-party in",
          "data-id":p.id,
          transform:"translate(" + c.sx + "," + c.sy + ")",
          tabindex:0,
          role:"button",
          "aria-label":p.name + ", X " + PC.utils.fmt(p.x) + ", Y " + PC.utils.fmt(p.y)
        }
      );
      append(
        g,
        el("path", { d:"M0-15 15 0 0 15-15 0Z", fill:p.color, stroke:"var(--bg)", "stroke-width":2 }),
        el("text", { x:20, y:-17, "class":"tag" }, p.tag)
      );
      var mark = emblem(p, 18);
      mark.setAttribute("x", -9);
      mark.setAttribute("y", -9);
      mark.style.color = colorLab(p.color)[3] > .45 ? "#111827" : "#ffffff";
      g.appendChild(mark);
      function open(){ PC.select(p.id); }
      g.addEventListener("click", open);
      g.addEventListener("keydown", function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } });
      layer.appendChild(g);
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
  /* Сбрасывает локальные данные раздела: черновик и гостевой режим. */
  function clearLocal(){
    draft=null;
    editId=null;
    fresh=true;
    guest=null;
    step=1;
    shown=0;
    closeSheet();
    PC.store.remove(M.DRAFT);
    if(PC.nav.current()==="party"){history.replaceState(null,"","#/party");renderList();}
  }
  PC.partyBuilder = {
    init:init, card:card, emblem:emblem, start:start, share:share, renderSidebar:renderSidebar, drawOnCompass:drawOnCompass,
    refresh:route, clearLocal:clearLocal, isOwn:isOwn, guest:function(){ return guest; }, colorLab:colorLab,
    ui:{
      node:node, append:append, button:button, icon:icon, badge:badge, chip:chip, ink:ink, emblem:emblem,
      card:card, group:group, toast:toast, routeTo:routeTo, renderList:renderList
    } };
})(window.PC = window.PC || {});
