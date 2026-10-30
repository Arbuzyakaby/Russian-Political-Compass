/* ============ Данные: вехи проекта ============

   Вехи и последние выпуски, из которых собирается лента истории в разделе
   «О проекте» (js/ui.js, initHistory → js/history-tree.js: вехи показываются
   в карточке узла дерева версий; само дерево — ниже, PC.RELEASES). Здесь только данные: ни одной
   функции, ни одного обращения к DOM — как в соседних js/data-*.js.

   Почему здесь не все версии из CHANGELOG.md.
   Лента отвечает на вопрос «как проект дошёл до нынешнего вида», а не
   «что менялось между выпусками»: на второй вопрос отвечает сам
   CHANGELOG, и пересказывать его здесь значило бы завести второй
   список изменений, который отстанет от первого на первой же правке.
   Поэтому веха — это момент, после которого проект стал другим, и
   несколько соседних выпусков вполне могут сойтись в одну запись
   (2.1–2.3), а два выпуска одного дня — остаться двумя, если они были
   про разное (2.4.2.1 и 2.4.3).

   Формат записи:

     v     — номер версии или диапазон; vEn — перевод подписи при наличии;
     date  — ISO-дата выпуска, по ней лента и упорядочена;
     h     — заголовок вехи, одной строкой;
     p     — что и зачем; hEn/pEn — то же по-английски.

   Записи обязаны лежать по возрастанию даты: лента печатает их в том
   порядке, в каком они здесь записаны, и не сортирует — иначе порядок
   в файле и порядок на экране разошлись бы молча. Это проверяется
   тестом, как и порядок голосований в js/data-votes.js. ============ */
