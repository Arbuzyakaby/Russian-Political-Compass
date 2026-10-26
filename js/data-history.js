/* ============ Данные: вехи проекта ============

   Вехи и последние выпуски, из которых собирается лента истории в разделе
   «О проекте» (js/ui.js, initHistory). Здесь только данные: ни одной
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
    }
  ];
})(window.PC = window.PC || {});
