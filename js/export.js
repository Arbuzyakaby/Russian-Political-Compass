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
  function downloadText(text, name, mime){
    download(new Blob([text], { type:mime + ";charset=utf-8" }), name);
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
    var head = ["id", "Партия", "Краткое название", "Идеология", "Лидер",
                "Экономика (X)", "Отношение к государству (Y)"];
    convs.forEach(function(c){ head.push("Мандаты · " + c.label); });
    var rows = [head];
    PC.PARTIES.forEach(function(p){
      var row = [p.id, p.name, p.short, p.ideology, p.leader, num(p.x.toFixed(1)), num(p.y.toFixed(1))];
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
    var rows = [["Созыв", "Годы", "id", "Партия", "Мандаты", "Доля палаты, %"]];
    convsAsc().forEach(function(c){
      PC.PARTIES.forEach(function(p){
        var s = PC.seatsAt(p, c.id);
        if(s === null) return;
        rows.push([c.label, c.years, p.id, p.name, s,
                   num((s / PC.TOTAL_SEATS * 100).toFixed(2))]);
      });
    });
    return toCSV(rows);
  }

  function trajectoriesCSV(){
    var rows = [["id", "Партия", "Год", "Экономика (X)", "Отношение к государству (Y)", "Что изменилось"]];
    PC.PARTIES.forEach(function(p){
      if(!p.history) return;
      p.history.forEach(function(h){
        rows.push([p.id, p.name, h.year, num(h.x.toFixed(1)), num(h.y.toFixed(1)), h.note]);
      });
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
      parties: PC.PARTIES.map(function(p){
        var seats = {};
        convsAsc().forEach(function(c){
          var s = PC.seatsAt(p, c.id);
          if(s !== null) seats[c.id] = s;
        });
        var out = {
          id:p.id, name:p.name, short:p.short, ideology:p.ideology, leader:p.leader,
          color:p.color, x:p.x, y:p.y, seats:seats, theses:p.theses, why:p.why
        };
        if(p.history) out.history = p.history;
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
        ranking: PC.quiz.ranking(res).map(function(r){
          return { id:r.p.id, name:r.p.name, match:r.match, distance:Number(r.d.toFixed(2)) };
        })
      };
    }
    return JSON.stringify(data, null, 2);
  }

  function quizCSV(){
    var res = PC.quiz && PC.quiz.result();
    if(!res) return null;
    var rows = [["Показатель", "Значение"],
                ["Экономика (X)", num(res.x.toFixed(2))],
                ["Отношение к государству (Y)", num(res.y.toFixed(2))],
                ["Квадрант", PC.quiz.quadrant(res.x, res.y)],
                ["Отвечено утверждений", res.answered],
                [], ["Партия", "Совпадение, %", "Расстояние"]];
    PC.quiz.ranking(res).forEach(function(r){
      rows.push([r.p.name, r.match, num(r.d.toFixed(2))]);
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
    if(!svgText) return;
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
        if(blob) download(blob, fileName("compas-" + convSlug(), "png"));
        if(done) done();
      }, "image/png");
    };
    img.onerror = function(){ if(done) done(); };
    /* data: вместо blob: — так холст гарантированно не помечается tainted */
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  }

  /* ---------- меню ---------- */
  var ITEMS = [
    { id:"png",   label:"Компас · PNG",            hint:"картинка 1320×1320, текущий созыв и фильтр",
      run:function(){ compassPNG(2); } },
    { id:"svg",   label:"Компас · SVG",            hint:"вектор, открывается в редакторе",
      run:function(){ downloadText(compassSVG(), fileName("compas-" + convSlug(), "svg"), "image/svg+xml"); } },
    { id:"csv",   label:"Партии · CSV",            hint:"координаты, лидеры и мандаты по всем созывам",
      run:function(){ downloadText(partiesCSV(), fileName("partii", "csv"), "text/csv"); } },
    { id:"seats", label:"Мандаты по созывам · CSV", hint:"длинная таблица: партия × созыв",
      run:function(){ downloadText(seatsCSV(), fileName("mandaty", "csv"), "text/csv"); } },
    { id:"traj",  label:"Траектории · CSV",        hint:"как двигались позиции партий по годам",
      run:function(){ downloadText(trajectoriesCSV(), fileName("traektorii", "csv"), "text/csv"); } },
    { id:"json",  label:"Всё · JSON",              hint:"полный набор данных, включая тезисы и обоснования",
      run:function(){ downloadText(datasetJSON(), fileName("dannye", "json"), "application/json"); } },
    { id:"quiz",  label:"Мой результат · CSV",     hint:"координаты и совпадение с партиями",
      when:function(){ return !!(PC.quiz && PC.quiz.result()); },
      run:function(){ downloadText(quizCSV(), fileName("moy-rezultat", "csv"), "text/csv"); } }
  ];

  var wrap, btn, menu;

  function buildMenu(){
    menu.innerHTML = ITEMS.filter(function(it){ return !it.when || it.when(); })
      .map(function(it){
        return '<button type="button" class="export-item" role="menuitem" data-id="' + it.id + '">' +
          '<span class="ei-label">' + U.esc(it.label) + '</span>' +
          '<span class="ei-hint">' + U.esc(it.hint) + '</span></button>';
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
  function onEsc(e){
    if(e.key === "Escape"){ e.stopPropagation(); close(); btn.focus(); }
  }

  function init(){
    wrap = document.getElementById("exportWrap");
    btn  = document.getElementById("exportBtn");
    menu = document.getElementById("exportMenu");
    if(!wrap || !btn || !menu) return;
    btn.addEventListener("click", function(){ menu.hidden ? open() : close(); });
  }

  PC.exporter = {
    init:init, download:download,
    compassSVG:compassSVG, compassPNG:compassPNG,
    partiesCSV:partiesCSV, seatsCSV:seatsCSV, trajectoriesCSV:trajectoriesCSV,
    datasetJSON:datasetJSON, quizCSV:quizCSV
  };
})(window.PC = window.PC || {});
