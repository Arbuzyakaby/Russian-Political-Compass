/* Применяем сохранённую тему до отрисовки страницы, чтобы не было вспышки
   тёмной темы у пользователей, выбравших светлую. Скрипт загружается в <head>
   синхронно — намеренно, без defer. */
(function(){
  var t = "dark";
  try{ t = localStorage.getItem("pc-theme") || "dark"; }catch(e){}
  if(t !== "light" && t !== "dark") t = "dark";
  document.documentElement.dataset.theme = t;
})();
