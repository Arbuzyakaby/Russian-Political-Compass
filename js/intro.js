/* ============ Блок «О проекте в цифрах» под вкладками (4.4.0.4) ============
   Раньше здесь стоял сплошной текст со ссылкой «Методология…». Теперь у блока
   три части: цифры (берутся из данных, а не пишутся руками), сворачиваемое
   описание и кнопки «что дальше», которые зависят от открытой вкладки.

   Описание лежит в разметке всегда: <details open> остаётся открытым без
   скрипта, а свёрнутый <details> поисковик и скринридер читают так же, как
   открытый. Свёрнутым блок стартует только на телефоне, и выбор человека
   запоминается (pc-intro-open). ============ */
(function(PC){
  "use strict";
  var KEY = "pc-intro-open";
  var PHONE = "(max-width:640px)";

  /* Куда вести дальше. Текущую вкладку в кнопках не предлагаем, а первая
     кнопка — естественный следующий шаг: с компаса и голосований — тест,
     из теста — смотреть результат на компасе. */
  var NEXT = {
    compass:["quiz", "about"],
    quiz:["compass", "about"],
    votes:["quiz", "about"],
    about:["quiz", "compass"]
  };
  var GO = {
    quiz:{ label:"seo.go.quiz", icon:"quiz" },
    compass:{ label:"seo.go.compass", icon:"compass" },
    about:{ label:"seo.go.method", icon:"about", title:"seo.method" }
  };

  function nextFor(tab){ return (NEXT[tab] || NEXT.compass).slice(); }

  /* Цифры блока: те же источники, что у счётчиков на вкладках. */
  function counts(){
    return {
      parties:PC.PARTIES ? PC.PARTIES.length : null,
      seats:PC.TOTAL_SEATS || null,
      votes:PC.VOTES ? PC.VOTES.length : null
    };
  }

  function fillFacts(root){
    var c = counts();
    Object.keys(c).forEach(function(k){
      var node = root.querySelector('[data-si="' + k + '"]');
      if(node && c[k] != null) node.textContent = String(c[k]);
    });
  }

  function fillActions(host){
    host.textContent = "";
    nextFor(PC.nav ? PC.nav.current() : "compass").forEach(function(tab, i){
      var spec = GO[tab];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn" + (i === 0 ? " primary" : "");
      b.innerHTML = PC.icon(spec.icon) + "<span></span>";
      b.lastChild.textContent = PC.t(spec.label);
      if(spec.title) b.title = PC.t(spec.title);
      b.addEventListener("click", function(){ PC.nav.go(tab); });
      host.appendChild(b);
    });
  }

  /* Свёрнутое состояние: сохранённый выбор важнее умолчания. */
  function wantOpen(){
    var saved = PC.store.get(KEY, null);
    if(saved === "1") return true;
    if(saved === "0") return false;
    return !(window.matchMedia && window.matchMedia(PHONE).matches);
  }

  function init(){
    var root = document.getElementById("seoIntro");
    if(!root) return;
    fillFacts(root);
    var more = root.querySelector("#siMore");
    if(more){
      more.open = wantOpen();
      more.addEventListener("toggle", function(){ PC.store.set(KEY, more.open ? "1" : "0"); });
    }
    var host = root.querySelector("#siActions");
    if(host){
      fillActions(host);
      if(PC.nav) PC.nav.onChange(function(){ fillActions(host); });
    }
  }

  PC.intro = { init:init, nextFor:nextFor, counts:counts, KEY:KEY };
})(window.PC = window.PC || {});
