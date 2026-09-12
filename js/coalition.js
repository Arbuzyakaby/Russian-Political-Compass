/* ============ ПЕСОЧНИЦА КОАЛИЦИЙ ============

   Интерактивный расчёт поверх тех же данных, что и у остальной
   аналитики: без нового источника, без бэкенда и без сохранения.
   Читатель включает и выключает фракции выбранного созыва и видит,
   проходит ли набор порог большинства и какой получается коалиция.

   До 2.0 песочница отвечала на три вопроса: хватает ли мандатов, где
   центр коалиции и насколько она разношёрстная. Этого мало, чтобы
   понять, работоспособен ли набор. Добавлены четыре:

     тип коалиции — минимальная выигрышная, избыточная или миноритарная.
       Различие содержательное: в избыточной есть участники, без которых
       большинство сохраняется, и торговаться они могут только за счёт
       репутации, а не голосов;
     незаменимые — фракции, выход любой из которых отнимает большинство.
       Именно у них настоящая переговорная сила, и число мандатов её
       не определяет: в раскладе «324 + 21» незаменима только первая;
     сплочённость — доля знаковых голосований этого созыва, в которых
       участники занимали одну позицию. Единственная метрика здесь,
       которая опирается не на экспертные координаты, а на поимённые
       результаты, и потому способна спорить с ними;
     ось разлома — по какой из двух осей участники разошлись сильнее.
       Разброс сам по себе говорит «далеко», а разлом — «в чём именно»:
       коалиция, единая по экономике и расколотая по отношению к власти
       государства, ведёт себя иначе, чем наоборот.

   Формулы не дублируются: центр тяжести, индекс Лааксо — Таагеперы и
   поляризация берутся из PC.charts.groupMetrics, то есть ровно те же,
   что в плитках палаты. При всех включённых фракциях центр и разброс
   коалиции обязаны совпасть с плитками — это закреплено тестом.

   Разметка строится один раз на созыв, а переключение фракции только
   меняет ширину сегментов и числа: так работают CSS-переходы, и полоса
   плавно дорастает до нового значения, а не перерисовывается. ============ */
