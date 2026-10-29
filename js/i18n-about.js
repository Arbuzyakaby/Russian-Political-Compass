/* ============ Словарь: экспорт, вкладка «О проекте» ============
   Часть словаря PC.i18nDict — общий формат и то, как им пользуется
   движок локализации, описаны в шапке js/i18n.js. Значение-массив —
   форма множественного числа: для русского три формы (1 / 2–4 / 5+),
   для английского две (1 / прочее). ============ */
(function(PC){
  "use strict";
  PC.i18nDict = PC.i18nDict || {};
  Object.assign(PC.i18nDict, {
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
    "ex.claims":          ["Заявлено и на деле · CSV", "Stated vs actual · CSV"],
    "ex.claims.h":        ["где партии стоят по своим словам и где — на деле", "where parties stand by their own words and in practice"],
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
    "ex.failed":          ["К сожалению, не удалось собрать файл", "Sorry, we could not build the file"],
    "ex.noCompass":       ["Компас ещё не отрисован", "The compass has not been drawn yet"],
    "ex.noImage":         ["К сожалению, не удалось собрать картинку", "Sorry, we could not build the image"],

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
    "csv.declaredX":      ["Заявлено: экономика (X)", "Stated: economy (X)"],
    "csv.declaredY":      ["Заявлено: отношение к государству (Y)", "Stated: attitude to the state (Y)"],
    "csv.gap":            ["Разрыв", "Gap"],
    "csv.claimNote":      ["Откуда разрыв", "Where the gap comes from"],
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
    "ab.hero.p2":         ["Компас не голосует за вас и никого не рекламирует. Он показывает, как программы и публичная риторика партий раскладываются по двум измерениям, насколько далеко партии отстоят друг от друга и как менялся состав Госдумы за шесть созывов подряд.",
                           "The compass does not vote for you and advertises no one. It shows how party platforms and public rhetoric decompose along two dimensions, how far apart the parties stand, and how the composition of the State Duma changed across six consecutive convocations."],

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
    "ab.src.p3":          ["С 3.0 у каждой партии две точки. Сплошная — реальная позиция, выведенная из всех четырёх источников. Полая — заявленная: где партия стоит по собственному названию, уставу и предвыборной риторике, то есть по третьему источнику, взятому отдельно. Стрелка между ними и есть разрыв между словом и делом — у «Яблока» он почти нулевой, у ЛДПР и КПРФ самый длинный на поле.",
                           "Since 3.0 every party has two dots. The solid one is the actual position, derived from all four sources. The hollow one is the stated position: where the party stands by its own name, charter and campaign rhetoric — the third source taken on its own. The arrow between them is the gap between word and deed: almost nil for Yabloko, longest on the board for the LDPR and the KPRF."],

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
    "ab.votes.p2":        ["Матрица совпадений под таблицей интереснее самих голосований. Она показывает то, что на компасе видно лишь косвенно: расстояние между точками и разница в поведении — не одно и то же. ЛДПР и «Справедливая Россия» стоят в 6.7 единицы друг от друга — почти втрое дальше, чем ЛДПР от «Единой России», — и при этом разошлись лишь в одном голосовании из двадцати общих, тогда как с ближайшей «Единой Россией» ЛДПР расходилась в пяти из двадцати трёх — по пенсионному возрасту, НДС 2018 года и митингам. Расстояние на поле измеряет программы, матрица — поведение, и совпадают они не всегда.",
                           "The agreement matrix beneath the table is more interesting than the votes themselves. It shows what the compass conveys only indirectly: distance between dots and difference in behaviour are not the same thing. The LDPR and A Just Russia sit 6.7 units apart — nearly three times farther than the LDPR is from United Russia — yet they parted on only one of the twenty votes they shared, while the LDPR parted with its nearest neighbour, United Russia, on five of twenty-three — the retirement age, the 2018 VAT rise and the rallies law among them. Distance on the field measures platforms; the matrix measures behaviour, and the two do not always agree."],
    "ab.votes.p3":       ["С 4.3 по тем же законопроектам можно проголосовать самому — блок «Проголосуйте сами» покажет, чья фракция голосовала как вы. А «Дуэль партий» сводит две партии в одном окне: расстояние на компасе, восемь шкал и законопроекты, по которым их фракции разошлись.",
                           "Since 4.3 you can vote on the same bills yourself: the “Cast your own votes” block shows which faction voted the way you would. And the party face-off puts two parties in one window, with their distance on the compass, eight scales and the bills their factions voted differently on."],
    "ab.votes.note":      ["Позиция фракции приведена как преобладающая: отдельные депутаты голосовали иначе. Там, где у фракции не было официальной позиции, стоит «нет данных», а не догадка — единственная ценность этого раздела в том, что ему можно верить.",
                           "A faction's stance is given as the prevailing one: individual deputies voted differently. Where a faction had no official line, the table says “no data” rather than offering a guess — the only value of this section is that it can be trusted."],

    "ab.quiz.h":          ["Тест на 90 утверждений", "The 90-statement quiz"],
    "ab.quiz.p":          ["Тест ставит на ту же сетку вас. Сорок пять утверждений про экономику и сорок пять про роль государства, ответ по шкале от «полностью не согласен» до «полностью согласен». Согласие двигает координату к одному полюсу оси, несогласие — к другому; пять ключевых утверждений весят 1.3 против 1 у остальных, потому что разводят позиции сильнее прочих.",
                           "The quiz puts you on the same grid. Forty-five statements about the economy and forty-five about the role of the state, answered on a scale from strongly disagree to strongly agree. Agreement moves the coordinate toward one pole of the axis and disagreement toward the other; five key statements carry a weight of 1.3 against 1 for the rest, because they separate positions more sharply than the others."],
    "ab.quiz.p2":         ["Версий теста три — на 90, 40 и 20 утверждений, — но это не три анкеты, а три вложенные выборки одного набора и одна общая шкала: короткая целиком входит в стандартную, стандартная — в расширенную, и результат любой из них лежит на том же поле. Результат — две координаты и список партий, отсортированный по расстоянию до вашей точки. Совпадение в процентах считается именно от расстояния и означает близость координат, а не совет за кого-то голосовать.",
                           "There are three versions of the quiz — 90, 40 and 20 statements — but they are not three questionnaires: they are three nested selections of one set sharing a single scale, the short one contained in the standard and the standard in the extended, so a result from any of them lands on the same board. The result is two coordinates and a list of parties sorted by distance from your point. The percentage match is computed from that distance and means closeness of coordinates, not advice on how to vote."],
    "ab.quiz.p3":         ["На экране результата раскрывается разбор: каждое утверждение с его вкладом в координату, пятёрка ответов, повлиявших сильнее прочих, и профиль по шести под-осям, наложенный на профиль ближайшей партии. Формула не прячется — сумма вкладов, достижимый максимум и итоговое число показаны прямо в таблице.",
                           "The result screen opens up a breakdown: every statement with its contribution to the coordinate, the five answers that mattered most, and a six-sub-axis profile overlaid on the profile of the closest party. The formula is not hidden — the total of the contributions, the reachable maximum and the resulting figure are all shown in the table."],
    "ab.quiz.note":       ["Ответы и результат хранятся только в браузере. Расчёты не отправляются на сервер. Ссылкой на результат и скачанным файлом вы делитесь самостоятельно; выбранные веб-шрифты могут загружаться из Google Fonts.","Answers and results stay in your browser. Calculations are not sent to a server. You choose whether to share a result link or downloaded file; selected web fonts may load from Google Fonts."],

    "ab.not.h":           ["Чего проект не делает", "What the project does not do"],
    "ab.not.l1":          ["Не агитирует и не призывает голосовать — материал справочный.",
                           "It does not campaign or urge anyone to vote — the material is a reference."],
    "ab.not.l2":          ["Не измеряет внешнюю политику, национальный вопрос и личное доверие к политикам: две оси не вмещают всё, и это осознанное упрощение.",
                           "It does not measure foreign policy, the national question or personal trust in politicians: two axes cannot hold everything, and that is a deliberate simplification."],
    "ab.not.l3":          ["Не претендует на единственно верные координаты — это оценка, открытая к аргументам.",
                           "It does not claim the coordinates are the only correct ones — this is an estimate, open to argument."],
    "ab.not.l4":          ["Не собирает и не передаёт данные о посетителях.",
                           "It does not collect or transmit any visitor data."],

    /* ===== тест по разделу (2.5) =====
       Префикс ab.aq, а не ab.quiz: ключи ab.quiz.* заняты карточкой
       «Тест на 90 утверждений», которая стоит в этом же разделе и
       рассказывает совсем о другом тесте. Два разных теста с общим
       префиксом — это гарантированная путаница при первой же правке. */
    "ab.aq.h":            ["Проверьте себя по разделу", "Check yourself on this section"],
    "ab.aq.p":            ["Двенадцать вопросов о том, как устроен компас. Ответ на каждый написан в одной из карточек выше — это проверка прочитанного, а не викторина на эрудицию. Результат остаётся в вашем браузере и никуда не отправляется.",
                           "Twelve questions about how the compass works. The answer to each is written in one of the cards above — this checks what you have read, not what you happen to know. The result stays in your browser and is sent nowhere."],
    "ab.aq.count":        ["Вопрос {n} из {total}", "Question {n} of {total}"],
    "ab.aq.next":         ["Дальше", "Next"],
    "ab.aq.done":         ["Показать результат", "Show the result"],
    "ab.aq.score":        ["{n} из {total}", "{n} out of {total}"],
    "ab.aq.again":        ["Пройти заново", "Take it again"],
    "ab.aq.reread":       ["Читать в разделе", "Read it in the section"],
    "ab.aq.right":        ["Верно", "Correct"],
    "ab.aq.wrong":        ["Не совсем так", "Not quite"],
    /* Итоговый экран: заголовок, совет и список разделов к перечитыванию.
       Три строки поздравления на три диапазона — не украшение: «10 из 10»
       и «3 из 10» требуют разного продолжения, и одна общая фраза
       звучала бы издёвкой в одном случае и сухо в другом. */
    "ab.aq.res.h":        ["Раздел прочитан", "The section has been read"],
    "ab.aq.res.mid":      ["Основное на месте, но кое-что стоит перечитать", "The main points are there, but a few things are worth a second look"],
    "ab.aq.res.low":      ["Похоже, раздел ещё не читан", "It looks as though the section has not been read yet"],
    "ab.aq.reread.h":     ["Вернуться стоит сюда", "Worth going back to"],
    "ab.aq.saved":        ["Прошлый результат", "Your last result"],
    "ab.aq.aria":         ["Варианты ответа", "Answer options"],
    "ab.aq.progress":     ["Ход теста по разделу", "Progress through the section quiz"],

    /* ===== история проекта (2.5) ===== */
    "ab.history.h":       ["История проекта", "The project's history"],
    "ab.history.p":       ["Проект существует меньше месяца, и половина вех в этом дереве — не новые возможности, а переделки того, что уже было и работало плохо. Это не оговорка: почти всё, чем сейчас можно пользоваться, сначала вышло в виде, который пришлось переписать.",
                           "The project is less than a month old, and half the milestones in this tree are not new features but rebuilds of things that already existed and worked badly. That is not an apology: nearly everything usable here first shipped in a form that had to be rewritten."],
    /* ===== дерево версий (4.1) =====
       Итог под деревом собирается из самих данных (js/history-tree.js):
       число выпусков, веток и дней нигде не записано словами и потому
       не отстанет от CHANGELOG — та же причина, по которой плитки чисел
       проекта считаются, а не стоят в разметке. Три формы слов нужны для
       склонения: «39 выпусков», «5 веток», «51 день». */
    "ab.ht.sum":          ["{n} · {m} · за {k}", "{n} · {m} · over {k}"],
    "ab.ht.w.rel":        [["выпуск", "выпуска", "выпусков"], ["release", "releases"]],
    "ab.ht.w.br":         [["ветка", "ветки", "веток"], ["branch", "branches"]],
    "ab.ht.w.day":        [["день", "дня", "дней"], ["day", "days"]],
    "ab.ht.aria":         ["Дерево версий проекта", "The project's version tree"],
    "ab.ht.legend":       ["Ветки: выберите, чтобы подсветить", "Branches: pick one to highlight it"],
    "ab.ht.only":         ["Только вехи", "Milestones only"],
    "ab.ht.hint":         ["Новое сверху. Выберите выпуск, чтобы прочитать о нём; стрелки вверх и вниз ходят по дереву.",
                           "Newest on top. Pick a release to read about it; the up and down arrows walk the tree."],
    "ab.ht.panel":        ["Выбранный выпуск", "Selected release"],
    "ab.ht.cur":          ["сейчас", "current"],
    "ab.ht.ms":           ["Веха", "Milestone"],
    "ab.ht.branch":       ["ветка", "branch"],
    "ab.ht.close":        ["Закрыть карточку", "Close the card"],
    "ab.ht.newer":        ["Новее", "Newer"],
    "ab.ht.older":        ["Старее", "Older"],
    "ab.ht.forked":       ["Ответвилась от {v}", "Forked from {v}"],
    "ab.ht.cont":         ["Продолжает {v}", "Continues {v}"],
    "ab.ht.merged":       ["Влита ветка {v}", "Merges the {v} branch"],
    "ab.ht.mergedInto":   ["Влилась в {v}", "Merged into {v}"],

    "ab.tech.h":          ["Как это устроено", "How it is built"],
    "ab.tech.p":          ["HTML, CSS и обычный JavaScript: исходники запускаются без сборки, при публикации собираются в пакет. Компас и графики рисуются в SVG прямо в браузере. Шесть тем, два языка и четыре вкладки; выбранные веб-шрифты загружаются из Google Fonts. Статический русский текст доступен без JavaScript, а интерактивные расчёты требуют его включения.","HTML, CSS and plain JavaScript: sources run directly and releases are bundled. The compass and charts are rendered as SVG in your browser. Six themes, two languages and four tabs; selected web fonts load from Google Fonts. Static Russian text is available without JavaScript; interactive calculations require it."],
    "ab.tech.p2":         ["Доступность: точки компаса и элементы легенд достижимы с клавиатуры, у графика динамики есть таблица данных как альтернатива цвету, цвет нигде не остаётся единственным кодом, а анимации выключаются по <code>prefers-reduced-motion</code>.",
                           "Accessibility: compass dots and legend items are reachable from the keyboard, the trend chart offers a data table as an alternative to colour, colour is never the only code anywhere, and animations switch off under <code>prefers-reduced-motion</code>."],
    "ab.tech.cta":        ["Исходный код открыт: <a href=\"https://github.com/Arbuzyakaby/Russian-Political-Compass\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/Arbuzyakaby/Russian-Political-Compass</a>. Замечания к координатам, данным и формулировкам вопросов — через issues.",
                           "The source is open: <a href=\"https://github.com/Arbuzyakaby/Russian-Political-Compass\" target=\"_blank\" rel=\"noopener noreferrer\">github.com/Arbuzyakaby/Russian-Political-Compass</a>. Objections to the coordinates, the data or the wording of the questions go through issues."],

    /* SRPC — блок-цепочка отрисовки (2.4). Подписи звеньев короткие
       намеренно: коробка шириной в шестую часть карточки не выдержит
       фразы, а рядом стоит абзац, который всё объясняет словами.
       Вторая строка каждого звена — не проза, а путь к файлу, но и она
       идёт через словарь: у пятого звена там не путь, а описание, и
       разнобой «половина в разметке, половина в словаре» вышел бы
       дороже шести одинаковых пар. */
    "ab.chain.badge":     ["SRPC · 6 звеньев", "SRPC · 6 links"],
    "ab.chain.t":         ["Static Render Pipeline Chain", "Static Render Pipeline Chain"],
    "ab.chain.d":         ["Путь страницы от разметки до выгрузки, шестью звеньями. Сигнал проходит цепочку слева направо — так страница и собирается при загрузке. Сбой в третьем звене и каскад за ним схема больше не показывает сама: демонстрация включается в настройках, в разделе SRPC, там же цепочку можно открыть во весь экран и разложить руками.",
                           "The page's path from markup to download, in six links. The diagram runs a full cycle: a signal passes along the chain, the third link fails and takes down everything that depends on it — and then the pipeline puts itself back together."],
    "ab.chain.s1":        ["Разметка", "Markup"],
    "ab.chain.s1f":       ["index.html", "index.html"],
    "ab.chain.s2":        ["Стили", "Styles"],
    "ab.chain.s2f":       ["css/*.css", "css/*.css"],
    "ab.chain.s3":        ["Данные", "Data"],
    "ab.chain.s3f":       ["js/data-*.js", "js/data-*.js"],
    "ab.chain.s4":        ["Расчёты", "Maths"],
    "ab.chain.s4f":       ["js/calc.js", "js/calc.js"],
    "ab.chain.s5":        ["Отрисовка", "Drawing"],
    "ab.chain.s5f":       ["SVG в браузере", "SVG in the browser"],
    "ab.chain.s6":        ["Экспорт", "Export"],
    "ab.chain.s6f":       ["PNG · SVG · CSV · JSON", "PNG · SVG · CSV · JSON"],
    "ab.chain.lg.ok":     ["звено работает", "link is running"],
    "ab.chain.lg.idle":   ["ждёт входных данных", "waiting for input"],
    "ab.chain.lg.warn":   ["ошибка в звене", "error in the link"],
    "ab.chain.lg.crit":   ["критическая ошибка", "critical failure"],

  });
})(window.PC = window.PC || {});
