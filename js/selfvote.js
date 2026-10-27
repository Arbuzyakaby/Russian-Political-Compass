/* ============ Голосую сам (4.3) ============
   Посетитель сам голосует по тем же законопроектам, что и фракции
   на вкладке «Голосования»: «за», «против» или «воздержался», можно
   пропустить. Справа растёт рейтинг фракций по доле совпавших голосов —
   то есть сравнение не по словам, как в тесте, а по поступкам.

   Счёт ведётся по тем же правилам, что матрица совпадений: голосование
   учитывается, только если известны и ответ посетителя, и позиция
   фракции («разделились», «нет фракции» и «нет данных» не считаются).

   Ответы хранятся в localStorage под ключом pc-selfvote и попадают
   в резервную копию. score() — чистая функция, её проверяют тесты. ============ */
(function(PC){
  "use strict";
  var t = PC.t, L = PC.L;
  var KEY = "pc-selfvote";
  var CHOICES = ["for", "against", "abstain"];
  var COUNTED = { "for":1, "against":1, "abstain":1 };

  /* Проверяется форма и значения. Id законопроекта не сверяется с данными:
     если голосование уберут из набора или копия пришла из более новой
     версии, лишний ответ просто не участвует в счёте (load его отбросит). */
  function valid(raw){
    if(!raw || typeof raw !== "object" || raw.v !== 1 || !raw.votes || typeof raw.votes !== "object" || Array.isArray(raw.votes)) return false;
    var ids = Object.keys(raw.votes);
    return ids.length <= 500 && ids.every(function(id){
      return /^[a-z0-9-]{1,64}$/.test(id) && CHOICES.indexOf(raw.votes[id]) >= 0;
    });
  }

  function load(){
    var raw = PC.store.getJSON(KEY, null), out = {};
    if(!valid(raw)) return out;
    PC.VOTES.forEach(function(v){ if(raw.votes[v.id]) out[v.id] = raw.votes[v.id]; });
    return out;
  }

  /* Рейтинг фракций по совпадению с ответами. Партии без единого общего
     голосования в список не попадают: процент от нуля голосов не значит
     ничего. Порядок — по доле, при равенстве — по числу общих. */
  function score(votes){
    return PC.PARTIES.map(function(p){
      var same = 0, common = 0;
      PC.VOTES.forEach(function(v){
        var mine = votes[v.id], theirs = PC.voteStance(v, p);
        if(!mine || !COUNTED[theirs]) return;
        common++;
        if(mine === theirs) same++;
      });
      return { p:p, same:same, common:common, ratio:common ? same / common : null };
    }).filter(function(r){ return r.common > 0; })
      .sort(function(a, b){ return b.ratio - a.ratio || b.common - a.common; });
  }

  /* ---------- раздел ---------- */
  var host, votes = {}, current = 0, order = [];

  function esc(s){ return PC.utils.esc(s); }

  function save(){ PC.store.setJSON(KEY, { v:1, votes:votes }); }

  function answered(){ return order.filter(function(v){ return votes[v.id]; }).length; }

  function firstOpen(from){
    for(var i = 0; i < order.length; i++){
      var j = (from + i) % order.length;
      if(!votes[order[j].id]) return j;
    }
    return -1;
  }

  function billCard(){
    if(current < 0) return '<div class="sv-done">' + PC.icon("check-circle") + "<p>" + esc(t("sv.done", { n:order.length })) + "</p>" +
      '<button type="button" class="btn small" data-sv="review">' + esc(t("sv.review")) + "</button></div>";
    var v = order[current], mine = votes[v.id];
    return '<article class="sv-bill" aria-labelledby="svTitle">' +
      '<p class="sv-meta">' + esc(t("sv.of", { k:current + 1, n:order.length })) + " · " + esc(v.date.slice(0, 4)) + "</p>" +
      '<h4 id="svTitle" tabindex="-1">' + esc(L(v, "title")) + "</h4>" +
      '<p class="sv-summary">' + esc(L(v, "summary")) + "</p>" +
      '<div class="sv-choices" role="group" aria-label="' + esc(t("sv.choose")) + '">' +
        CHOICES.map(function(c){
          return '<button type="button" class="sv-choice st-' + c + '" data-choice="' + c + '" aria-pressed="' + (mine === c) + '">' +
            esc(t("sv." + c)) + "</button>";
        }).join("") +
      "</div>" +
      '<div class="sv-nav">' +
        '<button type="button" class="btn small ghost" data-sv="prev"' + (current === 0 ? " disabled" : "") + ">" +
          PC.icon("back") + "<span>" + esc(t("sv.prev")) + "</span></button>" +
        '<button type="button" class="btn small ghost" data-sv="skip">' + "<span>" + esc(t("sv.skip")) + "</span>" + PC.icon("next") + "</button>" +
      "</div></article>";
  }

  function results(){
    var n = answered();
    if(!n) return '<div class="sv-empty">' + PC.icon("ballot") + "<p>" + esc(t("sv.empty")) + "</p></div>";
    var rows = score(votes);
    if(!rows.length) return '<div class="sv-empty"><p>' + esc(t("sv.noCommon")) + "</p></div>";
    var best = rows[0];
    return '<p class="sv-lead" role="status">' + esc(t("sv.closest", { party:L(best.p, "short"), p:Math.round(best.ratio * 100) })) + "</p>" +
      '<ol class="sv-rank">' + rows.map(function(r){
        var pct = Math.round(r.ratio * 100);
        return '<li class="' + (r.common <= 3 ? "is-thin" : "") + '" style="--c:' + esc(r.p.color) + '">' +
          '<span class="sv-dot" aria-hidden="true"></span><span class="sv-name">' + esc(L(r.p, "short")) + "</span>" +
          '<span class="sv-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
          '<b class="sv-pct">' + pct + '%</b><small class="sv-k">' + esc(t("votes.ofVotes", { k:r.same, n:r.common })) + "</small></li>";
      }).join("") + "</ol>" +
      (rows.some(function(r){ return r.common <= 3; }) ? '<p class="sv-hint">' + esc(t("sv.thin")) + "</p>" : "") +
      '<button type="button" class="btn small ghost sv-reset" data-sv="reset">' + PC.icon("reset") + "<span>" + esc(t("sv.reset")) + "</span></button>";
  }

  function render(focus){
    if(!host) return;
    var n = answered();
    host.querySelector(".sv-progress i").style.width = (n / order.length * 100).toFixed(1) + "%";
    host.querySelector(".sv-count").textContent = t("sv.count", { k:n, n:order.length });
    host.querySelector(".sv-main").innerHTML = billCard();
    host.querySelector(".sv-results").innerHTML = results();
    if(focus){
      var title = host.querySelector("#svTitle") || host.querySelector(".sv-done .btn");
      if(title) title.focus({ preventScroll:true });
    }
  }

  function choose(choice, btn){
    var v = order[current];
    if(!v) return;
    var wasDone = firstOpen(0) < 0;
    votes[v.id] = choice;
    save();
    /* Пока не всё отвечено — к следующему открытому; при пересмотре
       готового набора — просто к следующему законопроекту по порядку. */
    var next = wasDone ? (current + 1 < order.length ? current + 1 : -1) : firstOpen(current + 1);
    current = next;
    render(true);
    /* render() пересобрал карточку: отклик успеха — на выбранной кнопке
       нового законопроекта нет, поэтому на счётчике прогресса */
    if(PC.spring) PC.spring.done(host.querySelector(".sv-progress"));
    if(next < 0 && !wasDone && PC.ui) PC.ui.toast(t("sv.finished"));
  }

  function onClick(e){
    var c = e.target.closest("[data-choice]");
    if(c){ choose(c.dataset.choice, c); return; }
    var a = e.target.closest("[data-sv]");
    if(!a) return;
    var act = a.dataset.sv;
    if(act === "prev" && current > 0){ current--; render(true); }
    else if(act === "prev" && current < 0){ current = order.length - 1; render(true); }
    else if(act === "skip"){ current = current + 1 < order.length ? current + 1 : 0; render(true); }
    else if(act === "review"){ current = 0; render(true); }
    else if(act === "reset"){
      var before = votes;
      votes = {}; save(); current = 0; render(true);
      PC.ui.toast(t("sv.cleared"), false, { label:t("party.undo"), duration:5000,
        action:function(){ votes = before; save(); current = firstOpen(0); render(); } });
    }
  }

  function init(){
    host = document.getElementById("selfVote");
    if(!host || !PC.VOTES) return;
    order = PC.VOTES.slice();
    votes = load();
    current = firstOpen(0);
    host.addEventListener("click", onClick);
    render(false);
  }

  /* Для «Стереть всё» в настройках: модуль держит ответы в памяти. */
  function clearLocal(){ votes = {}; current = 0; render(false); }

  PC.selfVote = { init:init, score:score, valid:valid, clearLocal:clearLocal, KEY:KEY };
})(window.PC = window.PC || {});
