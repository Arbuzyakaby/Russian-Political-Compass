/* ============ Кастомный выпадающий список ============

   Нативный <select> нельзя оформить: браузер рисует и кнопку, и список
   средствами операционной системы, и на тёмной теме страница получала
   светлую системную плашку с чужим шрифтом и чужими радиусами. До 1.6
   таких списка было два — выбор созыва над компасом и выбор партии для
   диаграммы-паука, — и оба выпадали из оформления ровно в тот момент,
   когда на них нажимали.

   Подход здесь — «прогрессивное улучшение поверх настоящего select».
   Разметка в index.html остаётся нативной: без JavaScript страница
   сохраняет работающий список, а поисковик и скринридер видят обычный
   элемент формы. Скрипт прячет его от глаз и от дерева доступности
   (aria-hidden + tabindex="-1") и строит рядом свой listbox с полной
   клавиатурной моделью. Сам <select> при этом остаётся хранилищем
   состояния: значение кладётся в него, и на нём же поднимается событие
   change — поэтому app.js и charts.js не знают, что список подменён,
   и продолжают работать со своим sel.value.

   Обратная сторона: когда значение меняет код (созыв переключается
   кликом по графику динамики, партия — выбором на компасе), события
   change нет, и подпись на кнопке отстала бы. Для этого есть sync():
   она перечитывает <select> целиком, вместе со списком опций.

   Опции могут нести два необязательных атрибута данных:
     data-note  — приписка справа мелким кеглем (годы созыва);
     data-color — цветная метка слева (фирменный цвет партии). ============ */