(function(PC){
  "use strict";

  PC.HISTORY = [
    {
      v:"1.0", date:"2026-09-06",
      h:"Первый выпуск",
      hEn:"The first release",
      p:"Компас на двух осях, список партий с фильтрами и поиском, карточка партии с обоснованием координат, пять созывов Госдумы и тест на сорок утверждений. Всё по-русски и без единого внешнего запроса — это ограничение стоит в проекте с первого дня и с тех пор не нарушалось.",
      pEn:"A two-axis compass, a party list with filters and search, a party card with the reasoning behind its coordinates, five Duma convocations and a forty-statement quiz. All in Russian and without a single outbound request — a constraint set on day one and never broken since."
    },
    {
      v:"1.1", date:"2026-09-07",
      h:"Данные стало можно унести",
      hEn:"The data became portable",
      p:"Экспорт в PNG, SVG, CSV и JSON — компас ровно в том виде, что на экране, и весь набор целиком. Тогда же на поле появился слой траекторий: пунктирные стрелки показывают, как позиция партии смещалась во времени, с пояснением к каждому изгибу.",
      pEn:"Export to PNG, SVG, CSV and JSON — the compass exactly as it looks on screen, and the whole dataset besides. The trails layer arrived at the same time: dashed arrows showing how a party's position moved over the years, with a note explaining every turn."
    },
    {
      v:"1.4", date:"2026-09-10",
      h:"Английский и шесть под-осей",
      hEn:"English and six sub-axes",
      p:"Переведено всё: интерфейс, данные партий, формулировки теста и заголовки выгружаемых файлов. Тогда же каждая координата разложилась на три более узкие шкалы, появились ключевые голосования Думы и ссылка, по которой чужой результат теста открывается без обращения к серверу.",
      pEn:"Everything was translated: the interface, the party data, the wording of the quiz and the headers of the exported files. Each coordinate was also split into three narrower scales, the landmark Duma votes appeared, and a link was added that reproduces someone else's quiz result without contacting a server."
    },
    {
      v:"1.5", date:"2026-09-11",
      h:"Песочница коалиций и CI",
      hEn:"The coalition sandbox and CI",
      p:"Фракции включаются и выключаются кнопками, пороги 226 и 300 видны прямо на полосе мандатов, а центр тяжести и сплочённость пересчитываются на лету — теми же функциями, что считают плитки палаты. С этой же версии на каждый push гоняются тесты.",
      pEn:"Factions are switched on and off with buttons, the 226 and 300 thresholds are visible right on the seat bar, and the centre of gravity and cohesion are recomputed on the fly — by the same functions that feed the chamber tiles. From this version onwards the tests run on every push."
    },
    {
      v:"1.6", date:"2026-09-12",
      h:"Настройки как отдельное место",
      hEn:"Settings as a place of their own",
      p:"Переключатели темы и языка уехали из шапки в собственную панель, и туда же попало то, чем раньше нельзя было управлять вовсе: плотность вёрстки, анимации, зерно на фоне, подсветка карточки, подписи и сетка на компасе. Решения о внешнем виде перестали быть разбросаны по углам интерфейса.",
      pEn:"The theme and language switches left the header for a panel of their own, joined by everything that previously could not be controlled at all: layout density, animation, background grain, card spotlight, compass labels and grid. Decisions about appearance stopped being scattered around the interface."
    },
    {
      v:"2.0", date:"2026-09-12",
      h:"Вторая большая версия",
      hEn:"The second major version",
      p:"Тест вырос до девяноста утверждений и разошёлся на три вложенные выборки — 90, 40 и 20 — с общей нормировкой. Тем стало шесть вместо двух. Ни одна ссылка на результат при этом не перестала работать: совместимость адресов держится с 1.x до сих пор.",
      pEn:"The quiz grew to ninety statements and split into three nested selections — 90, 40 and 20 — sharing a single normalisation. There are now six themes instead of two. Not one result link stopped working in the process: address compatibility has held since 1.x."
    },
    {
      v:"2.1–2.3", date:"2026-09-13",
      h:"Страница научилась встречать",
      hEn:"The page learned to greet",
      p:"Приветственный экран поверх живого компаса, короткий список изменений для вернувшихся, пояснения «как это читать» у каждого графика. Панель настроек из сплошной прокрутки превратилась в окно с рельсом разделов, а сам код разъехался по файлам: данные отдельно, расчёты отдельно, словарь на пять частей.",
      pEn:"A welcome screen over the live compass, a short list of changes for returning visitors, and a “how to read this” note under every chart. The settings panel turned from one long scroll into a window with a rail of sections, and the code itself spread out across files: data apart, calculations apart, the dictionary in five pieces."
    },
    {
      v:"2.4", date:"2026-09-17",
      h:"Люди на поле и схема кода",
      hEn:"People on the board, and a diagram of the code",
      p:"Кроме партий на компасе стоят трое людей — со своей формой точки, своим цветом и отдельной карточкой, — и формат рассчитан так, что четвёртый добавляется одним объектом в данных. В карточке «Как это устроено» появилась SRPC: схема собственного конвейера страницы, шестью звеньями.",
      pEn:"Besides the parties, three individuals stand on the compass — each with their own dot shape, colour and separate card — and the format is built so that a fourth is added as a single object in the data. The “How it is built” card gained SRPC: a diagram of the page's own pipeline, in six links."
    },
    {
      v:"2.4.2.1", date:"2026-09-18",
      h:"Обучение по живой странице",
      hEn:"A tour of the live page",
      p:"Прежние четыре нарисованные сцены внутри окна показывали схему интерфейса, а не сам интерфейс, и переход от картинки к настоящей кнопке каждый проделывал сам. Теперь экран затемняется, в темноте остаётся вырез вокруг реального элемента, и вырез переезжает от шага к шагу на глазах.",
      pEn:"The previous four drawn scenes inside a window showed a diagram of the interface rather than the interface itself, and everyone had to make the leap from picture to real button unaided. Now the screen dims, a cut-out stays around the real element, and that cut-out travels from step to step in plain sight."
    },
    {
      v:"2.4.3", date:"2026-09-18",
      h:"Генеральная ревизия",
      hEn:"A full audit",
      p:"Версия без единой новой возможности: целиком про то, что уже есть и местами не работает. Боковая панель переписана, полноэкранный SRPC научился помещаться в телефон, а выключенные анимации оказались выключены по-настоящему — до этого бесконечные из них шли тысячу циклов в секунду.",
      pEn:"A release with not one new feature: entirely about what already exists and in places does not work. The side panel was rewritten, full-screen SRPC learned to fit on a phone, and animations switched off turned out to be genuinely off — until then the endless ones had been running a thousand cycles a second."
    },
    {
      v:"3.0 «Висла»", vEn:"3.0 “Vistula”", date:"2026-09-25",
      h:"Слова и дела",
      hEn:"Words and deeds",
      p:"Первая версия с именем реки. У каждой партии теперь две точки: где она стоит на деле и где — по собственным словам, и стрелка между ними. Данные переведены на IX созыв, избранный в сентябре 2026 года, голосований стало двадцать восемь, а траектории ушли: пять оценок подряд выглядели измерением, которым не были.",
      pEn:"The first version named after a river. Every party now has two dots — where it actually stands and where it says it stands — with an arrow between them. The data moved to the IX convocation elected in September 2026, the votes grew to twenty-eight, and the trajectories went: five estimates in a row looked like a measurement they never were."
    },
    {
      v:"3.1 «Висла»", vEn:"3.1 “Vistula”", date:"2026-10-26",
      h:"Исправления результатов теста и интерфейса",
      hEn:"Quiz result and interface fixes",
      p:"Сохранённый результат теперь хранит свои ответы: новое прохождение не меняет его разбор, радар, ссылку и экспорт. Исправлены отправка карточки чужого результата, переходы по ссылкам, подписи неизвестных голосов, переключение языка, горячие клавиши под диалогами и режим длинного теста в экспорте.",
      pEn:"Saved results now keep their own answers, so a new attempt does not change their breakdown, radar, link or export. Fixes also cover guest result sharing, result links, unknown vote labels, language switching, shortcuts under dialogs and the long quiz mode in exports."
    },
    {
      v:"3.1.1 «Висла»", vEn:"3.1.1 “Vistula”", date:"2026-10-26",
      h:"Новая документация",
      hEn:"Rewritten documentation",
      p:"README переписан с нуля и дополнен новыми скриншотами компаса, результата теста и мобильного интерфейса. Появились отдельные руководства пользователя и разработчика, описание методологии и инструкция по выпуску обновлений. Устаревшие описания заменены актуальными, номер версии согласован на сайте и в коде.",
      pEn:"The README has been rewritten with new screenshots of the compass, a quiz result and the mobile interface. Separate user and developer guides, a methodology reference and release instructions explain the current app. Outdated descriptions have been replaced, and the version number is consistent across the site and code."
    },
    {
      v:"3.2 «Висла»", vEn:"3.2 “Vistula”", date:"2026-10-26",
      h:"Удобнее на телефоне", hEn:"A better mobile experience",
      p:"Переработаны мобильная навигация, размеры текста и управление касаниями. У графиков появилась таблица значений, построение аналитики отложено до появления на экране. Оптимизированы фоны и загрузка стилей, обновлено техническое SEO.",
      pEn:"Reworked mobile navigation, typography and touch controls. Charts include readable values and analytics render near the viewport. Optimized backgrounds and stylesheet loading, and updated technical SEO."
    },
    {
      v:"4.0 «Тиса»", vEn:"4.0 “Tisza”", date:"2026-10-26",
      h:"Ваша партия на компасе", hEn:"Your party on the compass",
      p:"Политическая лаборатория: конструктор своих партий с эмблемами, программами, голосованиями и ссылками. Гипотетическая палата, командная палитра, новые настройки, интерактивный стол SRPC и новые пасхалки. Исправлены ссылки и пустые результаты теста, исторические карточки, экспорт и навигация.",
      pEn:"A political lab: build your own parties with emblems, manifestos, votes and shareable links. A hypothetical house, command palette, new settings, an interactive SRPC workbench and new easter eggs. Fixes cover result links, empty quizzes, historical cards, exports and navigation."
    },
    {
      v:"5.0 «Нарев»", vEn:"5.0 “Narew”", date:"2026-10-30",
      h:"Назад к корням", hEn:"Back to the roots",
      p:"Make Compass Great Again. «Моя партия» удалена целиком: проект снова про компас, тест и голосования. Телефон стал приложением — подписанная карта во всю ширину, карточка партии нижним листом, никаких переносов в кнопках. Новые настройки: акцент, слои поля, центр палаты, вибрация и звуки. Код разобран на понятные модули, а стартовый пакет стал почти вдвое легче.",
      pEn:"Make Compass Great Again. “My party” is gone entirely: the project is about the compass, the quiz and the votes again. The phone version became an app — a labelled full-width map, the party card as a bottom sheet, no wrapping in buttons. New settings: accent, map layers, the chamber centre, haptics and sounds. The code is split into clear modules, and the start-up bundle is almost half as heavy."
    }
  ];

  /* ============ Дерево версий (4.1) ============

     Вехи выше — рассказ, а дерево — карта: на нём все выпуски из
     CHANGELOG.md, по одному узлу на запись заголовка «## [версия] — дата».
     Рисует его js/history-tree.js, здесь только данные.

     PC.ARCS — линии выпусков («ветки»):
       id    — ключ; lane — дорожка на графе (0 — ствол, 1 — боковая ветка);
       label — подпись, одинаковая на обоих языках; name/nameEn — имя реки,
               которое носят выпуски линии (у 1.x и 2.x его нет);
       d/dEn — строка о линии для легенды и карточки.

     PC.RELEASES — выпуски по возрастанию даты, при равенстве дат — в
     порядке версий (как и вехи, не сортируются на лету; проверяется тестом):
       v     — номер так, как он записан в заголовке CHANGELOG;
       date  — ISO-дата; arc — id линии;
       s/sEn — одно-два предложения о выпуске;
       ms    — если выпуск стоит в PC.HISTORY, то точное значение v той
               вехи: длинный текст вехи показывается в карточке узла;
               2.3 замыкает веху «2.1–2.3»;
       from  — у первого выпуска линии: от какого выпуска она выросла;
       merge — выпуск, ветка которого влилась в этот;
       pin   — узел остаётся и в режиме «только вехи» (развилка);
       cur   — текущая версия, ровно один такой узел.
     Родитель остальных узлов — предыдущий выпуск той же линии. ============ */
  PC.ARCS = [
    { id:"v1", lane:0, label:"1.x",
      d:"Первые выпуски: компас, тест, экспорт, голосования и песочница коалиций.",
      dEn:"The first releases: the compass, the quiz, export, votes and the coalition sandbox." },
    { id:"v2", lane:0, label:"2.x",
      d:"Оформление, приветствие, настройки и люди на поле.",
      dEn:"Design, the welcome screen, settings and people on the board." },
    { id:"rpc", lane:1, label:"RPC 2.X",
      d:"Боковая линия: ответвилась от 2.4.3 и влилась в 3.0.",
      dEn:"A side line: forked from 2.4.3 and merged into 3.0." },
    { id:"v3", lane:0, label:"3.x", name:"Висла", nameEn:"Vistula",
      d:"Слова и дела, девятый созыв, мобильный интерфейс.",
      dEn:"Words and deeds, the ninth convocation, the mobile interface." },
    { id:"v4", lane:0, label:"4.x", name:"Тиса", nameEn:"Tisza",
      d:"Своя партия на компасе и новый интерфейс.",
      dEn:"Your own party on the compass and a new interface." },
    { id:"v5", lane:0, label:"5.x", name:"Нарев", nameEn:"Narew",
      d:"Назад к корням: компас, тест и голосования, телефон как приложение.",
      dEn:"Back to the roots: the compass, the quiz and the votes, the phone as an app." }
  ];

  PC.RELEASES = [
    { v:"1.0.0", date:"2026-09-06", arc:"v1", ms:"1.0",
      s:"Первый полный релиз: компас на двух осях, аналитика по пяти созывам, тест и раздел о проекте.",
      sEn:"The first full release: a two-axis compass, analytics for five convocations, a quiz and an About section." },
    { v:"1.1.0", date:"2026-09-07", arc:"v1", ms:"1.1",
      s:"Экспорт данных, слой траекторий на компасе и карточка результата для соцсетей.",
      sEn:"Data export, a trails layer on the compass and a shareable result card." },
    { v:"1.1.1", date:"2026-09-07", arc:"v1",
      s:"Исправления по итогам ручного тестирования: меню экспорта, траектории, тест и боковая панель.",
      sEn:"Fixes after manual testing: the export menu, trails, the quiz and the side panel." },
    { v:"1.3.0", date:"2026-09-07", arc:"v1",
      s:"Ревизия кода: исправления ошибок, 39 автотестов и слой премиального оформления.",
      sEn:"A code review: bug fixes, 39 automated tests and a layer of visual polish." },
    { v:"1.3.0.1", date:"2026-09-07", arc:"v1",
      s:"Кнопка «Дальше» в тесте наконец решает сама: клик по варианту больше не листает вопрос.",
      sEn:"The quiz “Next” button now does the moving: picking an answer no longer skips ahead by itself." },
    { v:"1.4.0", date:"2026-09-10", arc:"v1", ms:"1.4",
      s:"Английская версия целиком, шесть под-осей, ключевые голосования, разбор результата теста и ссылки на него.",
      sEn:"A full English version, six sub-axes, landmark votes, a quiz result breakdown and result links." },
    { v:"1.4.1", date:"2026-09-10", arc:"v1",
      s:"Короткая версия теста: 20 утверждений и 2–3 минуты вместо 5–7.",
      sEn:"A short quiz: 20 statements and 2–3 minutes instead of 5–7." },
    { v:"1.5.0", date:"2026-09-11", arc:"v1", ms:"1.5",
      s:"Песочница коалиций: фракции включаются кнопками, пороги 226 и 300 видны на полосе мандатов.",
      sEn:"The coalition sandbox: factions toggle with buttons and the 226 and 300 thresholds show on the seat bar." },
    { v:"1.5.1", date:"2026-09-11", arc:"v1",
      s:"Ещё десять ключевых голосований — всего двадцать, 2004–2024.",
      sEn:"Ten more landmark votes — twenty in total, 2004–2024." },
    { v:"1.5.2", date:"2026-09-11", arc:"v1",
      s:"Кнопки песочницы больше не ломают график динамики.",
      sEn:"Sandbox buttons no longer break the trend chart." },
    { v:"1.5.3", date:"2026-09-11", arc:"v1",
      s:"Матрица совпадений переделана: расходящаяся шкала цвета вместо «электронной таблицы».",
      sEn:"The agreement matrix was redesigned with a diverging colour scale instead of a spreadsheet look." },
    { v:"1.5.4", date:"2026-09-11", arc:"v1",
      s:"Строка мандатов у точки больше не перекрывает подпись соседней партии.",
      sEn:"A dot's seat count no longer covers a neighbouring party's label." },
    { v:"1.5.5", date:"2026-09-12", arc:"v1",
      s:"Три пасхалки к круглому номеру версии и карточка о короткой версии теста.",
      sEn:"Three easter eggs for a round version number and a card about the short quiz." },
    { v:"1.6.0", date:"2026-09-12", arc:"v1", ms:"1.6",
      s:"Новая акцентная пара, свой тон у каждой вкладки, меню настроек и переделанный слой траекторий.",
      sEn:"A new accent pair, a tone of its own for every tab, a settings menu and a rebuilt trails layer." },
    { v:"1.6.1", date:"2026-09-12", arc:"v1",
      s:"Три шрифта в настройках: «Современный», «Компактный» и «Творческий».",
      sEn:"Three fonts in settings: Modern, Compact and Creative." },
    { v:"1.6.2", date:"2026-09-12", arc:"v1",
      s:"Подписи порогов коалиции больше не наезжают друг на друга на узком экране.",
      sEn:"Coalition threshold labels no longer collide on a narrow screen." },
    { v:"2.0.0", date:"2026-09-12", arc:"v2", from:"1.6.2", ms:"2.0",
      s:"Вторая большая версия: тест на 90 утверждений, шесть тем, стекло и аналитика коалиций.",
      sEn:"The second major version: a 90-statement quiz, six themes, glass surfaces and coalition analytics." },
    { v:"2.0.1", date:"2026-09-12", arc:"v2",
      s:"Переключатель шрифта в настройках больше не наезжает на своё описание.",
      sEn:"The font switch in settings no longer overlaps its own description." },
    { v:"2.1.0", date:"2026-09-13", arc:"v2",
      s:"Приветственный экран, пояснения «как это читать» под графиками и оглавление раздела «О проекте».",
      sEn:"A welcome screen, “how to read this” notes under the charts and a contents rail for the About section." },
    { v:"2.1.1", date:"2026-09-13", arc:"v2",
      s:"Исправленное приветствие, короткое обучение и интерфейс в духе Apple.",
      sEn:"A fixed welcome screen, a short tour and an Apple-inspired interface." },
    { v:"2.1.1.1", date:"2026-09-13", arc:"v2",
      s:"Исправлена ошибка 405 при выборе языка в приветствии, чаще всего в приватном окне.",
      sEn:"Fixed a 405 error when choosing a language in the welcome screen, mostly in private windows." },
    { v:"2.2", date:"2026-09-13", arc:"v2",
      s:"3D-пролёт над компасом, тема «Прованс», новые настройки и слово автора.",
      sEn:"A 3D flyover of the compass, the Provence theme, new settings and a note from the author." },
    { v:"2.3", date:"2026-09-13", arc:"v2", ms:"2.1–2.3",
      s:"Консолидация: общий расчётный слой, новые способы сравнивать партии и коалиции, настройки по разделам.",
      sEn:"A consolidation: a shared calculation layer, new ways to compare parties and coalitions, settings by section." },
    { v:"2.3.1", date:"2026-09-13", arc:"v2",
      s:"Анимация переворота боковой панели и полностью переработанное окно настроек.",
      sEn:"A flip animation for the side panel and a fully reworked settings window." },
    { v:"2.3.1.1", date:"2026-09-14", arc:"v2",
      s:"Окно настроек фиксированной высоты, раздел «Приватность» и новый «Состав палаты».",
      sEn:"A fixed-height settings window, a Privacy section and a new chamber composition view." },
    { v:"2.3.2", date:"2026-09-14", arc:"v2",
      s:"Юбилейный выпуск: слоистый редизайн компаса и первый человек на поле вместо партии.",
      sEn:"The anniversary release: a layered compass redesign and the first person, not a party, on the board." },
    { v:"2.3.3", date:"2026-09-15", arc:"v2",
      s:"Точечный выпуск: давняя ошибка подписи на поле, живее приветствие и новые витрины.",
      sEn:"A small release: an old label bug on the board, a livelier welcome and new showcases." },
    { v:"2.4", date:"2026-09-17", arc:"v2", ms:"2.4",
      s:"Трое людей на поле, живая схема собственного кода и липкий рельс оглавления «О проекте».",
      sEn:"Three people on the board, a live diagram of the code and a sticky contents rail for the About section." },
    { v:"2.4.1", date:"2026-09-17", arc:"v2",
      s:"Выпуск про поле компаса: стекло вместо слоёв, траектории переписаны с нуля.",
      sEn:"A release about the compass board: glass instead of layers, trails rewritten from scratch." },
    { v:"2.4.2", date:"2026-09-17", arc:"v2",
      s:"Правки после 2.4.1: стекло стало заметным, исправлены три ошибки поля.",
      sEn:"Follow-ups to 2.4.1: the glass became visible and three board bugs were fixed." },
    { v:"2.4.2.1", date:"2026-09-18", arc:"v2", ms:"2.4.2.1",
      s:"Выпуск про то, что видно: обучение по живой странице, полноэкранный SRPC и переписанная тема «Аляска».",
      sEn:"A release about what is actually visible: a tour of the live page, full-screen SRPC and a rewritten Alaska theme." },
    { v:"2.4.3", date:"2026-09-18", arc:"v2", ms:"2.4.3",
      s:"Генеральная ревизия перед 3.0: ни одной новой возможности, боковая панель переписана.",
      sEn:"A full audit before 3.0: not a single new feature, and the side panel rewritten." },
    { v:"RPC 2.5", date:"2026-09-20", arc:"rpc", from:"2.4.3", pin:true,
      s:"Первый и единственный выпуск линии RPC: лента истории проекта и тест по разделу «О проекте».",
      sEn:"The first and only release of the RPC line: a project history timeline and a quiz on the About section." },
    { v:"3.0", date:"2026-09-25", arc:"v3", from:"2.4.3", merge:"RPC 2.5", ms:"3.0 «Висла»",
      s:"Большая переделка: заявленные координаты партий, IX созыв, 28 голосований и переписанные темы.",
      sEn:"A big rework: declared party coordinates, the IX convocation, 28 votes and rewritten themes." },
    { v:"3.1", date:"2026-10-26", arc:"v3", ms:"3.1 «Висла»",
      s:"Сохранённый результат теста хранит собственные ответы; исправления ссылок и интерфейса.",
      sEn:"A saved quiz result keeps its own answers; link and interface fixes." },
    { v:"3.1.1", date:"2026-10-26", arc:"v3", ms:"3.1.1 «Висла»",
      s:"Документация: README переписан с нуля, добавлены руководства и новые скриншоты.",
      sEn:"Documentation: the README was rewritten, with new guides and screenshots." },
    { v:"3.2", date:"2026-10-26", arc:"v3", ms:"3.2 «Висла»",
      s:"Мобильный интерфейс: двухстрочная навигация, увеличенные кнопки и выбор точек касанием.",
      sEn:"The mobile interface: two-row navigation, larger buttons and tap-to-pick compass dots." },
    { v:"4.0", date:"2026-10-26", arc:"v4", from:"3.2", ms:"4.0 «Тиса»",
      s:"Раздел «Моя партия»: конструктор партий, командная палитра, новые настройки и ссылки для обмена.",
      sEn:"The “My party” section: a party builder, a command palette, new settings and shareable links." },
    { v:"4.1", date:"2026-10-27", arc:"v4",
      s:"Мобильный интерфейс в стиле приложения, дерево версий, шаблоны и выборы в «Моей партии», новые настройки и исправления.",
      sEn:"App-style mobile interface, version tree, templates and elections in “My party”, redesigned settings and fixes." },
    { v:"4.2", date:"2026-10-27", arc:"v4",
      s:"Плавный компас и аккуратная панель карты на телефоне, два новых вопроса в тесте «О проекте», вежливые сообщения; код разобран по модулям.",
      sEn:"A smooth compass and a tidier map toolbar on phones, two new questions in the About quiz, politer messages; the code split into modules." },
    { v:"4.3", date:"2026-10-27", arc:"v4",
      s:"Дуэль партий, «Голосую сам», работа без сети, единый набор иконок, пружинящий отклик и вычитанная английская версия.",
      sEn:"Party face-off, cast-your-own-votes, offline mode, one consistent icon set, springy feedback and an edited English version." },
    { v:"4.4", date:"2026-10-27", arc:"v4",
      s:"Дуэль по ссылке и со своими партиями, «Голосую сам» по темам, плашка «Без сети», обучение на 13 шагов, загрузка по требованию и ровная ширина на телефоне.",
      sEn:"Face-off by link and with your own parties, cast-your-own-votes by topic, an offline bar, a 13-step tour, on-demand loading and a steady width on phones."},
    { v:"4.4.0.1", date:"2026-10-28", arc:"v4",
      s:"Иконки на нижней панели телефона; у «Моей партии» нет плашки версии.",
      sEn:"Icons on the phone bottom bar; no version badge on “My party”."},
    { v:"4.4.0.2", date:"2026-10-28", arc:"v4",
      s:"Исправлен пустой список в «Профиле по под-осям» на вкладке «Компас и аналитика».",
      sEn:"Fixed the empty dropdown in the sub-axis profile on the Compass tab."},
    { v:"4.4.0.3", date:"2026-10-28", arc:"v4",
      s:"Английская версия для поисковиков: hreflang, адрес ?lang=en в карте сайта и свой canonical.",
      sEn:"The English version for search engines: hreflang, ?lang=en in the sitemap and its own canonical."},
    { v:"4.4.0.4", date:"2026-10-28", arc:"v4",
      s:"Переработан блок «О проекте в цифрах» под вкладками: цифры из данных, сворачиваемое описание и кнопки «что дальше».",
      sEn:"The “project in numbers” block under the tabs is redesigned: figures from the data, a collapsible description and “what next” buttons." },
    { v:"5.0", date:"2026-10-30", arc:"v5", from:"4.4.0.4", ms:"5.0 «Нарев»",
      s:"Назад к корням: без «Моей партии», телефон как приложение, новые настройки, живые тексты и стартовый код почти вдвое легче.",
      sEn:"Back to the roots: no “My party”, the phone as an app, new settings, warmer writing and start-up code almost half as heavy." },
    { v:"5.0.1", date:"2026-10-30", arc:"v5", cur:true,
      s:"Спектр позиций на телефоне снова во всю ширину, без тёмных подложек под строками.",
      sEn:"The position spectrum on phones is full-width again, with no dark pills behind the rows." }
  ];
})(window.PC = window.PC || {});
