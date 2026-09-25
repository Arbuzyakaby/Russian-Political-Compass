/* ============ Словарь: подвал, карточка для соцсетей, приветственный экран, пасхалки ============
   Часть словаря PC.i18nDict — общий формат и то, как им пользуется
   движок локализации, описаны в шапке js/i18n.js. Значение-массив —
   форма множественного числа: для русского три формы (1 / 2–4 / 5+),
   для английского две (1 / прочее). ============ */
(function(PC){
  "use strict";
  PC.i18nDict = PC.i18nDict || {};
  Object.assign(PC.i18nDict, {
    /* ===== подвал ===== */
    "ft.call.eyebrow":    ["Дальше", "Next"],
    "ft.call.h":          ["Посмотрите, где на этой сетке стоите вы",
                           "See where you stand on this grid"],
    "ft.call.p":          ["Девяносто утверждений, сорок или двадцать — на выбор. Ваша точка появится на том же поле, рядом с партиями, вместе с разбором каждого ответа.",
                           "Ninety statements, forty or twenty — your choice. Your own point appears on the same board next to the parties, with every answer broken down."],
    "ft.call.quiz":       ["Пройти тест", "Take the quiz"],
    "ft.call.method":     ["Как считаются координаты", "How the coordinates are derived"],
    "ft.fig.parties":     ["Партий на поле", "Parties on the board"],
    "ft.fig.convs":       ["Созывов Госдумы", "Duma convocations"],
    "ft.fig.votes":       ["Ключевых голосований", "Landmark votes"],
    "ft.fig.sub":         ["Под-осей у каждой партии", "Sub-axes per party"],
    "ft.about":           ["Партии России на двух независимых осях: экономика и отношение к власти государства. С обоснованием каждой координаты и данными по шести созывам Госдумы.",
                           "Russian parties on two independent axes: the economy and attitude to state power. With the reasoning behind every coordinate and data for six Duma convocations."],
    "ft.l.compass":       ["Компас и аналитика", "Compass and analytics"],
    "ft.l.quiz":          ["Тест на 90 утверждений", "The 90-statement quiz"],
    "ft.l.votes":         ["Ключевые голосования", "Landmark votes"],
    "ft.l.about":         ["О проекте и методике", "About the project and its method"],
    "ft.data.h":          ["Данные", "Data"],
    "ft.data.l1":         ["Созывы <b>IV–IX</b>, 2003–2026", "Convocations <b>IV–IX</b>, 2003–2026"],
    "ft.data.l2":         ["<b>450</b> мандатов в каждом созыве", "<b>450</b> seats in every convocation"],
    "ft.data.l3":         ["<b>28</b> ключевых голосований", "<b>28</b> landmark votes"],
    "ft.data.l4":         ["Координаты — экспертная оценка", "Coordinates are an expert estimate"],
    "ft.data.l5":         ["Как они выведены", "How they were derived"],
    "ft.proj.h":          ["Проект", "The project"],
    "ft.proj.l1":         ["Исходный код на GitHub", "Source code on GitHub"],
    "ft.proj.l2":         ["Статическая страница без сборки", "A static page with no build step"],
    "ft.proj.l3":         ["Ответы теста — только в браузере", "Quiz answers stay in the browser"],
    "ft.proj.l4":         ["Русский и английский интерфейс", "Russian and English interface"],
    "ft.legal":           ["Мандаты указаны по итогам выборов в Государственную Думу соответствующего созыва (IV–IX, 2003–2026, всего 450 мест); переключить созыв можно над компасом. Координаты и лидеры партий — экспертная оценка и данные на текущий момент; материал не является агитацией.",
                           "Seats are given as of the State Duma election results for the corresponding convocation (IV–IX, 2003–2026, 450 seats in total); the convocation can be switched above the compass. Party coordinates and leaders are an expert estimate and current as of today; this material is not campaigning."],

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

    /* ===== приветственный экран ===== */
    "wel.eyebrow":        ["Политический компас партий РФ", "Russian Political Compass"],
    "wel.h":              ["Добро пожаловать", "Welcome"],
    "wel.lede":           ["Здесь российские партии расставлены по двум осям — что они думают про экономику и сколько власти отдают государству. Никакой агитации: у каждой координаты рядом лежит объяснение, с которым можно спорить.",
                           "This is where Russia's parties are laid out along two axes — what they think about the economy, and how much power they hand the state. No campaigning: every coordinate comes with the reasoning behind it, and you are welcome to argue with it."],
    "wel.p1.h":           ["Посмотрите на поле", "Look at the field"],
    "wel.p1.p":           ["Одиннадцать партий, шесть созывов Думы и графики, которые следуют за выбранным созывом.",
                           "Eleven parties, six convocations of the Duma, and charts that follow whichever one you pick."],
    "wel.p2.h":           ["Найдите себя", "Find yourself on it"],
    "wel.p2.p":           ["Тест ставит на ту же сетку вас — от двух минут до четверти часа, на ваш выбор.",
                           "The quiz puts you on the same grid — anywhere from two minutes to a quarter of an hour, your call."],
    "wel.p3.h":           ["Ничего не уходит наружу", "Nothing leaves your browser"],
    "wel.p3.p":           ["Ни счётчиков, ни аналитики. Ответы и настройки лежат только в вашем браузере.",
                           "No trackers, no analytics. Your answers and settings stay in your browser and nowhere else."],
    "wel.enter":          ["Смотреть компас", "Open the compass"],
    "wel.quiz":           ["Сразу к тесту", "Straight to the quiz"],
    "wel.note":           ["Это окно больше не появится — разве что после следующего обновления. Вернуть его можно в настройках.",
                           "You won't see this again — except after the next update. You can bring it back from the settings."],
    "wel.close":          ["Закрыть приветствие", "Close the welcome screen"],
    "wel.up.eyebrow":     ["Обновление {v}", "Update {v}"],
    "wel.up.h":           ["Кое-что изменилось", "A few things have changed"],
    "wel.up.lede":        ["Вы уже были здесь раньше, поэтому коротко — что нового с прошлого раза.",
                           "You have been here before, so here is the short version of what is new."],
    "wel.up.enter":       ["Понятно, дальше", "Got it, carry on"],
    "wel.t.steps":        ["Шаги обучения", "Tutorial steps"],
    "wel.t.step":         ["Шаг {n} из {total}", "Step {n} of {total}"],
    "wel.up.l1":          ["Заявлено и на деле. У каждой партии на компасе теперь две точки: сплошная — где она стоит по программе, законам и голосованиям, полая — где она стоит по собственным словам. Стрелка идёт от слов к делу, и её длина — это разрыв. В карточке партии — обе пары координат и объяснение, откуда разрыв взялся.",
                           "Stated and actual. Every party on the compass now has two dots: a solid one for where it stands by its platform, laws and votes, and a hollow one for where it stands by its own words. The arrow runs from words to deeds, and its length is the gap. The party card shows both pairs of coordinates and explains where the gap comes from."],
    "wel.up.l2":          ["IX созыв. Мандаты по итогам выборов в Госдуму в сентябре 2026 года: «Единая Россия» — 349, КПРФ — 37, ЛДПР — 23, «Новые люди» — 19, «Справедливая Россия» — 17, «Родина» — 1. Графики, коалиции и список партий по умолчанию показывают новый созыв.",
                           "The IX convocation. Seats from the September 2026 State Duma election: United Russia 349, KPRF 37, LDPR 23, New People 19, A Just Russia 17, Rodina 1. Charts, coalitions and the party list now show the new convocation by default."],
    "wel.up.l3":          ["Восемь новых голосований VIII созыва — от парламентского расследования пыток до НДС 22%, — всего двадцать восемь. Матрица совпадений пересчитана: ЛДПР и «Справедливая Россия» больше не совпадают во всём.",
                           "Eight new votes from the VIII convocation — from the parliamentary inquiry into torture to 22% VAT — twenty-eight in all. The agreement matrix has been recalculated: the LDPR and A Just Russia no longer agree on everything."],
    "wel.up.l4":          ["Все темы, кроме «Аляски», переписаны с нуля: графит, лён, газета, синтвейв и новый камин. Траектории партий из проекта убраны. Ссылки на результат теста из версий 1.x и 2.x больше не открываются — результат теперь сравнивается и с заявленными позициями партий.",
                           "Every theme except Alaska has been rewritten from scratch: graphite, linen, newsprint, synthwave and a new fireplace. Party trajectories are gone. Quiz result links from versions 1.x and 2.x no longer open — your result is now also compared with the parties' stated positions."],
    "wel.up.l5":          ["У версий теперь есть имена. Эта — 3.0 «Висла»: номер снова без приставки, а имя — гидроним, название реки.",
                           "Versions now have names. This one is 3.0 “Vistula”: the number is plain again, and the name is a hydronym — the name of a river."],
    "ab.author.h":        ["Слово автора", "A note from the author"],
    "ab.author.p":        ["Этот проект начался с раздражения. В любом споре о политике первые полторы минуты уходят на то, чтобы выяснить, кого собеседник считает «левым», а кого «либералом», — и выясняется, что одним и тем же словом вы называете разные вещи. Координатная сетка не мирит спорящих, но она заставляет их спорить о чём-то проверяемом: не о ярлыке, а о числе и о том, откуда оно взялось.",
                           "This project started out of irritation. In any political argument the first ninety seconds go on working out whom the other person calls “left” and whom they call “liberal” — and it turns out you are using the same words for different things. A coordinate grid does not reconcile anyone, but it makes the argument about something checkable: not about a label, but about a number and where that number came from."],
    "ab.author.p2":       ["Поэтому здесь нет ни одной координаты без объяснения и ни одной цифры, которую нельзя выгрузить и пересчитать. Это экспертная оценка, а не измерение: с ней можно и нужно спорить — но спорить придётся с конкретным абзацем, а не с общим ощущением, что «автор предвзят».",
                           "That is why there is not a single coordinate here without an explanation, and not a single figure you cannot export and recompute. This is an expert estimate, not a measurement: it can and should be argued with — but the argument has to be with a specific paragraph, not with a general feeling that “the author is biased”."],
    "ab.author.l1":       ["<b>Никакой агитации.</b> Проект не зовёт голосовать, не собирает подписи и не продаёт ничего — ни явно, ни исподволь. Если вам показалось, что какая-то формулировка агитирует, это ошибка формулировки, и о ней стоит написать.",
                           "<b>No campaigning.</b> The project does not urge you to vote, collect signatures or buy anything — neither openly nor by implication. If some wording looks like campaigning to you, that is a flaw in the wording, and it is worth writing about."],
    "ab.author.l2":       ["<b>Никаких счётчиков.</b> Сколько людей прошло тест и какие ответы они выбирали, автор не знает и узнать не может: ответы не покидают ваш браузер. Это ограничение архитектуры, а не обещание в подвале.",
                           "<b>No analytics.</b> How many people took the quiz and what they answered is something the author does not know and cannot find out: the answers never leave your browser. That is an architectural limit, not a promise in the footer."],
    "ab.author.l3":       ["<b>Спасибо тем, кто спорит предметно.</b> Половина правок в координатах и почти все найденные баги на телефонах пришли от читателей, которые не поленились написать, где именно не сходится.",
                           "<b>Thanks to everyone who argues on the merits.</b> Half the corrections to the coordinates and nearly every bug found on phones came from readers who took the trouble to say exactly where things did not add up."],
    "ab.author.sign":     ["— Arbuzyakaby, автор PolitCompass", "— Arbuzyakaby, author of PolitCompass"],
    "promo.tag":          ["Новый проект автора", "The author’s new project"],
    "promo.p":            ["Фоторедактор прямо в браузере: без установки и регистрации. Попробуйте — и расскажите, чего не хватает.",
                           "A photo editor right in your browser: no install, no sign-up. Give it a try and tell me what’s missing."],
    "promo.cta":          ["Открыть Lumen →", "Open Lumen →"],
    "ft.proj.lumen":      ["Lumen — фоторедактор автора", "Lumen — the author’s photo editor"],
    "egg.c22":            ["Уловка-22: чтобы остановить вращение, надо очистить поиск. Чтобы очистить поиск, надо в него попасть.",
                           "Catch-22: to stop the spinning, clear the search. To clear the search, you have to hit it first."],
    "egg.c50":            ["Пятидесятый коммит проекта. В hex это 0x32, но конфетти запускаются по десятичной системе.",
                           "Commit number fifty. In hex that's 0x32, but the confetti run on decimal."],
    "egg.konami":         ["Секретный код найден. Спасибо, что читаете код, а не только интерфейс.",
                           "Secret code found. Thanks for reading the code, not just the interface."],
    "quiz.congrats":      ["Поздравляю, тест пройден! Спасибо, что дошли до конца. — автор",
                           "Congratulations, you finished the quiz! Thanks for sticking with it. — the author"],
    "wel.tour":           ["Как пользоваться", "Show me around"],
    /* Ключи wel.skip / wel.back / wel.next / wel.done и все wel.t* жили
       здесь до 2.4.2.1 и обслуживали обучение, нарисованное внутри
       приветственного окна. Обучение переехало на саму страницу
       (js/tour.js) и завело собственный набор ключей tour.*; старый
       набор удалён целиком, а не оставлен «вдруг пригодится»: словарь
       с двумя параллельными наборами подписей для одного и того же
       рано или поздно расходится, и расходится он молча. */

    /* ===== пояснения к графикам ===== */
    "how.open":           ["Как это читать", "How to read this"],
    "how.close":          ["Свернуть пояснение", "Hide the explanation"],
    "how.compass.h":      ["Как читать компас", "How to read the compass"],
    "how.compass.p1":     ["Каждый кружок — партия, а его размер — мандаты в выбранном созыве. Чем дальше две партии друг от друга, тем сильнее расходятся их программы.",
                           "Each circle is a party, and its size is the number of seats it holds in the selected convocation. The further apart two parties sit, the further apart their platforms are."],
    "how.compass.p2":     ["Влево и вправо — спор про экономику: кто распоряжается собственностью и доходом. Вверх и вниз — спор про государство: сколько оно вправе решать за человека.",
                           "Left and right is the argument about the economy: who controls property and income. Up and down is the argument about the state: how much it gets to decide for you."],
    "how.compass.p3":     ["Наведите курсор на точку — появится карточка партии. Нажмите — она откроется целиком, вместе с обоснованием координат.",
                           "Hover over a dot for a quick card. Click it to open the party in full, reasoning included."],

    /* ===== вкладка голосований ===== */
    "votes.lede.short":   ["Программу можно написать какой угодно — голосование уже поступок. Двадцать восемь законопроектов 2004–2025 годов и позиция каждой фракции по каждому из них.",
                           "A platform can say anything; a vote is an act. Twenty-eight bills from 2004 to 2025, and where every faction stood on each of them."],
    "votes.s1":           ["голосований", "votes"],
    "votes.s2":           ["годы", "years"],
    "votes.s3":           ["фракций", "factions"],
    "votes.why.h":        ["Зачем этот раздел", "Why this section exists"],
    "votes.why.p":        ["Координаты на компасе выведены в том числе из того, как фракции голосуют, а не только из того, что партии пишут в программах. Здесь собраны и те голосования, на которых позиции разошлись сильнее всего, и те, на которых фракции совпали полностью.",
                           "The coordinates on the compass are derived partly from how factions actually vote, not only from what parties put in their platforms. This section collects both the votes that split them the hardest and the ones where they agreed completely."],
    "votes.note.h":       ["Как читать позиции", "How to read the positions"],
    "votes.agreementWhy": ["Что здесь видно: расстояние на компасе измеряет программы, а матрица — поведение, и совпадают они не всегда. ЛДПР и «Справедливая Россия» стоят на поле почти втрое дальше друг от друга, чем ЛДПР от «Единой России», — и при этом совпали в девятнадцати голосованиях из двадцати общих.",
                           "What this shows: distance on the compass measures platforms, while the matrix measures behaviour — and the two do not always agree. The LDPR and A Just Russia sit almost three times further apart on the field than the LDPR and United Russia, yet they matched on nineteen of the twenty votes they shared."],

    /* ===== вкладка «О проекте» ===== */
    "ab.nav.h":           ["Коротко о разделах", "The sections, briefly"],
    "ab.nav.hint":        ["Нажмите, чтобы перейти к нужному", "Tap any of these to jump to it"],
    /* Подписи плиток собираются из склоняемого слова и хвоста: пять
       созывов и два языка требуют разных форм, а число приходит из
       данных и меняется при каждом новом созыве. */
    "ab.st.parties":      ["{w} на поле", "{w} on the field"],
    "ab.st.quiz":         ["{w} в тесте", "{w} in the quiz"],
    "ab.st.votes":        ["ключевых {w}", "landmark {w}"],
    "ab.st.conv":         ["{w} Госдумы", "Duma {w}"],
    "ab.st.sub":          ["{w} у каждой партии", "{w} per party"],
    "ab.st.langs":        ["{w} интерфейса", "interface {w}"],

    /* ===== пасхалки ===== */
    "egg.portal.tip":     ["Наверх. Сюда войдёшь — там выйдешь", "Back to the top. In one side, out the other"],
    "egg.portal.aria":    ["Вернуться к началу страницы", "Return to the top of the page"],
    "egg.grave.tip":      ["Здесь покоится Horse Update. Плита накрыта вышиванкой — так теплее",
                           "Here lies the Horse Update. The slab is covered with an embroidered cloth — it is warmer that way"],
    "egg.grave.epitaph":  ["Horse Update · 1.6 — 2.0", "Horse Update · 1.6 — 2.0"],

    /* ===== прочее ===== */
    "ui.top":             ["Наверх", "Back to top"],
    "ui.topAria":         ["Вернуться к началу страницы", "Return to the top of the page"],
    "ui.copy":            ["Скопировать", "Copy"],
    "foot.privacy":       ["Без счётчиков, аналитики и внешних запросов",
                           "No trackers, no analytics, no outbound requests"],
    "foot.version.tip":   ["Версия 3.0 «Висла»: у каждой партии две точки — где она стоит на деле и где по собственным словам; данные IX созыва; двадцать восемь голосований и пересчитанная матрица совпадений; все темы, кроме «Аляски», переписаны; траектории убраны; ссылки на результат из 1.x и 2.x больше не открываются",
                           "Version 3.0 “Vistula”: every party has two dots — where it actually stands and where it says it stands; IX convocation data; twenty-eight votes and a recalculated agreement matrix; every theme except Alaska rewritten; trajectories removed; result links from 1.x and 2.x no longer open"],
    "foot.rose.tip":      ["Здесь была пасхалка про Horse Update в Minecraft 1.6 — роза осталась на память",
                           "A Horse Update easter egg used to live here — the rose is what's left of it"]
  });
})(window.PC = window.PC || {});
