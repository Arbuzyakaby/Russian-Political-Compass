/* ============ ЭКСПОРТ ДАННЫХ ============

   Всё считается в браузере: сервера у проекта нет, наружу ничего
   не уходит. Файл собирается в память, отдаётся через ссылку с
   атрибутом download и тут же освобождается.

   CSV пишется с BOM и точкой с запятой в качестве разделителя: русский
   Excel открывает такой файл сразу и не ломает кириллицу, а запятая
   внутри него встречается в названиях партий и в десятичных дробях.
   Кому нужен «настоящий» CSV с запятой — есть JSON, он без компромиссов.

   Картинка компаса собирается из живого SVG: узел клонируется вместе
   с текущим созывом, фильтром и слоем траекторий, а переменные темы
   разворачиваются в конкретные цвета — иначе отдельный файл не знал бы,
   чему равен var(--tag). ============ */
(function(PC){
  "use strict";
  var U = PC.utils;
  var t = PC.t, L = PC.L;

  var SEP = ";";
  var SIZE = PC.geom.SIZE;

  /* ---------- служебное ---------- */
  function stamp(){
    var d = new Date(), p = function(n){ return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function convSlug(){
    var c = PC.convocationInfo();
    return "sozyv-" + c.id;
  }
  function fileName(kind, ext){
    return "politcompass-" + kind + "-" + stamp() + "." + ext;
  }

  function download(blob, name){
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* Safari успевает начать загрузку не мгновенно — освобождаем ссылку
       следующим тиком, а не сразу после click() */
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }
  /* Пустой набор данных не сохраняем: пустой файл в загрузках выглядит
     как молчаливая поломка, а не как «нечего выгружать». */
  function downloadText(text, name, mime){
    if(text == null){ note(t("ex.failed"), true); return; }
    download(new Blob([text], { type:mime + ";charset=utf-8" }), name);
    note(t("ex.saved", { name:name }));
  }

  function note(text, bad){
    if(PC.ui && PC.ui.toast) PC.ui.toast(text, bad);
  }

  /* Кавычки удваиваются, поле берётся в кавычки, если внутри есть
     разделитель, кавычка или перенос строки. */
  function cell(v){
    if(v === null || v === undefined) return "";
    var s = String(v);
    if(s.indexOf(SEP) === -1 && s.indexOf('"') === -1 && !/[\r\n]/.test(s)) return s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function toCSV(rows){
    return "﻿" + rows.map(function(r){ return r.map(cell).join(SEP); }).join("\r\n") + "\r\n";
  }
  /* дробь с запятой — так её понимает русская локаль Excel */
  function num(v){ return String(v).replace(".", ","); }

  /* ---------- наборы данных ---------- */
  var convsAsc = function(){ return PC.convsAsc(); };

  function partiesCSV(){
    var convs = convsAsc();
    var head = [t("csv.id"), t("csv.party"), t("csv.short"), t("csv.ideology"), t("csv.leader"),
                t("csv.x"), t("csv.y")];
    convs.forEach(function(c){ head.push(t("csv.seatsIn", { conv:L(c, "label") })); });
    var rows = [head];
    PC.PARTIES.forEach(function(p){
      var row = [p.id, L(p, "name"), L(p, "short"), L(p, "ideology"), L(p, "leader"),
                 num(p.x.toFixed(1)), num(p.y.toFixed(1))];
      convs.forEach(function(c){
        var s = PC.seatsAt(p, c.id);
        row.push(s === null ? "—" : s);
      });
      rows.push(row);
    });
    return toCSV(rows);
  }

  /* «Длинная» таблица: одна строка — партия в созыве. Для сводных таблиц
     и графиков это удобнее широкой матрицы. */
  function seatsCSV(){
    var rows = [[t("csv.conv"), t("csv.years"), t("csv.id"), t("csv.party"),
                 t("csv.seats"), t("csv.share")]];
    convsAsc().forEach(function(c){
      PC.PARTIES.forEach(function(p){
        var s = PC.seatsAt(p, c.id);
        if(s === null) return;
        rows.push([L(c, "label"), c.years, p.id, L(p, "name"), s,
                   num((s / PC.TOTAL_SEATS * 100).toFixed(2))]);
      });
    });
    return toCSV(rows);
  }

  function trajectoriesCSV(){
    var rows = [[t("csv.id"), t("csv.party"), t("csv.year"), t("csv.x"), t("csv.y"), t("csv.changed")]];
    PC.PARTIES.forEach(function(p){
      if(!p.history) return;
      p.history.forEach(function(h){
        rows.push([p.id, L(p, "name"), h.year, num(h.x.toFixed(1)), num(h.y.toFixed(1)), L(h, "note")]);
      });
    });
    return toCSV(rows);
  }

  /* «Длинная» таблица под-осей: строка на пару «партия × шкала». Широкая
     матрица здесь читалась бы хуже — шесть колонок с длинными русскими
     заголовками не помещаются в экран сводной таблицы. */
  function subaxesCSV(){
    var rows = [[t("csv.id"), t("csv.party"), t("csv.subaxis"), t("csv.score")]];
    PC.PARTIES.forEach(function(p){
      if(!p.sub) return;
      PC.SUBAXES.forEach(function(ax){
        rows.push([p.id, L(p, "name"), t("sub." + ax.id), num(p.sub[ax.id].toFixed(1))]);
      });
    });
    return toCSV(rows);
  }

  function votesCSV(){
    var parties = PC.PARTIES;
    var head = [t("csv.date"), t("csv.conv"), t("csv.bill")];
    parties.forEach(function(p){ head.push(L(p, "short")); });
    var rows = [head];
    PC.VOTES.forEach(function(v){
      var conv = PC.CONVOCATIONS.filter(function(c){ return c.id === v.conv; })[0];
      var row = [v.date, conv ? L(conv, "label") : v.conv, L(v, "title")];
      parties.forEach(function(p){
        var st = PC.voteStance(v, p);
        var meta = PC.votes && PC.votes.STANCE[st];
        row.push(meta ? t(meta.key) : st);
      });
      rows.push(row);
    });
    return toCSV(rows);
  }

  function datasetJSON(){
    var res = PC.quiz && PC.quiz.result();
    var data = {
      source: "Интерактивный политический компас партий РФ",
      url: location.origin + location.pathname,
      exported: new Date().toISOString(),
      note: "Координаты и траектории — экспертная оценка, а не результат измерения. " +
            "Оси: X — экономика (−10 плановая … +10 рыночная), " +
            "Y — отношение к власти государства (−10 свободы … +10 этатизм).",
      totalSeats: PC.TOTAL_SEATS,
      convocations: PC.CONVOCATIONS.map(function(c){
        return { id:c.id, label:c.label, years:c.years };
      }),
      subAxes: PC.SUBAXES.map(function(ax){
        return { id:ax.id, axis:ax.axis, name:t("sub." + ax.id), about:t("sub." + ax.id + ".d") };
      }),
      votes: PC.VOTES.map(function(v){
        var stances = {};
        PC.PARTIES.forEach(function(p){
          var st = PC.voteStance(v, p);
          if(st !== "absent") stances[p.id] = st;
        });
        return { id:v.id, date:v.date, convocation:v.conv, topic:v.topic, axis:v.axis,
                 title:L(v, "title"), summary:L(v, "summary"), tally:L(v, "tally"),
                 why:L(v, "why"), stances:stances };
      }),
      parties: PC.PARTIES.map(function(p){
        var seats = {};
        convsAsc().forEach(function(c){
          var s = PC.seatsAt(p, c.id);
          if(s !== null) seats[c.id] = s;
        });
        var out = {
          id:p.id, name:L(p, "name"), short:L(p, "short"), ideology:L(p, "ideology"),
          leader:L(p, "leader"), color:p.color, x:p.x, y:p.y, seats:seats,
          subAxes:p.sub, theses:L(p, "theses"), why:L(p, "why")
        };
        if(p.history){
          out.history = p.history.map(function(h){
            return { year:h.year, x:h.x, y:h.y, note:L(h, "note") };
          });
        }
        return out;
      })
    };
    if(res){
      data.quizResult = {
        x: Number(res.x.toFixed(2)),
        y: Number(res.y.toFixed(2)),
        quadrant: PC.quiz.quadrant(res.x, res.y),
        answered: res.answered,
        takenAt: res.ts ? new Date(res.ts).toISOString() : null,
        version: res.mode === "short" ? "short" : "full",
        statements: res.total || null,
        subAxes: PC.quiz.subScoreOf(PC.store.getJSON("pc-quiz-answers", {}) || {}),
        permalink: PC.quiz.shareURL(PC.store.getJSON("pc-quiz-answers", {}) || {}, res.mode),
        ranking: PC.quiz.ranking(res).map(function(r){
          return { id:r.p.id, name:L(r.p, "name"), match:r.match, distance:Number(r.d.toFixed(2)) };
        })
      };
    }
    return JSON.stringify(data, null, 2);
  }

  function quizCSV(){
    var res = PC.quiz && PC.quiz.result();
    if(!res) return null;
    var answers = PC.store.getJSON("pc-quiz-answers", {}) || {};
    var sub = PC.quiz.subScoreOf(answers);
    var rows = [[t("csv.metric"), t("csv.value")],
                [t("csv.x"), num(res.x.toFixed(2))],
                [t("csv.y"), num(res.y.toFixed(2))],
                [t("csv.quadrant"), PC.quiz.quadrant(res.x, res.y)],
                [t("csv.version"), t(res.mode === "short" ? "quiz.mode.short.n" : "quiz.mode.full.n")],
                [t("csv.answered"), res.answered],
                []];
    rows.push([t("csv.subaxis"), t("csv.score")]);
    PC.SUBAXES.forEach(function(ax){
      rows.push([t("sub." + ax.id), num(sub[ax.id].toFixed(2))]);
    });
    rows.push([]);
    rows.push([t("csv.party"), t("csv.match"), t("csv.distance")]);
    PC.quiz.ranking(res).forEach(function(r){
      rows.push([L(r.p, "name"), r.match, num(r.d.toFixed(2))]);
    });
    return toCSV(rows);
  }

  /* ---------- картинка компаса ---------- */
  /* Значения переменных темы на момент экспорта: отдельный файл не видит
     ни tokens.css, ни атрибута data-theme на <html>. */
  function v(name){
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  }

  function exportCSS(){
    return [
      "svg{font-family:'Manrope','Inter','Segoe UI',system-ui,sans-serif;}",
      ".quad{opacity:" + (v("quad-op") || 1) + ";}",
      ".grid-minor{stroke:" + v("line-minor") + ";stroke-width:1;}",
      ".grid-major{stroke:" + v("line-major") + ";stroke-width:1;}",
      ".axis{stroke:" + v("line-axis") + ";stroke-width:1.4;}",
      ".frame{fill:none;stroke:" + v("line-frame") + ";stroke-width:1.4;}",
      ".tick{font-size:9px;fill:" + v("tick") + ";}",
      ".axis-cap{font-size:11px;font-weight:700;letter-spacing:.11em;fill:" + v("cap") + ";}",
      ".quad-cap{font-size:9.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;fill:" + v("quad-cap") + ";}",
      ".origin{fill:" + v("cap") + ";opacity:.45;}",
      ".node{opacity:1;}",
      ".node .dot{stroke:" + v("dot-stroke") + ";stroke-width:1.8;}",
      ".node .tag{font-size:10.5px;font-weight:650;fill:" + v("tag") +
        ";paint-order:stroke;stroke:" + v("tag-halo") + ";stroke-width:3.4px;stroke-linejoin:round;}",
      ".node .seat{font-size:8px;font-weight:600;fill:" + v("muted") +
        ";paint-order:stroke;stroke:" + v("tag-halo") + ";stroke-width:3px;stroke-linejoin:round;}",
      ".node.you .you-mark{fill:" + v("accent") + ";stroke:" + v("tag-halo") + ";stroke-width:1.6;}",
      ".node.you .you-halo{fill:" + v("accent") + ";opacity:.14;}",
      ".node.you .tag{fill:" + v("accent") + ";}",
      ".trails{opacity:1;}",
      ".trail-line{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;" +
        "stroke-dasharray:7 5;opacity:.62;}",
      ".trail-dot{opacity:.7;}",
      ".trail-year{font-size:8.5px;font-weight:650;fill:" + v("muted") +
        ";paint-order:stroke;stroke:" + v("tag-halo") + ";stroke-width:3px;stroke-linejoin:round;}",
      /* перекрестие и пульсация — состояния наведения, в файле им не место */
      ".cross,.node .pulse,.node .ring,.node .seat.empty{display:none;}",
      ".node.muted,.trail.muted{display:none;}"
    ].join("\n");
  }

  function compassSVG(){
    var live = document.getElementById("svg");
    if(!live) return null;
    var clone = live.cloneNode(true);
    clone.removeAttribute("style");
    clone.removeAttribute("class");
    clone.setAttribute("xmlns", PC.geom.NS);
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clone.setAttribute("width", SIZE);
    clone.setAttribute("height", SIZE);
    /* слой траекторий в файле показываем только если он включён на экране */
    if(!PC.compass.trailsOn()){
      var t = clone.querySelector(".trails");
      if(t) t.remove();
    }
    /* фон: без него прозрачный PNG в тёмной теме выглядит пустым листом */
    var bg = document.createElementNS(PC.geom.NS, "rect");
    bg.setAttribute("x", 0); bg.setAttribute("y", 0);
    bg.setAttribute("width", SIZE); bg.setAttribute("height", SIZE);
    bg.setAttribute("fill", v("bg") || "#06080e");
    clone.insertBefore(bg, clone.firstChild);

    var style = document.createElementNS(PC.geom.NS, "style");
    style.textContent = exportCSS();
    clone.insertBefore(style, clone.firstChild);

    var head = '<?xml version="1.0" encoding="UTF-8"?>\n';
    return head + new XMLSerializer().serializeToString(clone);
  }

  function compassPNG(scale, done){
    var svgText = compassSVG();
    if(!svgText){ note(t("ex.noCompass"), true); if(done) done(); return; }
    var img = new Image();
    img.onload = function(){
      var px = SIZE * scale;
      var canvas = document.createElement("canvas");
      canvas.width = px; canvas.height = px;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = v("bg") || "#06080e";
      ctx.fillRect(0, 0, px, px);
      ctx.drawImage(img, 0, 0, px, px);
      canvas.toBlob(function(blob){
        if(blob){
          var name = fileName("compas-" + convSlug(), "png");
          download(blob, name);
          note(t("ex.saved", { name:name }));
        }else note(t("ex.noImage"), true);
        if(done) done();
      }, "image/png");
    };
    img.onerror = function(){ note(t("ex.noImage"), true); if(done) done(); };
    /* data: вместо blob: — так холст гарантированно не помечается tainted */
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  }

  /* ---------- меню ---------- */
  var ITEMS = [
    { id:"png",   label:"ex.png",   hint:"ex.png.h",
      run:function(){ compassPNG(2); } },
    { id:"svg",   label:"ex.svg",   hint:"ex.svg.h",
      run:function(){ downloadText(compassSVG(), fileName("compas-" + convSlug(), "svg"), "image/svg+xml"); } },
    { id:"csv",   label:"ex.csv",   hint:"ex.csv.h",
      run:function(){ downloadText(partiesCSV(), fileName("partii", "csv"), "text/csv"); } },
    { id:"seats", label:"ex.seats", hint:"ex.seats.h",
      run:function(){ downloadText(seatsCSV(), fileName("mandaty", "csv"), "text/csv"); } },
    { id:"traj",  label:"ex.traj",  hint:"ex.traj.h",
      run:function(){ downloadText(trajectoriesCSV(), fileName("traektorii", "csv"), "text/csv"); } },
    { id:"sub",   label:"ex.sub",   hint:"ex.sub.h",
      run:function(){ downloadText(subaxesCSV(), fileName("pod-osi", "csv"), "text/csv"); } },
    { id:"votes", label:"ex.votes", hint:"ex.votes.h",
      run:function(){ downloadText(votesCSV(), fileName("golosovaniya", "csv"), "text/csv"); } },
    { id:"json",  label:"ex.json",  hint:"ex.json.h",
      run:function(){ downloadText(datasetJSON(), fileName("dannye", "json"), "application/json"); } },
    { id:"quiz",  label:"ex.quiz",  hint:"ex.quiz.h",
      when:function(){ return !!(PC.quiz && PC.quiz.result()); },
      run:function(){ downloadText(quizCSV(), fileName("moy-rezultat", "csv"), "text/csv"); } }
  ];

  var wrap, btn, menu;

  function buildMenu(){
    menu.innerHTML = ITEMS.filter(function(it){ return !it.when || it.when(); })
      .map(function(it){
        return '<button type="button" class="export-item" role="menuitem" data-id="' + it.id + '">' +
          '<span class="ei-label">' + U.esc(t(it.label)) + '</span>' +
          '<span class="ei-hint">' + U.esc(t(it.hint)) + '</span></button>';
      }).join("");
    menu.querySelectorAll(".export-item").forEach(function(b){
      b.addEventListener("click", function(){
        var item = ITEMS.filter(function(it){ return it.id === b.dataset.id; })[0];
        close();
        if(item) item.run();
      });
    });
  }

  function open(){
    buildMenu();                       /* состав пунктов зависит от того, пройден ли тест */
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    document.addEventListener("click", onOutside, true);
    document.addEventListener("keydown", onEsc);
  }
  function close(){
    if(menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onOutside, true);
    document.removeEventListener("keydown", onEsc);
  }
  function onOutside(e){ if(!wrap.contains(e.target)) close(); }

  /* Клавиатура в меню: Escape закрывает и возвращает фокус на кнопку,
     стрелки ходят по пунктам по кругу, Home/End — к краям списка.
     Это ожидаемое поведение для role="menu", без него список пунктов
     обходится только Tab и уводит фокус за пределы меню. */
  function onEsc(e){
    if(e.key === "Escape"){ e.stopPropagation(); close(); btn.focus(); return; }
    var items = Array.prototype.slice.call(menu.querySelectorAll(".export-item"));
    if(!items.length) return;
    var i = items.indexOf(document.activeElement);
    var to = -1;
    if(e.key === "ArrowDown") to = i < 0 ? 0 : (i + 1) % items.length;
    else if(e.key === "ArrowUp") to = i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length;
    else if(e.key === "Home" && i > -1) to = 0;
    else if(e.key === "End" && i > -1) to = items.length - 1;
    if(to > -1){ e.preventDefault(); items[to].focus(); }
  }

  function init(){
    wrap = document.getElementById("exportWrap");
    btn  = document.getElementById("exportBtn");
    menu = document.getElementById("exportMenu");
    if(!wrap || !btn || !menu) return;
    btn.addEventListener("click", function(){ menu.hidden ? open() : close(); });
    btn.addEventListener("keydown", function(e){
      if(e.key !== "ArrowDown") return;
      e.preventDefault();
      /* обработчик меню вешается на document прямо здесь, в open(), и успел
         бы получить это же нажатие — фокус перескочил бы через первый пункт */
      e.stopPropagation();
      if(menu.hidden) open();
      var first = menu.querySelector(".export-item");
      if(first) first.focus();
    });
  }

  PC.exporter = {
    init:init, download:download,
    compassSVG:compassSVG, compassPNG:compassPNG,
    partiesCSV:partiesCSV, seatsCSV:seatsCSV, trajectoriesCSV:trajectoriesCSV,
    subaxesCSV:subaxesCSV, votesCSV:votesCSV,
    datasetJSON:datasetJSON, quizCSV:quizCSV
  };
})(window.PC = window.PC || {});