(function(PC){
  "use strict";
  var esc = PC.utils.esc;
  var instances = [];
  var openOne = null;

  /* Строит собственный список вместо нативного select. */
  function build(native){
    if(!native || native.dataset.xsReady) return null;
    native.dataset.xsReady = "1";

    var wrap = document.createElement("div");
    wrap.className = "xs";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "xs-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    var label = native.getAttribute("aria-label");
    if(label) btn.setAttribute("aria-label", label);
    btn.innerHTML = '<span class="xs-dot" hidden></span><span class="xs-val"></span>' +
                    '<span class="xs-note"></span>' +
                    '<svg class="xs-caret ico" aria-hidden="true" focusable="false"><use href="#i-down"/></svg>';

    var pop = document.createElement("div");
    pop.className = "xs-pop";
    pop.setAttribute("role", "listbox");
    if(label) pop.setAttribute("aria-label", label);
    pop.hidden = true;

    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    wrap.appendChild(btn);
    wrap.appendChild(pop);

    /* Нативный список остаётся в разметке ради состояния, но исчезает
       и с экрана, и из дерева доступности: иначе скринридер объявлял бы
       один и тот же выбор дважды. */
    native.classList.add("xs-native");
    native.setAttribute("aria-hidden", "true");
    native.tabIndex = -1;

    var inst = { native:native, wrap:wrap, btn:btn, pop:pop, options:[] };
    instances.push(inst);

    function paint(){
      var opt = native.options[native.selectedIndex];
      var dot = btn.querySelector(".xs-dot");
      btn.querySelector(".xs-val").textContent = opt ? opt.textContent.split(" · ")[0] : "";
      btn.querySelector(".xs-note").textContent = opt ? (opt.dataset.note || "") : "";
      if(opt && opt.dataset.color){
        dot.hidden = false;
        dot.style.background = opt.dataset.color;
      }else{
        dot.hidden = true;
      }
    }

    function rebuild(){
      pop.replaceChildren();
      Array.prototype.forEach.call(native.options,function(o,i){
        var b=document.createElement("button");
        b.type="button";
        b.className="xs-opt";
        b.setAttribute("role","option");
        b.dataset.i=i;
        b.setAttribute("aria-selected",String(i===native.selectedIndex));
        b.tabIndex=-1;
        function span(cls,text){var e=document.createElement("span");e.className=cls;if(text!=null)e.textContent=text;return e;}
        if(o.dataset.color){var dot=span("xs-dot");dot.style.background=o.dataset.color;b.appendChild(dot);}
        b.appendChild(span("xs-opt-t",o.textContent.split(" · ")[0]));if(o.dataset.note)b.appendChild(span("xs-opt-n",o.dataset.note));
        var svg=PC.utils.el("svg",{class:"xs-tick",viewBox:"0 0 12 12","aria-hidden":"true"});
        svg.appendChild(PC.utils.el("path",{d:"M2.5 6.4 5 8.8 9.5 3.4"}));
        b.appendChild(svg);
        pop.appendChild(b);
      });
      inst.options = Array.prototype.slice.call(pop.querySelectorAll(".xs-opt"));
      inst.options.forEach(function(b){
        b.addEventListener("click", function(){ pick(Number(b.dataset.i)); });
      });
      paint();
    }

    function pick(i){
      if(i < 0 || i >= native.options.length) return;
      var changed = i !== native.selectedIndex;
      native.selectedIndex = i;
      rebuild();
      close(true);
      if(changed) native.dispatchEvent(new Event("change", { bubbles:true }));
    }

    function open(){
      if(!pop.hidden) return;
      if(openOne && openOne !== inst) openOne.close();
      openOne = inst;
      pop.hidden = false;
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      /* Список раскрывается вверх, если снизу не хватает места: над
         компасом он стоит в самом низу липкой панели, и вниз ему часто
         некуда. */
      var box = btn.getBoundingClientRect();
      wrap.classList.toggle("drop-up",
        box.bottom + pop.offsetHeight + 16 > window.innerHeight && box.top > pop.offsetHeight + 16);
      var sel = inst.options[native.selectedIndex] || inst.options[0];
      if(sel) sel.focus({ preventScroll:true });
    }

    function close(focusBtn){
      if(pop.hidden) return;
      pop.hidden = true;
      wrap.classList.remove("is-open", "drop-up");
      btn.setAttribute("aria-expanded", "false");
      if(openOne === inst) openOne = null;
      if(focusBtn) btn.focus({ preventScroll:true });
    }

    inst.close = close;
    inst.sync = rebuild;

    btn.addEventListener("click", function(){ pop.hidden ? open() : close(true); });
    btn.addEventListener("keydown", function(e){
      if(e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " "){
        e.preventDefault();
        open();
      }
    });

    /* Клавиатура внутри списка: стрелки ходят по вариантам, Home/End
       прыгают на края, Enter выбирает, Esc уходит без изменений, а
       Tab закрывает список, не мешая уйти дальше по странице. */
    pop.addEventListener("keydown", function(e){
      var idx = inst.options.indexOf(document.activeElement);
      var step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if(step){
        e.preventDefault();
        var next = inst.options[(idx + step + inst.options.length) % inst.options.length];
        if(next) next.focus({ preventScroll:true });
      }else if(e.key === "Home" || e.key === "End"){
        e.preventDefault();
        inst.options[e.key === "Home" ? 0 : inst.options.length - 1].focus({ preventScroll:true });
      }else if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        if(idx > -1) pick(idx);
      }else if(e.key === "Escape"){
        e.preventDefault();
        close(true);
      }else if(e.key === "Tab"){
        close(false);
      }
    });
    pop.addEventListener("focusout", function(e){
      if(!wrap.contains(e.relatedTarget)) close(false);
    });

    native.addEventListener("change", paint);
    rebuild();
    return inst;
  }

  /* Перечитать список после того, как значение или набор опций поменяли
     из кода. Принимает сам <select> или его id. */
  function sync(target){
    var native = typeof target === "string" ? document.getElementById(target) : target;
    instances.forEach(function(i){ if(i.native === native) i.sync(); });
  }

  function init(root){
    instances = instances.filter(function(i){ if(i.native.isConnected) return true; if(openOne === i){ i.close(false); openOne = null; } return false; });
    (root || document).querySelectorAll("select:not([data-xs-ready]):not([data-native])").forEach(build);
  }

  document.addEventListener("pointerdown", function(e){
    if(openOne && !openOne.wrap.contains(e.target)) openOne.close(false);
  });

  PC.dropdown = { init:init, sync:sync, enhance:build };
})(window.PC = window.PC || {});
