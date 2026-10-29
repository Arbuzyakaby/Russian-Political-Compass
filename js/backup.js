/* ============ Резервная копия данных (4.0, разобрано в 4.2) ============

   Всё, что сайт помнит о посетителе, лежит в localStorage под ключами
   pc-*. Копия — один JSON-файл с этими ключами, восстановление —
   обратная запись. Файл приходит от пользователя, то есть может быть
   чем угодно, поэтому перед записью он целиком проверяется, а при
   сбое посреди записи возвращается прежнее состояние: частично
   восстановленный набор опаснее, чем неудачная попытка.

   Проверка — таблица «ключ → функция»: для каждого ключа своя. Ключ
   без записи в таблице проходит как есть (важны только формат имени и
   размер). Новый ключ хранилища с вложенной структурой получает здесь
   свою строку, а не ещё одно условие в общем выражении. */
(function(PC){
  "use strict";

  var FORMAT = "politcompass-backup";
  var MAX_KEYS = 100;
  var MAX_VALUE = 2000000;
  var QUIZ_MODES = ["short", "full", "long"];
  var THEMES = ["system", "dark", "light", "paper", "alaska", "neon", "fireplace"];
  var LAYOUTS = ["snake", "line", "column", "circle"];
  /* Ключи раздела, которого больше нет: «Моя партия» удалена в 5.0.
     Старая копия с ними не бракуется целиком — они пропускаются при
     восстановлении, остальное ложится как было, а человек получает
     перечень пропущенного. В новые копии они не попадают. */
  var RETIRED = ["pc-my-parties", "pc-party-draft"];
  function retired(key){ return RETIRED.indexOf(key) >= 0; }
  /* То же для настроек: переключатель «Мои партии» и стартовая вкладка
     «Моя партия» в копии 4.x не ошибка, а след удалённого раздела. */
  function cleanSettings(s){
    if(!isObject(s)) return s;
    var out = {};
    Object.keys(s).forEach(function(key){
      if(key === "myParties" || (key === "startTab" && s[key] === "party")) return;
      out[key] = s[key];
    });
    return out;
  }

  function isObject(v){ return !!v && typeof v === "object" && !Array.isArray(v); }

  function isNumber(v){ return typeof v === "number" && isFinite(v); }

  /* точка на поле: обе координаты числа в пределах шкалы ±10 */
  function isPoint(v){
    return isObject(v) && isNumber(v.x) && Math.abs(v.x) <= 10 && isNumber(v.y) && Math.abs(v.y) <= 10;
  }

  /* ответы теста: только известные вопросы, целые значения от −2 до 2 */
  function isAnswers(v){
    if(!isObject(v)) return false;
    var known = PC.quiz.questionsFor("long");
    return Object.keys(v).every(function(id){
      return known.some(function(q){ return q.id === id; }) && Number.isInteger(v[id]) && v[id] >= -2 && v[id] <= 2;
    });
  }

  /* Раскладка SRPC бывает двух форматов: массив из шести точек (до 3.2)
     и объект с числом колонок. Старый формат приводится к новому. */
  function isLayout(raw){
    var layout = Array.isArray(raw) ? { c:3, p:raw } : raw;
    if(!isObject(layout) || !Array.isArray(layout.p) || layout.p.length !== 6) return false;
    var cells = layout.p.every(function(cell){
      return Array.isArray(cell) && cell.length === 2 && cell.every(function(n){ return isNumber(n) && n >= 0 && n <= 1; });
    });
    if(!cells || !Number.isInteger(layout.c) || layout.c < 1 || layout.c > 6) return false;
    if(layout.layout !== undefined && LAYOUTS.indexOf(layout.layout) < 0) return false;
    if(layout.scale !== undefined && (!isNumber(layout.scale) || layout.scale < .2 || layout.scale > 2)) return false;
    return true;
  }

  function settings(value){
    var s = cleanSettings(JSON.parse(value));
    return isObject(s) && Object.keys(s).every(function(key){ return PC.settings.valid(key, s[key]); });
  }

  function quizResult(value){
    var r = JSON.parse(value);
    return isPoint(r) && isAnswers(r.answers) && QUIZ_MODES.indexOf(r.mode) >= 0;
  }

  function quizHistory(value){
    var h = JSON.parse(value);
    return Array.isArray(h) && h.length <= 100 && h.every(isPoint);
  }

  function eggsFound(value){
    var found = JSON.parse(value);
    return Array.isArray(found) && found.every(function(id){ return PC.eggs.IDS.indexOf(id) >= 0; });
  }

  var CHECKS = {
    "pc-settings":     settings,
    "pc-lang":         function(value){ return value === "ru" || value === "en"; },
    "pc-quiz-answers": function(value){ return isAnswers(JSON.parse(value)); },
    "pc-quiz-result":  quizResult,
    "pc-quiz-history": quizHistory,
    "pc-quiz-mode":    function(value){ return QUIZ_MODES.indexOf(value) >= 0; },
    "pc-theme":        function(value){ return THEMES.indexOf(value) >= 0; },
    "pc-eggs-found":   eggsFound,
    "pc-srpc-layout":  function(value){ return isLayout(JSON.parse(value)); },
    "pc-selfvote":     function(value){ return PC.votes.validSelf(JSON.parse(value)); }
  };

  function validKey(key, value){
    if(!/^pc-[a-z0-9-]+$/.test(key) || typeof value !== "string" || value.length > MAX_VALUE) return false;
    if(retired(key)) return true;
    var check = CHECKS[key];
    if(!check) return true;
    try{ return check(value) !== false; }catch(e){ return false; }
  }

  /* Копия всего pc-*; null, если хранилище недоступно (приватный режим). */
  function make(){
    var data = {};
    try{
      for(var i = 0; i < localStorage.length; i++){
        var key = localStorage.key(i);
        if(/^pc-/.test(key) && !retired(key)) data[key] = localStorage.getItem(key);
      }
    }catch(e){ return null; }
    return { format:FORMAT, v:1, version:PC.VERSION, created:new Date().toISOString(), data:data };
  }

  function validate(backup){
    if(!backup || backup.format !== FORMAT || backup.v !== 1 || !isObject(backup.data)) return false;
    var keys = Object.keys(backup.data);
    return keys.length <= MAX_KEYS && keys.every(function(key){ return validKey(key, backup.data[key]); });
  }

  /* Заменяет текущие pc-* содержимым копии. Если запись упала на
     полпути (например, переполнена квота), возвращает то, что было. */
  function restore(backup){
    if(!validate(backup)) return false;
    var before = make();
    if(!before) return false;
    try{
      Object.keys(before.data).forEach(function(key){ localStorage.removeItem(key); });
      Object.keys(backup.data).forEach(function(key){
        if(retired(key)) return;
        var value = backup.data[key];
        if(key === "pc-settings") value = JSON.stringify(cleanSettings(JSON.parse(value)));
        localStorage.setItem(key, value);
      });
      return true;
    }catch(e){
      try{
        Object.keys(backup.data).forEach(function(key){ localStorage.removeItem(key); });
        Object.keys(before.data).forEach(function(key){ localStorage.setItem(key, before.data[key]); });
      }catch(ignore){}
      return false;
    }
  }

  /* Что из копии не будет восстановлено: ключи удалённых разделов. */
  function skipped(backup){
    return backup && isObject(backup.data) ? Object.keys(backup.data).filter(retired) : [];
  }

  PC.backup = { make:make, validate:validate, restore:restore, skipped:skipped, RETIRED:RETIRED };
})(window.PC = window.PC || {});
