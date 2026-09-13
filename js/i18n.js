/* ============ ЛОКАЛИЗАЦИЯ: русский и английский ============

   Проект остаётся статической страницей без сборки, поэтому словарь
   лежит прямо в этих же файлах, а не тянется с сервера отдельным JSON:
   лишний запрос ради пары десятков килобайт текста дороже, чем разбор
   большого объекта.

   Сам словарь с 2.3.1 живёт не здесь, а в пяти соседних файлах —
   js/i18n-shell.js, js/i18n-compass.js, js/i18n-quiz.js, js/i18n-about.js,
   js/i18n-misc.js, — каждый со своим куском по смыслу (шапка и настройки;
   компас и аналитика; тест и голосования; экспорт и «О проекте»; подвал,
   соцсети, приветствие и пасхалки). Раньше всё это было одним литералом
   на 1080 строк, и найти нужный ключ в нём означало пролистать файл
   длиннее, чем все остальные модули проекта, кроме этого же самого.
   Файлы со словарём просто дополняют один и тот же объект PC.i18nDict —
   этот модуль читает его целиком, не зная, из скольких файлов он собран.

   Разметка в index.html написана по-русски и помечена атрибутами
   data-i18n. Это осознанный порядок: без JavaScript и для поисковика
   страница остаётся полноценным русским документом, а английский —
   слой поверх, который накладывается при загрузке. Обратный вариант
   (пустая разметка, всё из словаря) сделал бы страницу без скриптов
   пустой, а проект уже обещает в <noscript> обратное.

   Смена языка перезагружает страницу. Компас, графики и экраны теста
   строятся один раз при инициализации и держат текст внутри готовой
   разметки; делать каждый модуль реактивным ради переключателя, которым
   пользуются один раз за визит, значит усложнить весь код ради редкого
   действия. Перезагрузка сохраняет вкладку (она в хеше) и все ответы
   теста (они в localStorage), поэтому со стороны это выглядит как
   мгновенная подмена языка. ============ */
