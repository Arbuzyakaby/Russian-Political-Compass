/* ============ Общие утилиты, хранилище и геометрия компаса ============ */
(function(PC){
  "use strict";

  /* Система координат SVG: viewBox 0 0 SIZE SIZE, поле отступает на PAD
     от края, шкала −10…+10 растягивается на (SIZE/2 − PAD) пикселей. */
  var SIZE = 660, PAD = 76, C = SIZE / 2, K = (SIZE / 2 - PAD) / 10;
  var NS = "http://www.w3.org/2000/svg";

  /* значение шкалы -> координата SVG (ось Y направлена вниз, поэтому минус) */
  function px(x, y){ return { sx: C + x * K, sy: C - y * K }; }

  /* "+3.2" / "-8.0" — знак всегда явный, один знак после запятой */
  function fmt(v){ return (v > 0 ? "+" : "") + v.toFixed(1); }

  /* радиус точки растёт от числа мандатов, но не бесконечно */
  function radius(seats){ return 9 + Math.min(6, Math.sqrt(seats || 0) * 0.36); }

  function clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }

  /* окончание слова «мандат» для русского счёта: 1 мандат, 2 мандата, 5 мандатов */
  function plural(n){
    var a = n % 10, b = n % 100;
    if(a === 1 && b !== 11) return "";
    if(a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "а";
    return "ов";
  }
  function seatsLabel(n){ return n ? n + " мандат" + plural(n) : "нет мандатов"; }

  /* общий склонятель: word(5, ["вопрос","вопроса","вопросов"]) -> "вопросов" */
  function word(n, forms){
    var a = n % 10, b = n % 100;
    if(a === 1 && b !== 11) return forms[0];
    if(a >= 2 && a <= 4 && (b < 10 || b >= 20)) return forms[1];
    return forms[2];
  }

  /* создание SVG-элемента с атрибутами и (необязательно) текстом */
  function el(tag, attrs, text){
    var e = document.createElementNS(NS, tag);
    attrs = attrs || {};
    for(var k in attrs) e.setAttribute(k, attrs[k]);
    if(text != null) e.textContent = text;
    return e;
  }

  /* экранирование для вставки строк в innerHTML */
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  /* localStorage бросает исключение в приватном режиме и при запрете
     сторонних данных — единая безопасная обёртка вместо try/catch
     в каждом месте вызова. */
  var store = {
    get: function(key, fallback){
      try{
        var v = localStorage.getItem(key);
        return v === null ? fallback : v;
      }catch(e){ return fallback; }
    },
    set: function(key, value){
      try{ localStorage.setItem(key, value); return true; }catch(e){ return false; }
    },
    remove: function(key){
      try{ localStorage.removeItem(key); return true; }catch(e){ return false; }
    },
    getJSON: function(key, fallback){
      var raw = store.get(key, null);
      if(raw === null) return fallback;
      try{ return JSON.parse(raw); }catch(e){ return fallback; }
    },
    setJSON: function(key, value){
      try{ return store.set(key, JSON.stringify(value)); }catch(e){ return false; }
    }
  };

  PC.geom  = { SIZE:SIZE, PAD:PAD, C:C, K:K, NS:NS, px:px, radius:radius };
  PC.utils = { fmt:fmt, plural:plural, word:word, seatsLabel:seatsLabel,
               el:el, esc:esc, clamp:clamp };
  PC.store = store;
})(window.PC = window.PC || {});
