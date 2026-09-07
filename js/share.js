/* ============ КАРТОЧКА РЕЗУЛЬТАТА ДЛЯ СОЦСЕТЕЙ ============

   Картинка рисуется прямо в браузере через Canvas 2D: ни сервера,
   ни внешних библиотек. Наружу по-прежнему ничего не уходит — файл
   появляется в загрузках или в системном «Поделиться».

   Палитра карточки фиксированная, тёмная, и не следует за темой сайта:
   в ленте соцсети картинка живёт отдельно от страницы, и светлый вариант
   на белом фоне ленты просто растворился бы. Это единственное место
   в проекте, где цвета захардкожены, а не взяты из токенов.

   Два формата: 1:1 для ленты и сторис-превью, 16:9 для Telegram, VK
   и превью ссылок. Раскладка от формата зависит принципиально — в
   квадрате компас стоит над текстом, в широком варианте сбоку, — поэтому
   это две ветки одной функции, а не один «резиновый» макет. ============ */
(function(PC){
  "use strict";

  /* Раскладка задана числами, а не долями стороны: у квадрата и широкого
     формата разный порядок блоков, и «резиновые» коэффициенты в прошлой
     версии сталкивали компас с плитками координат. Числа — в пикселях
     холста, то есть в системе координат самой картинки. */
  var FORMATS = {
    square: {
      w:1080, h:1080, label:"1:1", title:"Квадрат · лента",
      pad:80, colW:920,
      eyebrow:{ size:21, y:112 }, title:{ size:60, y:180 }, sub:{ size:23, y:222 },
      compass:{ x:340, y:250, size:400 },
      tiles:{ y:676, h:112, gap:20 },
      list:{ head:16, headY:832, y:846, rowH:48, gap:8 },
      foot:{ line:1018, text:1050, size:17 }
    },
    wide:   {
      w:1920, h:1080, label:"16:9", title:"Широкая · превью ссылки",
      pad:100, colW:880,
      eyebrow:{ size:23, y:224 }, title:{ size:84, y:316 }, sub:{ size:30, y:368 },
      compass:{ x:1000, y:130, size:820 },
      tiles:{ y:424, h:148, gap:24 },
      list:{ head:20, headY:648, y:668, rowH:72, gap:12 },
      foot:{ line:972, text:1014, size:20 }
    }
  };

  var INK = {
    bg1:"#070b16", bg2:"#111a33",
    text:"#f4f7fd", body:"#cfd6e6", muted:"#97a3bd", faint:"#66708a",
    accent:"#6ee7f9", accent2:"#a78bfa",
    line:"rgba(255,255,255,.10)", line2:"rgba(255,255,255,.20)",
    tile:"rgba(255,255,255,.045)"
  };

  var FONT = "'Manrope','Inter','Segoe UI',system-ui,sans-serif";

  function font(size, weight){ return (weight || 600) + " " + size + "px " + FONT; }

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Разрядка у заголовков-надстрочников: ctx.letterSpacing есть не везде,
     поэтому при его отсутствии буквы расставляются вручную. */
  function tracked(ctx, text, x, y, spacing, align){
    if("letterSpacing" in ctx){
      ctx.letterSpacing = spacing + "px";
      ctx.textAlign = align || "left";
      ctx.fillText(text, x, y);
      ctx.letterSpacing = "0px";
      return;
    }
    var chars = text.split("");
    var total = chars.reduce(function(s, c){ return s + ctx.measureText(c).width + spacing; }, -spacing);
    var cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    ctx.textAlign = "left";
    chars.forEach(function(c){
      ctx.fillText(c, cx, y);
      cx += ctx.measureText(c).width + spacing;
    });
  }

  /* обрезка длинного названия партии по ширине колонки */
  function ellipsis(ctx, text, maxWidth){
    if(ctx.measureText(text).width <= maxWidth) return text;
    var s = text;
    while(s.length > 1 && ctx.measureText(s + "…").width > maxWidth) s = s.slice(0, -1);
    return s.replace(/[\s,.·-]+$/, "") + "…";
  }

  /* ---------- мини-компас ---------- */
  function drawCompass(ctx, x, y, size, pt, highlight){
    var pad = size * 0.085;
    var c = size / 2, K = (size / 2 - pad) / 10;
    var X = function(v){ return x + c + v * K; };
    var Y = function(v){ return y + c - v * K; };
    var half = size / 2 - pad;

    ctx.save();

    /* подложка поля */
    roundRect(ctx, x + pad, y + pad, half * 2, half * 2, size * 0.026);
    ctx.fillStyle = "rgba(255,255,255,.028)";
    ctx.fill();

    /* лёгкая подсветка квадрантов — те же четыре цвета, что на сайте */
    [["#ef4444", X(-10), Y(10)], ["#a855f7", X(10), Y(10)],
     ["#38bdf8", X(-10), Y(-10)], ["#fbbf24", X(10), Y(-10)]].forEach(function(q){
      var g = ctx.createRadialGradient(q[1], q[2], 0, q[1], q[2], half * 1.25);
      g.addColorStop(0, q[0]);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      roundRect(ctx, x + pad, y + pad, half * 2, half * 2, size * 0.026);
      ctx.clip();
      ctx.globalAlpha = 0.17;
      ctx.fillStyle = g;
      ctx.fillRect(x + pad, y + pad, half * 2, half * 2);
      ctx.restore();
    });

    /* сетка через пять делений */
    ctx.lineWidth = Math.max(1, size * 0.0016);
    ctx.strokeStyle = "rgba(255,255,255,.075)";
    [-5, 5].forEach(function(v){
      ctx.beginPath(); ctx.moveTo(X(v), Y(10)); ctx.lineTo(X(v), Y(-10)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(-10), Y(v)); ctx.lineTo(X(10), Y(v)); ctx.stroke();
    });

    /* оси и рамка */
    ctx.strokeStyle = "rgba(255,255,255,.26)";
    ctx.lineWidth = Math.max(1.2, size * 0.0022);
    ctx.beginPath(); ctx.moveTo(X(-10), Y(0)); ctx.lineTo(X(10), Y(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(0), Y(10)); ctx.lineTo(X(0), Y(-10)); ctx.stroke();
    ctx.strokeStyle = INK.line2;
    roundRect(ctx, x + pad, y + pad, half * 2, half * 2, size * 0.026);
    ctx.stroke();

    /* подписи полюсов */
    ctx.fillStyle = INK.faint;
    ctx.font = font(size * 0.028, 700);
    ctx.textBaseline = "middle";
    tracked(ctx, "ЭТАТИЗМ", x + c, y + pad * 0.5, size * 0.006, "center");
    tracked(ctx, "СВОБОДЫ", x + c, y + size - pad * 0.5, size * 0.006, "center");
    ctx.save();
    ctx.translate(x + pad * 0.46, y + c); ctx.rotate(-Math.PI / 2);
    tracked(ctx, "ПЛАН", 0, 0, size * 0.006, "center");
    ctx.restore();
    ctx.save();
    ctx.translate(x + size - pad * 0.46, y + c); ctx.rotate(Math.PI / 2);
    tracked(ctx, "РЫНОК", 0, 0, size * 0.006, "center");
    ctx.restore();

    /* точки партий: тройка ближайших — с белым кольцом */
    var top = {};
    (highlight || []).forEach(function(id){ top[id] = true; });
    PC.PARTIES.forEach(function(p){
      var r = size * (top[p.id] ? 0.0135 : 0.0105);
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = top[p.id] ? 1 : 0.62;
      ctx.fill();
      ctx.globalAlpha = 1;
      if(top[p.id]){
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), r + size * 0.009, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,.55)";
        ctx.lineWidth = Math.max(1, size * 0.0022);
        ctx.stroke();
      }
    });

    /* выноски от осей к точке пользователя */
    var ux = X(pt.x), uy = Y(pt.y);
    ctx.setLineDash([size * 0.012, size * 0.014]);
    ctx.strokeStyle = "rgba(110,231,249,.5)";
    ctx.lineWidth = Math.max(1, size * 0.002);
    ctx.beginPath(); ctx.moveTo(X(0), uy); ctx.lineTo(ux, uy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ux, Y(0)); ctx.lineTo(ux, uy); ctx.stroke();
    ctx.setLineDash([]);

    /* сама точка — звезда, как на большом компасе */
    ctx.beginPath();
    ctx.arc(ux, uy, size * 0.038, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(110,231,249,.16)";
    ctx.fill();
    var k = size * 0.0026;
    var star = [[0,-11],[3.1,-3.6],[11,-3.4],[4.8,1.6],[7,9.2],[0,4.8],[-7,9.2],[-4.8,1.6],[-11,-3.4],[-3.1,-3.6]];
    ctx.beginPath();
    star.forEach(function(p, i){
      var px = ux + p[0] * k, py = uy + p[1] * k;
      if(i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = INK.accent;
    ctx.fill();
    ctx.strokeStyle = "rgba(7,11,22,.9)";
    ctx.lineWidth = Math.max(1, size * 0.0026);
    ctx.stroke();

    ctx.font = font(size * 0.036, 700);
    ctx.fillStyle = INK.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Вы", ux, uy - size * 0.052);

    ctx.restore();
  }

  /* ---------- плитка координаты ---------- */
  function drawCoord(ctx, x, y, w, h, title, value, left, right, val){
    roundRect(ctx, x, y, w, h, h * 0.16);
    ctx.fillStyle = INK.tile;
    ctx.fill();
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var padX = w * 0.075;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK.muted;
    ctx.font = font(h * 0.115, 700);
    tracked(ctx, title.toUpperCase(), x + padX, y + h * 0.235, h * 0.02, "left");

    ctx.fillStyle = INK.text;
    ctx.font = font(h * 0.34, 800);
    ctx.textAlign = "left";
    ctx.fillText(value, x + padX, y + h * 0.58);

    /* шкала −10…+10 с засечкой в нуле и заливкой от центра */
    var bx = x + padX, by = y + h * 0.70, bw = w - padX * 2, bh = h * 0.075;
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fill();
    var mid = bx + bw / 2, len = Math.abs(val) / 10 * (bw / 2);
    roundRect(ctx, val < 0 ? mid - len : mid, by, Math.max(len, bh * 0.6), bh, bh / 2);
    ctx.fillStyle = INK.accent;
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillRect(mid - 1, by - bh * 0.5, 2, bh * 2);

    ctx.font = font(h * 0.105, 600);
    ctx.fillStyle = INK.faint;
    ctx.textAlign = "left";
    ctx.fillText(left, bx, y + h * 0.93);
    ctx.textAlign = "right";
    ctx.fillText(right, bx + bw, y + h * 0.93);
    ctx.textAlign = "left";
  }

  /* ---------- строка партии ---------- */
  function drawParty(ctx, x, y, w, h, r, rank){
    ctx.textBaseline = "middle";
    var cy = y + h / 2;

    ctx.font = font(h * 0.4, 800);
    ctx.fillStyle = INK.faint;
    ctx.textAlign = "left";
    ctx.fillText(rank + ".", x, cy);

    var dotX = x + h * 0.62;
    ctx.beginPath();
    ctx.arc(dotX, cy, h * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = r.p.color;
    ctx.fill();

    var nameX = dotX + h * 0.38;
    var pctW = h * 1.5, barW = w * 0.22;
    ctx.font = font(h * 0.4, 700);
    ctx.fillStyle = INK.text;
    ctx.fillText(ellipsis(ctx, r.p.short, w - (nameX - x) - pctW - barW - h * 0.5), nameX, cy);

    var bx = x + w - pctW - barW, bh = h * 0.17;
    roundRect(ctx, bx, cy - bh / 2, barW, bh, bh / 2);
    ctx.fillStyle = "rgba(255,255,255,.09)";
    ctx.fill();
    roundRect(ctx, bx, cy - bh / 2, Math.max(barW * r.match / 100, bh), bh, bh / 2);
    ctx.fillStyle = r.p.color;
    ctx.fill();

    ctx.font = font(h * 0.4, 800);
    ctx.fillStyle = INK.text;
    ctx.textAlign = "right";
    ctx.fillText(r.match + "%", x + w, cy);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  function siteLabel(){
    var host = location.host.replace(/^www\./, "");
    return host || "github.com/Arbuzyakaby/Russian-Political-Compass";
  }

  /* ---------- сборка карточки ---------- */
  function render(canvas, pt, fmt){
    var F = FORMATS[fmt] || FORMATS.square;
    var W = F.w, H = F.h;
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");

    /* фон: диагональный градиент плюс два мягких пятна по углам */
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, INK.bg1);
    g.addColorStop(1, INK.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    [[W * 0.85, H * 0.12, "rgba(167,139,250,.20)"], [W * 0.1, H * 0.95, "rgba(20,184,166,.18)"]]
      .forEach(function(b){
        var rg = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], Math.max(W, H) * 0.55);
        rg.addColorStop(0, b[2]);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      });

    var rank = PC.quiz.ranking(pt);
    var top3 = rank.slice(0, 3);
    var quad = PC.quiz.quadrant(pt.x, pt.y);
    var words = PC.quiz.words(pt);

    var x = F.pad, colW = F.colW;

    drawCompass(ctx, F.compass.x, F.compass.y, F.compass.size, pt,
      top3.map(function(r){ return r.p.id; }));

    /* --- шапка --- */
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK.accent;
    ctx.font = font(F.eyebrow.size, 700);
    tracked(ctx, "ПОЛИТИЧЕСКИЙ КОМПАС ПАРТИЙ РФ", x, F.eyebrow.y, F.eyebrow.size * 0.22, "left");

    ctx.fillStyle = INK.text;
    ctx.font = font(F.title.size, 800);
    var title = quad.charAt(0).toUpperCase() + quad.slice(1);
    ctx.fillText(ellipsis(ctx, title, colW), x, F.title.y);

    ctx.fillStyle = INK.body;
    ctx.font = font(F.sub.size, 500);
    var sub = words.econ.charAt(0).toUpperCase() + words.econ.slice(1) + " взгляды · " + words.state;
    ctx.fillText(ellipsis(ctx, sub, colW), x, F.sub.y);

    /* --- координаты --- */
    var tileW = (colW - F.tiles.gap) / 2;
    drawCoord(ctx, x, F.tiles.y, tileW, F.tiles.h, "Экономика", PC.utils.fmt(pt.x),
      "плановая", "рыночная", pt.x);
    drawCoord(ctx, x + tileW + F.tiles.gap, F.tiles.y, tileW, F.tiles.h, "Государство",
      PC.utils.fmt(pt.y), "свободы", "этатизм", pt.y);

    /* --- ближайшие партии --- */
    ctx.fillStyle = INK.muted;
    ctx.font = font(F.list.head, 700);
    tracked(ctx, "БЛИЖЕ ВСЕГО", x, F.list.headY, F.list.head * 0.22, "left");

    top3.forEach(function(r, i){
      drawParty(ctx, x, F.list.y + i * (F.list.rowH + F.list.gap), colW, F.list.rowH, r, i + 1);
    });

    /* --- подвал --- */
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(F.pad, F.foot.line);
    ctx.lineTo(W - F.pad, F.foot.line);
    ctx.stroke();

    ctx.fillStyle = INK.faint;
    ctx.font = font(F.foot.size, 600);
    ctx.textAlign = "left";
    ctx.fillText("Тест на 40 утверждений · " + siteLabel(), F.pad, F.foot.text);
    ctx.textAlign = "right";
    ctx.fillText("Координаты — экспертная оценка, не агитация", W - F.pad, F.foot.text);
    ctx.textAlign = "left";

    return canvas;
  }

  /* ---------- файл ---------- */
  function toBlob(pt, fmt, cb){
    var canvas = document.createElement("canvas");
    render(canvas, pt, fmt);
    canvas.toBlob(function(blob){ cb(blob); }, "image/png");
  }
  function fileNameFor(fmt){
    var d = new Date(), p = function(n){ return (n < 10 ? "0" : "") + n; };
    return "politcompass-rezultat-" + (FORMATS[fmt] || FORMATS.square).w + "-" +
      d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + ".png";
  }

  function canShareFiles(){
    if(!navigator.share || !navigator.canShare) return false;
    try{
      return navigator.canShare({ files:[new File([new Blob()], "t.png", { type:"image/png" })] });
    }catch(e){ return false; }
  }

  /* ---------- блок в результатах теста ---------- */
  function mount(host, pt){
    if(!host) return;
    var fmt = PC.store.get("pc-share-format", "square");
    if(!FORMATS[fmt]) fmt = "square";

    host.innerHTML =
      '<div class="qr-share-head">' +
        '<h3>Карточка результата</h3>' +
        '<p>Картинка собирается прямо в браузере — можно сохранить или отправить как есть.</p>' +
      '</div>' +
      '<div class="qr-share-tools">' +
        '<div class="fmt-group" role="group" aria-label="Формат картинки">' +
          Object.keys(FORMATS).map(function(k){
            return '<button type="button" class="fmt" data-fmt="' + k + '" title="' +
              PC.utils.esc(FORMATS[k].title) + '" aria-pressed="' + (k === fmt) + '">' +
              FORMATS[k].label + '</button>';
          }).join("") +
        '</div>' +
        '<button type="button" class="btn primary" id="shareSave">Сохранить картинку</button>' +
        (canShareFiles() ? '<button type="button" class="btn" id="shareSend">Поделиться</button>' : "") +
      '</div>' +
      '<div class="qr-share-preview"><canvas id="shareCanvas" aria-label="Предпросмотр карточки результата" role="img"></canvas></div>' +
      '<p class="qr-share-note" id="shareNote">Формат <b>' + FORMATS[fmt].label + '</b> · ' +
        FORMATS[fmt].w + '×' + FORMATS[fmt].h + ' px</p>';

    var canvas = host.querySelector("#shareCanvas");
    var note = host.querySelector("#shareNote");

    function paint(){
      render(canvas, pt, fmt);
      canvas.classList.toggle("wide", fmt === "wide");
      note.innerHTML = "Формат <b>" + FORMATS[fmt].label + "</b> · " +
        FORMATS[fmt].w + "×" + FORMATS[fmt].h + " px";
    }
    paint();
    /* веб-шрифт может доехать позже — тогда карточку рисуем ещё раз,
       иначе в предпросмотре останется системный шрифт */
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(paint);

    host.querySelectorAll(".fmt").forEach(function(b){
      b.addEventListener("click", function(){
        fmt = b.dataset.fmt;
        PC.store.set("pc-share-format", fmt);
        host.querySelectorAll(".fmt").forEach(function(o){
          o.setAttribute("aria-pressed", String(o === b));
        });
        paint();
      });
    });

    host.querySelector("#shareSave").addEventListener("click", function(){
      canvas.toBlob(function(blob){
        if(!blob){
          if(PC.ui) PC.ui.toast("Не удалось собрать картинку", true);
          return;
        }
        var name = fileNameFor(fmt);
        PC.exporter.download(blob, name);
        if(PC.ui) PC.ui.toast("Карточка сохранена: " + name);
      }, "image/png");
    });

    var send = host.querySelector("#shareSend");
    if(send) send.addEventListener("click", function(){
      canvas.toBlob(function(blob){
        if(!blob) return;
        var file = new File([blob], fileNameFor(fmt), { type:"image/png" });
        navigator.share({
          files:[file],
          title:"Мой политический компас",
          text:"Мой результат: " + PC.quiz.quadrant(pt.x, pt.y) + " · экономика " +
               PC.utils.fmt(pt.x) + ", государство " + PC.utils.fmt(pt.y)
        }).catch(function(){ /* пользователь закрыл системное окно — это не ошибка */ });
      }, "image/png");
    });
  }

  PC.share = { mount:mount, render:render, toBlob:toBlob, FORMATS:FORMATS };
})(window.PC = window.PC || {});
