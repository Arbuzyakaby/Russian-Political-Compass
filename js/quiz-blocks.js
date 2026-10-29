/* ============ Тест: блоки экрана результата ============
   Вынесено из js/quiz.js в 5.0. Здесь то, что собирает разметку из уже
   посчитанных чисел и ничего не хранит: словесные ярлыки позиции,
   мини-компас, разбор «как ответы сложились в координаты», график
   прохождений, ссылка на результат и рамка профиля по под-осям. Само
   состояние теста — ответы, история, открытый экран — живёт в js/quiz.js. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc, fmt = U.fmt;
  var QC = PC.quizCalc;
  var SCALE = PC.QUIZ.SCALE;
  var MODES = ["long", "full", "short"];
  var t = PC.t, L = PC.L;
  var contributions = QC.contributions, axisBreakdown = QC.axisBreakdown, shareURL = QC.shareURL;
  var REACH = QC.REACH;

  /* ---------- словесные ярлыки позиции ---------- */
  function econWord(x){
    return t(x <= -6 ? "w.econ.farleft" : x <= -2 ? "w.econ.left"
           : x <   2 ? "w.econ.centre"  : x <   6 ? "w.econ.right" : "w.econ.farright");
  }
  function stateWord(y){
    return t(y <= -6 ? "w.state.lib"    : y <= -2 ? "w.state.freedom"
           : y <   2 ? "w.state.centre" : y <   6 ? "w.state.strong" : "w.state.statist");
  }
  /* Название квадранта по координатам. */
  function quadrant(x, y){
    if(x < 0 && y >= 0) return t("q.leftstat");
    if(x >= 0 && y >= 0) return t("q.rightstat");
    if(x < 0) return t("q.leftlib");
    return t("q.rightlib");
  }
  function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
  function modeName(m){ return t("quiz.mode." + (MODES.indexOf(m) > -1 ? m : "full") + ".n"); }

  function scaleLabel(s){ return s.key ? t(s.key) : s.label; }
  function questionText(q){ return L(q, "t"); }

  /* ---------- мини-компас с точкой пользователя ---------- */
  function miniCompass(pt){
    var S = 300, P = 26, C = S / 2, K = (S / 2 - P) / 10;
    function X(v){ return C + v * K; }
    function Y(v){ return C - v * K; }

    var parts = [];
    parts.push('<rect x="' + P + '" y="' + P + '" width="' + (S - 2 * P) + '" height="' + (S - 2 * P) + '" rx="10" class="mc-frame"/>');
    for(var v = -10; v <= 10; v += 5){
      if(v === 0) continue;
      parts.push('<line x1="' + X(v) + '" y1="' + P + '" x2="' + X(v) + '" y2="' + (S - P) + '" class="mc-grid"/>');
      parts.push('<line x1="' + P + '" y1="' + Y(v) + '" x2="' + (S - P) + '" y2="' + Y(v) + '" class="mc-grid"/>');
    }
    parts.push('<line x1="' + P + '" y1="' + C + '" x2="' + (S - P) + '" y2="' + C + '" class="mc-axis"/>');
    parts.push('<line x1="' + C + '" y1="' + P + '" x2="' + C + '" y2="' + (S - P) + '" class="mc-axis"/>');

    /* полюса подписаны прямо на поле: без них мини-компас читается
       как абстрактная россыпь точек */
    parts.push('<text x="' + C + '" y="' + (P - 9) + '" class="mc-cap" text-anchor="middle">' + esc(t("cap.mini.top")) + '</text>');
    parts.push('<text x="' + C + '" y="' + (S - P + 17) + '" class="mc-cap" text-anchor="middle">' + esc(t("cap.mini.bottom")) + '</text>');
    parts.push('<text x="' + (P - 8) + '" y="' + C + '" class="mc-cap" text-anchor="middle" transform="rotate(-90 ' +
      (P - 8) + ' ' + C + ')">' + esc(t("cap.mini.left")) + '</text>');
    parts.push('<text x="' + (S - P + 8) + '" y="' + C + '" class="mc-cap" text-anchor="middle" transform="rotate(90 ' +
      (S - P + 8) + ' ' + C + ')">' + esc(t("cap.mini.right")) + '</text>');

    PC.PARTIES.forEach(function(p){
      parts.push('<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="5" class="mc-party" fill="' +
        esc(p.color) + '"><title>' + esc(L(p, "name")) + '</title></circle>');
    });

    var ux = X(pt.x).toFixed(1), uy = Y(pt.y).toFixed(1);
    parts.push('<line x1="' + C + '" y1="' + uy + '" x2="' + ux + '" y2="' + uy + '" class="mc-lead"/>');
    parts.push('<line x1="' + ux + '" y1="' + C + '" x2="' + ux + '" y2="' + uy + '" class="mc-lead"/>');
    parts.push('<circle cx="' + ux + '" cy="' + uy + '" r="11" class="mc-you-halo"/>');
    parts.push('<circle cx="' + ux + '" cy="' + uy + '" r="6" class="mc-you"/>');
    parts.push('<text x="' + ux + '" y="' + (Number(uy) - 16) + '" class="mc-you-label" text-anchor="middle">' +
      esc(t("node.you")) + '</text>');

    return '<svg class="mini-compass" viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="' +
      esc(t("node.youAria", { x:fmt(pt.x), y:fmt(pt.y) })) + '">' + parts.join("") + '</svg>';
  }

  /* ---------- разбор: как ответы сложились в координаты ---------- */
  function poleName(axis, positive){
    if(axis === "x") return t(positive ? "ch.spec.market" : "ch.spec.planned");
    return t(positive ? "ch.spec.statism" : "ch.spec.liberty");
  }

  function breakdownTable(src, axis, list){
    var b = axisBreakdown(src, axis, list);
    var rows = b.rows.slice().sort(function(a, c){ return Math.abs(c.value) - Math.abs(a.value); });
    return '<div class="bd-axis">' +
      '<h4>' + esc(t(axis === "x" ? "res.break.axisX" : "res.break.axisY")) + '</h4>' +
      '<p class="bd-sum">' + esc(t("res.break.sum", {
        s:(b.sum > 0 ? "+" : "") + b.sum.toFixed(1),
        m:(b.max * REACH).toFixed(1),
        c:fmt(b.coord)
      })) + '</p>' +
      '<table class="data-table bd-table">' +
        '<thead><tr>' +
          '<th scope="col">' + esc(t("res.break.stmt")) + '</th>' +
          '<th scope="col">' + esc(t("res.break.answer")) + '</th>' +
          '<th scope="col">' + esc(t("res.break.weight")) + '</th>' +
          '<th scope="col">' + esc(t("res.break.contrib")) + '</th>' +
        '</tr></thead><tbody>' +
        rows.map(function(c){
          var s = SCALE.filter(function(x){ return x.v === c.answer; })[0];
          var cls = c.value > 0 ? "up" : c.value < 0 ? "down" : "flat";
          return '<tr><th scope="row">' + esc(questionText(c.q)) + "</th>" +
            "<td>" + esc(c.answer === null ? "—" : scaleLabel(s)) + "</td>" +
            "<td>" + c.q.w.toFixed(1) + "</td>" +
            '<td class="' + cls + '">' + (c.value > 0 ? "+" : "") + c.value.toFixed(1) + "</td></tr>";
        }).join("") +
      "</tbody></table></div>";
  }

  /* open — раскрыта ли таблица вкладов (состояние живёт в js/quiz.js) */
  function breakdownBlock(src, list, open){
    var all = contributions(src, list).filter(function(c){ return c.value !== 0; })
      .sort(function(a, b){ return Math.abs(b.value) - Math.abs(a.value); })
      .slice(0, 5);

    return '<section class="qr-block bd-block" data-reveal aria-label="' + esc(t("res.break.h")) + '">' +
      '<h3>' + esc(t("res.break.h")) + '</h3>' +
      '<p class="qr-block-p">' + esc(t("res.break.p")) + '</p>' +
      '<div class="bd-top"><h4>' + esc(t("res.break.top")) + '</h4><ol>' +
        all.map(function(c){
          var pole = poleName(c.q.axis, c.value > 0);
          return "<li><span class=\"bt-q\">" + esc(questionText(c.q)) + "</span>" +
            '<span class="bt-v ' + (c.value > 0 ? "up" : "down") + '">' +
            esc(t("res.break.pull", { pole:pole, v:Math.abs(c.value).toFixed(1) })) + "</span></li>";
        }).join("") +
      "</ol></div>" +
      '<button type="button" class="data-toggle" id="bdToggle" aria-expanded="' + open + '">' +
        esc(open ? t("res.break.hide") : t("res.break.show")) + '</button>' +
      '<div class="data-wrap bd-wrap"' + (open ? "" : " hidden") + '>' +
        breakdownTable(src, "x", list) + breakdownTable(src, "y", list) +
        '<p class="qr-block-p">' + esc(t("res.break.reach", { p:Math.round(REACH * 100) })) + '</p>' +
      '</div>' +
    '</section>';
  }

  /* ---------- история прохождений ---------- */
  /* Две линии на общем поле −10…+10: экономика и отношение к государству
     по номеру прохождения. График намеренно маленький и без осей — он
     отвечает на один вопрос, «куда вы сдвинулись», а точные числа стоят
     подписями рядом. */
  function historyChart(list){
    var W = 460, H = 150, pl = 30, pr = 14, pt = 12, pb = 24;
    var iw = W - pl - pr, ih = H - pt - pb;
    var n = list.length;
    function X(i){ return pl + (n === 1 ? iw / 2 : iw * i / (n - 1)); }
    function Y(v){ return pt + ih - (v + 10) / 20 * ih; }

    function line(key, color){
      var d = list.map(function(e, i){ return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(e[key]).toFixed(1); }).join("");
      var dots = list.map(function(e, i){
        return '<circle class="hc-dot" cx="' + X(i).toFixed(1) + '" cy="' + Y(e[key]).toFixed(1) +
          '" r="3.6" fill="' + color + '"><title>' + esc(fmt(e[key])) + "</title></circle>";
      }).join("");
      return '<path class="hc-line" d="' + d + '" stroke="' + color + '"/>' + dots;
    }

    return '<svg class="hist-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' +
      esc(t("res.hist.aria")) + '">' +
      '<line class="hc-zero" x1="' + pl + '" y1="' + Y(0) + '" x2="' + (W - pr) + '" y2="' + Y(0) + '"/>' +
      '<text class="hc-tick" x="' + (pl - 6) + '" y="' + (Y(10) + 3) + '" text-anchor="end">+10</text>' +
      '<text class="hc-tick" x="' + (pl - 6) + '" y="' + (Y(0) + 3) + '" text-anchor="end">0</text>' +
      '<text class="hc-tick" x="' + (pl - 6) + '" y="' + (Y(-10) + 3) + '" text-anchor="end">−10</text>' +
      line("x", "var(--accent)") + line("y", "var(--accent-2)") +
      list.map(function(e, i){
        var label = i === n - 1 ? t("res.hist.now") : String(i + 1);
        return '<text class="hc-tick" x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' +
          esc(label) + "</text>";
      }).join("") +
    "</svg>";
  }

  /* past — сохранённые прохождения, от старых к новым */
  function historyBlock(past, pt){
    var list = past.slice();
    if(pt && (!list.length || list[list.length - 1].ts !== pt.ts)){
      /* показанный результат может быть ещё не записан (открыт из
         сохранённого прошлого прохождения) — рисуем его как последнюю
         точку, не трогая хранилище */
      var last = list[list.length - 1];
      if(!last || Math.abs(last.x - pt.x) > .05 || Math.abs(last.y - pt.y) > .05){
        list = list.concat([{ x:pt.x, y:pt.y, answered:pt.answered, ts:pt.ts,
                              mode:pt.mode || "full", code:null }]);
      }
    }
    if(list.length < 2){
      return '<section class="qr-block hist-block" data-reveal aria-label="' + esc(t("res.hist.h")) + '">' +
        '<h3>' + esc(t("res.hist.h")) + '</h3>' +
        '<p class="qr-block-p">' + esc(t("res.hist.empty")) + '</p></section>';
    }

    var first = list[0], now = list[list.length - 1];
    function delta(v){ return (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(1); }

    return '<section class="qr-block hist-block" data-reveal aria-label="' + esc(t("res.hist.h")) + '">' +
      '<h3>' + esc(t("res.hist.h")) + '</h3>' +
      '<p class="qr-block-p">' + esc(t("res.hist.p", { n:list.length })) + '</p>' +
      historyChart(list) +
      '<div class="rad-legend">' +
        '<span class="rl"><i style="background:var(--accent)"></i>' + esc(t("res.econ")) + "</span>" +
        '<span class="rl"><i style="background:var(--accent-2)"></i>' + esc(t("res.state")) + "</span>" +
      "</div>" +
      '<p class="hist-note">' + esc(t("res.hist.drift", {
        dx:delta(now.x - first.x), dy:delta(now.y - first.y)
      })) + "</p>" +
      /* Пять прохождений — тоже совпадение с номером версии 1.5.5,
         которое не грех отметить строкой, а не только в чейнджлоге. */
      (list.length === 5 ? '<p class="hist-note hist-five">' + esc(t("res.hist.five")) + '</p>' : "") +
      '<div class="hist-runs">' + list.map(function(e, i){
        var when = e.ts ? new Date(e.ts).toLocaleDateString(PC.i18n.isRu() ? "ru-RU" : "en-GB") : "—";
        var tag = 'class="hrun' + (e.mode === "short" ? " short" : "") + '" data-code="' + esc(e.code || "") + '"';
        return "<" + (e.code ? "button type=\"button\" " + tag : "span " + tag) + ">" +
          '<b>' + (i + 1) + "</b><span>" + esc(when) + "</span>" +
          '<em>' + fmt(e.x) + " / " + fmt(e.y) + "</em>" +
          '<u>' + esc(modeName(e.mode)) + "</u>" +
          "</" + (e.code ? "button" : "span") + ">";
      }).join("") + "</div>" +
      '<button type="button" class="btn ghost small" id="histClear">' + esc(t("res.hist.clear")) + "</button>" +
    "</section>";
  }

  /* ---------- ссылка на результат ---------- */
  function linkBlock(src, m){
    var url = shareURL(src, m);
    return '<section class="qr-block link-block" data-reveal aria-label="' + esc(t("res.link.h")) + '">' +
      '<h3>' + esc(t("res.link.h")) + '</h3>' +
      '<p class="qr-block-p">' + esc(t("res.link.p")) + '</p>' +
      '<div class="link-row">' +
        '<input type="text" id="resLink" readonly value="' + esc(url) +
          '" aria-label="' + esc(t("res.link.aria")) + '" spellcheck="false">' +
        '<button type="button" class="btn primary" id="resCopy">' + esc(t("res.link.copy")) + '</button>' +
        '<a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(t("res.link.open")) + '</a>' +
      "</div>" +
    "</section>";
  }

  function bindLink(){
    var input = document.getElementById("resLink");
    var btn = document.getElementById("resCopy");
    if(!input || !btn) return;
    btn.addEventListener("click", function(){
      input.focus();
      input.select();
      var done = function(){ if(PC.ui) PC.ui.toast(t("res.link.copied")); };
      var fail = function(){ if(PC.ui) PC.ui.toast(t("res.link.failed"), true); };
      /* Clipboard API недоступен на http и в части встроенных браузеров —
         старый execCommand остаётся рабочим запасным путём, а не наследием */
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(input.value).then(done, function(){
          try{ document.execCommand("copy") ? done() : fail(); }catch(e){ fail(); }
        });
      }else{
        try{ document.execCommand("copy") ? done() : fail(); }catch(e){ fail(); }
      }
    });
  }

  /* ---------- профиль по под-осям ---------- */
  function subBlock(){
    return '<section class="qr-block sub-block" data-reveal aria-label="' + esc(t("res.sub.h")) + '">' +
      '<h3>' + esc(t("res.sub.h")) + '</h3>' +
      '<p class="qr-block-p">' + esc(t("res.sub.p")) + '</p>' +
      '<div class="radar-wrap" id="qrRadar"></div>' +
      '<p class="rad-summary" id="qrRadarNote"></p>' +
    "</section>";
  }

  PC.quizBlocks = {
    econWord:econWord,
    stateWord:stateWord,
    quadrant:quadrant,
    capitalize:capitalize,
    modeName:modeName,
    scaleLabel:scaleLabel,
    questionText:questionText,
    miniCompass:miniCompass,
    poleName:poleName,
    breakdownTable:breakdownTable,
    breakdownBlock:breakdownBlock,
    historyChart:historyChart,
    historyBlock:historyBlock,
    linkBlock:linkBlock,
    bindLink:bindLink,
    subBlock:subBlock
  };
})(window.PC = window.PC || {});
