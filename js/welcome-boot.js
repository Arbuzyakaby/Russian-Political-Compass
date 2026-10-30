/* Приветствию нужны только хранилище и переводы, а не графики: поэтому оно
   запускается отдельным файлом и не ждёт остальные модули. */
(function(PC){
  "use strict";
  PC.i18n.applyDom(document.getElementById("welcome"));
  document.getElementById("welGuide").disabled = true;
  PC.welcome.init();
})(window.PC);
