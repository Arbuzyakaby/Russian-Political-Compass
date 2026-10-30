/* ============ Данные: тест по разделу «О проекте» ============

   Двенадцать вопросов о том, как устроен сам проект. Это не второй
   политический тест: у него нет ни координат, ни результата, который
   можно кому-то показать, — он проверяет, что из прочитанного осталось,
   и ничего больше. Поэтому и ссылки на результат у него нет: делиться
   отметкой о прочтении не с кем.

   Главное правило набора: ответ на каждый вопрос написан в тексте той
   карточки, чей id стоит в поле card. Не «выводится из неё», не
   «следует из общего смысла», а написан — так, что читатель, который
   дошёл до этой карточки, отвечает, а не угадывает. Правило держится
   тестом (tests/page.test.js проверяет, что такой id в разметке есть),
   но саму связку «ответ ↔ абзац» проверить машиной нельзя: если абзац
   переписан, вопрос надо править руками. Это цена того, что тест
   спрашивает о содержании, а не о наличии ключей.

   Формат записи:

     id    — короткое имя вопроса, не показывается;
     card  — id карточки раздела, в которой лежит ответ; по нему же
             строится ссылка «читать в разделе»;
     q     — вопрос;  qEn — то же по-английски;
     a     — варианты ответа; aEn — то же по-английски;
     ok    — индекс верного варианта в a;
     why   — разбор: почему верный вариант верный; whyEn — по-английски.

   Порядок вопросов повторяет порядок карточек в разделе: человек,
   который только что прочитал раздел сверху вниз, идёт по тесту в том
   же направлении. ============ */
