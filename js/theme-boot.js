/* Применяем тему до первой отрисовки, чтобы не было вспышки чужого фона.
   Скрипт загружается в <head> синхронно — намеренно, без defer.

   Хранится не итоговая тема, а предпочтение: "system" либо имя одной
   из шести тем. По умолчанию — "system": берём светлую или тёмную по
   настройке ОС (prefers-color-scheme).

   На <html> кладутся два атрибута, и это разные вещи:
     data-theme  — имя темы, на него смотрят стили;
     data-scheme — её светлота, "light" или "dark", на неё смотрит код,
                   которому нужно знать только это (расчёт цвета марок
                   на графиках). Без разделения график пришлось бы учить
                   списку тем, и каждая новая ломала бы его молча.

   Таблица тем продублирована в js/theme.js: этот файл обязан быть
   самодостаточным и синхронным, а тот подключается в конце страницы.
   Расхождение поймает тест. */
(function(){
  var SCHEME = {
    light:"light", dark:"dark",
    paper:"light", alaska:"light",
    neon:"dark",   fireplace:"dark"
  };

  var pref = "system";
  try{ pref = localStorage.getItem("pc-theme") || "system"; }catch(e){}
  if(pref !== "system" && !SCHEME[pref]) pref = "system";

  var name = pref;
  if(pref === "system"){
    name = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)
      ? "light" : "dark";
  }
  var root = document.documentElement;
  root.dataset.themePref = pref;
  root.dataset.theme = name;
  root.dataset.scheme = SCHEME[name];
})();