(function(PC){
  "use strict";

  var KEY = "pc-lang";
  var LANGS = ["ru", "en"];
  var DEFAULT = "ru";

  /* Значение-массив в словаре — форма множественного числа: для
     русского три формы (1 / 2–4 / 5+), для английского две (1 / прочее).
     Собирается из пяти файлов js/i18n-*.js — все они обязаны загрузиться
     до этого модуля, иначе DICT окажется пустым. */
  var DICT = PC.i18nDict || {};

  /* ---------- состояние ---------- */
  var lang = DEFAULT;

  function safeGet(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }
  function safeSet(key, value){
    try{ localStorage.setItem(key, value); }catch(e){ /* приватный режим */ }
  }

  /* Порядок источников от явного к неявному: выбор пользователя важнее
     ссылки, ссылка важнее настроек браузера. */
  function detect(){
    /* Порядок источников: адрес, сохранённый выбор, язык браузера.
       Адрес идёт первым, и это не мелочь. На него указывают hreflang
       в <head>: поисковику обещано, что ?lang=en — это английская
       версия страницы. Если запомненный выбор перебивает параметр,
       обещание нарушается для всех, кто уже был на сайте, а ссылка
       «посмотри английскую версию», отправленная в переписке, молча
       открывает русскую. Явное указание в ссылке — намерение
       отправителя, и оно сильнее прошлого выбора получателя.

       Пришедший из адреса язык тут же запоминается: иначе следующая
       страница без параметра вернула бы прежний, и переключение
       выглядело бы как сбой. */
    var m = /[?&]lang=([a-z-]+)/i.exec(location.search + location.hash);
    if(m){
      var v = m[1].toLowerCase().slice(0, 2);
      if(LANGS.indexOf(v) > -1){
        safeSet(KEY, v);
        return v;
      }
    }

    var stored = safeGet(KEY);
    if(LANGS.indexOf(stored) > -1) return stored;

    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    /* русский интерфейс — умолчание для русскоязычных и для всех, чей
       язык мы не знаем: проект в первую очередь про российскую политику */
    if(/^(ru|be|uk|kk|ky|uz|tg|hy|az|mo)/i.test(nav)) return "ru";
    return /^en/i.test(nav) ? "en" : DEFAULT;
  }

  function current(){ return lang; }
  function isRu(){ return lang === "ru"; }

  /* ---------- подстановка ---------- */
  function fill(str, vars){
    if(!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function(all, k){
      return vars[k] === undefined ? all : String(vars[k]);
    });
  }

  function raw(key){
    var entry = DICT[key];
    if(!entry) return null;
    return entry[lang === "ru" ? 0 : 1];
  }

  /* Ключ без перевода возвращается как есть и заметен на экране —
     это дешевле, чем молча показать пустоту. */
  function t(key, vars){
    var v = raw(key);
    if(v === null || v === undefined) return key;
    if(Array.isArray(v)) return v[0];
    return fill(v, vars);
  }

  /* Форма множественного числа. Русские правила — три формы, английские
     две; выбор индекса зависит от языка, а не от вызывающего кода. */
  function ruIndex(n){
    var a = n % 10, b = n % 100;
    if(a === 1 && b !== 11) return 0;
    if(a >= 2 && a <= 4 && (b < 10 || b >= 20)) return 1;
    return 2;
  }
  function pl(n, key){
    var forms = raw(key);
    if(!Array.isArray(forms)) return t(key);
    return lang === "ru" ? forms[ruIndex(n)] : forms[n === 1 ? 0 : 1];
  }
  /* «5 мандатов» / «5 seats» одной строкой */
  function n(count, key){ return count + " " + pl(count, key); }

  /* ---------- перевод полей данных ----------
     Данные хранятся по-русски, а английские варианты лежат в поле en
     того же объекта. Отсутствие перевода — не ошибка: имя собственное
     вроде «ЛДПР» одинаково в обоих языках, и дублировать его в словаре
     значило бы держать две копии одной строки. */
  function L(obj, field){
    if(!obj) return "";
    if(lang !== "ru" && obj.en && obj.en[field] !== undefined && obj.en[field] !== null){
      return obj.en[field];
    }
    return obj[field];
  }

  /* ---------- разметка ----------
     data-i18n          — текстовое содержимое узла
     data-i18n-html     — то же, но со вставкой разметки (в словаре есть <b>)
     data-i18n-attr     — "placeholder:search.placeholder;title:trails.title"
     Русский текст остаётся в HTML и подменяется только при lang !== ru,
     поэтому для русского эта функция не трогает ни один узел. */
  function applyDom(root){
    var scope = root || document;

    scope.querySelectorAll("[data-i18n]").forEach(function(node){
      var v = raw(node.dataset.i18n);
      if(v === null || v === undefined || Array.isArray(v)) return;
      node.textContent = v;
    });
    scope.querySelectorAll("[data-i18n-html]").forEach(function(node){
      var v = raw(node.dataset.i18nHtml);
      if(v === null || v === undefined || Array.isArray(v)) return;
      node.innerHTML = v;
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach(function(node){
      node.dataset.i18nAttr.split(";").forEach(function(pair){
        var parts = pair.split(":");
        if(parts.length !== 2) return;
        var v = raw(parts[1].trim());
        if(v === null || v === undefined || Array.isArray(v)) return;
        node.setAttribute(parts[0].trim(), v);
      });
    });
  }

  /* ---------- переключатель ---------- */
  function set(next){
    if(LANGS.indexOf(next) === -1 || next === lang) return;
    safeSet(KEY, next);
    /* Перезагрузка вместо перерисовки — см. комментарий в шапке файла.
       Хеш сохраняется сам, поэтому человек остаётся на своей вкладке. */
    location.reload();
  }
  function toggle(){ set(lang === "ru" ? "en" : "ru"); }

  /* Переключатель языка живёт в меню настроек и устроен так же, как
     переключатель темы: не кнопка «другой язык», а два видимых
     положения. Кнопка «EN» в шапке до 1.6 не показывала текущий выбор,
     а только предлагала противоположный — по ней нельзя было понять,
     на каком языке ты сейчас, не прочитав саму страницу. */
  function initSwitch(){
    var seg = document.getElementById("langSeg");
    if(!seg) return;
    seg.querySelectorAll("[data-val]").forEach(function(b){
      var on = b.dataset.val === lang;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
      b.addEventListener("click", function(){ set(b.dataset.val); });
      b.addEventListener("keydown", function(e){
        if(e.key !== "ArrowRight" && e.key !== "ArrowLeft" &&
           e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        set(lang === "ru" ? "en" : "ru");
      });
    });
  }

  /* Метаданные страницы: язык документа влияет на переносы, синтез речи
     и на то, каким документ увидит поисковик, а description — на сниппет. */
  function initDocument(){
    document.documentElement.lang = lang;
    var desc = document.querySelector('meta[name="description"]');
    if(desc && lang !== "ru") desc.setAttribute("content", t("doc.desc"));
    var og = document.querySelector('meta[property="og:locale"]');
    if(og) og.setAttribute("content", lang === "ru" ? "ru_RU" : "en_US");
  }

  function init(){
    initDocument();
    applyDom();
    initSwitch();
  }

  /* Язык определяется сразу при загрузке файла: модули, которые строят
     разметку в своих init(), уже спрашивают t() и должны получить ответ
     на нужном языке, а не на умолчании. */
  lang = detect();

  PC.i18n = { init:init, applyDom:applyDom, t:t, pl:pl, n:n, L:L,
              current:current, isRu:isRu, set:set, toggle:toggle, LANGS:LANGS,
              /* Запись словаря целиком, обе локали сразу: raw() отдаёт
                 строку на текущем языке, а проверкам нужно сверять
                 перевод с переводом — например, что подсказка к номеру
                 версии упоминает его и по-русски, и по-английски. */
              entry:function(key){ return DICT[key]; } };
  /* Короткие псевдонимы: t() и L() зовутся из каждого модуля десятки раз,
     и PC.i18n.t на каждой строке читался бы хуже самой строки. */
  PC.t = t;
  PC.L = L;
})(window.PC = window.PC || {});
