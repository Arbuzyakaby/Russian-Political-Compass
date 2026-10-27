/* ============ PC.tisza — запуск интерфейса 4.0 (разобрано в 4.2) ============

   В 4.0 здесь жили палитра команд, резервные копии, настройки и жесты
   карты. В 4.2 всё это разнесено по своим файлам — js/palette.js,
   js/backup.js, js/map-controls.js и js/settings.js, — а этот остаётся
   тонкой обёрткой: порядок запуска и прежние имена PC.tisza.*, на
   которые ссылаются тесты и js/app.js. */
(function(PC){
  "use strict";

  /* Настройки, меняющие рисунок карты, требуют перерисовки; чип «Мои
     партии» над картой повторяет их значение. */
  var REDRAW_KEYS = ["*", "dotSize", "labelMode", "bubbles", "myParties", "colorblind"];

  function init(){
    PC.settings.extend();
    PC.mapControls.init();
    PC.palette.init();
    document.addEventListener("pc:settings", function(e){
      if(REDRAW_KEYS.indexOf(e.detail.key) === -1) return;
      PC.compass.redraw();
      var chip = document.getElementById("myPartiesLayer");
      if(chip) chip.setAttribute("aria-pressed", String(PC.settings.get("myParties") === "on"));
    });
    /* стартовый созыв из настроек действует до первого перехода по ссылке */
    var stored = PC.store.getJSON("pc-settings", {}), convocation = Number(stored.convDefault);
    if(PC.CONVOCATIONS.some(function(c){ return c.id === convocation; })) PC.setConvocation(convocation);
    if(!location.hash) PC.nav.go(PC.nav.current());
    if(location.hash === "#/srpc") PC.srpc.open();
    var about = document.querySelector(".srpc-chain") || document.querySelector(".chain");
    if(!about) return;
    var open = document.createElement("button");
    open.type = "button";
    open.className = "btn small";
    open.textContent = PC.t("srpc.open");
    open.addEventListener("click", function(){ PC.srpc.open(); });
    about.parentNode.appendChild(open);
  }

  PC.tisza = {
    init:init,
    openPalette:function(){ PC.palette.open(); },
    backup:function(){ return PC.backup.make(); },
    validateBackup:function(data){ return PC.backup.validate(data); },
    restore:function(data){ return PC.backup.restore(data); }
  };
})(window.PC = window.PC || {});
