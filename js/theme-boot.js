/* Применяем тему до первой отрисовки, чтобы не было вспышки чужого фона.
   Скрипт загружается в <head> синхронно — намеренно, без defer.

   Хранится не итоговая тема, а предпочтение: "system" | "light" | "dark".
   По умолчанию — "system": берём то, что выставлено в ОС/браузере
   (prefers-color-scheme). В data-theme на <html> кладём уже разрешённое
   значение ("light" | "dark"), поэтому весь остальной код и стили работают
   с двумя состояниями и ничего не знают о системном режиме. */
(function(){
  var pref = "system";
  try{ pref = localStorage.getItem("pc-theme") || "system"; }catch(e){}
  if(pref !== "light" && pref !== "dark" && pref !== "system") pref = "system";

  var resolved = pref;
  if(pref === "system"){
    resolved = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)
      ? "light" : "dark";
  }
  var root = document.documentElement;
  root.dataset.themePref = pref;
  root.dataset.theme = resolved;
})();