(function(PC){
  "use strict";

  PC.ABOUT_QUIZ = [
    {
      id:"axes", card:"axes",
      q:"Почему у компаса две оси, а не одна шкала «левые — правые»?",
      qEn:"Why does the compass have two axes instead of a single left–right scale?",
      a:[
        "Так принято во всех политических компасах, и менять формат незачем",
        "Отношение к собственности и отношение к принуждению в жизни не связаны, и на одной шкале они бы слиплись",
        "Одна ось описывает партии, вторая — людей вне партий"
      ],
      aEn:[
        "Every political compass does it this way, so there is no reason to change the format",
        "Attitudes to property and attitudes to coercion are unrelated in practice, and a single scale would fuse them together",
        "One axis describes parties, the other describes individuals outside them"
      ],
      ok:1,
      why:"Оси независимы намеренно: партия может требовать национализации и при этом выступать за честные выборы. Таких сочетаний в российской политике достаточно, и одномерная шкала свела бы их к одной точке.",
      whyEn:"The axes are independent by design: a party can demand nationalisation and campaign for fair elections at the same time. Russian politics has plenty of such combinations, and a one-dimensional scale would collapse them into a single point."
    },
    {
      id:"points", card:"method",
      q:"Что означает полая точка партии рядом со сплошной?",
      qEn:"What does a party's hollow dot next to the solid one mean?",
      a:[
        "Прежнюю позицию партии, которую она потом сменила",
        "Заявленную позицию — по названию, уставу и предвыборной риторике; стрелка между точками показывает разрыв между словом и делом",
        "Позицию, которую партии присвоили участники теста"
      ],
      aEn:[
        "The party's former position, which it later abandoned",
        "The declared position — by the party's name, charter and campaign rhetoric; the arrow between the dots shows the gap between word and deed",
        "A position assigned to the party by quiz participants"
      ],
      ok:1,
      why:"Сплошная точка — реальная позиция, выведенная из всех четырёх источников; полая — заявленная, то есть по одному третьему источнику, взятому отдельно. Чем длиннее стрелка между ними, тем больше расхождение между словом и делом.",
      whyEn:"The solid dot is the real position derived from all four sources; the hollow one is the declared position, taken from the third source alone. The longer the arrow between them, the wider the gap between word and deed."
    },
    {
      id:"sub", card:"sub",
      q:"Как шесть под-осей связаны с точкой партии на компасе?",
      qEn:"How do the six sub-axes relate to a party's point on the compass?",
      a:[
        "Никак: под-оси — отдельная оценка, сделанная другим способом",
        "Среднее трёх под-осей равно координате партии по этой оси — это требование к данным",
        "Под-оси считаются из координаты делением на три"
      ],
      aEn:[
        "They do not: the sub-axes are a separate estimate made by a different method",
        "The mean of three sub-axes equals the party's coordinate on that axis — it is a requirement on the data",
        "The sub-axes are derived from the coordinate by dividing it by three"
      ],
      ok:1,
      why:"Под-оси обязаны объяснять точку, а не жить своей жизнью: три экономические в среднем дают X, три политические — Y. Обратное неверно — из одной координаты три шкалы не вывести, иначе они не добавляли бы ничего нового.",
      whyEn:"The sub-axes must explain the point rather than lead a life of their own: the three economic ones average to X, the three political ones to Y. The reverse does not hold — three scales cannot be derived from one coordinate, or they would add nothing."
    },
    {
      id:"votes", card:"votes",
      q:"Почему расстояние между партиями на компасе не всегда совпадает с тем, как они голосуют?",
      qEn:"Why does the distance between parties on the compass not always match how they vote?",
      a:[
        "Потому что голосования в таблице приведены с ошибками",
        "Расстояние на поле измеряет программы, матрица совпадений — поведение, и совпадают они не всегда",
        "Потому что компас учитывает только голосования, а программы не учитывает"
      ],
      aEn:[
        "Because the votes in the table contain errors",
        "Distance on the board measures programmes, the agreement matrix measures behaviour, and the two do not always coincide",
        "Because the compass counts only votes and ignores programmes"
      ],
      ok:1,
      why:"ЛДПР и «Справедливая Россия» стоят далеко друг от друга, но разошлись лишь в одном голосовании из двадцати общих, а с ближайшей «Единой Россией» ЛДПР расходилась в пяти из двадцати трёх.",
      whyEn:"LDPR and A Just Russia stand far apart, yet they split in only one vote out of twenty they had in common, while LDPR split with the nearest party, United Russia, in five out of twenty-three."
    },
    {
      id:"weight", card:"quiz",
      q:"Все ли утверждения теста весят одинаково?",
      qEn:"Do all the quiz statements carry the same weight?",
      a:[
        "Да, иначе результат зависел бы от мнения автора о важности вопросов",
        "Нет: пять ключевых утверждений весят 1.3 против 1 у остальных",
        "Нет: вес утверждения растёт с номером — последние весят больше первых"
      ],
      aEn:[
        "Yes, otherwise the result would depend on the author's view of which questions matter",
        "No: five key statements carry a weight of 1.3 against 1 for the rest",
        "No: the weight grows with the statement number — the last ones weigh more than the first"
      ],
      ok:1,
      why:"Повышенный вес стоит у тех утверждений, которые разводят позиции сильнее прочих, — например, у национализации и вертикали власти. Их пять, и они входят во все три версии теста, включая короткую.",
      whyEn:"The raised weight sits on the statements that separate positions most sharply — nationalisation and the power vertical, for instance. There are five of them, and they appear in all three versions of the quiz, the short one included."
    },
    {
      id:"scale", card:"quiz",
      q:"Версий теста три — на 90, 40 и 20 утверждений. Что у них общего?",
      qEn:"There are three versions of the quiz — 90, 40 and 20 statements. What do they share?",
      a:[
        "Только тема: каждая версия считается по своей шкале и даёт свою точку",
        "Одна шкала: это три вложенные выборки одного набора, и результат любой из них лежит на том же поле",
        "Общее число утверждений: длинная версия просто повторяет короткую трижды"
      ],
      aEn:[
        "Only the subject: each version has its own scale and gives its own point",
        "A single scale: they are three nested selections of one set, and a result from any of them lands on the same board",
        "The total number of statements: the long version simply repeats the short one three times"
      ],
      ok:1,
      why:"Короткая версия целиком входит в стандартную, стандартная — в расширенную. Разница между ними — разрешение, а не строгость: чем больше утверждений, тем меньше луч на диаграмме-пауке зависит от формулировки одного вопроса.",
      whyEn:"The short version is contained in the standard one, the standard in the extended. The difference between them is resolution, not severity: the more statements, the less a spoke on the radar depends on the wording of any single question."
    },
    {
      id:"not", card:"limits",
      q:"Что из перечисленного проект про себя не утверждает?",
      qEn:"Which of the following does the project not claim about itself?",
      a:[
        "Что его координаты — единственно верные",
        "Что две оси — осознанное упрощение",
        "Что материал справочный, а не агитационный"
      ],
      aEn:[
        "That its coordinates are the only correct ones",
        "That two axes are a deliberate simplification",
        "That the material is reference, not campaigning"
      ],
      ok:0,
      why:"Координаты — экспертная оценка, открытая к аргументам: у каждой партии в карточке есть письменное обоснование, и спорить предлагается именно с ним. Два других утверждения проект о себе как раз делает.",
      whyEn:"The coordinates are an expert estimate open to argument: every party card carries written reasoning, and that is what you are invited to dispute. The other two statements are ones the project does make about itself."
    },
    {
      id:"server", card:"tech",
      q:"Где считается всё, что показано на странице?",
      qEn:"Where is everything shown on the page computed?",
      a:[
        "На сервере проекта, который отдаёт готовые картинки графиков",
        "В браузере: страница статическая, без сборки, фреймворков и зависимостей",
        "Наполовину: компас рисуется в браузере, аналитика приходит запросом"
      ],
      aEn:[
        "On the project's server, which returns ready-made chart images",
        "In the browser: the page is static, with no build step, framework or dependencies",
        "Half and half: the compass is drawn in the browser, the analytics arrive by request"
      ],
      ok:1,
      why:"Компас, парламентская диаграмма, график динамики, спектр и диаграмма-паук рисуются в SVG прямо в браузере. Сервера, который что-то считал бы, у проекта нет вовсе.",
      whyEn:"The compass, the hemicycle, the trend chart, the spectrum and the radar are all drawn as SVG right in the browser. There is no server doing any computing at all."
    },
    {
      id:"export", card:"tech",
      q:"В каких форматах проект отдаёт свои данные?",
      qEn:"In what formats does the project hand over its data?",
      a:[
        "Только в PNG: картинка компаса и больше ничего",
        "PNG, SVG, CSV и JSON — последнее звено схемы SRPC так и называется",
        "Ни в каких: данные можно только смотреть на странице"
      ],
      aEn:[
        "PNG only: a picture of the compass and nothing else",
        "PNG, SVG, CSV and JSON — the last link of the SRPC diagram is named after them",
        "None: the data can only be looked at on the page"
      ],
      ok:1,
      why:"Картинка компаса уходит в PNG и SVG, таблицы — в CSV, весь набор целиком — в JSON. Собирается всё это в браузере, и наружу при этом ничего не отправляется.",
      whyEn:"The compass image goes out as PNG and SVG, the tables as CSV, the whole dataset as JSON. All of it is assembled in the browser, and nothing is sent anywhere in the process."
    },
    {
      id:"nojs", card:"tech",
      q:"Что останется от страницы, если выключить JavaScript?",
      qEn:"What is left of the page if JavaScript is switched off?",
      a:[
        "Пустой экран: разметка собирается скриптом",
        "Русский документ: описание проекта, обложка и оглавление книги — без графиков, теста и глав",
        "Английская версия: русский накладывается скриптом поверх"
      ],
      aEn:[
        "A blank screen: the markup is assembled by a script",
        "A Russian document: the project summary and the book's cover and contents — no charts, quiz or chapters",
        "The English version: Russian is layered on top by a script"
      ],
      ok:1,
      why:"Разметка написана по-русски и помечена атрибутами перевода, а не собирается скриптом. Английский накладывается поверх — поэтому и без JavaScript, и для поисковика страница остаётся русским документом. Главы книги, графики и тест собираются скриптом.",
      whyEn:"The markup is written in Russian and tagged with translation attributes rather than assembled by a script. English is layered on top — which is why, both without JavaScript and for a search engine, the page stays a Russian document. The book's chapters, the charts and the quiz are built by script."
    },
    {
      id:"srpc", card:"tech",
      q:"Что показывает схема SRPC в главе «Устройство и открытый код»?",
      qEn:"What does the SRPC diagram in the chapter “How it is built, and the source” show?",
      a:[
        "Маршрут пользователя по вкладкам сайта",
        "Путь страницы от разметки до выгрузки, шестью звеньями",
        "Порядок, в котором партии попадают на компас"
      ],
      aEn:[
        "The visitor's route across the site's tabs",
        "The page's path from markup to download, in six links",
        "The order in which parties land on the compass"
      ],
      ok:1,
      why:"Static Render Pipeline Chain — схема собственного конвейера страницы: разметка, стили, данные, расчёты, отрисовка, экспорт. Сигнал идёт слева направо, и так страница действительно собирается при загрузке.",
      whyEn:"Static Render Pipeline Chain is a diagram of the page's own pipeline: markup, styles, data, maths, drawing, export. The signal runs left to right, and that is genuinely how the page assembles itself on load."
    },
    {
      id:"storage", card:"quiz",
      q:"Куда попадают ваши ответы на утверждения теста?",
      qEn:"Where do your answers to the quiz statements go?",
      a:[
        "В обезличенную статистику проекта — автор видит сводку, но не вас",
        "В localStorage вашего браузера и больше никуда; кнопка «Сбросить ответы» стирает их полностью",
        "В ссылку на результат, которая сохраняется на сервере"
      ],
      aEn:[
        "Into the project's anonymised statistics — the author sees a summary but not you",
        "Into your browser's localStorage and nowhere else; the “Reset answers” button wipes them completely",
        "Into the result link, which is stored on a server"
      ],
      ok:1,
      why:"Никакой аналитики, счётчиков и внешних запросов в проекте нет — единственный внешний ресурс на странице это шрифты. Ссылка на результат тоже никуда не сохраняется: результат закодирован в ней самой.",
      whyEn:"There is no analytics, no counters and no outbound requests in the project — the only external resource on the page is the fonts. The result link is not stored anywhere either: the result is encoded in the link itself."
    }
  ];
})(window.PC = window.PC || {});
