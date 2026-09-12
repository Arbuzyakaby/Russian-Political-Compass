/* ============ ЛОКАЛИЗАЦИЯ: русский и английский ============

   Проект остаётся статической страницей без сборки, поэтому словарь
   лежит прямо здесь, а не тянется отдельным файлом: лишний запрос ради
   пары десятков килобайт текста дороже, чем разбор большого объекта.

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

  /* ---------- словарь ---------- */
  /* Значение-массив — форма множественного числа: для русского три
     формы (1 / 2–4 / 5+), для английского две (1 / прочее). */
  var DICT = {

    /* ===== оболочка страницы ===== */
    "doc.title.compass":  ["Политический компас партий РФ", "Russian Political Compass"],
    "doc.title.quiz":     ["Тест: где вы на компасе — Политический компас партий РФ",
                           "Quiz: where do you stand — Russian Political Compass"],
    "doc.title.votes":    ["Ключевые голосования Госдумы — Политический компас партий РФ",
                           "Landmark Duma votes — Russian Political Compass"],
    "doc.title.about":    ["О проекте — Политический компас партий РФ",
                           "About — Russian Political Compass"],
    "doc.desc":           ["Интерактивный политический компас партий России: положение по осям «экономика» и «отношение к власти государства», мандаты в Госдуме по созывам IV–VIII, тест на 40 утверждений.",
                           "Interactive political compass of Russian parties: positions on the economic and state-authority axes, State Duma seats across convocations IV–VIII, and a 40-statement quiz."],

    "skip":               ["Перейти к содержимому", "Skip to content"],
    "noscript":           ["Компас, графики и тест рисуются в браузере на JavaScript — без него страница остаётся пустой. Включите JavaScript, чтобы увидеть данные.",
                           "The compass, charts and quiz are drawn in the browser with JavaScript — without it the page stays empty. Enable JavaScript to see the data."],

    /* ===== шапка ===== */
    "brand.eyebrow":      ["Политология · Россия", "Political science · Russia"],
    "brand.h1":           ["Интерактивный политический компас партий РФ",
                           "Interactive Political Compass of Russian Parties"],
    "brand.lead":         ["{n} {parties} на двух осях: экономика и отношение к власти государства",
                           "{n} {parties} on two axes: the economy and the power of the state"],
    "word.party":         [["партия", "партии", "партий"], ["party", "parties"]],
    "word.statement":     [["утверждение", "утверждения", "утверждений"], ["statement", "statements"]],
    "word.question":      [["вопрос", "вопроса", "вопросов"], ["question", "questions"]],
    "word.seat":          [["мандат", "мандата", "мандатов"], ["seat", "seats"]],
    "word.faction":       [["фракция", "фракции", "фракций"], ["faction", "factions"]],
    "word.vote":          [["голосование", "голосования", "голосований"], ["vote", "votes"]],

    "search.label":       ["Поиск партии", "Search parties"],
    "search.placeholder": ["Найти партию…", "Find a party…"],
    "search.clear":       ["Очистить поиск", "Clear search"],
    "theme.toggle":       ["Переключить тему", "Switch theme"],
    "theme.system":       ["Тема: системная", "Theme: system"],
    "theme.light":        ["Тема: светлая", "Theme: light"],
    "theme.dark":         ["Тема: тёмная", "Theme: dark"],
    "theme.hint":         ["нажмите, чтобы переключить", "click to switch"],
    "lang.toggle":        ["Switch to English", "Переключить на русский"],
    "lang.label":         ["Язык интерфейса", "Interface language"],

    /* ===== вкладки ===== */
    "tabs.label":         ["Разделы", "Sections"],
    "tab.compass":        ["Компас", "Compass"],
    "tab.compass.more":   [" и аналитика", " & analytics"],
    "tab.quiz":           ["Тест", "Quiz"],
    "tab.votes":          ["Голосования", "Votes"],
    "tab.about":          ["О проекте", "About"],

    /* ===== компас ===== */
    "stage.aria":         ["Компас партий", "Party compass"],
    "stage.title":        ["Позиции партий · шкала −10…+10", "Party positions · scale −10…+10"],
    "filter.label":       ["Фильтр партий", "Party filter"],
    "filter.all":         ["Все", "All"],
    "filter.duma":        ["В Госдуме", "In the Duma"],
    "filter.nonduma":     ["Без мандатов", "No seats"],
    "trails.btn":         ["Траектории", "Trajectories"],
    "trails.title":       ["Показать, как смещались позиции партий во времени",
                           "Show how party positions shifted over time"],
    "export.btn":         ["Экспорт", "Export"],
    "export.menu":        ["Форматы экспорта", "Export formats"],
    "conv.label":         ["Созыв Госдумы", "Duma convocation"],
    "compass.aria":       ["Политический компас: партии по осям экономики и отношения к государству",
                           "Political compass: parties on the economic and state-authority axes"],

    "legend.left":        ["Плановая экономика, национализация", "Planned economy, nationalisation"],
    "legend.right":       ["Свободный рынок, частная инициатива", "Free market, private enterprise"],
    "legend.up":          ["Сильное государство, контроль", "Strong state, control"],
    "legend.down":        ["Личные свободы, децентрализация", "Personal liberty, decentralisation"],

    "cap.top":            ["АВТОРИТАРИЗМ · ЭТАТИЗМ", "AUTHORITARIANISM · STATISM"],
    "cap.bottom":         ["ЛИБЕРТАРИАНСТВО · СВОБОДА", "LIBERTARIANISM · LIBERTY"],
    "cap.left":           ["ЛЕВЫЕ · СОЦИАЛИЗМ", "LEFT · SOCIALISM"],
    "cap.right":          ["ПРАВЫЕ · РЫНОК", "RIGHT · MARKET"],
    "quad.lt":            ["лево · государство", "left · state"],
    "quad.rt":            ["право · государство", "right · state"],
    "quad.lb":            ["лево · свобода", "left · liberty"],
    "quad.rb":            ["право · свобода", "right · liberty"],
    "cap.mini.top":       ["ЭТАТИЗМ", "STATISM"],
    "cap.mini.bottom":    ["СВОБОДЫ", "LIBERTY"],
    "cap.mini.left":      ["ПЛАН", "PLAN"],
    "cap.mini.right":     ["РЫНОК", "MARKET"],

    /* ===== боковая панель ===== */
    "side.title":         ["Партии", "Parties"],
    "side.listTitle":     ["Партии · мандаты в ГД · {conv}", "Parties · Duma seats · {conv}"],
    "side.cardTitle":     ["Карточка партии", "Party profile"],
    "side.empty":         ["Ничего не найдено.<br>Попробуйте изменить запрос.",
                           "Nothing found.<br>Try a different query."],
    "side.back":          ["← Все партии", "← All parties"],
    "side.leader":        ["Лидер партии", "Party leader"],
    "side.econ":          ["Экономика", "Economy"],
    "side.state":         ["Гос. контроль", "State control"],
    "side.duma":          ["Госдума {conv}", "State Duma {conv}"],
    "side.ofSeats":       ["/ {n} мест", "/ {n} seats"],
    "side.pctOfHouse":    ["{p}% состава палаты", "{p}% of the chamber"],
    "side.noSeats":       ["Партия не преодолела барьер и не получила мандатов",
                           "The party fell below the threshold and won no seats"],
    "side.byConv":        ["Мандаты по созывам", "Seats by convocation"],
    "side.maxSeats":      ["Максимум за период — {n} {seats}", "Peak over the period — {n} {seats}"],
    "side.neverSeats":    ["Партия ни разу не получала мандатов в Госдуме",
                           "The party has never won seats in the Duma"],
    "side.dashNote":      [". «—» — партии в том созыве не существовало.",
                           ". “—” means the party did not exist in that convocation."],
    "side.theses":        ["Ключевые тезисы", "Key positions"],
    "side.why":           ["Почему такие координаты", "Why these coordinates"],
    "side.trail":         ["Как менялась позиция", "How the position changed"],
    "side.trailSum":      ["С {from} по {to}: экономика — {dx}, отношение к государству — {dy}.",
                           "From {from} to {to}: economy — {dx}, attitude to the state — {dy}."],
    "side.noShift":       ["почти без сдвига", "almost unchanged"],
    "side.left":          ["влево на {d}", "left by {d}"],
    "side.right":         ["вправо на {d}", "right by {d}"],
    "side.down":          ["вниз к свободам на {d}", "down toward liberty by {d}"],
    "side.up":            ["вверх к этатизму на {d}", "up toward statism by {d}"],
    "side.neighbours":    ["Соседи по компасу", "Compass neighbours"],
    "side.neighboursNote":["Расстояние измерено по прямой на поле −10…+10: чем меньше число, тем ближе программы по обеим осям сразу.",
                           "Distance is measured straight across the −10…+10 field: the smaller the number, the closer the two platforms are on both axes at once."],
    "side.farthest":      ["Дальше всего", "Farthest"],
    "side.subaxes":       ["Разбор по под-осям", "Sub-axis breakdown"],
    "side.subaxesNote":   ["Две оси компаса — это свёртка шести более узких шкал. Здесь видно, из чего складывается итоговая координата и где партия расходится сама с собой.",
                           "The two compass axes are a roll-up of six narrower scales. This shows what the final coordinate is built from and where a party contradicts itself."],
    "side.votesHead":     ["Как голосовала фракция", "How the faction voted"],
    "side.votesNote":     ["Позиция фракции по знаковым законопроектам. Полный список — во вкладке «Голосования».",
                           "The faction's stance on landmark bills. The full list is in the Votes tab."],
    "side.labels.left":   ["левые", "left"],
    "side.labels.right":  ["правые", "right"],
    "side.labels.centre": ["центр", "centre"],
    "side.labels.lib":    ["либертарианство", "libertarian"],
    "side.labels.stat":   ["этатизм", "statist"],

    /* ===== аналитика ===== */
    "an.head":            ["Аналитика Госдумы", "Duma analytics"],
    "an.hint":            ["все графики следуют за выбранным созывом",
                           "every chart follows the selected convocation"],
    "an.parties":         ["Партий на компасе", "Parties on the compass"],
    "an.partiesD":        ["в выбранном созыве существовали {n}", "{n} existed in the selected convocation"],
    "an.factions":        ["Фракций в Госдуме", "Factions in the Duma"],
    "an.largest":         ["Крупнейшая фракция", "Largest faction"],
    "an.largestD":        ["{name} · {p}% палаты", "{name} · {p}% of the chamber"],
    "an.noData":          ["нет данных", "no data"],
    "an.centre":          ["Центр тяжести палаты", "Centre of gravity"],
    "an.centreD":         ["взвешено по мандатам", "weighted by seats"],
    "an.fragmentation":   ["Эффективное число фракций", "Effective number of factions"],
    "an.fragmentationD":  ["индекс Лааксо — Таагеперы: 1.0 — монополия одной фракции",
                           "Laakso–Taagepera index: 1.0 means a single faction monopoly"],
    "an.polarization":    ["Поляризация палаты", "Chamber polarisation"],
    "an.polarizationD":   ["среднее расстояние до центра тяжести, взвешенное по мандатам",
                           "mean distance to the centre of gravity, weighted by seats"],
    "an.groupParties":    ["Партии и фракции", "Parties and factions"],
    "an.groupHouse":      ["Палата как целое", "The chamber as a whole"],

    /* ===== песочница коалиций ===== */
    "co.h":               ["Песочница коалиций", "Coalition sandbox"],
    "co.p":               ["Соберите коалицию из фракций выбранного созыва и проверьте, проходит ли она порог большинства. Центр тяжести, эффективное число партнёров и разброс позиций пересчитываются на лету по тем же формулам, что и плитки палаты.",
                           "Assemble a coalition from the factions of the selected convocation and see whether it clears the majority threshold. Centre of gravity, effective number of partners and spread of positions are recalculated on the fly with the same formulas as the chamber tiles."],
    "co.toggles":         ["Фракции в коалиции", "Factions in the coalition"],
    "co.reset":           ["Как в жизни", "As it really is"],
    "co.resetTitle":      ["Вернуть реальный расклад: все фракции созыва", "Restore the actual line-up: every faction of the convocation"],
    "co.clear":           ["Снять все", "Clear all"],
    "co.real":            ["реальный состав", "actual line-up"],
    "co.bar":             ["Мандаты коалиции относительно порога большинства", "Coalition seats against the majority threshold"],
    "co.markMaj":         ["{n} — большинство", "{n} — majority"],
    "co.markSuper":       ["{n} — две трети", "{n} — two thirds"],
    "co.yes":             ["Большинство есть: на {n} сверх порога", "Majority: {n} above the threshold"],
    "co.no":              ["До большинства не хватает {n}", "{n} short of a majority"],
    "co.super":           ["Две трети палаты — хватает и на поправки к Конституции", "Two thirds of the chamber — enough even for constitutional amendments"],
    "co.empty":           ["Выберите хотя бы одну фракцию", "Pick at least one faction"],
    "co.centre":          ["Центр тяжести коалиции", "Coalition centre of gravity"],
    "co.enp":             ["Эффективное число партнёров", "Effective number of partners"],
    "co.enpD":            ["1.0 — коалиция держится на одной фракции", "1.0 means the coalition rests on a single faction"],
    "co.polar":           ["Разброс внутри коалиции", "Spread within the coalition"],
    "co.polarD":          ["среднее расстояние фракции до центра коалиции", "mean distance of a faction to the coalition centre"],
    "co.vsHouse":         ["вся палата: {v}", "whole chamber: {v}"],
    "co.why":             ["Как читать: полоса разложена по экономической оси, как и дуга палаты. Коалиция с большим разбросом собрана из далёких друг от друга фракций — формально большинство есть, но договариваться ей придётся по каждому закону. Это модель на координатах компаса, а не прогноз: реальные коалиции держатся ещё и на том, чего на осях нет.",
                           "How to read it: the bar runs along the economic axis, just like the chamber arc. A coalition with a wide spread is built from factions far apart — it has a majority on paper but will have to negotiate every bill. This is a model on compass coordinates, not a forecast: real coalitions also rest on things the axes do not capture."],

    "an.dominance":       ["Доля крупнейшей фракции", "Largest faction's share"],
    "an.dominanceD":      ["больше 50% — однопартийное большинство", "above 50% means a single-party majority"],

    "ch.hemi.h":          ["Состав палаты", "Composition of the chamber"],
    "ch.hemi.p":          ["450 мест, каждая точка — один мандат. Места расставлены слева направо по экономической оси: слева плановая экономика, справа рыночная. Наведите курсор на любую часть дуги — подсветится ближайшая фракция.",
                           "450 seats, one dot per mandate. Seats run left to right along the economic axis: planned economy on the left, market on the right. Hover anywhere over the arc and the nearest faction lights up."],
    "ch.hemi.aria":       ["Состав Госдумы {conv}: {n} мест по фракциям",
                           "State Duma {conv} composition: {n} seats by faction"],
    "ch.hemi.seats":      ["мест · {conv} · {n} {factions}", "seats · {conv} · {n} {factions}"],
    "ch.hemi.share":      ["{name} · {p}% палаты", "{name} · {p}% of the chamber"],
    "ch.hemi.nodata":     ["В этом созыве нет данных о фракциях.", "No faction data for this convocation."],
    "ch.hemi.rest":       ["Вне фракций и самовыдвиженцы", "Non-aligned deputies and independents"],
    "ch.hemi.why":        ["Почему это важно: место фракции на дуге — не рейтинг, а положение на экономической шкале. Сплошной блок одного цвета в центре означает, что большинство собрано вокруг одной позиции, а не составлено из коалиции.",
                           "Why it matters: a faction's place on the arc is not a ranking but its position on the economic scale. A solid block of one colour in the middle means the majority is built around a single position rather than assembled from a coalition."],

    "ch.trend.h":         ["Динамика мандатов, IV–VIII созывы", "Seat dynamics, convocations IV–VIII"],
    "ch.trend.p":         ["Мандаты по итогам выборов 2003–2021. Разрыв линии означает, что партия в том созыве не участвовала. Клик по графику переключает созыв на всей странице.",
                           "Seats as of the 2003–2021 election results. A break in a line means the party did not run in that convocation. Clicking the chart switches the convocation across the whole page."],
    "ch.trend.aria":      ["Динамика {what} партий по созывам Госдумы IV–VIII",
                           "Dynamics of party {what} across Duma convocations IV–VIII"],
    "ch.trend.seats":     ["Мандаты", "Seats"],
    "ch.trend.share":     ["Доля палаты", "Share of chamber"],
    "ch.trend.scale":     ["Шкала графика", "Chart scale"],
    "ch.trend.axisSeats": ["МЕСТ", "SEATS"],
    "ch.trend.axisShare": ["% МЕСТ", "% OF SEATS"],
    "ch.trend.showTable": ["Показать таблицу данных", "Show data table"],
    "ch.trend.hideTable": ["Скрыть таблицу данных", "Hide data table"],
    "ch.trend.tableCap":  ["Мандаты партий по созывам Госдумы", "Party seats by Duma convocation"],
    "ch.trend.party":     ["Партия", "Party"],
    "ch.trend.first":     ["впервые", "first time"],
    "ch.trend.click":     ["Клик — переключить созыв", "Click to switch convocation"],
    "ch.trend.why":       ["Как читать: в абсолютных мандатах видно масштаб фракции, в долях — сравнимость созывов между собой. Резкий обрыв линии почти всегда совпадает не со сменой настроений, а со сменой избирательных правил: барьер, одномандатные округа, порядок регистрации.",
                           "How to read it: absolute seats show a faction's scale, shares make convocations comparable. A sharp drop almost always coincides not with a shift in public mood but with a change of electoral rules: the threshold, single-member districts, registration procedure."],

    "ch.spec.h":          ["Идеологический спектр", "Ideological spectrum"],
    "ch.spec.p":          ["Те же координаты, что и на компасе, но развёрнутые в две шкалы: видно порядок партий и расстояния между ними. Полоса растёт от нуля в сторону полюса.",
                           "The same coordinates as on the compass, unrolled into two scales: you can see the ordering of the parties and the gaps between them. Each bar grows from zero toward its pole."],
    "ch.spec.econ":       ["Экономика", "Economy"],
    "ch.spec.state":      ["Отношение к государству", "Attitude to the state"],
    "ch.spec.planned":    ["плановая", "planned"],
    "ch.spec.market":     ["рыночная", "market"],
    "ch.spec.liberty":    ["свободы", "liberty"],
    "ch.spec.statism":    ["этатизм", "statism"],
    "ch.spec.why":        ["Что здесь видно: на экономической шкале партии распределены почти равномерно, а на шкале отношения к государству сбиты в верхнюю половину. Это и есть главная асимметрия российской партийной системы — спор идёт про экономику, а не про объём государственной власти.",
                           "What this shows: on the economic scale the parties are spread almost evenly, while on the state-authority scale they cluster in the upper half. That is the central asymmetry of the Russian party system — the argument is about the economy, not about the reach of state power."],

    "ch.radar.h":         ["Профиль по под-осям", "Sub-axis profile"],
    "ch.radar.p":         ["Одна точка на компасе прячет внутреннюю структуру позиции. Здесь те же партии разложены на шесть узких шкал: три уточняют экономическую ось, три — отношение к власти государства. Выберите партию, чтобы наложить её профиль на ваш результат теста.",
                           "A single dot on the compass hides the internal structure of a position. Here the same parties are broken down into six narrow scales: three refine the economic axis, three the attitude to state power. Pick a party to overlay its profile on your quiz result."],
    "ch.radar.pick":      ["Сравнить с партией", "Compare with a party"],
    "ch.radar.you":       ["Вы", "You"],
    "ch.radar.youHint":   ["Пройдите тест — и ваш профиль ляжет поверх партийного.",
                           "Take the quiz and your profile will be laid over the party's."],
    "ch.radar.aria":      ["Диаграмма-паук: профиль партии по шести под-осям",
                           "Radar chart: party profile across six sub-axes"],
    "ch.radar.legend":    ["Шкала каждого луча — от −10 у внутреннего края к +10 у внешнего; ноль проходит по средней окружности.",
                           "Each spoke runs from −10 at the inner edge to +10 at the outer; zero sits on the middle ring."],
    /* «{d} единиц» ломается на дробных числах: по-русски 7.1 требует
       родительного единственного («единицы»), а 2.0 — множественного.
       Проще не склонять вовсе и сказать «по шкале» — так же, как в
       сводке результата теста. */
    "ch.radar.gap":       ["Наибольшее расхождение — {axis}: {d} по шкале.",
                           "Largest gap — {axis}: {d} on the scale."],
    "ch.radar.match":     ["Средняя разница по шести шкалам — {d}.",
                           "Mean difference across the six scales — {d}."],

    /* ===== под-оси ===== */
    "sub.property":       ["Собственность", "Ownership"],
    "sub.property.d":     ["Кому принадлежат недра, банки и крупная промышленность: государству или частным владельцам.",
                           "Who owns natural resources, banks and heavy industry: the state or private holders."],
    "sub.property.lo":    ["национализация", "nationalisation"],
    "sub.property.hi":    ["частная собственность", "private ownership"],
    "sub.redistribution": ["Перераспределение", "Redistribution"],
    "sub.redistribution.d":["Насколько сильно налоги и социальные выплаты должны выравнивать доходы.",
                           "How strongly taxes and transfers should level out incomes."],
    "sub.redistribution.lo":["сильное", "strong"],
    "sub.redistribution.hi":["слабое", "weak"],
    "sub.regulation":     ["Регулирование", "Regulation"],
    "sub.regulation.d":   ["Объём государственного вмешательства в работу компаний: цены, тарифы, проверки, трудовое право.",
                           "How far the state reaches into how companies operate: prices, tariffs, inspections, labour law."],
    "sub.regulation.lo":  ["жёсткое", "heavy"],
    "sub.regulation.hi":  ["дерегуляция", "deregulation"],
    "sub.civil":          ["Гражданские свободы", "Civil liberties"],
    "sub.civil.d":        ["Слово, собрания, интернет, частная жизнь: где заканчивается право государства ограничивать.",
                           "Speech, assembly, the internet, private life: where the state's right to restrict ends."],
    "sub.civil.lo":       ["защищены", "protected"],
    "sub.civil.hi":       ["ограничены", "restricted"],
    "sub.centralization": ["Централизация", "Centralisation"],
    "sub.centralization.d":["Вертикаль власти против федерализма, выборности губернаторов и самоуправления.",
                           "The power vertical versus federalism, elected governors and local self-government."],
    "sub.centralization.lo":["федерализм", "federalism"],
    "sub.centralization.hi":["вертикаль", "the vertical"],
    "sub.tradition":      ["Традиционализм", "Traditionalism"],
    "sub.tradition.d":    ["Должно ли государство законодательно поддерживать определённый культурный и моральный уклад.",
                           "Whether the state should enforce a particular cultural and moral order by law."],
    "sub.tradition.lo":   ["нейтралитет", "neutrality"],
    "sub.tradition.hi":   ["охранительство", "state guardianship"],

    /* ===== голосования ===== */
    "votes.h":            ["Ключевые голосования", "Landmark votes"],
    "votes.lede":         ["Координаты на компасе выведены в том числе из того, как фракции голосуют, а не только из того, что партии пишут в программах. Здесь эти голосования собраны в одну таблицу: двадцать законопроектов 2004–2024 годов — и те, на которых позиции разошлись сильнее всего, и те, на которых фракции совпали полностью.",
                           "The compass coordinates are derived in part from how factions actually vote, not only from what parties write in their platforms. Here those votes are gathered into one table: twenty bills from 2004 to 2024 — both those on which positions diverged the most and those on which the factions agreed completely."],
    "votes.note":         ["Позиция фракции — преобладающая: отдельные депутаты голосовали иначе, а по части законопроектов фракция официально не определялась. Партии, которой в том созыве не было в Думе, в строке стоит прочерк.",
                           "A faction's stance is the prevailing one: individual deputies voted differently, and on some bills a faction took no official line. A dash marks a party that was not in the Duma for that convocation."],
    "votes.filterAll":    ["Все голосования", "All votes"],
    "votes.filterEcon":   ["Экономика", "Economy"],
    "votes.filterState":  ["Государство и права", "State & rights"],
    "votes.filterForeign":["Внешняя политика", "Foreign policy"],
    "votes.for":          ["За", "For"],
    "votes.against":      ["Против", "Against"],
    "votes.abstain":      ["Воздержались", "Abstained"],
    "votes.skip":         ["Не голосовали", "Did not vote"],
    "votes.split":        ["Раскол", "Split"],
    "votes.absent":       ["Не в Думе", "Not in the Duma"],
    "votes.result":       ["Итог", "Outcome"],
    "votes.passed":       ["Принят", "Passed"],
    "votes.axis":         ["Что разводит", "What it separates"],
    "votes.tally":        ["{n} голосов за", "{n} votes in favour"],
    "votes.conv":         ["{conv} созыв", "Convocation {conv}"],
    "votes.matrixAria":   ["Позиции фракций по ключевым голосованиям Госдумы",
                           "Faction positions on landmark Duma votes"],
    "votes.agreement":    ["Совпадение позиций", "Position agreement"],
    "votes.agreementP":   ["Доля голосований, в которых две фракции заняли одинаковую позицию. Считается только по тем голосованиям, где обе партии были в Думе, — иначе отсутствие в созыве читалось бы как согласие.",
                           "The share of votes on which two factions took the same position. Counted only over votes where both parties sat in the Duma — otherwise absence would read as agreement."],
    "votes.agreementAria":["Матрица совпадения позиций фракций", "Matrix of faction position agreement"],
    "votes.noCommon":     ["нет общих голосований", "no shared votes"],
    "votes.ofVotes":      ["{k} из {n}", "{k} of {n}"],
    "votes.scaleLow":     ["Расходятся", "Diverge"],
    "votes.scaleHigh":    ["Совпадают", "Agree"],
    "votes.thinHint":     ["мало общих голосований, процент неустойчив", "few shared votes, the percentage is unstable"],
    "votes.thinNote":     ["Ячейки с пунктирной рамкой посчитаны по трём общим голосованиям или меньше: одно новое голосование заметно сдвинет процент, поэтому доверять ему как устойчивому показателю не стоит.",
                           "Dashed-border cells are based on three or fewer shared votes: a single new vote would shift the percentage noticeably, so it should not be read as a stable measure."],
    "votes.pickHint":     ["Клик по строке раскрывает разбор голосования.",
                           "Click a row to open the breakdown of the vote."],
    "votes.why":          ["Почему это голосование в списке", "Why this vote is on the list"],

    /* ===== тест ===== */
    "quiz.eyebrow":       ["Тест · {n} {statements}", "Quiz · {n} {statements}"],
    "quiz.h":             ["Где вы на компасе?", "Where do you stand?"],
    "quiz.lede":          ["Оцените согласие с {n} утверждениями о российской экономике и устройстве власти. В конце получите две координаты по тем же шкалам, что и у партий, — и увидите, рядом с кем оказались.",
                           "Rate how much you agree with {n} statements about the Russian economy and the structure of power. At the end you get two coordinates on the same scales as the parties — and see whose company you are in."],
    "quiz.fact1":         ["<b>{a} + {b}</b> утверждений: экономика и роль государства",
                           "<b>{a} + {b}</b> statements: the economy and the role of the state"],
    "quiz.fact2":         ["<b>5–7 минут</b> — примерное время прохождения", "<b>5–7 minutes</b> — the usual run time"],
    "quiz.fact2.short":   ["<b>2–3 минуты</b> — примерное время прохождения", "<b>2–3 minutes</b> — the usual run time"],

    "quiz.mode":          ["Версия теста", "Quiz length"],
    "quiz.mode.full":     ["Полная · {n}", "Full · {n}"],
    "quiz.mode.short":    ["Короткая · {n}", "Short · {n}"],
    "quiz.mode.fullD":    ["все утверждения, 5–7 минут", "every statement, 5–7 minutes"],
    "quiz.mode.shortD":   ["ключевые утверждения, 2–3 минуты", "the key statements, 2–3 minutes"],
    "quiz.mode.full.n":   ["полная", "full"],
    "quiz.mode.short.n":  ["короткая", "short"],
    "quiz.shortNote":     ["Короткая версия — не первые {n} вопросов, а отдельная выборка из {all}: поровну на каждую ось, все шесть под-осей покрыты, все ключевые утверждения на месте. Координаты считаются по той же формуле и по той же шкале, поэтому результаты двух версий сравнимы между собой.",
                           "The short version is not the first {n} questions but a separate selection out of {all}: evenly split between the axes, covering all six sub-axes, with every key statement kept. The coordinates use the same formula on the same scale, so results from the two versions are comparable."],
    "res.version":        ["Версия теста: {v} · {n} {statements}", "Quiz length: {v} · {n} {statements}"],
    "res.shortNote":      ["Результат получен по короткой версии ({n} утверждений из {all}) — шкала та же, но отдельных утверждений за координатой стоит вдвое меньше.",
                           "This result comes from the short version ({n} statements out of {all}) — the same scale, but half as many statements stand behind each coordinate."],
    "quiz.fact3":         ["<b>Ничего не отправляется</b> — ответы остаются в вашем браузере",
                           "<b>Nothing is sent anywhere</b> — your answers stay in your browser"],
    "quiz.start":         ["Начать тест", "Start the quiz"],
    "quiz.continue":      ["Продолжить · вопрос {n}", "Continue · question {n}"],
    "quiz.showPrev":      ["Показать прошлый результат", "Show the previous result"],
    "quiz.reset":         ["Сбросить ответы", "Clear answers"],
    "quiz.note":          ["Две оси — упрощение: они не описывают внешнюю политику, национальный вопрос и личное доверие к политикам. Результат — повод разобраться в позициях, а не диагноз и не агитация.",
                           "Two axes are a simplification: they do not cover foreign policy, the national question or personal trust in politicians. The result is a starting point for working out positions, not a diagnosis and not campaigning."],
    "quiz.back":          ["← К описанию", "← Back to the intro"],
    "quiz.answered":      ["Отвечено вопросов", "Questions answered"],
    "quiz.tag.x":         ["Экономика", "Economy"],
    "quiz.tag.y":         ["Государство и общество", "State and society"],
    "quiz.answer":        ["Ваш ответ", "Your answer"],
    "quiz.prev":          ["← Назад", "← Back"],
    "quiz.skip":          ["Пропустить", "Skip"],
    "quiz.next":          ["Дальше →", "Next →"],
    "quiz.finish":        ["Показать результат", "Show my result"],
    "quiz.keys":          ["Клавиши <kbd>1</kbd>…<kbd>5</kbd> — ответ, <kbd>←</kbd> <kbd>→</kbd> — переход между вопросами.",
                           "Keys <kbd>1</kbd>…<kbd>5</kbd> answer, <kbd>←</kbd> <kbd>→</kbd> move between questions."],
    "quiz.weight":        ["Ключевое утверждение · вес {w}", "Key statement · weight {w}"],
    "quiz.weightHint":    ["Такие утверждения разводят позиции сильнее остальных, поэтому весят чуть больше.",
                           "Statements like this separate positions more sharply than the rest, so they carry slightly more weight."],
    "quiz.subOf":         ["Под-ось: {name}", "Sub-axis: {name}"],

    "scale.--":           ["Полностью не согласен", "Strongly disagree"],
    "scale.-":            ["Скорее не согласен", "Somewhat disagree"],
    "scale.0":            ["Затрудняюсь ответить", "No opinion"],
    "scale.+":            ["Скорее согласен", "Somewhat agree"],
    "scale.++":           ["Полностью согласен", "Strongly agree"],

    "res.eyebrow":        ["Ваш результат", "Your result"],
    "res.shared":         ["Результат по ссылке", "A shared result"],
    "res.sharedNote":     ["Это чужой результат, открытый по ссылке: ваши собственные ответы не тронуты. Кнопка ниже вернёт вас к своему тесту.",
                           "This is someone else's result opened from a link: your own answers are untouched. The button below returns you to your own quiz."],
    "res.mine":           ["Вернуться к моему тесту", "Back to my own quiz"],
    "res.econ":           ["Экономика", "Economy"],
    "res.state":          ["Отношение к государству", "Attitude to the state"],
    "res.views":          ["{w} взгляды", "{w} views"],
    "res.summary":        ["Ближе всего — <b>{best}</b>: {m}% совпадения, расстояние {d} по шкале. Дальше всего — {far}.",
                           "Closest — <b>{best}</b>: {m}% match, a distance of {d} on the scale. Farthest — {far}."],
    "res.skipped":        [" Без ответа {n} {statements} — они не влияют на результат.",
                           " {n} {statements} left unanswered — they do not affect the result."],
    "res.showCompass":    ["Показать на большом компасе", "Show on the full compass"],
    "res.review":         ["Вернуться к вопросам", "Back to the questions"],
    "res.again":          ["Пройти заново", "Take it again"],
    "res.matchNote":      ["Совпадение считается по расстоянию между точками на двух осях: 100% — полное попадание, 0% — {n} и больше единиц шкалы. Это близость координат, а не рекомендация голосовать.",
                           "The match is computed from the distance between two points on two axes: 100% is an exact hit, 0% is {n} scale units or more. It measures closeness of coordinates, not voting advice."],
    "res.shareBlock":     ["Карточка результата", "Result card"],
    "res.cardP":          ["Картинка собирается прямо в браузере — можно сохранить или отправить как есть.",
                           "The image is assembled right in your browser — save it or share it as is."],
    "res.fmt":            ["Формат картинки", "Image format"],
    "res.save":           ["Сохранить картинку", "Save image"],
    "res.send":           ["Поделиться", "Share"],
    "res.fmtNote":        ["Формат <b>{label}</b> · {w}×{h} px", "Format <b>{label}</b> · {w}×{h} px"],
    "res.preview":        ["Предпросмотр карточки результата", "Preview of the result card"],
    "res.saved":          ["Карточка сохранена: {name}", "Card saved: {name}"],
    "res.cardFail":       ["Не удалось собрать картинку", "Could not build the image"],
    "res.fmt.square":     ["Квадрат · лента", "Square · feed"],
    "res.fmt.wide":       ["Широкая · превью ссылки", "Wide · link preview"],

    "res.link.h":         ["Ссылка на результат", "Link to this result"],
    "res.link.p":         ["В ссылке закодированы все ваши ответы, поэтому по ней результат воспроизводится точь-в-точь — вместе с разбором по под-осям, а не только картинкой. Ссылка никуда не отправляется и никем не хранится: весь код лежит в самом адресе.",
                           "The link encodes every one of your answers, so it reproduces the result exactly — including the sub-axis breakdown, not just a picture. The link is not sent or stored anywhere: the whole code sits inside the address itself."],
    "res.link.copy":      ["Скопировать ссылку", "Copy link"],
    "res.link.copied":    ["Ссылка скопирована в буфер обмена", "Link copied to the clipboard"],
    "res.link.failed":    ["Не удалось скопировать — выделите адрес вручную",
                           "Could not copy — select the address manually"],
    "res.link.open":      ["Открыть в новой вкладке", "Open in a new tab"],
    "res.link.aria":      ["Ссылка на ваш результат", "Link to your result"],

    "res.break.h":        ["Как ответы сложились в координаты", "How your answers add up"],
    "res.break.p":        ["Каждый ответ умножается на направление утверждения и на его вес, а сумма по оси делится на достижимый максимум. Ниже — вклад каждого утверждения: положительные значения тянут вправо и вверх, отрицательные — влево и вниз.",
                           "Each answer is multiplied by the statement's direction and its weight, and the sum along an axis is divided by the reachable maximum. Below is the contribution of every statement: positive values pull right and up, negative ones left and down."],
    "res.break.show":     ["Показать разбор по утверждениям", "Show the statement-by-statement breakdown"],
    "res.break.hide":     ["Скрыть разбор", "Hide the breakdown"],
    "res.break.top":      ["Сильнее всего на результат повлияли", "The biggest influences on your result"],
    "res.break.pull":     ["тянет к {pole} на {v}", "pulls toward {pole} by {v}"],
    "res.break.none":     ["не сдвигает координату", "does not move the coordinate"],
    "res.break.axisX":    ["Ось экономики", "Economic axis"],
    "res.break.axisY":    ["Ось отношения к государству", "State-authority axis"],
    "res.break.sum":      ["Сумма вкладов {s} из достижимых {m} — это и даёт координату {c}.",
                           "Contributions total {s} out of a reachable {m}, which yields the coordinate {c}."],
    "res.break.reach":    ["Полюс шкалы достигается на {p}% от арифметического максимума: иначе крайние точки были бы недостижимы и все результаты сползали бы к центру.",
                           "A pole is reached at {p}% of the arithmetic maximum: otherwise the extremes would be unreachable and every result would drift toward the centre."],
    "res.break.stmt":     ["Утверждение", "Statement"],
    "res.break.answer":   ["Ответ", "Answer"],
    "res.break.weight":   ["Вес", "Weight"],
    "res.break.contrib":  ["Вклад", "Contribution"],

    "res.sub.h":          ["Ваш профиль по под-осям", "Your sub-axis profile"],
    "res.sub.p":          ["Те же ответы, но разложенные на шесть узких шкал. Здесь часто видно то, что итоговая точка сглаживает: например, рыночные взгляды на собственность при сильном запросе на перераспределение.",
                           "The same answers, unrolled into six narrower scales. This often reveals what the final dot smooths over: market views on ownership alongside a strong demand for redistribution, for instance."],

    "res.hist.h":         ["История прохождений", "Your past attempts"],
    "res.hist.p":         ["Последние {n} результатов из вашего браузера. Взгляды меняются, и полезнее видеть направление сдвига, чем одну точку.",
                           "The last {n} results from your browser. Views change, and the direction of the shift says more than a single point."],
    "res.hist.empty":     ["Пока только одно прохождение — вернитесь к тесту позже, и здесь появится линия сдвига.",
                           "Only one attempt so far — come back to the quiz later and a drift line will appear here."],
    "res.hist.now":       ["сейчас", "now"],
    "res.hist.drift":     ["С первого прохождения: экономика {dx}, отношение к государству {dy}.",
                           "Since your first attempt: economy {dx}, attitude to the state {dy}."],
    "res.hist.five":      ["Пятое прохождение — ровно как в номере версии сайта. Совпадение, но приятное.",
                           "Fifth attempt — matches the site's version number exactly. A coincidence, but a nice one."],
    "res.hist.clear":     ["Очистить историю", "Clear history"],
    "res.hist.cleared":   ["История прохождений очищена", "Attempt history cleared"],
    "res.hist.aria":      ["График ваших прошлых результатов", "Chart of your past results"],
    "res.hist.open":      ["Открыть это прохождение", "Open this attempt"],

    /* ===== словесные ярлыки позиции ===== */
    "w.econ.farleft":     ["последовательно левые", "consistently left-wing"],
    "w.econ.left":        ["умеренно левые", "moderately left-wing"],
    "w.econ.centre":      ["центристские", "centrist"],
    "w.econ.right":       ["умеренно правые", "moderately right-wing"],
    "w.econ.farright":    ["последовательно правые", "consistently right-wing"],
    "w.state.lib":        ["выраженно либертарианские", "strongly libertarian"],
    "w.state.freedom":    ["скорее за личные свободы", "leaning toward personal liberty"],
    "w.state.centre":     ["центристские", "centrist"],
    "w.state.strong":     ["скорее за сильное государство", "leaning toward a strong state"],
    "w.state.statist":    ["выраженно этатистские", "strongly statist"],
    "q.leftstat":         ["левый этатизм", "left statism"],
    "q.rightstat":        ["правый этатизм", "right statism"],
    "q.leftlib":          ["левое либертарианство", "left libertarianism"],
    "q.rightlib":         ["правое либертарианство", "right libertarianism"],

    /* ===== подсказка над точкой ===== */
    "tip.hasSeats":       ["Есть представительство в Госдуме", "Represented in the State Duma"],
    "tip.noSeats":        ["Нет мандатов в Госдуме {conv}", "No seats in the State Duma, {conv}"],
    "tip.more":           [" · клик — подробнее", " · click for details"],
    "tip.you":            ["Ваша позиция", "Your position"],
    "tip.youSub":         ["{q} — по результатам теста", "{q} — from your quiz result"],
    "tip.youBest":        ["Ближе всего — {name} · {m}% совпадения", "Closest — {name} · {m}% match"],
    "tip.trail":          ["Точка траектории · сейчас {x} / {y}", "Trajectory point · now {x} / {y}"],
    "node.you":           ["Вы", "You"],
    "node.youSeat":       ["результат теста", "quiz result"],
    "node.youAria":       ["Ваша позиция по результатам теста: экономика {x}, отношение к государству {y}",
                           "Your position from the quiz: economy {x}, attitude to the state {y}"],
    "seats.none":         ["нет мандатов", "no seats"],

    /* ===== экспорт ===== */
    "ex.png":             ["Компас · PNG", "Compass · PNG"],
    "ex.png.h":           ["картинка 1320×1320, текущий созыв и фильтр",
                           "a 1320×1320 image with the current convocation and filter"],
    "ex.svg":             ["Компас · SVG", "Compass · SVG"],
    "ex.svg.h":           ["вектор, открывается в редакторе", "vector, opens in an editor"],
    "ex.csv":             ["Партии · CSV", "Parties · CSV"],
    "ex.csv.h":           ["координаты, лидеры и мандаты по всем созывам",
                           "coordinates, leaders and seats across all convocations"],
    "ex.seats":           ["Мандаты по созывам · CSV", "Seats by convocation · CSV"],
    "ex.seats.h":         ["длинная таблица: партия × созыв", "a long table: party × convocation"],
    "ex.traj":            ["Траектории · CSV", "Trajectories · CSV"],
    "ex.traj.h":          ["как двигались позиции партий по годам", "how party positions moved year by year"],
    "ex.sub":             ["Под-оси · CSV", "Sub-axes · CSV"],
    "ex.sub.h":           ["шесть узких шкал по каждой партии", "six narrow scales for every party"],
    "ex.votes":           ["Голосования · CSV", "Votes · CSV"],
    "ex.votes.h":         ["позиции фракций по ключевым законопроектам", "faction stances on landmark bills"],
    "ex.json":            ["Всё · JSON", "Everything · JSON"],
    "ex.json.h":          ["полный набор данных, включая тезисы и обоснования",
                           "the full dataset, including positions and reasoning"],
    "ex.quiz":            ["Мой результат · CSV", "My result · CSV"],
    "ex.quiz.h":          ["координаты и совпадение с партиями", "coordinates and match with the parties"],
    "ex.saved":           ["Файл сохранён: {name}", "File saved: {name}"],
    "ex.failed":          ["Не удалось собрать файл", "Could not build the file"],
    "ex.noCompass":       ["Компас ещё не отрисован", "The compass has not been drawn yet"],
    "ex.noImage":         ["Не удалось собрать картинку", "Could not build the image"],

    /* CSV-заголовки */
    "csv.id":             ["id", "id"],
    "csv.party":          ["Партия", "Party"],
    "csv.short":          ["Краткое название", "Short name"],
    "csv.ideology":       ["Идеология", "Ideology"],
    "csv.leader":         ["Лидер", "Leader"],
    "csv.x":              ["Экономика (X)", "Economy (X)"],
    "csv.y":              ["Отношение к государству (Y)", "Attitude to the state (Y)"],
    "csv.seatsIn":        ["Мандаты · {conv}", "Seats · {conv}"],
    "csv.conv":           ["Созыв", "Convocation"],
    "csv.years":          ["Годы", "Years"],
    "csv.seats":          ["Мандаты", "Seats"],
    "csv.share":          ["Доля палаты, %", "Share of chamber, %"],
    "csv.year":           ["Год", "Year"],
    "csv.changed":        ["Что изменилось", "What changed"],
    "csv.metric":         ["Показатель", "Metric"],
    "csv.value":          ["Значение", "Value"],
    "csv.quadrant":       ["Квадрант", "Quadrant"],
    "csv.answered":       ["Отвечено утверждений", "Statements answered"],
    "csv.version":        ["Версия теста", "Quiz length"],
    "csv.match":          ["Совпадение, %", "Match, %"],
    "csv.distance":       ["Расстояние", "Distance"],
    "csv.subaxis":        ["Под-ось", "Sub-axis"],
    "csv.score":          ["Оценка", "Score"],
    "csv.bill":           ["Законопроект", "Bill"],
    "csv.date":           ["Дата", "Date"],
    "csv.position":       ["Позиция фракции", "Faction stance"],

    /* ===== вкладка «О проекте» ===== */
    "ab.hero.h":          ["Карта вместо ярлыков", "A map instead of labels"],
    "ab.hero.lede":       ["Разговор о политике в России быстро сводится к двум ярлыкам — «свои» и «чужие». Этот проект пробует заменить их координатной сеткой: у каждой партии есть измеримое положение по двум независимым осям, и рядом с ним — объяснение, почему оно именно такое.",
                           "Political conversation in Russia collapses quickly into two labels — ours and theirs. This project tries to replace them with a coordinate grid: every party has a measurable position on two independent axes, and next to it an explanation of why it sits there."],
    "ab.hero.p2":         ["Компас не голосует за вас и никого не рекламирует. Он показывает, как программы и публичная риторика партий раскладываются по двум измерениям, насколько далеко партии отстоят друг от друга и как менялся состав Госдумы за пять созывов подряд.",
                           "The compass does not vote for you and advertises no one. It shows how party platforms and public rhetoric decompose along two dimensions, how far apart the parties stand, and how the composition of the State Duma changed across five consecutive convocations."],

    "ab.axes.h":          ["Две оси", "Two axes"],
    "ab.axes.p":          ["Одномерная шкала «левые — правые» склеивает вещи, которые в жизни не связаны: отношение к собственности и отношение к принуждению. Поэтому осей две, и они независимы.",
                           "A one-dimensional left–right scale glues together things that are unrelated in practice: attitudes to property and attitudes to coercion. Hence two axes, and they are independent."],
    "ab.axes.xk":         ["Горизонталь · экономика", "Horizontal · the economy"],
    "ab.axes.xlo":        ["−10 плановая", "−10 planned"],
    "ab.axes.xhi":        ["+10 рыночная", "+10 market"],
    "ab.axes.xp":         ["Кто распоряжается собственностью и доходом: государство через национализацию, планирование и перераспределение — или частные владельцы через рынок, конкуренцию и низкие налоги.",
                           "Who disposes of property and income: the state through nationalisation, planning and redistribution — or private owners through markets, competition and low taxes."],
    "ab.axes.yk":         ["Вертикаль · отношение к власти государства", "Vertical · attitude to state power"],
    "ab.axes.ylo":        ["−10 свободы", "−10 liberty"],
    "ab.axes.yhi":        ["+10 этатизм", "+10 statism"],
    "ab.axes.yp":         ["Сколько государство вправе решать за человека: контроль над словом, собраниями, интернетом и частной жизнью, сила вертикали власти — или права личности, суд, федерализм и самоуправление.",
                           "How much the state may decide on a person's behalf: control over speech, assembly, the internet and private life, and the strength of the power vertical — or individual rights, the courts, federalism and self-government."],
    "ab.axes.note":       ["Оси независимы: партия может требовать национализации и при этом выступать за честные выборы — таких сочетаний в российской политике достаточно, и на одной шкале они бы слиплись.",
                           "The axes are independent: a party can demand nationalisation and campaign for fair elections at the same time. Russian politics has plenty of such combinations, and a single scale would fuse them together."],

    "ab.src.h":           ["Откуда берутся координаты", "Where the coordinates come from"],
    "ab.src.p":           ["Координаты — это экспертная оценка, а не результат измерения. Каждая позиция выведена из четырёх источников, в порядке приоритета:",
                           "The coordinates are an expert estimate, not the result of a measurement. Every position is derived from four sources, in order of priority:"],
    "ab.src.l1":          ["<b>Программные документы партии</b> — официальная программа и предвыборная платформа.",
                           "<b>The party's programme documents</b> — the official platform and the election manifesto."],
    "ab.src.l2":          ["<b>Голосования фракции в Госдуме</b> — что партия поддерживает на практике, а не на словах.",
                           "<b>The faction's votes in the Duma</b> — what the party supports in practice rather than in words."],
    "ab.src.l3":          ["<b>Публичная риторика руководства</b> — заявления лидеров и партийных спикеров.",
                           "<b>The leadership's public rhetoric</b> — statements by leaders and party spokespeople."],
    "ab.src.l4":          ["<b>Позиция относительно соседей</b> — координата калибруется так, чтобы расстояния между партиями отражали реальную разницу программ, а не только абсолютные значения.",
                           "<b>Position relative to neighbours</b> — each coordinate is calibrated so that the distances between parties reflect the real difference in platforms, not just absolute values."],
    "ab.src.p2":          ["У каждой партии в карточке есть раздел «Почему такие координаты» — там разбор конкретной позиции. Это и есть главное содержание проекта: не цифра, а обоснование, с которым можно спорить.",
                           "Every party profile has a “Why these coordinates” section with the reasoning for that specific position. That is the real content of the project: not the number but the argument you can dispute."],

    "ab.sub.h":           ["Шесть под-осей", "Six sub-axes"],
    "ab.sub.p":           ["Точка на компасе — это свёртка, а всякая свёртка что-то теряет. Партия с рыночным взглядом на собственность и жёстким запросом на перераспределение попадает туда же, куда партия, умеренная в обоих вопросах. Поэтому каждая координата дополнительно разложена на три более узкие шкалы в той же системе −10…+10.",
                           "A dot on the compass is a roll-up, and every roll-up loses something. A party with market views on ownership and a hard demand for redistribution lands in the same spot as a party that is moderate on both. So each coordinate is additionally broken into three narrower scales in the same −10…+10 system."],
    "ab.sub.l1":          ["<b>Собственность</b> — кому принадлежат недра, банки и крупная промышленность.",
                           "<b>Ownership</b> — who owns natural resources, banks and heavy industry."],
    "ab.sub.l2":          ["<b>Перераспределение</b> — насколько сильно налоги и выплаты выравнивают доходы.",
                           "<b>Redistribution</b> — how strongly taxes and transfers level out incomes."],
    "ab.sub.l3":          ["<b>Регулирование</b> — как глубоко государство вмешивается в работу компаний.",
                           "<b>Regulation</b> — how deeply the state reaches into how companies operate."],
    "ab.sub.l4":          ["<b>Гражданские свободы</b> — где заканчивается право государства ограничивать.",
                           "<b>Civil liberties</b> — where the state's right to restrict comes to an end."],
    "ab.sub.l5":          ["<b>Централизация</b> — вертикаль власти против федерализма и самоуправления.",
                           "<b>Centralisation</b> — the power vertical against federalism and self-government."],
    "ab.sub.l6":          ["<b>Традиционализм</b> — должно ли государство охранять определённый культурный уклад.",
                           "<b>Traditionalism</b> — whether the state should guard a particular cultural order."],
    "ab.sub.note":        ["Среднее трёх под-осей равно координате партии — это требование к данным, а не совпадение: под-оси обязаны объяснять точку на компасе, иначе они начнут жить своей жизнью. Диаграмма-паук в аналитике накладывает профиль партии на ваш результат теста, и расхождения там видны лучше, чем в цифрах.",
                           "The mean of the three sub-axes equals the party's coordinate — a requirement on the data, not a coincidence: the sub-axes must explain the dot on the compass, otherwise they start living a life of their own. The radar chart in the analytics section overlays a party's profile on your quiz result, where the gaps read better than any table of numbers."],

    "ab.votes.h":         ["Ключевые голосования", "Landmark votes"],
    "ab.votes.p":         ["Программу можно написать какой угодно, голосование — уже поступок. Отдельная вкладка собирает двадцать знаковых законопроектов — от монетизации льгот 2004 года до запрета «пропаганды чайлдфри» в 2024-м — и показывает, как по ним разошлись фракции.",
                           "A platform can say anything; a vote is an act. A separate tab collects twenty landmark bills, from the 2004 monetisation of social benefits to the 2024 ban on “child-free propaganda”, and shows how the factions split on each."],
    "ab.votes.p2":        ["Матрица совпадений под таблицей интереснее самих голосований. Она показывает то, что на компасе видно лишь косвенно: расстояние между точками и разница в поведении — не одно и то же. ЛДПР и «Справедливая Россия» стоят в 6.7 единицы друг от друга — почти втрое дальше, чем ЛДПР от «Единой России», — и при этом совпали во всех общих голосованиях, тогда как с ближайшей «Единой Россией» ЛДПР разошлась по пенсионному возрасту. Расстояние на поле измеряет программы, матрица — поведение, и совпадают они не всегда.",
                           "The agreement matrix beneath the table is more interesting than the votes themselves. It shows what the compass conveys only indirectly: distance between dots and difference in behaviour are not the same thing. The LDPR and A Just Russia sit 6.7 units apart — nearly three times farther than the LDPR is from United Russia — yet they matched on every vote they shared, while the LDPR parted with its nearest neighbour, United Russia, over the retirement age. Distance on the field measures platforms; the matrix measures behaviour, and the two do not always agree."],
    "ab.votes.note":      ["Позиция фракции приведена как преобладающая: отдельные депутаты голосовали иначе. Там, где у фракции не было официальной позиции, стоит «нет данных», а не догадка — единственная ценность этого раздела в том, что ему можно верить.",
                           "A faction's stance is given as the prevailing one: individual deputies voted differently. Where a faction had no official line, the table says “no data” rather than offering a guess — the only value of this section is that it can be trusted."],

    "ab.trail.h":         ["Траектории партий", "Party trajectories"],
    "ab.trail.p":         ["Кнопка «Траектории» над компасом включает необязательный слой: пунктирные стрелки показывают, как менялось положение партии от самой ранней известной позиции к нынешней. Наглядные примеры — «Родина», которая начинала как левопатриотический блок с требованием изъять природную ренту, а вернулась в политику национал-консервативной партией без перераспределительной программы; «Справедливая Россия», прошедшая путь от протестной зимы 2011 года до патриотической мобилизационной повестки после объединения с «За правду»; и «Единая Россия», чья риторика с 2003 по 2021 год сместилась от центристского управленческого языка к консервативному суверенитету.",
                           "The Trajectories button above the compass turns on an optional layer: dashed arrows show how a party's position moved from its earliest known point to the present one. The clearest examples are Rodina, which began as a left-patriotic bloc demanding the clawback of resource rent and returned to politics as a national-conservative party with no redistributive programme; A Just Russia, which travelled from the protest winter of 2011 to a patriotic mobilisation agenda after merging with For Truth; and United Russia, whose rhetoric between 2003 and 2021 shifted from centrist managerial language to conservative sovereignty."],
    "ab.trail.p2":        ["Точки маршрута подписаны годами: наведите курсор — появится объяснение, что именно изменилось в тот момент. Траектории есть не у всех партий: рисовать стрелку там, где позиция сдвинулась на полделения шкалы, значит выдавать шум за тенденцию.",
                           "Waypoints are labelled with years: hover over one and an explanation of what changed at that moment appears. Not every party has a trajectory — drawing an arrow where a position moved by half a scale unit would be passing noise off as a trend."],
    "ab.trail.note":      ["Промежуточные координаты — такая же экспертная оценка, как и основные, и выведены тем же способом: из программ, голосований и публичной риторики соответствующих лет.",
                           "The intermediate coordinates are the same kind of expert estimate as the main ones and are derived the same way: from the platforms, votes and public rhetoric of the corresponding years."],

    "ab.metrics.h":       ["Аналитика палаты", "Chamber analytics"],
    "ab.metrics.p":       ["Компас показывает партии, а плитки под ним — саму Госдуму: то, чего в координатах отдельных партий не видно.",
                           "The compass shows parties; the tiles beneath it show the Duma itself — what the coordinates of individual parties cannot reveal."],
    "ab.metrics.l1":      ["<b>Центр тяжести</b> — средние координаты палаты, взвешенные по мандатам. Отвечает на вопрос, о чём в этой Думе договорились.",
                           "<b>Centre of gravity</b> — the chamber's mean coordinates, weighted by seats. It answers the question of what this Duma agreed on."],
    "ab.metrics.l2":      ["<b>Эффективное число фракций</b> — индекс Лааксо — Таагеперы, единица делённая на сумму квадратов долей. Фракция весит своей долей, а не фактом существования: пять фракций, одна из которых держит почти три четверти мест, дают чуть больше полутора.",
                           "<b>Effective number of factions</b> — the Laakso–Taagepera index, one divided by the sum of squared shares. A faction is weighted by its share, not by the fact of its existence: five factions, one of which holds nearly three quarters of the seats, yield only a little over one and a half."],
    "ab.metrics.l3":      ["<b>Поляризация</b> — среднее расстояние фракции до центра тяжести, взвешенное по мандатам. Отвечает на вопрос, спорят ли в палате вообще.",
                           "<b>Polarisation</b> — the mean distance from a faction to the centre of gravity, weighted by seats. It answers the question of whether the chamber argues at all."],
    "ab.metrics.note":    ["Все три числа пересчитываются при смене созыва, поэтому их можно сравнивать между созывами напрямую — размер палаты всё это время оставался равным 450 местам.",
                           "All three numbers are recomputed when you switch convocation, so they can be compared across convocations directly — the size of the chamber stayed at 450 seats throughout."],

    "ab.export.h":        ["Экспорт данных", "Data export"],
    "ab.export.p":        ["Кнопка «Экспорт» отдаёт содержимое проекта в машиночитаемом виде — можно проверить расчёты, построить свои графики или поспорить с координатами предметно:",
                           "The Export button hands over the project's content in machine-readable form, so you can check the arithmetic, build your own charts, or dispute the coordinates with specifics:"],
    "ab.export.l1":       ["<b>Компас · PNG и SVG</b> — картинка поля ровно в том виде, в каком она на экране: с выбранным созывом, фильтром, темой и включённым слоем траекторий.",
                           "<b>Compass · PNG and SVG</b> — a picture of the field exactly as it appears on screen: with the chosen convocation, filter, theme and trajectory layer."],
    "ab.export.l2":       ["<b>Партии · CSV</b> — координаты, идеология, лидеры и мандаты по всем пяти созывам.",
                           "<b>Parties · CSV</b> — coordinates, ideology, leaders and seats across all five convocations."],
    "ab.export.l3":       ["<b>Мандаты по созывам · CSV</b> — длинная таблица «партия × созыв» с долей палаты.",
                           "<b>Seats by convocation · CSV</b> — a long party-by-convocation table with each share of the chamber."],
    "ab.export.l4":       ["<b>Траектории · CSV</b> — точки маршрутов по годам вместе с пояснениями.",
                           "<b>Trajectories · CSV</b> — waypoints by year together with their explanations."],
    "ab.export.l5":       ["<b>Под-оси · CSV</b> — шесть узких шкал по каждой партии.",
                           "<b>Sub-axes · CSV</b> — the six narrow scales for every party."],
    "ab.export.l6":       ["<b>Голосования · CSV</b> — матрица «законопроект × фракция».",
                           "<b>Votes · CSV</b> — a bill-by-faction matrix."],
    "ab.export.l7":       ["<b>Всё · JSON</b> — полный набор, включая тезисы и обоснования координат, а если тест пройден — и ваш результат с рейтингом близости и ссылкой на него.",
                           "<b>Everything · JSON</b> — the full set, including party positions and the reasoning behind the coordinates, plus your own result with its closeness ranking and permalink if you have taken the quiz."],
    "ab.export.note":     ["Файлы собираются в браузере и никуда не отправляются. CSV пишется с BOM и точкой с запятой — так его без плясок открывает русский Excel; кому нужен строгий формат, тот берёт JSON. Выгрузка идёт на языке интерфейса: переключите язык, и заголовки столбцов сменятся вместе с ним.",
                           "Files are assembled in the browser and sent nowhere. The CSV is written with a BOM and semicolons, which is what a Russian-locale Excel opens without a fight; anyone who needs a strict format takes the JSON. Exports follow the interface language: switch it and the column headers switch with it."],

    "ab.seats.h":         ["Данные о мандатах", "Seat data"],
    "ab.seats.p":         ["Мандаты приводятся по итогам выборов в Государственную Думу IV–VIII созывов (2003–2021), всего 450 мест в каждом. Переключатель созыва над компасом меняет и список партий, и все графики сразу: партии, которой в том созыве не существовало, на поле нет вовсе, а ноль означает, что партия участвовала, но мандатов не получила.",
                           "Seats are given as of the State Duma election results for convocations IV–VIII (2003–2021), 450 seats in each. The convocation selector above the compass changes both the party list and every chart at once: a party that did not exist in that convocation is absent from the field entirely, while a zero means it ran and won no seats."],
    "ab.seats.p2":        ["Разница между суммой мандатов фракций и 450 местами — это депутаты вне фракций и самовыдвиженцы; на диаграмме состава палаты они показаны серыми точками и отдельной строкой легенды.",
                           "The gap between the sum of faction seats and 450 consists of non-aligned deputies and independents; on the composition chart they appear as grey dots and as a separate legend row."],

    "ab.quiz.h":          ["Тест на 40 утверждений", "The 40-statement quiz"],
    "ab.quiz.p":          ["Тест ставит на ту же сетку вас. Двадцать утверждений про экономику и двадцать про роль государства, ответ по шкале от «полностью не согласен» до «полностью согласен». Согласие двигает координату к одному полюсу оси, несогласие — к другому; несколько ключевых утверждений весят чуть больше, потому что разводят позиции сильнее остальных.",
                           "The quiz puts you on the same grid. Twenty statements about the economy and twenty about the role of the state, answered on a scale from strongly disagree to strongly agree. Agreement moves the coordinate toward one pole of the axis and disagreement toward the other; a few key statements weigh slightly more because they separate positions more sharply."],
    "ab.quiz.p2":         ["Результат — две координаты и список партий, отсортированный по расстоянию до вашей точки. Совпадение в процентах считается именно от расстояния и означает близость координат, а не совет за кого-то голосовать.",
                           "The result is two coordinates and a list of parties sorted by distance from your point. The percentage match is computed from that distance and means closeness of coordinates, not advice on how to vote."],
    "ab.quiz.p3":         ["На экране результата раскрывается разбор: каждое утверждение с его вкладом в координату, пятёрка ответов, повлиявших сильнее прочих, и профиль по шести под-осям, наложенный на профиль ближайшей партии. Формула не прячется — сумма вкладов, достижимый максимум и итоговое число показаны прямо в таблице.",
                           "The result screen opens up a breakdown: every statement with its contribution to the coordinate, the five answers that mattered most, and a six-sub-axis profile overlaid on the profile of the closest party. The formula is not hidden — the total of the contributions, the reachable maximum and the resulting figure are all shown in the table."],
    "ab.quiz.p4":         ["Рядом — ссылка на результат. В ней закодированы все сорок ответов, поэтому по ссылке результат воспроизводится точь-в-точь, вместе с разбором, а не только картинкой. Ссылка никуда не отправляется и нигде не хранится: весь код лежит в самом адресе. Открытый по чужой ссылке результат ваши собственные ответы не затирает.",
                           "Next to it is a link to the result. It encodes all forty answers, so the link reproduces the result exactly, breakdown included, rather than as a picture alone. The link is neither sent nor stored anywhere: the whole code sits in the address itself. Opening someone else's link does not overwrite your own answers."],
    "ab.quiz.p5":         ["История прохождений хранит последние двенадцать результатов и рисует их линией: взгляды меняются, и направление сдвига говорит больше, чем одна точка. История живёт только в вашем браузере и стирается отдельной кнопкой.",
                           "The attempt history keeps your last twelve results and draws them as a line: views change, and the direction of the shift says more than a single point. The history lives only in your browser and is wiped by a button of its own."],
    "ab.quiz.p6":         ["Ещё на экране результата есть карточка для соцсетей: мини-компас с вашей точкой, координаты, название квадранта и тройка ближайших партий. Она рисуется прямо в браузере через Canvas в двух форматах — квадрат для ленты и 16:9 для превью ссылки, — и её можно сохранить файлом или отправить через системное «Поделиться».",
                           "The result screen also carries a card for social media: a mini-compass with your point, the coordinates, the name of the quadrant and the three closest parties. It is drawn right in the browser with Canvas in two formats — a square for feeds and 16:9 for link previews — and can be saved as a file or passed to the system share sheet."],
    "ab.quiz.note":       ["Ответы никуда не отправляются: они лежат в localStorage вашего браузера, и кнопка «Сбросить ответы» стирает их полностью. Никакой аналитики, счётчиков и внешних запросов в проекте нет — единственный внешний ресурс на странице это шрифты.",
                           "Your answers are sent nowhere: they sit in your browser's localStorage, and the “Clear answers” button erases them completely. There is no analytics, no tracking and no outbound request in the project — the only external resource on the page is the fonts."],

    "ab.short.tag":       ["Быстрый путь", "The quick route"],
    "ab.short.h":         ["Короткая версия — 20 утверждений", "The short version — 20 statements"],
    "ab.short.p":         ["На экране запуска теста есть переключатель режима. Короткая версия — не первые двадцать вопросов из сорока, а отдельная выборка: поровну на каждую ось, все шесть под-осей покрыты и все ключевые утверждения на месте, так что расклад по направлениям такой же, как в полном тесте, только компактнее.",
                           "The quiz's start screen has a mode switch. The short version is not just the first twenty of the forty questions but a separate selection: split evenly between the axes, all six sub-axes covered and every key statement kept, so the spread across directions matches the full quiz, only more compact."],
    "ab.short.p2":        ["Результат нормируется по своей выборке, а не делится на максимум полного теста — иначе короткая версия систематически поджималась бы к центру. Поэтому обе версии кладут точку на одну и ту же шкалу, и их можно сравнивать напрямую.",
                           "The result is normalised against its own sample rather than divided by the full quiz's maximum — otherwise the short version would be systematically pulled toward the centre. Both versions therefore place the point on the same scale, and the two are directly comparable."],
    "ab.short.note":      ["Ссылка на результат короткого теста помечена отдельным кодом, чтобы двадцать ответов не спутать с двадцатью пропущенными вопросами полного прохождения — обе версии остаются различимыми и воспроизводимыми по ссылке.",
                           "The short quiz's result link carries a distinct code so that twenty answers are never confused with twenty skipped questions from a full run — both versions stay distinguishable and reproducible from their link."],

    "ab.lang.h":          ["Два языка", "Two languages"],
    "ab.lang.p":          ["Интерфейс, данные партий, формулировки теста и заголовки выгружаемых файлов переведены на английский целиком. Кнопка <b>EN</b> в шапке переключает язык и запоминает выбор; ссылка вида <code>?lang=en</code> открывает английскую версию сразу, минуя настройки браузера.",
                           "The interface, the party data, the wording of the quiz and the headers of exported files are translated into English in full. The <b>RU</b> button in the header switches the language and remembers the choice; a link of the form <code>?lang=ru</code> opens the Russian version directly, bypassing browser settings."],
    "ab.lang.note":       ["Формулировки теста переведены как позиции, а не смягчены: утверждение, звучащее резко по-русски, обязано звучать так же резко по-английски, иначе две версии теста измеряли бы разное.",
                           "The quiz statements are translated as positions rather than softened: a statement that sounds blunt in Russian has to sound just as blunt in English, otherwise the two versions of the quiz would be measuring different things."],

    "ab.not.h":           ["Чего проект не делает", "What the project does not do"],
    "ab.not.l1":          ["Не агитирует и не призывает голосовать — материал справочный.",
                           "It does not campaign or urge anyone to vote — the material is a reference."],
    "ab.not.l2":          ["Не измеряет внешнюю политику, национальный вопрос и личное доверие к политикам: две оси не вмещают всё, и это осознанное упрощение.",
                           "It does not measure foreign policy, the national question or personal trust in politicians: two axes cannot hold everything, and that is a deliberate simplification."],
    "ab.not.l3":          ["Не претендует на единственно верные координаты — это оценка, открытая к аргументам.",
                           "It does not claim the coordinates are the only correct ones — this is an estimate, open to argument."],
    "ab.not.l4":          ["Не собирает и не передаёт данные о посетителях.",
                           "It does not collect or transmit any visitor data."],

    "ab.tech.h":          ["Как это устроено", "How it is built"],
    "ab.tech.p":          ["Статическая страница без сборки, фреймворков и зависимостей: HTML, CSS и обычный JavaScript. Компас, парламентская диаграмма, график динамики, спектр и диаграмма-паук рисуются в SVG прямо в браузере. Тема по умолчанию системная — берётся из настроек операционной системы и меняется вместе с ней, пока вы не выберете светлую или тёмную вручную.",
                           "A static page with no build step, no framework and no dependencies: HTML, CSS and plain JavaScript. The compass, the hemicycle, the trend chart, the spectrum and the radar are all drawn as SVG in the browser. The default theme follows the system — it is taken from the operating system's settings and changes with them until you pick light or dark by hand."],
    "ab.tech.p2":         ["Доступность: точки компаса и элементы легенд достижимы с клавиатуры, у графика динамики есть таблица данных как альтернатива цвету, цвет нигде не остаётся единственным кодом, а анимации выключаются по <code>prefers-reduced-motion</code>.",
                           "Accessibility: compass dots and legend items are reachable from the keyboard, the trend chart offers a data table as an alternative to colour, colour is never the only code anywhere, and animations switch off under <code>prefers-reduced-motion</code>."],
    "ab.tech.cta":        ["Исходный код открыт: <a href=\"https://github.com/Arbuzyakaby/Russian-Political-Compass\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/Arbuzyakaby/Russian-Political-Compass</a>. Замечания к координатам, данным и формулировкам вопросов — через issues.",
                           "The source is open: <a href=\"https://github.com/Arbuzyakaby/Russian-Political-Compass\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/Arbuzyakaby/Russian-Political-Compass</a>. Objections to the coordinates, the data or the wording of the questions go through issues."],

    /* ===== подвал ===== */
    "ft.about":           ["Партии России на двух независимых осях: экономика и отношение к власти государства. С обоснованием каждой координаты и данными по пяти созывам Госдумы.",
                           "Russian parties on two independent axes: the economy and attitude to state power. With the reasoning behind every coordinate and data for five Duma convocations."],
    "ft.l.compass":       ["Компас и аналитика", "Compass and analytics"],
    "ft.l.quiz":          ["Тест на 40 утверждений", "The 40-statement quiz"],
    "ft.l.votes":         ["Ключевые голосования", "Landmark votes"],
    "ft.l.about":         ["О проекте и методике", "About the project and its method"],
    "ft.data.h":          ["Данные", "Data"],
    "ft.data.l1":         ["Созывы <b>IV–VIII</b>, 2003–2021", "Convocations <b>IV–VIII</b>, 2003–2021"],
    "ft.data.l2":         ["<b>450</b> мандатов в каждом созыве", "<b>450</b> seats in every convocation"],
    "ft.data.l3":         ["<b>20</b> ключевых голосований", "<b>20</b> landmark votes"],
    "ft.data.l4":         ["Координаты — экспертная оценка", "Coordinates are an expert estimate"],
    "ft.data.l5":         ["Как они выведены", "How they were derived"],
    "ft.proj.h":          ["Проект", "The project"],
    "ft.proj.l1":         ["Исходный код на GitHub", "Source code on GitHub"],
    "ft.proj.l2":         ["Статическая страница без сборки", "A static page with no build step"],
    "ft.proj.l3":         ["Ответы теста — только в браузере", "Quiz answers stay in the browser"],
    "ft.proj.l4":         ["Русский и английский интерфейс", "Russian and English interface"],
    "ft.legal":           ["Мандаты указаны по итогам выборов в Государственную Думу соответствующего созыва (IV–VIII, 2003–2021, всего 450 мест); переключить созыв можно над компасом. Координаты и лидеры партий — экспертная оценка и данные на текущий момент; материал не является агитацией.",
                           "Seats are given as of the State Duma election results for the corresponding convocation (IV–VIII, 2003–2021, 450 seats in total); the convocation can be switched above the compass. Party coordinates and leaders are an expert estimate and current as of today; this material is not campaigning."],

    /* ===== карточка для соцсетей ===== */
    "card.eyebrow":       ["ПОЛИТИЧЕСКИЙ КОМПАС ПАРТИЙ РФ", "RUSSIAN POLITICAL COMPASS"],
    "card.closest":       ["БЛИЖЕ ВСЕГО", "CLOSEST MATCHES"],
    "card.state":         ["Государство", "The state"],
    "card.sub":           ["{econ} взгляды · {state}", "{econ} views · {state}"],
    "card.foot1":         ["Тест на {n} утверждений · {site}", "A {n}-statement quiz · {site}"],
    "card.foot2":         ["Координаты — экспертная оценка, не агитация",
                           "Coordinates are an expert estimate, not campaigning"],
    "card.shareTitle":    ["Мой политический компас", "My political compass"],
    "card.shareText":     ["Мой результат: {q} · экономика {x}, государство {y}",
                           "My result: {q} · economy {x}, state {y}"],

    /* ===== прочее ===== */
    "ui.top":             ["Наверх", "Back to top"],
    "ui.topAria":         ["Вернуться к началу страницы", "Return to the top of the page"],
    "ui.copy":            ["Скопировать", "Copy"],
    "foot.privacy":       ["Без счётчиков, аналитики и внешних запросов",
                           "No trackers, no analytics, no outbound requests"],
    "foot.version.tip":   ["Две пятёрки подряд — слишком круглое число, чтобы портить его версией 1.5.6 в тот же день",
                           "Two fives in a row — too round a number to spoil with a 1.5.6 the same day"]
  };

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
    var stored = safeGet(KEY);
    if(LANGS.indexOf(stored) > -1) return stored;

    var m = /[?&]lang=([a-z-]+)/i.exec(location.search + location.hash);
    if(m){
      var v = m[1].toLowerCase().slice(0, 2);
      if(LANGS.indexOf(v) > -1) return v;
    }

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

  function initSwitch(){
    var btn = document.getElementById("langBtn");
    if(!btn) return;
    var other = lang === "ru" ? "EN" : "RU";
    var label = btn.querySelector(".lang-code");
    if(label) label.textContent = other;
    btn.title = t("lang.toggle");
    btn.setAttribute("aria-label", t("lang.toggle"));
    btn.addEventListener("click", toggle);
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
              current:current, isRu:isRu, set:set, toggle:toggle, LANGS:LANGS };
  /* Короткие псевдонимы: t() и L() зовутся из каждого модуля десятки раз,
     и PC.i18n.t на каждой строке читался бы хуже самой строки. */
  PC.t = t;
  PC.L = L;
})(window.PC = window.PC || {});
