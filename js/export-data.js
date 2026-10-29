/* ============ Экспорт: наборы данных и запись файлов ============
   Вынесено из js/export.js в 5.0. Здесь таблицы CSV и полный JSON —
   всё, что собирается из данных проекта без отрисовки, — и общие
   служебные функции: имя файла, скачивание, уведомление. Картинки
   компаса и меню экспорта остались в js/export.js.

   CSV пишется с BOM и точкой с запятой в качестве разделителя: русский
   Excel открывает такой файл сразу и не ломает кириллицу, а запятая
   внутри него встречается в названиях партий и в десятичных дробях.
   Кому нужен «настоящий» CSV с запятой — есть JSON, он без компромиссов. ============ */
(function(PC){
  "use strict";
  var U = PC.utils;
  var t = PC.t, L = PC.L;

  var SEP = ";";

  /* ---------- служебное ---------- */
  function stamp(){
    var d = new Date(), p = function(n){ return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  /* Короткое имя созыва для имени файла. */
  function convSlug(){
    var c = PC.convocationInfo();
    return "sozyv-" + c.id;
  }
  /* Имя файла с датой и расширением. */
  function fileName(kind, ext){
    return "politcompass-" + kind + "-" + stamp() + "." + ext;
  }

  /* Скачивание Blob через временную ссылку. */
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
  /* Превращает строки в CSV с экранированием кавычек. */
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

  /* Заявленная и реальная позиция в одной строке: столбцы идут парами,
     чтобы разрыв можно было посчитать в таблице самому, а готовое число
     стоит рядом — для тех, кому считать не нужно. */
  function claimsCSV(){
    var rows = [[t("csv.id"), t("csv.party"), t("csv.declaredX"), t("csv.declaredY"),
                 t("csv.x"), t("csv.y"), t("csv.gap"), t("csv.claimNote")]];
    PC.PARTIES.forEach(function(p){
      var d = p.declared;
      if(!d) return;
      rows.push([p.id, L(p, "name"), num(d.x.toFixed(1)), num(d.y.toFixed(1)),
                 num(p.x.toFixed(1)), num(p.y.toFixed(1)),
                 num(Math.hypot(p.x - d.x, p.y - d.y).toFixed(1)), L(d, "note")]);
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

  /* Полный набор данных в JSON для экспорта. */
  function datasetJSON(){
    var res = PC.quiz && PC.quiz.result();
    var data = {
      source: "Интерактивный политический компас партий РФ",
      url: location.origin + location.pathname,
      exported: new Date().toISOString(),
      note: "Координаты, реальные и заявленные, — экспертная оценка, " +
        "а не результат измерения. " +
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
        if(p.declared){
          out.declared = { x:p.declared.x, y:p.declared.y, note:L(p.declared, "note") };
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
        version: res.mode || "full",
        statements: res.total || null,
        subAxes: PC.quiz.subScoreOf(res.answers || {}, PC.quiz.questionsFor(res.mode)),
        permalink: PC.quiz.shareURL(res.answers || {}, res.mode),
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
    var answers = res.answers || {};
    var sub = PC.quiz.subScoreOf(answers, PC.quiz.questionsFor(res.mode));
    var rows = [[t("csv.metric"), t("csv.value")],
                [t("csv.x"), num(res.x.toFixed(2))],
                [t("csv.y"), num(res.y.toFixed(2))],
                [t("csv.quadrant"), PC.quiz.quadrant(res.x, res.y)],
                [t("csv.version"), t("quiz.mode." + (res.mode || "full") + ".n")],
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

  PC.exportData = {
    stamp:stamp, convSlug:convSlug, fileName:fileName, download:download,
    downloadText:downloadText, note:note, cell:cell, toCSV:toCSV, num:num, partiesCSV:partiesCSV,
    seatsCSV:seatsCSV, claimsCSV:claimsCSV, subaxesCSV:subaxesCSV, votesCSV:votesCSV, datasetJSON:datasetJSON,
    quizCSV:quizCSV, convsAsc:convsAsc
  };
})(window.PC = window.PC || {});
