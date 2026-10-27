/* ============ Работа без сети (4.3) ============
   В собранном пакете (<html data-build="dist">) регистрирует sw.js —
   копию сайта в браузере, с которой он открывается и без интернета.
   В исходниках sw.js нет, поэтому здесь модуль ничего не делает. Нужен
   https: на локальном http-сервере браузерных тестов работник не ставится,
   чтобы уведомление «сайт сохранён» и кэш не вмешивались в проверки.

   При первой установке появляется одно уведомление «сайт сохранён»;
   когда выложена новая версия, а открыта старая, — предложение
   обновить страницу. Наружу ничего не отправляется. ============ */
(function(PC){
  "use strict";

  function supported(){
    return document.documentElement.dataset.build === "dist" && "serviceWorker" in navigator && location.protocol === "https:";
  }

  function offerUpdate(worker){
    PC.ui.toast(PC.t("offline.update"), false, {
      label:PC.t("offline.reload"),
      duration:12000,
      action:function(){ worker.postMessage("skip-waiting"); }
    });
  }

  function init(){
    if(!supported()) return;
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").then(function(reg){
      if(reg.active) hadController = true;          /* жёсткая перезагрузка: страница без работника, но он установлен */
      if(reg.waiting && hadController) offerUpdate(reg.waiting);
      reg.addEventListener("updatefound", function(){
        var worker = reg.installing;
        if(!worker) return;
        worker.addEventListener("statechange", function(){
          if(worker.state !== "installed") return;
          if(hadController) offerUpdate(worker);
          else if(!PC.utils.modalOpen()) PC.ui.toast(PC.t("offline.ready"));
        });
      });
    }).catch(function(){ /* без работника сайт просто работает по сети */ });
    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function(){
      if(!hadController || reloading) return;
      reloading = true;
      location.reload();
    });
  }

  PC.offline = { init:init, supported:supported };
})(window.PC = window.PC || {});