(function(PC){
  "use strict";
  var U = PC.utils, esc = U.esc, fmt = U.fmt;
  var t = PC.t, L = PC.L;

  var host = {};
  var conv = null;        /* созыв, на который собрана разметка */
  var key = null;         /* созыв + тема + язык: при смене — пересборка */
  var on = {};            /* id фракции -> входит ли в коалицию */
  var shown = {};         /* последние показанные числа — для доезда */

  /* Простое большинство — больше половины палаты, две трети — порог
     для конституционных законов и преодоления вето Совета Федерации. */
  function majority(){ return Math.floor(PC.TOTAL_SEATS / 2) + 1; }
  function supermajority(){ return Math.ceil(PC.TOTAL_SEATS * 2 / 3); }

  function factions(c){
    return PC.PARTIES
      .filter(function(p){ return PC.seatsAt(p, c) > 0; })
      .sort(function(a, b){ return PC.seatsAt(b, c) - PC.seatsAt(a, c); });
  }

  /* ---------- сплочённость по голосованиям ----------
     Доля голосований, в которых две фракции заняли одну позицию,
     усреднённая по всем парам участников. Считается только по знаковым
     голосованиям ТОГО ЖЕ созыва: PC.voteAgreement берёт весь набор
     целиком, и для коалиции это было бы подменой — сплочённость
     фракций VI созыва не характеризует коалицию в IV.

     Пары, у которых общих голосований меньше трёх, в среднее не входят:
     одно совпадение из одного — это не 100%, это отсутствие данных.
     Если таких пар не осталось вовсе, метрика честно молчит. */
  var MIN_COMMON = 3;

  function pairAgreement(a, b, c){
    var same = 0, common = 0;
    PC.VOTES.forEach(function(v){
      if(v.conv !== c) return;
      var sa = PC.voteStance(v, a), sb = PC.voteStance(v, b);
      if(sa === "absent" || sb === "absent" || sa === "unknown" || sb === "unknown") return;
      common++;
      if(sa === sb) same++;
    });
    return { same:same, common:common };
  }

  function cohesionOf(members, c){
    if(members.length < 2) return null;
    var sum = 0, pairs = 0;
    for(var i = 0; i < members.length; i++){
      for(var j = i + 1; j < members.length; j++){
        var r = pairAgreement(members[i], members[j], c);
        if(r.common < MIN_COMMON) continue;
        sum += r.same / r.common;
        pairs++;
      }
    }
    return pairs ? { ratio:sum / pairs, pairs:pairs } : null;
  }

  /* ---------- ось разлома ----------
     Размах координат участников по каждой оси, взвешивать нечем:
     речь про то, насколько далеко разнесены крайние позиции, а не про
     то, сколько за ними мандатов. Ось с большим размахом и есть та,
     по которой коалиции придётся договариваться. */
  function faultOf(members){
    if(members.length < 2) return null;
    var xs = members.map(function(p){ return p.x; });
    var ys = members.map(function(p){ return p.y; });
    var dx = Math.max.apply(null, xs) - Math.min.apply(null, xs);
    var dy = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    var byX = dx >= dy;
    var key = byX ? "x" : "y";
    var sorted = members.slice().sort(function(a, b){ return a[key] - b[key]; });
    return {
      axis: byX ? "x" : "y",
      span: byX ? dx : dy,
      lo: sorted[0],
      hi: sorted[sorted.length - 1]
    };
  }

  /* Чистый расчёт без DOM: набор id -> мандаты, вердикт и метрики.
     Неизвестные id и фракции без мандатов в этом созыве молча
     отбрасываются — ссылка на партию из другого созыва не должна
     давать ни мандатов, ни NaN в метриках. */
  function evaluate(ids, c){
    var all = factions(c);
    var members = all.filter(function(p){ return ids.indexOf(p.id) > -1; });
    var rest = all.filter(function(p){ return ids.indexOf(p.id) === -1; });
    var seats = members.reduce(function(s, p){ return s + PC.seatsAt(p, c); }, 0);
    var need = majority();
    var win = seats >= need;

    /* Незаменимые: те, без кого большинство рассыпается. У фракции
       с одним мандатом переговорная сила может быть выше, чем у
       фракции с двадцатью, — если без неё не набирается 226. */
    var pivots = win ? members.filter(function(p){
      return seats - PC.seatsAt(p, c) < need;
    }) : [];

    return {
      members: members,
      others: rest,
      seats: seats,
      share: seats / PC.TOTAL_SEATS * 100,
      need: need,
      majority: win,
      supermajority: seats >= supermajority(),
      margin: seats - need,
      /* Минимальная выигрышная — та, из которой нельзя убрать никого:
         значит незаменимы все. Избыточная — выигрышная, но с балластом. */
      kind: !members.length ? "empty"
          : !win ? "minority"
          : pivots.length === members.length ? "minimal" : "surplus",
      pivots: pivots,
      cohesion: cohesionOf(members, c),
      fault: faultOf(members),
      metrics: PC.charts.groupMetrics(members, c),
      oppMetrics: PC.charts.groupMetrics(rest, c)
    };
  }

  /* ---------- готовые расклады ----------
     Кнопки-заготовки существуют, чтобы читателю не приходилось
     подбирать интересный набор наугад. Все три считаются из данных
     выбранного созыва, а не выписаны списком партий: список устарел бы
     при первом же переключении созыва. */
  function presetIds(name, c){
    var list = factions(c);
    if(name === "left")  return list.filter(function(p){ return p.x < 0; }).map(function(p){ return p.id; });
    if(name === "right") return list.filter(function(p){ return p.x >= 0; }).map(function(p){ return p.id; });
    if(name === "min"){
      /* Наименьшая по числу участников выигрышная коалиция: берём
         фракции от крупной к мелкой, пока не наберётся большинство.
         Жадный проход не даёт самую компактную по мандатам, зато даёт
         самую малочисленную по составу — а договариваться приходится
         именно с участниками, а не с мандатами. */
      var need = majority(), sum = 0, out = [];
      for(var i = 0; i < list.length && sum < need; i++){
        out.push(list[i].id);
        sum += PC.seatsAt(list[i], c);
      }
      return out;
    }
    return list.map(function(p){ return p.id; });
  }

  function currentIds(){
    return Object.keys(on).filter(function(id){ return on[id]; });
  }
  function isReal(){
    return factions(conv).every(function(p){ return on[p.id]; });
  }

  /* ---------- доезд чисел ---------- */
  function tween(node, name, to, printer){
    if(!node) return;
    var from = shown[name];
    shown[name] = to;
    var reduced = !window.requestAnimationFrame || !PC.motion || PC.motion.reduced();
    if(to === null){ node.textContent = "—"; return; }
    if(reduced || from === undefined || from === null || from === to){
      node.textContent = printer(to); return;
    }
    var t0 = null, DUR = 480;
    var token = node._tw = {};
    function frame(ts){
      if(node._tw !== token) return;           /* поверх уже запущен новый доезд */
      if(t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUR);
      var e = 1 - Math.pow(1 - p, 3);
      node.textContent = printer(from + (to - from) * e);
      if(p < 1) requestAnimationFrame(frame); else node.textContent = printer(to);
    }
    requestAnimationFrame(frame);
  }
  var INT = function(v){ return String(Math.round(v)); };
  var F1 = function(v){ return v.toFixed(1); };
  var F2 = function(v){ return v.toFixed(2); };
  var PCT = function(v){ return Math.round(v) + "%"; };
  var SIGNED = function(v){ return fmt(Number(v.toFixed(1))); };

  /* ---------- сборка разметки на созыв ----------
     keep — набор включённых фракций, который надо перенести в новую
     разметку. Он приходит при пересборке из-за смены темы или языка:
     состав коалиции выбрал читатель, и терять его из-за перекраски
     было бы так же неприятно, как терять текст в поле ввода. */
  function build(keep){
    var list = factions(conv);
    var color = PC.charts.chartColor;
    on = {};
    list.forEach(function(p){ on[p.id] = keep ? !!keep[p.id] : true; });
    shown = {};

    host.togs.innerHTML = list.map(function(p){
      return '<button type="button" class="co-tog" data-id="' + esc(p.id) + '" aria-pressed="true">' +
        '<i style="background:' + esc(color(p.color)) + '"></i>' +
        '<span class="n">' + esc(L(p, "short")) + '</span>' +
        '<b>' + PC.seatsAt(p, conv) + '</b>' +
        '<u class="co-key" hidden title="' + esc(t("co.pivotMark")) + '">' + esc(t("co.pivotShort")) + '</u>' +
      '</button>';
    }).join("");

    if(host.presets){
      /* «Как в жизни» и «Снять все» стоят отдельными кнопками в панели
         выше — здесь только заготовки, которых там нет. */
      host.presets.innerHTML = ["min", "left", "right"].map(function(name){
        return '<button type="button" class="co-preset" data-preset="' + name + '">' +
          esc(t("co.preset." + name)) + '</button>';
      }).join("");
      host.presets.querySelectorAll(".co-preset").forEach(function(b){
        b.addEventListener("click", function(){ applyPreset(b.dataset.preset); });
      });
    }

    /* сегменты — по экономической оси, как места на дуге палаты */
    var byX = list.slice().sort(function(a, b){ return a.x - b.x; });
    var pct = function(n){ return (n / PC.TOTAL_SEATS * 100).toFixed(3) + "%"; };
    host.bar.innerHTML =
      '<div class="co-track">' +
        byX.map(function(p){
          return '<span class="co-seg" data-id="' + esc(p.id) + '" title="' +
            esc(L(p, "short") + " · " + PC.seatsAt(p, conv)) + '" style="background:' +
            esc(color(p.color)) + ';width:' + pct(PC.seatsAt(p, conv)) + '"></span>';
        }).join("") +
      '</div>' +
      '<span class="co-mark maj" style="left:' + pct(majority()) + '"><em>' +
        esc(t("co.markMaj", { n:majority() })) + '</em></span>' +
      '<span class="co-mark super" style="left:' + pct(supermajority()) + '"><em>' +
        esc(t("co.markSuper", { n:supermajority() })) + '</em></span>';

    function metric(k, body, note, cls){
      return '<div class="co-metric' + (cls ? " " + cls : "") + '">' +
        '<div class="k">' + esc(k) + '</div>' + body +
        '<div class="d"' + (note ? ' data-m="' + note + '"' : "") + '>' +
        (note ? "" : "") + '</div></div>';
    }

    host.metrics.innerHTML =
      '<div class="co-metric co-metric--wide"><div class="k">' + esc(t("co.centre")) + '</div>' +
        '<div class="co-dual">' +
          '<div><span class="lbl">' + esc(t("side.state")) + '</span><span class="num" data-m="wy">—</span></div>' +
          '<div><span class="lbl">' + esc(t("side.econ")) + '</span><span class="num" data-m="wx">—</span></div>' +
        '</div><div class="d" data-m="centreD"></div></div>' +

      metric(t("co.kind"), '<div class="v v-word" data-m="kind">—</div>', "kindD") +
      metric(t("co.pivot"), '<div class="v" data-m="pivot">—</div>', "pivotD") +
      metric(t("co.enp"), '<div class="v" data-m="enp">—</div>', "enpD") +
      metric(t("co.cohesion"), '<div class="v" data-m="coh">—</div>', "cohD") +
      metric(t("co.polar"), '<div class="v" data-m="polar">—</div>', "polarD") +
      metric(t("co.fault"), '<div class="v v-word" data-m="fault">—</div>', "faultD") +
      metric(t("co.opp"), '<div class="v" data-m="opp">—</div>', "oppD");

    host.togs.querySelectorAll(".co-tog").forEach(function(b){
      b.addEventListener("click", function(){
        on[b.dataset.id] = !on[b.dataset.id];
        update();
      });
    });
    update();
  }

  function applyPreset(name){
    var ids = name === "none" ? [] : presetIds(name, conv);
    factions(conv).forEach(function(p){ on[p.id] = ids.indexOf(p.id) > -1; });
    update();
  }

  /* ---------- пересчёт ---------- */
  function update(){
    var res = evaluate(currentIds(), conv);
    var house = PC.charts.houseMetrics(conv);
    var m = res.metrics, empty = !res.members.length;
    var pivotIds = res.pivots.map(function(p){ return p.id; });

    host.togs.querySelectorAll(".co-tog").forEach(function(b){
      var inside = !!on[b.dataset.id];
      b.setAttribute("aria-pressed", String(inside));
      /* Метка незаменимости стоит на самой фракции, а не только в
         сводке: решение «убрать эту» принимается здесь, и знать цену
         надо до клика, а не после. */
      var mark = b.querySelector(".co-key");
      if(mark) mark.hidden = pivotIds.indexOf(b.dataset.id) === -1;
    });
    /* выключенный сегмент схлопывается, и включённые съезжаются к левому
       краю: длина цветной части полосы и есть мандаты коалиции */
    host.bar.querySelectorAll(".co-seg").forEach(function(s){
      var p = PC.partyById(s.dataset.id);
      var inside = !!on[s.dataset.id];
      s.classList.toggle("off", !inside);
      s.style.width = inside ? (PC.seatsAt(p, conv) / PC.TOTAL_SEATS * 100).toFixed(3) + "%" : "0%";
    });

    var q = function(name){ return host.metrics.querySelector('[data-m="' + name + '"]'); };
    tween(host.seats, "seats", res.seats, INT);
    host.total.textContent = " / " + PC.TOTAL_SEATS;

    var verdict = host.verdict;
    verdict.className = "co-verdict " + (empty ? "none" : res.majority ? "yes" : "no");
    verdict.textContent = empty ? t("co.empty")
      : res.supermajority ? t("co.super")
      : res.majority ? t("co.yes", { n:res.margin })
      : t("co.no", { n:-res.margin });

    tween(q("wy"), "wy", empty ? null : m.wy, SIGNED);
    tween(q("wx"), "wx", empty ? null : m.wx, SIGNED);
    tween(q("enp"), "enp", empty ? null : m.enp, F2);
    tween(q("polar"), "polar", empty ? null : m.polar, F1);
    q("centreD").textContent = t("co.vsHouse", { v:fmt(Number(house.wy.toFixed(1))) + " / " + fmt(Number(house.wx.toFixed(1))) });
    q("enpD").textContent = t("co.enpD");
    q("polarD").textContent = t("co.vsHouse", { v:house.polar.toFixed(1) });

    /* тип коалиции */
    q("kind").textContent = t("co.kind." + res.kind);
    q("kind").className = "v v-word kind-" + res.kind;
    /* Пояснение разное у трёх типов, и это не украшение: «98% палаты»
       одинаково верно и для минимальной, и для избыточной коалиции, а
       различает их ровно то, можно ли кого-то убрать. */
    var spare = res.members.length - res.pivots.length;
    q("kindD").textContent = empty ? t("co.kindD.empty")
      : !res.majority ? t("co.kindD.short", { n:-res.margin })
      : res.kind === "minimal" ? t("co.kindD.minimal", { p:res.share.toFixed(1) })
      : t("co.kindD.surplus", { p:res.share.toFixed(1), n:spare });

    /* незаменимые */
    var pivotV = q("pivot");
    if(!res.majority){
      pivotV.textContent = "—";
      shown.pivot = null;
      q("pivotD").textContent = t("co.pivotD.none");
    }else{
      tween(pivotV, "pivot", res.pivots.length, INT);
      /* Одна незаменимая фракция и несколько — разные фразы: «без любой
         из них» про единственную читается как ошибка согласования. */
      var names = res.pivots.map(function(p){ return L(p, "short"); }).join(", ");
      q("pivotD").textContent = !res.pivots.length ? t("co.pivotD.zero")
        : res.pivots.length === 1 ? t("co.pivotD.one", { name:names })
        : t("co.pivotD.list", { list:names });
    }

    /* сплочённость */
    var coh = res.cohesion;
    if(coh){
      tween(q("coh"), "coh", coh.ratio * 100, PCT);
      q("cohD").textContent = t("co.cohD", { n:coh.pairs });
    }else{
      q("coh").textContent = "—";
      shown.coh = null;
      q("cohD").textContent = t("co.cohD.none");
    }

    /* ось разлома */
    var f = res.fault;
    if(f){
      q("fault").textContent = t(f.axis === "x" ? "co.fault.econ" : "co.fault.state");
      q("faultD").textContent = t("co.faultD", {
        v:f.span.toFixed(1), lo:L(f.lo, "short"), hi:L(f.hi, "short")
      });
    }else{
      q("fault").textContent = "—";
      q("faultD").textContent = t("co.faultD.none");
    }

    /* всё, что осталось за бортом */
    var oppSeats = PC.TOTAL_SEATS - res.seats;
    tween(q("opp"), "opp", oppSeats, INT);
    q("oppD").textContent = res.others.length
      ? t("co.oppD", { n:res.others.length,
                       v:fmt(Number(res.oppMetrics.wy.toFixed(1))) + " / " + fmt(Number(res.oppMetrics.wx.toFixed(1))) })
      : t("co.oppD.none");

    var real = isReal();
    host.reset.disabled = real;
    host.real.hidden = !real;
    host.clear.disabled = empty;
    if(host.presets){
      var nowIds = currentIds().slice().sort().join(",");
      host.presets.querySelectorAll(".co-preset").forEach(function(b){
        var ids = b.dataset.preset === "none" ? [] : presetIds(b.dataset.preset, conv);
        b.setAttribute("aria-pressed", String(ids.slice().sort().join(",") === nowIds));
      });
    }
  }

  function reset(){ applyPreset("real"); }
  function clear(){ applyPreset("none"); }

  /* Вызывается из PC.charts.render: песочница следует за созывом, как и
     все графики. Своё состояние (набор фракций) при смене созыва
     сбрасывается к реальному составу — фракции другого созыва другие, —
     но переживает смену темы и языка. */
  function render(){
    if(!host.card) return;
    var c = PC.convocationInfo().id;
    var k = c + "|" + document.documentElement.dataset.theme + "|" + PC.i18n.current();
    if(k === key) return;
    var keep = (key !== null && c === conv) ? on : null;
    key = k;
    conv = c;
    build(keep);
  }
  function invalidate(){ /* разметка от размеров не зависит — пересобирать нечего */ }

  function init(){
    host.card    = document.getElementById("coalition");
    host.togs    = document.getElementById("coTogs");
    host.presets = document.getElementById("coPresets");
    host.bar     = document.getElementById("coBar");
    host.seats   = document.getElementById("coSeats");
    host.total   = document.getElementById("coTotal");
    host.verdict = document.getElementById("coVerdict");
    host.metrics = document.getElementById("coMetrics");
    host.reset   = document.getElementById("coReset");
    host.clear   = document.getElementById("coClear");
    host.real    = document.getElementById("coReal");
    if(!host.card) return;
    host.reset.addEventListener("click", reset);
    host.clear.addEventListener("click", clear);
  }

  PC.coalition = { init:init, render:render, invalidate:invalidate, evaluate:evaluate,
                   presetIds:presetIds, cohesionOf:cohesionOf, faultOf:faultOf,
                   majority:majority, supermajority:supermajority };
})(window.PC = window.PC || {});
