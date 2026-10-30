/* ============ «О проекте» как книга (5.1) ============

   До 5.1 раздел был лентой из тринадцати карточек подряд. Теперь это
   книга: обложка с оглавлением, двенадцать глав и три приложения,
   по одной главе на экран.

   - адреса: #/about — обложка, #/about/<глава> — глава; старые якоря
     #ab-* (ссылки 2.x–5.0) переводятся на соответствующие главы;
   - закладка последней открытой главы — pc-book;
   - оглавление: боковой список на широком экране, нижний лист на
     телефоне; там же поиск по тексту всех глав;
   - полоса прогресса по книге: номер главы плюс прочитанная часть
     текущей;
   - печать главы или всей книги (css/book.css, @media print);
   - живые вставки берут числа из тех же данных, что и компас.

   Тексты — в js/i18n-book.js; здесь только порядок блоков. Префиксы
   блоков: li: — пункт списка, n: — примечание, c: — цитата для
   копирования, sign: — подпись, s: — источник внизу главы, w: — вставка,
   «=» — полный ключ словаря вместо ключа главы. ============ */
(function(PC){
  "use strict";

  var KEY = "pc-book";
  var CHAPTERS = [
    { id:"intro",   body:["1","2","3","li:l1","li:l2","li:l3","4","5"] },
    { id:"axes",    body:["1","w:axismap","2","3","4","w:mini","5","n:n"] },
    { id:"sub",     body:["1","li:l1","li:l2","li:l3","li:l4","li:l5","li:l6","w:subex","2","3"] },
    { id:"method",  body:["1","li:l1","li:l2","li:l3","li:l4","2","3","4"], src:["s1","s2"] },
    { id:"votes",   body:["1","w:votefig","2","3","4"] },
    { id:"quiz",    body:["1","2","3","4","n:n"] },
    { id:"duel",    body:["1","w:duel","2","3","4"] },
    { id:"limits",  body:["1","li:l1","li:l2","li:l3","li:l4","li:l5","2"] },
    { id:"history", body:["1","w:history","2"] },
    { id:"author",  body:["1","2","li:l1","li:l2","li:l3","sign:sign","w:promo"] },
    { id:"tech",    body:["1","w:chain","4","2","3"] },
    { id:"check",   body:["1","w:aquiz"] },
    { id:"glossary", app:true, body:["li:=bk.g.axis","li:=bk.g.sub","li:=bk.g.actual","li:=bk.g.stated","li:=bk.g.conv",
                                     "li:=bk.g.faction","li:=bk.g.seat","li:=bk.g.duel","li:=bk.g.sv","li:=bk.g.match","li:=bk.g.centre"] },
    { id:"cite",    app:true, body:["1","c:c","2"] },
    { id:"faq",     app:true, body:["li:=bk.faq.q1","li:=bk.faq.q2","li:=bk.faq.q3","li:=bk.faq.q4","li:=bk.faq.q5"] }
  ];
  /* старые якоря карточек → главы */
  var ANCHORS = { "ab-axes":"axes", "ab-src":"method", "ab-sub":"sub", "ab-votes":"votes", "ab-quiz90":"quiz",
    "ab-not":"limits", "ab-author":"author", "ab-history":"history", "ab-quiz":"check", "ab-tech":"tech" };

  var root = document.documentElement;
  var host, cover, reader, side, tocList, sheet, sheetList, progressBar, progressText, pager, search, results;
  var sections = {}, current = null, built = false, scrollFrame = 0;

  function t(key, vars){ return PC.t(key, vars); }
  function still(){
    return root.dataset.motion === "off" ||
      !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function el(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text != null) n.textContent = text;
    return n;
  }
  function svgEl(name, attrs){
    var n = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function(k){ n.setAttribute(k, attrs[k]); });
    return n;
  }
  function chapter(id){ return CHAPTERS.filter(function(c){ return c.id === id; })[0] || null; }
  function index(id){ for(var i = 0; i < CHAPTERS.length; i++) if(CHAPTERS[i].id === id) return i; return -1; }
  function main(){ return CHAPTERS.filter(function(c){ return !c.app; }); }
  function label(c){
    if(c.app) return t("bk.app", { n:appLetter(c) });
    return t("bk.ch", { n:main().indexOf(c) + 1 });
  }
  function appLetter(c){
    var i = CHAPTERS.filter(function(x){ return x.app; }).indexOf(c);
    return PC.i18n.isRu() ? "АБВГД".charAt(i) : "ABCDE".charAt(i);
  }
  function num(c){ return c.app ? appLetter(c) : String(main().indexOf(c) + 1); }

  /* ---------- числа из данных ---------- */
  function figures(){
    var years = PC.VOTES.map(function(v){ return +v.date.slice(0, 4); });
    var factions = {};
    PC.VOTES.forEach(function(v){ Object.keys(v.pos || {}).forEach(function(k){ factions[k] = 1; }); });
    var releases = (PC.RELEASES || PC.HISTORY || []).length;
    return {
      parties: PC.PARTIES.length,
      votes: PC.VOTES.length,
      conv: PC.CONVOCATIONS.filter(function(c){ return !c.draft; }).length,
      quiz: PC.QUIZ && PC.QUIZ.QUESTIONS ? PC.QUIZ.QUESTIONS.length : 90,
      sub: PC.SUBAXES.length,
      years: Math.min.apply(null, years) + "–" + Math.max.apply(null, years),
      factions: Object.keys(factions).length,
      releases: releases || "",
      first: PC.i18n.isRu() ? "6 сентября 2026 года" : "6 September 2026",
      version: PC.versionLabel ? PC.versionLabel() : PC.VERSION
    };
  }

  /* ---------- лёгкая разметка строк: **жирный** и [текст](ссылка) ---------- */
  function rich(target, text){
    var re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g, last = 0, m;
    while((m = re.exec(text))){
      if(m.index > last) target.appendChild(document.createTextNode(text.slice(last, m.index)));
      if(m[1] != null){
        target.appendChild(el("b", "", m[1]));
      }else{
        var href = m[3], a = el("a", "", m[2]);
        if(/^ch:/.test(href)){
          a.href = "#/about/" + href.slice(3);
          a.className = "book-xref";
        }else if(/^https:\/\//.test(href)){
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        target.appendChild(a);
      }
      last = re.lastIndex;
    }
    if(last < text.length) target.appendChild(document.createTextNode(text.slice(last)));
    return target;
  }

  function keyOf(c, k){ return k.charAt(0) === "=" ? k.slice(1) : "bk." + c.id + "." + k; }

  /* ---------- живые вставки ---------- */
  function part(sel){
    var store = document.getElementById("bookParts");
    var n = store && store.querySelector(sel);
    return n || null;
  }

  function figure(cls, caption){
    var f = el("figure", "book-fig " + (cls || ""));
    if(caption){
      var cap = el("figcaption", "book-fig-cap", caption);
      f.appendChild(cap);
    }
    return f;
  }

  var WIDGETS = {
    axismap: function(){ var n = part(".axis-map"); if(!n) return null; var f = figure("book-fig--map"); f.prepend(n); return f; },
    history: function(){
      var a = part("#abHistory"), b = part("#abHistorySum");
      if(!a) return null;
      var f = figure("book-fig--history");
      f.append(a);
      if(b) f.append(b);
      return f;
    },
    promo: function(){ return part(".about-promo"); },
    chain: function(){ return part(".chain"); },
    aquiz: function(){ return part("#abQuiz"); },

    mini: function(){
      var f = figure("book-fig--mini", t("bk.live"));
      var svg = svgEl("svg", { viewBox:"-11 -11 22 22", role:"img", "class":"book-mini" });
      svg.setAttribute("aria-label", t("bk.mini.aria", { n:PC.PARTIES.length }));
      for(var g = -10; g <= 10; g += 5){
        svg.appendChild(svgEl("line", { x1:g, y1:-10, x2:g, y2:10, "class":g === 0 ? "bm-axis" : "bm-grid" }));
        svg.appendChild(svgEl("line", { x1:-10, y1:g, x2:10, y2:g, "class":g === 0 ? "bm-axis" : "bm-grid" }));
      }
      svg.appendChild(svgEl("rect", { x:-10, y:-10, width:20, height:20, "class":"bm-frame" }));
      PC.PARTIES.forEach(function(p){
        var r = 0.42 + Math.sqrt(Math.max(p.seats || 0, 0)) / 30;
        var dot = svgEl("circle", { cx:p.x, cy:-p.y, r:r.toFixed(2), "class":"bm-dot" });
        dot.style.fill = p.color;
        var tip = svgEl("title");
        tip.textContent = PC.L(p, "short") + " (" + p.x.toFixed(1) + "; " + p.y.toFixed(1) + ")";
        dot.appendChild(tip);
        svg.appendChild(dot);
      });
      f.prepend(svg);
      var legend = el("ul", "book-mini-legend");
      PC.PARTIES.forEach(function(p){
        var li = el("li");
        var sw = el("i");
        sw.style.background = p.color;
        sw.setAttribute("aria-hidden", "true");
        li.append(sw, el("span", "", PC.L(p, "short")));
        legend.appendChild(li);
      });
      f.insertBefore(legend, f.querySelector("figcaption"));
      return f;
    },

    subex: function(){
      var p = PC.PARTIES[0];
      if(!p || !p.sub) return null;
      var f = figure("book-fig--sub", t("bk.sub.of", { party:PC.L(p, "short") }));
      var list = el("ul", "book-bars");
      PC.SUBAXES.forEach(function(s){
        var v = p.sub[s.id];
        if(typeof v !== "number") return;
        var li = el("li");
        var name = el("span", "bb-name", t("sub." + s.id));
        var track = el("span", "bb-track");
        track.setAttribute("aria-hidden", "true");
        var fill = el("i");
        var left = v < 0 ? 50 + v * 5 : 50;
        fill.style.left = left + "%";
        fill.style.width = Math.abs(v) * 5 + "%";
        fill.style.background = p.color;
        track.appendChild(fill);
        var val = el("b", "bb-val", (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1));
        li.append(name, track, val);
        list.appendChild(li);
      });
      f.prepend(list);
      return f;
    },

    votefig: function(){
      var n = figures();
      var f = figure("book-fig--nums", t("bk.live"));
      var row = el("div", "book-nums");
      [[n.votes, "bk.fig.votes"], [n.years, "bk.fig.years"], [n.factions, "bk.fig.factions"]].forEach(function(x){
        var cell = el("div", "bn");
        cell.append(el("b", "", String(x[0])), el("span", "", t(x[1])));
        row.appendChild(cell);
      });
      f.prepend(row);
      return f;
    },

    duel: function(){
      var a = PC.PARTIES.filter(function(p){ return p.id === "er"; })[0];
      var b = PC.PARTIES.filter(function(p){ return p.id === "kprf"; })[0];
      if(!a || !b) return null;
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      var ag = PC.voteAgreement(a, b);
      var f = figure("book-fig--duel", t("bk.live"));
      var card = el("div", "book-duel");
      var head = el("div", "bd-head");
      [a, b].forEach(function(p, i){
        var s = el("span", "bd-party");
        var dot = el("i");
        dot.style.background = p.color;
        dot.setAttribute("aria-hidden", "true");
        s.append(dot, el("b", "", PC.L(p, "short")));
        head.appendChild(s);
        if(i === 0) head.appendChild(el("span", "bd-vs", "vs"));
      });
      var nums = el("div", "book-nums");
      var c1 = el("div", "bn"); c1.append(el("b", "", d.toFixed(1)), el("span", "", t("bk.duel.dist")));
      var c2 = el("div", "bn"); c2.append(el("b", "", ag.ratio == null ? "—" : Math.round(ag.ratio * 100) + "%"),
        el("span", "", t("bk.duel.agree") + (ag.common ? " · " + ag.same + "/" + ag.common : "")));
      nums.append(c1, c2);
      var go = el("a", "btn small", t("bk.duel.open"));
      go.href = "#/duel/" + a.id + "-" + b.id;
      card.append(head, nums, go);
      f.prepend(card);
      return f;
    }
  };

  /* ---------- сборка главы ---------- */
  function paintChapter(c){
    var sec = sections[c.id];
    sec.replaceChildren();
    var vars = figures();
    var head = el("header", "book-ch-head");
    head.appendChild(el("span", "book-ch-eyebrow", label(c)));
    var h = el("h2", "book-ch-title");
    h.id = "bk-h-" + c.id;
    h.tabIndex = -1;
    var n = el("span", "book-ch-num", num(c));
    n.setAttribute("aria-hidden", "true");
    h.append(n, el("span", "", t("bk." + c.id + ".t")));
    head.appendChild(h);
    head.appendChild(el("p", "book-ch-dek", t("bk." + c.id + ".d")));
    var meta = el("p", "book-ch-meta");
    head.appendChild(meta);
    sec.appendChild(head);

    var body = el("div", "book-body"), list = null, words = 0;
    c.body.forEach(function(raw){
      var m = /^(li|n|c|sign|w|s):(.*)$/.exec(raw);
      var kind = m ? m[1] : "p", k = m ? m[2] : raw;
      if(kind !== "li") list = null;
      if(kind === "w"){
        var w = WIDGETS[k] && WIDGETS[k]();
        if(w){ w.classList.add("book-w"); body.appendChild(w); }
        return;
      }
      var text = t(keyOf(c, k), vars);
      words += text.split(/\s+/).length;
      if(kind === "li"){
        if(!list){ list = el("ul", "book-list"); body.appendChild(list); }
        list.appendChild(rich(el("li"), text));
      }else if(kind === "n"){
        body.appendChild(rich(el("p", "book-note"), text));
      }else if(kind === "c"){
        body.appendChild(el("blockquote", "book-cite", text));
      }else if(kind === "sign"){
        body.appendChild(el("p", "book-sign", text));
      }else{
        body.appendChild(rich(el("p"), text));
      }
    });
    sec.appendChild(body);
    meta.textContent = t("bk.min", { n:Math.max(1, Math.round(words / 180)) });

    if(c.src){
      var foot = el("footer", "book-src");
      foot.appendChild(el("h3", "", t("bk.sources")));
      var ol = el("ol");
      c.src.forEach(function(k){ ol.appendChild(rich(el("li"), t(keyOf(c, k), vars))); });
      foot.appendChild(ol);
      sec.appendChild(foot);
    }

    var tools = el("div", "book-ch-tools");
    var p1 = el("button", "btn small ghost", t("bk.print.ch"));
    p1.type = "button";
    p1.addEventListener("click", function(){ print("chapter"); });
    var p2 = el("button", "btn small ghost", t("bk.print.all"));
    p2.type = "button";
    p2.addEventListener("click", function(){ print("book"); });
    tools.append(p1, p2);
    sec.appendChild(tools);
  }

  /* ---------- оглавление ---------- */
  function tocInto(listEl, onPick){
    listEl.replaceChildren();
    var appsHead = false;
    CHAPTERS.forEach(function(c){
      if(c.app && !appsHead){
        appsHead = true;
        var cap = el("li", "book-toc-cap", t("bk.apps"));
        cap.setAttribute("role", "presentation");
        listEl.appendChild(cap);
      }
      var li = el("li");
      var a = el("a", "book-toc-link");
      a.href = "#/about/" + c.id;
      a.dataset.ch = c.id;
      a.append(el("span", "bt-num", num(c)), el("span", "bt-title", t("bk." + c.id + ".t")));
      if(onPick) a.addEventListener("click", onPick);
      li.appendChild(a);
      listEl.appendChild(li);
    });
  }

  function markToc(){
    [tocList, sheetList].forEach(function(listEl){
      if(!listEl) return;
      listEl.querySelectorAll(".book-toc-link").forEach(function(a){
        var on = a.dataset.ch === current;
        a.classList.toggle("is-current", on);
        if(on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
    });
  }

  /* ---------- нижний лист оглавления (телефон) ---------- */
  var sheetFocus = null;
  function openSheet(){
    sheetFocus = document.activeElement;
    sheet.hidden = false;
    requestAnimationFrame(function(){ sheet.classList.add("is-open"); });
    document.body.classList.add("book-sheet-open");
    var cur = sheet.querySelector(".is-current") || sheet.querySelector("input");
    if(cur) cur.focus({ preventScroll:true });
  }
  function closeSheet(){
    if(sheet.hidden) return;
    sheet.classList.remove("is-open");
    document.body.classList.remove("book-sheet-open");
    var done = function(){ sheet.hidden = true; if(sheetFocus && sheetFocus.focus) sheetFocus.focus({ preventScroll:true }); };
    if(still()) done(); else setTimeout(done, 240);
  }

  /* ---------- поиск ---------- */
  function norm(s){ return s.toLowerCase().replace(/ё/g, "е"); }
  function runSearch(input, out){
    var q = norm(input.value.trim());
    out.replaceChildren();
    out.hidden = q.length < 2;
    if(out.hidden) return;
    var hits = [];
    CHAPTERS.forEach(function(c){
      var text = sections[c.id].textContent.replace(/\s+/g, " ");
      var at = norm(text).indexOf(q);
      if(at < 0) return;
      var from = Math.max(0, at - 40);
      hits.push({ c:c, before:(from ? "…" : "") + text.slice(from, at), match:text.slice(at, at + q.length),
        after:text.slice(at + q.length, at + q.length + 60) + "…" });
    });
    var head = el("p", "book-hits-n", hits.length ? t("bk.search.n", { n:hits.length }) : t("bk.search.none"));
    head.setAttribute("role", "status");
    out.appendChild(head);
    hits.forEach(function(h){
      var a = el("a", "book-hit");
      a.href = "#/about/" + h.c.id;
      a.appendChild(el("b", "", num(h.c) + " · " + t("bk." + h.c.id + ".t")));
      var snip = el("span");
      snip.append(document.createTextNode(h.before), el("mark", "", h.match), document.createTextNode(h.after));
      a.appendChild(snip);
      a.addEventListener("click", function(){ pending = h.match; closeSheet(); });
      out.appendChild(a);
    });
  }
  var pending = null;
  function flashMatch(c, q){
    var nq = norm(q);
    var blocks = sections[c.id].querySelectorAll("p,li,blockquote");
    for(var i = 0; i < blocks.length; i++){
      if(norm(blocks[i].textContent).indexOf(nq) >= 0){
        blocks[i].classList.add("book-flash");
        blocks[i].scrollIntoView({ block:"center", behavior:still() ? "auto" : "smooth" });
        setTimeout(function(n){ return function(){ n.classList.remove("book-flash"); }; }(blocks[i]), 2200);
        return true;
      }
    }
    return false;
  }

  function searchBox(idSuffix){
    var wrap = el("div", "book-search");
    var lab = el("label", "sr-only", t("bk.search"));
    lab.htmlFor = "bookSearch" + idSuffix;
    var input = el("input");
    input.type = "search";
    input.id = "bookSearch" + idSuffix;
    input.placeholder = t("bk.search.ph");
    input.autocomplete = "off";
    var out = el("div", "book-hits");
    out.hidden = true;
    input.addEventListener("input", function(){ runSearch(input, out); });
    wrap.append(lab, input, out);
    return wrap;
  }

  /* ---------- печать ---------- */
  function print(what){
    root.dataset.bookPrint = what;
    var clear = function(){ delete root.dataset.bookPrint; window.removeEventListener("afterprint", clear); };
    window.addEventListener("afterprint", clear);
    window.print();
    setTimeout(clear, 1500);
  }

  /* ---------- прогресс ---------- */
  function progress(){
    if(!current || !reader || reader.hidden) return;
    var i = index(current), sec = sections[current];
    var r = sec.getBoundingClientRect();
    var span = Math.max(1, r.height - window.innerHeight * 0.6);
    var frac = Math.min(1, Math.max(0, -r.top / span));
    var p = Math.round((i + frac) / CHAPTERS.length * 100);
    progressBar.style.transform = "scaleX(" + (p / 100) + ")";
    progressText.textContent = t("bk.progress", { p:p });
  }

  /* ---------- пагинатор ---------- */
  function paintPager(){
    pager.replaceChildren();
    var i = index(current);
    [[CHAPTERS[i - 1], "prev"], [CHAPTERS[i + 1], "next"]].forEach(function(x){
      var c = x[0];
      if(!c){ pager.appendChild(el("span", "book-pg-gap")); return; }
      var a = el("a", "book-pg book-pg--" + x[1]);
      a.href = "#/about/" + c.id;
      a.rel = x[1];
      a.append(el("small", "", t("bk." + x[1]) + " · " + label(c)), el("b", "", t("bk." + c.id + ".t")));
      pager.appendChild(a);
    });
  }

  /* ---------- открытие ---------- */
  function showCover(){
    current = null;
    reader.hidden = true;
    cover.hidden = false;
    var mark = PC.store.getJSON(KEY, null);
    var resume = document.getElementById("bookResume");
    var c = mark && chapter(mark.ch);
    if(resume){
      resume.hidden = !c || c.id === "intro";
      if(c) resume.textContent = t("bk.resume", { n:num(c) });
      if(c) resume.href = "#/about/" + c.id;
    }
  }

  function open(id, opts){
    var c = chapter(id);
    if(!c){ showCover(); return; }
    build();
    var changed = current !== id;
    current = id;
    cover.hidden = true;
    reader.hidden = false;
    CHAPTERS.forEach(function(x){ sections[x.id].hidden = x.id !== id; });
    PC.store.setJSON(KEY, { ch:id, ts:Date.now() });
    markToc();
    paintPager();
    if(changed && !(opts && opts.keep)){
      var top = host.getBoundingClientRect().top + window.scrollY - 12;
      if(window.scrollY > top) window.scrollTo({ top:Math.max(0, top), behavior:"auto" });
      var h = document.getElementById("bk-h-" + id);
      if(h) h.focus({ preventScroll:true });
    }
    if(pending){ var q = pending; pending = null; setTimeout(function(){ flashMatch(c, q); }, 60); }
    progress();
  }

  function route(){
    var h = (location.hash || "").replace(/^#\/?/, "");
    if(ANCHORS[h]){
      history.replaceState(null, "", "#/about/" + ANCHORS[h]);
      h = "about/" + ANCHORS[h];
    }
    if(!/^about(\/|$)/.test(h)) return;
    var id = h.split("/")[1];
    if(id) open(id); else showCover();
  }

  /* ---------- сборка читалки (один раз) ---------- */
  function build(){
    if(built) return;
    built = true;

    var bar = el("div", "book-progress");
    bar.setAttribute("aria-hidden", "true");
    progressBar = el("i");
    bar.appendChild(progressBar);

    side = el("aside", "book-side");
    side.setAttribute("aria-label", t("bk.toc"));
    var back = el("a", "book-side-cover", "← " + t("bk.cover"));
    back.href = "#/about";
    var sideHead = el("p", "book-side-h", t("bk.toc"));
    tocList = el("ol", "book-toc");
    tocInto(tocList);
    progressText = el("p", "book-side-progress");
    side.append(back, searchBox("Side"), sideHead, tocList, progressText);

    var mainCol = el("div", "book-main");
    var mbar = el("div", "book-mbar");
    var tocBtn = el("button", "book-mbar-btn");
    tocBtn.type = "button";
    tocBtn.setAttribute("aria-haspopup", "dialog");
    tocBtn.append(svgIcon("i-list"), el("span", "", t("bk.toc")));
    tocBtn.addEventListener("click", openSheet);
    mbar.appendChild(tocBtn);

    var pages = el("div", "book-pages");
    CHAPTERS.forEach(function(c){
      var sec = el("article", "book-ch" + (c.app ? " book-ch--app" : ""));
      sec.id = "bk-" + c.id;
      sec.setAttribute("aria-labelledby", "bk-h-" + c.id);
      sec.hidden = true;
      sections[c.id] = sec;
      pages.appendChild(sec);
    });
    CHAPTERS.forEach(paintChapter);
    pager = el("nav", "book-pager");
    pager.setAttribute("aria-label", t("bk.toc"));
    mainCol.append(mbar, pages, pager);

    reader.append(bar, side, mainCol);

    /* нижний лист с оглавлением и поиском */
    sheet = el("div", "book-sheet");
    sheet.hidden = true;
    var panel = el("div", "book-sheet-card");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", t("bk.toc"));
    var grab = el("span", "book-sheet-grab");
    grab.setAttribute("aria-hidden", "true");
    var top = el("div", "book-sheet-top");
    var close = el("button", "book-sheet-x", t("bk.close"));
    close.type = "button";
    close.addEventListener("click", closeSheet);
    top.append(el("b", "", t("bk.toc")), close);
    sheetList = el("ol", "book-toc");
    tocInto(sheetList, closeSheet);
    var cv = el("a", "book-side-cover", "← " + t("bk.cover"));
    cv.href = "#/about";
    cv.addEventListener("click", closeSheet);
    panel.append(grab, top, searchBox("Sheet"), sheetList, cv);
    sheet.appendChild(panel);
    sheet.addEventListener("click", function(e){ if(e.target === sheet) closeSheet(); });
    sheet.addEventListener("keydown", function(e){
      if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); closeSheet(); return; }
      if(e.key !== "Tab") return;
      var f = Array.prototype.filter.call(panel.querySelectorAll("a[href],button,input"), function(n){ return n.offsetParent !== null; });
      if(!f.length) return;
      if(e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length - 1].focus(); }
      else if(!e.shiftKey && document.activeElement === f[f.length - 1]){ e.preventDefault(); f[0].focus(); }
    });
    document.body.appendChild(sheet);

    /* стрелки листают главы, если фокус не в поле ввода */
    reader.addEventListener("keydown", function(e){
      if(e.target.matches && e.target.matches("input,textarea,select")) return;
      if(e.altKey || e.ctrlKey || e.metaKey) return;
      var i = index(current);
      if(e.key === "ArrowRight" && CHAPTERS[i + 1]) location.hash = "#/about/" + CHAPTERS[i + 1].id;
      if(e.key === "ArrowLeft" && CHAPTERS[i - 1]) location.hash = "#/about/" + CHAPTERS[i - 1].id;
    });

    window.addEventListener("scroll", function(){
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(progress);
    }, { passive:true });
  }

  function svgIcon(id){
    var s = svgEl("svg", { "class":"ico", "aria-hidden":"true", focusable:"false" });
    var u = svgEl("use", { href:"#" + id });
    s.appendChild(u);
    return s;
  }

  /* текст для теста «Проверь себя»: заголовок главы по старому якорю */
  function anchorTitle(anchor){
    var id = ANCHORS[anchor] || (chapter(anchor) ? anchor : null);
    return id ? t("bk." + id + ".t") : "";
  }
  function openAnchor(anchor){
    var id = ANCHORS[anchor] || anchor;
    if(!chapter(id)) return false;
    if(PC.nav && PC.nav.current() !== "about") PC.nav.go("about", { silent:true });
    location.hash = "#/about/" + id;
    return true;
  }

  function init(){
    host = document.getElementById("book");
    if(!host) return;
    cover = document.getElementById("bookCover");
    reader = document.getElementById("bookReader");
    /* статическое оглавление написано по-русски: номера приложений (А, Б, В)
       и подписи следуют за языком интерфейса */
    host.querySelectorAll(".book-toc-static [data-ch]").forEach(function(a){
      var c = chapter(a.dataset.ch), n = a.querySelector(".bt-num");
      if(c && n) n.textContent = num(c);
    });
    var start = document.getElementById("bookStart");
    if(start) start.href = "#/about/intro";
    window.addEventListener("hashchange", route);
    if(PC.nav) PC.nav.onChange(function(tab){ if(tab === "about") route(); });
    route();
  }

  PC.book = { init:init, open:open, route:route, CHAPTERS:CHAPTERS, ANCHORS:ANCHORS, figures:figures,
    anchorTitle:anchorTitle, openAnchor:openAnchor, current:function(){ return current; }, KEY:KEY };
})(window.PC = window.PC || {});
