/* ============ АНАЛИТИКА: KPI, спектр, профиль и общий запуск ============
   Парламентская диаграмма и динамика мандатов с 5.0 живут в своих файлах
   (js/charts-hemi.js, js/charts-trend.js) и берут отсюда контейнеры,
   цвет марок и выбранную партию.

   Графики рисуются в реальных пикселях контейнера (viewBox совпадает с
   размером), а не в условной системе координат: иначе на телефоне вместе
   с шириной ужимался бы и шрифт подписей. Отсюда перерисовка по resize.

   Цвет партии — идентичность, а не палитра под задачу: два синих и два
   красных различимы не всегда, поэтому цвет нигде не единственный код —
   рядом всегда название и число (прямая подпись, строка легенды или
   таблица данных). ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc, fmt = U.fmt;
  var seatsAt = PC.seatsAt;
  var t = PC.t, L = PC.L;

  var host = {};          /* ссылки на контейнеры */
  var activeId = null;
  var lastKey = null;     /* последнее состояние, на котором графики уже отрисованы */
  var sections = [], observer;

  /* Откладывает отрисовку секции до её появления на экране. */
  function scheduleSection(node, paint, key){
    if(!node) return;
    var section = sections.filter(function(s){ return s.node === node; })[0];
    if(!section){
      section = { node:node, watch:node.closest(".chart-card") || node.parentElement,
        paint:paint, key:null, rendered:null, visible:false };
      sections.push(section);
      if(observer) observer.observe(section.watch);
    }
    section.key = key;
    var rect = section.watch.getBoundingClientRect();
    section.visible = rect.width > 0 && rect.bottom >= -200 && rect.top <= window.innerHeight + 200;
    if(!observer || section.visible) flushSection(section);
  }
  /* Выполняет отложенную отрисовку секции. */
  function flushSection(section){
    if(section.rendered === section.key || !section.node.getClientRects().length) return;
    section.paint();
    section.rendered = section.key;
  }

  /* ---------- цвет марок ---------- */
  function hexToRgb(h){
    h = h.replace("#", "");
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  /* Перевод RGB в HSL для подбора цветов. */
  function rgbToHsl(r, g, b){
    r/=255; g/=255; b/=255;
    var mx = Math.max(r,g,b), mn = Math.min(r,g,b), h = 0, s = 0, l = (mx+mn)/2, d = mx-mn;
    if(d){
      s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
      h = mx === r ? ((g-b)/d + (g<b?6:0)) : mx === g ? (b-r)/d + 2 : (r-g)/d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToCss(h, s, l){
    return "hsl(" + (h*360).toFixed(1) + " " + (s*100).toFixed(1) + "% " + (l*100).toFixed(1) + "%)";
  }

  /* Тёмные фирменные цвета (бордовый, тёмно-синий) на почти чёрном фоне
     дают контраст ниже 3:1 — поднимаем светлоту, сохраняя тон. В светлой
     теме наоборот ограничиваем сверху, чтобы жёлтый не выцветал. */
  function chartColor(hex){
    /* Светлота, а не имя темы: тем шесть, и перечислять их здесь
       значило бы ломать график при добавлении седьмой. */
    var dark = document.documentElement.dataset.scheme !== "light";
    var hsl = rgbToHsl.apply(null, hexToRgb(hex));
    var l = hsl[2];
    if(dark) l = Math.max(l, .48);
    else     l = Math.min(l, .55);
    return hslToCss(hsl[0], hsl[1], l);
  }

  /* ---------- выборки по данным и сводки палаты ----------
     Сама арифметика (кто в Думе, центр тяжести, эффективное число
     фракций, поляризация) переехала в js/calc.js в 2.3.1 — здесь
     остались только псевдонимы, чтобы не переписывать всё, что
     обращалось к этим именам ниже по файлу. */
  var inDuma = PC.calc.inDuma, existing = PC.calc.existing;
  var houseMetrics = PC.calc.houseMetrics;

  /* «Круглый» шаг сетки: 1 · 2 · 5 · 10 … — чтобы подписи оси были
     читаемыми при любом максимуме, а не всегда кратными 50. */
  function niceScale(max, targetSteps){
    if(max <= 0) return { max:1, step:1 };
    var raw = max / (targetSteps || 5);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm > 5 ? 10 : norm > 2 ? 5 : norm > 1 ? 2 : 1) * mag;
    return { max: Math.ceil(max / step) * step, step: step };
  }

  /* ---------- KPI-плитки ---------- */
  var statsShown = false;   /* плитки уже показывались хотя бы раз */
  function renderStats(){
    var conv = PC.convocationInfo(), c = conv.id;
    var duma = inDuma(c).sort(function(a, b){ return seatsAt(b,c) - seatsAt(a,c); });
    var top = duma[0];
    var m = houseMetrics(c);
    var wx = m.wx, wy = m.wy;

    /* data-count — цель для счётчика из js/motion.js; в разметку кладём
       уже конечное число, чтобы страница оставалась правильной, даже если
       анимация не запустится (нет наблюдателя, отключены анимации). */
    function num(v, signed){
      return '<span data-count="' + v + '"' + (signed ? ' data-count-fmt="signed"' : "") + '>' +
             (signed ? fmt(v) : v) + '</span>';
    }

    /* Прежние значения счётчиков: при смене созыва число доезжает от
       старого к новому, а не отсчитывается заново от нуля — так видно,
       в какую сторону и насколько сдвинулась палата. */
    var prev = Array.prototype.map.call(host.stats.querySelectorAll("[data-count]"),
      function(n){ return n.dataset.count; });

    var partyTiles = [
      { k:t("an.parties"), v:num(PC.PARTIES.length),
        d:t("an.partiesD", { n:existing(c).length }) },
      { k:t("an.factions"), v:num(duma.length), d:L(conv, "label") + " · " + conv.years },
      { k:t("an.largest"), v:num(top ? seatsAt(top,c) : 0),
        vs:" / " + PC.TOTAL_SEATS,
        d:(top ? t("an.largestD", { name:esc(L(top, "short")), p:m.topShare.toFixed(1) }) : t("an.noData")) }
    ];
    var houseTiles = [
      { k:t("an.centre"),
        body:'<div class="stat-dual">' +
               '<div><span class="lbl">' + esc(t("side.state")) + '</span><span class="num">' + num(Number(wy.toFixed(1)), true) + '</span></div>' +
               '<div><span class="lbl">' + esc(t("side.econ")) + '</span><span class="num">' + num(Number(wx.toFixed(1)), true) + '</span></div>' +
             '</div>',
        d:t("an.centreD") },
      { k:t("an.fragmentation"),
        v:'<span data-count="' + m.enp.toFixed(2) + '" data-count-fmt="fixed2">' + m.enp.toFixed(2) + '</span>',
        d:t("an.fragmentationD") },
      { k:t("an.polarization"),
        v:'<span data-count="' + m.polar.toFixed(1) + '" data-count-fmt="fixed1">' + m.polar.toFixed(1) + '</span>',
        d:t("an.polarizationD") }
    ];
    function tile(x){
      return '<div class="stat" data-reveal><div class="k">' + x.k + '</div>' +
             (x.body ? x.body : '<div class="v">' + x.v + (x.vs ? '<small>' + x.vs + '</small>' : '') + '</div>') +
             '<div class="d">' + x.d + '</div></div>';
    }
    /* Две группы явной вёрсткой, а не только порядком: три плитки
       описывают партии, три — палату как целое, и это разные вопросы. */
    function group(cls, title, list){
      return '<section class="stat-group ' + cls + '" aria-label="' + esc(title) + '">' +
             '<h3 class="stat-group-h">' + esc(title) + '</h3>' +
             '<div class="stat-row">' + list.map(tile).join("") + '</div></section>';
    }
    host.stats.innerHTML = group("sg-parties", t("an.groupParties"), partyTiles) +
                           group("sg-house", t("an.groupHouse"), houseTiles);
    if(statsShown){
      host.stats.querySelectorAll("[data-count]").forEach(function(n, i){
        if(prev[i] !== undefined) n.dataset.countFrom = prev[i];
      });
    }
    /* Первая отрисовка проявляется по прокрутке, все последующие (смена
       созыва, выбор партии) — сразу: блок уже на экране, и повторный
       въезд выглядел бы как мигание. */
    if(PC.motion){
      if(statsShown) PC.motion.showNow(host.stats); else PC.motion.scan(host.stats);
    }
    statsShown = true;
  }

  /* ---------- 3. Идеологический спектр ---------- */
  function specColumn(key, title, left, right){
    var list = PC.PARTIES.filter(function(p){
      return seatsAt(p, PC.convocationInfo().id) !== null;
    }).sort(function(a, b){ return a[key] - b[key]; });
    function n(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
    var col=n("div","spec-col"),poles=n("div","poles");poles.append(n("span","",left),n("span","",right));col.append(n("h4","",title),poles);
    list.forEach(function(p){
      var v=p[key],w=Math.abs(v)/10*50,l=v<0?50-w:50,
        row=n("button","srow"+(p.id===activeId?" hi":""));
      row.type="button";
      row.dataset.id=p.id;
      var lab=n("div","lab",L(p,"short"));
      lab.appendChild(n("b","",fmt(v)));
      var track=n("div","track"),fill=n("span","fill");
      fill.dataset.left=l.toFixed(2);
      fill.dataset.w=w.toFixed(2);
      fill.style.left="50%";
      fill.style.background=chartColor(p.color);
      track.appendChild(fill);
      row.append(lab,track);
      col.appendChild(row);
    });var scale=n("div","spec-scale");scale.append(n("span","","−10"),n("span","","0"),n("span","","+10"));col.appendChild(scale);return col;
  }
  var spectrumGrown = false;
  /* Спектр позиций по осям. */
  function renderSpectrum(){
    host.spectrum.replaceChildren(
      specColumn("x", t("ch.spec.econ"), t("ch.spec.planned"), t("ch.spec.market")),
      specColumn("y", t("ch.spec.state"), t("ch.spec.liberty"), t("ch.spec.statism"))
    );
    host.spectrum.querySelectorAll(".srow").forEach(function(row){
      row.style.cursor = "pointer";
      row.addEventListener("click", function(){ PC.select(row.dataset.id); });
    });
    /* Полосы разъезжаются не сразу, а когда блок попал в вид: спектр
       лежит в самом низу страницы, и без привязки к появлению вся
       анимация проигрывалась бы за экраном. */
    var apply = function(){
      host.spectrum.querySelectorAll(".fill").forEach(function(f){
        f.style.left = f.dataset.left + "%";
        f.style.width = Math.max(1.5, Number(f.dataset.w)) + "%";
      });
    };
    /* Координаты от созыва и выбора партии не зависят: разъезд полос
       проигрывается один раз, а на повторных отрисовках они сразу стоят
       на месте — иначе каждый клик по партии заново «выращивал» спектр. */
    if(spectrumGrown){ apply(); return; }
    var grow = function(){
      spectrumGrown = true;
      requestAnimationFrame(apply);
    };
    var card = host.spectrum.closest(".chart-card");
    if(PC.motion && PC.motion.whenRevealed && card) PC.motion.whenRevealed(card, grow); else grow();
  }

  /* ---------- 4. Диаграмма-паук по под-осям ----------
     Радар живёт в аналитике, а не только в результатах теста, потому что
     он отвечает на вопрос про партии, а не про читателя: две точки,
     стоящие рядом на компасе, здесь расходятся, и видно, чем именно. */
  var radarPick = null;
  var radarActive = null;
  /* Радарная диаграмма по подосям. */
  function renderRadar(){
    if(!host.radar || !PC.radar) return;
    var list = PC.PARTIES;
    if(!radarPick || !PC.partyById(radarPick)) radarPick = activeId || list[0].id;
    if(activeId && activeId !== radarActive) radarPick = activeId;
    radarActive = activeId;
    var p = PC.partyById(radarPick);

    var sel = host.radarPick;
    if(sel){
      sel.replaceChildren();
      list.forEach(function(o){
        var option=document.createElement("option");
        option.value=o.id;
        option.dataset.color=o.color;
        option.textContent=L(o,"short");
        sel.appendChild(option);

      });
    }
    /* Опции пересозданы выше, поэтому подпись и список кастомного выпадающего
       меню перечитываются всегда: если выбрана первая партия, значение не
       меняется, и без этого кнопка оставалась пустой (4.4.0.2). */
    if(sel){
      sel.value = radarPick;
      if(PC.dropdown) PC.dropdown.sync(sel);
    }

    var series = [{ label:L(p, "short"), color:chartColor(p.color), values:p.sub }];
    var res = PC.quiz && PC.quiz.result();
    if(res && PC.quiz.subScoreOf){
      series.push({ label:t("ch.radar.you"), color:"var(--accent)",
                    values:PC.quiz.subScoreOf(res.answers || {}, PC.quiz.questionsFor(res.mode)), dashed:true });
    }
    PC.radar.render(host.radar, series);

    if(host.radarNote){
      host.radarNote.textContent = series.length > 1
        ? PC.radar.summary(series[0].values, series[1].values)
        : t("ch.radar.youHint");
    }
  }

  /* ---------- сборка ---------- */
  function init(){
    if(window.IntersectionObserver){
      observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          sections.filter(function(s){ return s.watch === entry.target; }).forEach(function(section){
            section.visible = entry.isIntersecting;
            if(section.visible) flushSection(section);
          });
        });
      }, { rootMargin:"200px" });
    }
    host.stats       = document.getElementById("stats");
    host.hemi        = document.getElementById("hemi");
    host.hemiLegend  = document.getElementById("hemiLegend");
    host.trend       = document.getElementById("trend");
    host.trendLegend = document.getElementById("trendLegend");
    host.trendTable  = document.getElementById("trendTable");
    host.spectrum    = document.getElementById("spectrum");
    host.radar       = document.getElementById("radarBox");
    host.radarPick   = document.getElementById("radarPick");
    host.radarNote   = document.getElementById("radarNote");

    if(host.radarPick){
      host.radarPick.addEventListener("change", function(){
        radarPick = host.radarPick.value;
        renderRadar();
      });
    }

    var toggle = document.getElementById("trendTableBtn");
    var wrap   = document.getElementById("trendTableWrap");
    if(toggle && wrap){
      toggle.addEventListener("click", function(){
        var open = wrap.hasAttribute("hidden");
        if(open) wrap.removeAttribute("hidden"); else wrap.setAttribute("hidden", "");
        toggle.textContent = t(open ? "ch.trend.hideTable" : "ch.trend.showTable");
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    /* переключатель шкалы графика динамики — в js/charts-trend.js */
    PC.charts.bindTrendModes();

    var frame = null;
    /* Перерисовка при изменении размера окна. */
    function resized(){
      if(frame !== null) return;
      frame = requestAnimationFrame(function(){ frame = null; render(activeId); });
    }
    if(window.ResizeObserver) new ResizeObserver(resized).observe(host.hemi);
    else window.addEventListener("resize", resized, { passive:true });
  }

  /* Графики зависят только от созыва и выбранной партии — поиск и фильтры
     на них не влияют. Без этой проверки каждое нажатие клавиши в поиске
     перерисовывало бы 450 точек парламента и сбрасывало подсветку. */
  function render(active){
    if(!host.stats) return;
    activeId = active || null;
    if(!host.hemi.clientWidth) return;
    /* В ключе — всё, от чего зависит готовая картинка: созыв, выбранная
       партия, тема (она задаёт цвета марок) и плотность с кеглем (они
       меняют ширину контейнеров, а графики рисуются в пикселях). Без
       двух последних смена плотности оставляла бы графики нарисованными
       под прежнюю ширину до первого перехода по вкладкам. */
    var root = document.documentElement.dataset;
    var key = [PC.convocationInfo().id, activeId, root.theme,
               root.density, root.textsize, root.font, PC.i18n.current(), host.hemi.clientWidth].join("|");
    if(key === lastKey) return;
    lastKey = key;
    scheduleSection(host.stats, renderStats, key);
    scheduleSection(host.hemi, PC.charts.renderHemicycle, key);
    scheduleSection(host.trend, PC.charts.renderTrend, key);
    scheduleSection(host.spectrum, renderSpectrum, key);
    scheduleSection(host.radar, renderRadar, key);
    if(PC.coalition) scheduleSection(document.getElementById("coalition"), PC.coalition.render, key);
  }

  /* Сброс кэша: после возврата на вкладку компаса размеры контейнеров
     изменились, хотя ключ состояния прежний. */
  function invalidate(){
    lastKey = null;
    sections.forEach(function(s){ s.rendered = null; });
    if(PC.coalition) PC.coalition.invalidate();
  }

  /* niceScale и hemiSeats (js/charts-hemi.js) — чистые функции без DOM:
     раскладка мест и шаг сетки проверяются тестами напрямую, без браузера.
     host и active() нужны модулям парламента и динамики (5.0). */
  PC.charts = { init:init, render:render, invalidate:invalidate,
                chartColor:chartColor, niceScale:niceScale, host:host,
                active:function(){ return activeId; } };
})(window.PC = window.PC || {});
