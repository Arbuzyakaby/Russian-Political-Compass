/* The welcome screen needs only storage and translations, not the charts. */
(function(PC){
  "use strict";
  PC.i18n.applyDom(document.getElementById("welcome"));
  document.getElementById("welTour").disabled = true;
  PC.welcome.init();
})(window.PC);
