/* Данные партий. Координаты: x — экономика (−10 левые … +10 правые),
   y — отношение к государству (−10 либертарианство … +10 этатизм).
   lp — предпочтительная сторона подписи: top | bottom | left | right.
   seats — мандаты в Госдуме IX созыва (текущий созыв, база по умолчанию).
   seatsBy — мандаты по прошлым созывам {id_созыва: число}; отсутствие ключа
   означает, что партия в этом созыве не участвовала / не была зарегистрирована.
   leader — нынешний руководитель партии (на некоторых партиях — коллегиальное
   руководство, тогда перечислены сопредседатели).

   summary — два-три предложения о том, что это вообще за партия: когда
   и кем создана, какое место занимает в системе, к кому обращается.
   Поле отвечает на вопрос, который у читателя возникает раньше всех
   остальных и на который ни координаты, ни тезисы не отвечают:
   «ЛДПР» и «Партия Прямой Демократии» стоят в списке рядом, но одна
   существует с 1989 года, а другую основал продюсер компьютерной игры.
   Это описание, а не оценка: оценка живёт в why.

   x/y — реальная позиция: где партия стоит по программе, законам,
   которые она вносит, и тому, как голосует её фракция.

   declared — заявленная позиция: где партия стоит по собственным
   словам — по названию, уставу, предвыборной риторике и тому, как она
   описывает себя сама. Это тоже экспертная оценка, но другого вопроса:
   не «что партия делает», а «кем она себя называет». На компасе
   заявленная точка рисуется полой и соединяется стрелкой с реальной;
   note объясняет, откуда взялся разрыв. Поле обязательно у каждой
   партии: нулевой разрыв — тоже факт, и у «Яблока» он почти нулевой.

   С 3.0 траекторий (поле history) больше нет: пять точек на партию
   давали видимость измерения там, где было четыре оценки подряд.

   sub — разложение обеих координат на шесть более узких шкал в той же
   системе −10…+10. Три из них уточняют экономическую ось (property,
   redistribution, regulation), три — отношение к власти государства
   (civil, centralization, tradition). Ориентация лучей совпадает с
   ориентацией родительской оси: больше — правее по экономике и выше
   по этатизму. Среднее трёх под-осей равно координате партии с точностью
   до десятой — это не совпадение, а требование к данным: под-оси должны
   объяснять точку на компасе, а не жить своей жизнью. Проверяется тестом.

   en — английские варианты полей. Отсутствие ключа означает, что перевод
   не нужен: «ЛДПР» и в английском тексте остаётся аббревиатурой. */
(function(PC){
  "use strict";

PC.PARTIES = [
  {
    id:"er", name:"Единая Россия", short:"Единая Россия", tag:"Единая Россия", lp:"left",
    seats:349, seatsBy:{8:324, 7:343, 6:238, 5:315, 4:223}, color:"#2f6fe0", x:3.2, y:8.2,
    ideology:"Государственный консерватизм, центризм «партии власти»",
    summary:"Партия власти, созданная в 2001 году слиянием «Единства» и «Отечества» и с тех пор не терявшая большинства в Госдуме. Собственной идеологии в привычном смысле не имеет: её позиция — это позиция исполнительной власти, оформленная в программу.",
    leader:"Дмитрий Медведев (председатель партии)",
    sub:{ property:1.0, redistribution:4.5, regulation:4.0,
          civil:8.5, centralization:9.0, tradition:7.1 },
    declared:{ x:-0.5, y:3.0,
      note:"Называет себя партией «народного большинства» и центром: в программе — «социальное государство», поддержка гражданских инициатив и «развитие демократических институтов».",
      en:{ note:"Calls itself the party of the “people's majority” and of the centre: its platform speaks of a “social state”, support for civic initiatives and “the development of democratic institutions”." } },
    theses:[
      "Полная поддержка курса исполнительной власти и президента",
      "Государственный капитализм: госкорпорации в стратегических отраслях при сохранении рынка",
      "Традиционные ценности, суверенитет, приоритет стабильности над реформами",
      "Укрепление вертикали власти и централизованного управления регионами"
    ],
    why:"Правее центра по экономике — партия сохраняет рыночные институты, частную собственность и поддерживает крупный бизнес, хотя ключевые отрасли остаются под госконтролем. По вертикальной оси — почти максимум: ЕР институционально является опорой сильной централизованной власти и последовательно голосует за расширение полномочий государства.",
    en:{
      name:"United Russia", short:"United Russia", tag:"United Russia",
      ideology:"State conservatism, the centrism of a ruling party",
      summary:"The ruling party, assembled in 2001 from the Unity and Fatherland blocs, and holder of a Duma majority ever since. It has no ideology in the usual sense: its position is the position of the executive, written up as a platform.",
      leader:"Dmitry Medvedev (party chairman)",
      theses:[
        "Full support for the course of the executive and the president",
        "State capitalism: state corporations in strategic sectors alongside a functioning market",
        "Traditional values, sovereignty, stability ahead of reform",
        "Reinforcing the power vertical and centralised management of the regions"
      ],
      why:"Right of centre on the economy — the party keeps market institutions and private property intact and backs big business, even though the key sectors stay under state control. On the vertical axis it sits near the maximum: United Russia is institutionally the backbone of strong centralised power and votes consistently to widen the state's authority."
    }
  },
  {
    id:"ldpr", name:"ЛДПР", short:"ЛДПР", tag:"ЛДПР", lp:"left",
    seats:23, seatsBy:{8:21, 7:39, 6:56, 5:40, 4:36}, color:"#eab308", x:1.0, y:7.0,
    ideology:"Национал-популизм, державный дирижизм",
    summary:"Старейшая из ныне действующих партий страны: основана в 1989 году и до смерти Владимира Жириновского в 2022-м была построена вокруг его фигуры. Голосует с большинством, но занимает нишу громкого национал-популизма, который «Единая Россия» себе позволить не может.",
    leader:"Леонид Слуцкий",
    sub:{ property:-1.0, redistribution:1.5, regulation:2.5,
          civil:7.5, centralization:8.5, tradition:5.0 },
    declared:{ x:2.0, y:-2.0,
      note:"Само название обещает либерализм и демократию, а устав — центристскую партию. Ни то, ни другое не видно ни в программе, ни в голосованиях.",
      en:{ note:"The very name promises liberalism and democracy, and the charter a centrist party. Neither shows up in the platform or in the voting record." } },
    theses:[
      "Сильное централизованное унитарное государство без национальных республик",
      "Национал-патриотическая и антимигрантская повестка",
      "Экономический эклектизм: то госрегулирование цен, то популистские рыночные лозунги",
      "Жёсткая внешняя политика и расширение полномочий силовых структур"
    ],
    why:"Экономическая программа непоследовательна и колеблется вокруг центра — отсюда позиция чуть правее нуля. По оси власти партия исторически требует максимального усиления вертикали и полномочий государства, что даёт один из самых высоких показателей этатизма.",
    en:{
      name:"LDPR", short:"LDPR", tag:"LDPR",
      ideology:"National populism, great-power dirigisme",
      summary:"The oldest party still operating in the country, founded in 1989 and built around Vladimir Zhirinovsky until his death in 2022. It votes with the majority but occupies a niche of loud national populism that United Russia cannot afford.",
      leader:"Leonid Slutsky",
      theses:[
        "A strong, centralised unitary state with no ethnic republics",
        "A national-patriotic and anti-migrant agenda",
        "Economic eclecticism: price controls one day, populist market slogans the next",
        "A hard line abroad and wider powers for the security services"
      ],
      why:"The economic platform is inconsistent and oscillates around the centre, which puts the party just right of zero. On the authority axis it has historically demanded the strongest possible vertical and the widest state powers, giving it one of the highest statism scores on the board."
    }
  },
  {
    id:"kprf", name:"КПРФ", short:"КПРФ", tag:"КПРФ", lp:"bottom",
    seats:37, seatsBy:{8:57, 7:42, 6:92, 5:57, 4:52}, color:"#dc2626", x:-8.0, y:4.8,
    ideology:"Марксизм-ленинизм, левый национал-патриотизм",
    summary:"Прямая наследница КПСС и крупнейшая оппозиционная фракция все шесть созывов подряд. Совмещает требование вернуть экономику государству с державной риторикой, из-за чего по вопросам суверенитета голосует заодно с властью, а по социальным — против неё.",
    leader:"Геннадий Зюганов",
    sub:{ property:-9.5, redistribution:-8.5, regulation:-6.0,
          civil:2.0, centralization:6.0, tradition:6.4 },
    declared:{ x:-9.0, y:-2.5,
      note:"Говорит о себе как о защитнице «народовластия», честных выборов и гражданских свобод против «партии власти» — то есть заявляет позицию заметно ниже той, что следует из её державной программы.",
      en:{ note:"Presents itself as the defender of “people's power”, fair elections and civil liberties against the ruling party — a claim that sits well below where its great-power platform places it." } },
    theses:[
      "Национализация недр, банков и стратегических отраслей промышленности",
      "Государственное планирование экономики и контроль над ценами",
      "Расширенные социальные гарантии, «народные предприятия», прогрессивный налог",
      "Советская ностальгия в сочетании с державной патриотической риторикой"
    ],
    why:"Требование национализации и планового управления экономикой размещает партию у левого края шкалы. По вертикали — заметный, но не крайний этатизм: КПРФ ориентируется на советскую модель сильного государства, однако регулярно выступает за честные выборы и против отдельных ограничений гражданских прав.",
    en:{
      name:"Communist Party (KPRF)", short:"KPRF", tag:"KPRF",
      ideology:"Marxism-Leninism, left national patriotism",
      summary:"The direct heir of the Soviet Communist Party and the largest opposition faction in all six convocations. It pairs a demand to return the economy to the state with great-power rhetoric, so on sovereignty it votes with the authorities and on social policy against them.",
      leader:"Gennady Zyuganov",
      theses:[
        "Nationalisation of natural resources, banks and strategic industry",
        "State planning of the economy and control over prices",
        "Expanded social guarantees, “people's enterprises”, progressive taxation",
        "Soviet nostalgia combined with great-power patriotic rhetoric"
      ],
      why:"The demand for nationalisation and planned management of the economy places the party at the left edge of the scale. On the vertical it shows marked but not extreme statism: the KPRF looks to the Soviet model of a strong state, yet regularly campaigns for fair elections and against particular restrictions on civil rights."
    }
  },
  {
    id:"sr", name:"Справедливая Россия", short:"СР", tag:"Справедливая Россия", lp:"right",
    seats:17, seatsBy:{8:27, 7:23, 6:64, 5:38}, color:"#f97316", x:-5.0, y:4.0,
    ideology:"Социал-демократия с патриотическим уклоном",
    summary:"Собрана в 2006 году как вторая, «левая нога» партийной системы, а в 2021-м поглотила движения Захара Прилепина и Геннадия Семигина. Место в спектре — социал-демократия: перераспределение и социальные выплаты без национализации.",
    leader:"Сергей Миронов",
    sub:{ property:-4.5, redistribution:-7.5, regulation:-3.0,
          civil:2.0, centralization:4.5, tradition:5.5 },
    declared:{ x:-7.0, y:0.0,
      note:"Заявляет себя партией «нового социализма» и оппозицией курсу правительства; в риторике — ставка на справедливость, а не на сильное государство.",
      en:{ note:"Describes itself as the party of “new socialism” and an opposition to the government's course; its rhetoric stakes everything on fairness rather than on a strong state." } },
    theses:[
      "Прогрессивная шкала налогообложения и налог на роскошь",
      "Базовый доход, отмена пенсионной реформы, рост социальных выплат",
      "Госсектор в стратегических отраслях при сохранении частного предпринимательства",
      "Патриотическая мобилизационная повестка после слияния с «За правду»"
    ],
    why:"Умеренно левая позиция: партия требует перераспределения и социальных гарантий, но не тотальной национализации, в отличие от коммунистов. По вертикали — выше центра из-за системной лояльности и поддержки сильной государственной власти, усилившейся после объединения с патриотическим крылом.",
    en:{
      name:"A Just Russia — For Truth", short:"Just Russia", tag:"A Just Russia",
      ideology:"Social democracy with a patriotic slant",
      summary:"Assembled in 2006 as the system's second, left-hand leg, and in 2021 it absorbed the movements of Zakhar Prilepin and Gennady Semigin. Its place in the spectrum is social democracy: redistribution and welfare without nationalisation.",
      leader:"Sergey Mironov",
      theses:[
        "A progressive income tax scale and a luxury tax",
        "Basic income, repeal of the pension reform, higher social payments",
        "A public sector in strategic industries alongside private enterprise",
        "A patriotic mobilisation agenda after the merger with For Truth"
      ],
      why:"A moderately left position: the party demands redistribution and social guarantees but not the wholesale nationalisation the communists call for. On the vertical it sits above the centre because of its systemic loyalty and support for strong state power, which grew after the merger with the patriotic wing."
    }
  },
  {
    id:"nl", name:"Новые люди", short:"Новые люди", tag:"Новые люди", lp:"top",
    seats:19, seatsBy:{8:13}, color:"#f43f5e", x:6.0, y:1.1,
    ideology:"Либеральный центризм, про-предпринимательский прагматизм",
    summary:"Самая молодая партия в Думе: основана в 2020 году владельцем косметической компании Faberlic Алексеем Нечаевым и с первой попытки взяла мандаты. Обращается к малому бизнесу и городским профессионалам, а не к идеологизированному избирателю.",
    leader:"Алексей Нечаев",
    sub:{ property:5.0, redistribution:6.5, regulation:6.5,
          civil:2.0, centralization:0.0, tradition:1.3 },
    declared:{ x:5.5, y:-5.0,
      note:"Позиционирует себя как партию «свободных людей» против запретов и блокировок — от защиты мессенджеров до гуманизации законов. Голосует при этом ближе к большинству.",
      en:{ note:"Positions itself as the party of “free people” against bans and blocking — from defending messaging apps to a more humane legal code. It votes, meanwhile, closer to the majority." } },
    theses:[
      "Снижение налоговой и административной нагрузки на малый и средний бизнес",
      "Ставка на цифровую экономику, стартапы и креативные индустрии",
      "Критика избыточного регулирования, проверок и бюрократии",
      "Осторожная риторика о свободе интернета и гуманизации законодательства"
    ],
    why:"Самая прорыночная позиция в списке: дерегулирование, поддержка частной инициативы и снижение налогов. По вертикали точка перешла на сторону государства: фракция всё чаще голосует по охранительным законам вместе с провластным большинством, а прежняя риторика о свободе интернета и гуманизации законодательства за последние созывы почти сошла на нет. Прежняя оценка (−2.9) отражала более раннюю, либеральную по тону фракцию; нынешняя практика голосований этого уже не подтверждает.",
    en:{
      name:"New People", short:"New People", tag:"New People",
      ideology:"Liberal centrism, pro-business pragmatism",
      summary:"The youngest party in the Duma: founded in 2020 by Alexey Nechayev, owner of the cosmetics company Faberlic, and it won seats at the first attempt. It speaks to small business and urban professionals rather than to an ideological voter.",
      leader:"Alexey Nechayev",
      theses:[
        "Lower tax and administrative burdens on small and medium business",
        "A bet on the digital economy, startups and the creative industries",
        "Criticism of excessive regulation, inspections and bureaucracy",
        "Cautious rhetoric about internet freedom and a more humane legal code"
      ],
      why:"The most pro-market position on the board: deregulation, support for private initiative and lower taxes. On the vertical axis the point has moved to the state's side: the faction increasingly votes for restrictive laws alongside the pro-government majority, and its earlier rhetoric about internet freedom and a more humane legal code has largely faded. The earlier estimate (−2.9) reflected an earlier, more liberal-sounding faction; the current voting record no longer supports it."
    }
  },
  {
    id:"yabloko", name:"Яблоко", short:"Яблоко", tag:"Яблоко", lp:"bottom",
    seats:0, seatsBy:{8:0, 7:0, 6:0, 5:0, 4:4}, color:"#22c55e", x:-3.0, y:-8.0,
    ideology:"Социальный либерализм, правозащитная демократия",
    summary:"Основана в 1993 году Григорием Явлинским и была в Думе до 2003 года; с тех пор мандатов не получает, но остаётся действующей партией. Единственная в списке, чья программа целиком построена вокруг прав человека, независимого суда и антивоенной позиции.",
    leader:"Николай Рыбаков",
    sub:{ property:-1.5, redistribution:-6.0, regulation:-1.5,
          civil:-9.5, centralization:-8.0, tradition:-6.5 },
    declared:{ x:-2.5, y:-8.5,
      note:"Разрыв почти нулевой: программа и публичная позиция партии совпадают с тем, что следует из её действий.",
      en:{ note:"The gap is almost nil: the party's platform and public stance match what its actions imply." } },
    theses:[
      "Верховенство права, независимость судов, свобода слова и собраний",
      "Демократизация выборов, парламентская республика, децентрализация власти",
      "Социально ориентированная рыночная экономика, сильная социальная защита",
      "Последовательная антивоенная и антимилитаристская позиция"
    ],
    why:"Экономически — левее центра: рынок с развитой социальной политикой европейского образца. По вертикальной оси занимает крайнюю либертарианскую точку: ни одна другая партия в списке не строит программу вокруг ограничения полномочий государства и защиты прав человека настолько последовательно.",
    en:{
      name:"Yabloko", short:"Yabloko", tag:"Yabloko",
      ideology:"Social liberalism, human-rights democracy",
      summary:"Founded in 1993 by Grigory Yavlinsky and present in the Duma until 2003; it has won no seats since, yet remains an active party. It is the only one here whose platform is built entirely on human rights, an independent judiciary and an anti-war stance.",
      leader:"Nikolay Rybakov",
      theses:[
        "Rule of law, independent courts, freedom of speech and assembly",
        "Democratic elections, a parliamentary republic, decentralised power",
        "A socially oriented market economy with strong social protection",
        "A consistent anti-war and anti-militarist position"
      ],
      why:"Economically left of centre: a market with European-style social policy. On the vertical axis it occupies the extreme libertarian point — no other party on the board builds its platform around limiting state power and defending human rights so consistently."
    }
  },
  {
    id:"kr", name:"Коммунисты России", short:"Коммунисты России", tag:"Коммунисты России", lp:"top",
    seats:0, seatsBy:{8:0, 7:0}, color:"#8b1f3f", x:-9.0, y:5.5,
    ideology:"Ортодоксальный коммунизм сталинистского толка",
    summary:"Партия-спутник, созданная в 2009 году и известная прежде всего критикой КПРФ «слева» и программой «10 сталинских ударов по капитализму». Мандатов не получала ни разу, но стабильно участвует в выборах.",
    leader:"Максим Сурайкин",
    sub:{ property:-10.0, redistribution:-9.5, regulation:-7.5,
          civil:3.5, centralization:6.5, tradition:6.5 },
    declared:{ x:-9.5, y:3.0,
      note:"Требует «народовластия» Советов и ставит его рядом со сталинской моделью, из-за чего заявленная точка лежит ниже реальной.",
      en:{ note:"Demands the “people's power” of the Soviets and places it next to the Stalinist model, so the stated point sits below the real one." } },
    theses:[
      "Полная национализация экономики и возврат к плановой советской модели",
      "Реабилитация фигуры Сталина и мобилизационной модели государства",
      "«10 сталинских ударов по капитализму» как программный документ",
      "Радикальная критика КПРФ за оппортунизм и соглашательство"
    ],
    why:"Программа более радикальна, чем у КПРФ: не частичная, а тотальная национализация — отсюда крайняя левая точка. По вертикали выше КПРФ, поскольку партия открыто апеллирует к жёсткой мобилизационной государственности и не выдвигает требований расширения гражданских свобод.",
    en:{
      name:"Communists of Russia", short:"Communists of Russia", tag:"Communists of Russia",
      ideology:"Orthodox communism of a Stalinist bent",
      summary:"A satellite party created in 2009 and known mainly for attacking the Communist Party from the left with its programme of ten Stalinist blows against capitalism. It has never won a seat but runs in every election.",
      leader:"Maxim Suraykin",
      theses:[
        "Complete nationalisation of the economy and a return to the Soviet planned model",
        "Rehabilitation of Stalin and of the mobilisation model of the state",
        "“Ten Stalinist blows against capitalism” as the programme document",
        "Radical criticism of the KPRF for opportunism and accommodation"
      ],
      why:"The platform is more radical than the KPRF's: not partial but total nationalisation, hence the extreme left position. It sits above the KPRF on the vertical because the party openly appeals to a hard mobilisation statehood and makes no demands for wider civil liberties."
    }
  },
  {
    id:"pens", name:"Партия пенсионеров за социальную справедливость", short:"Партия пенсионеров", tag:"Партия пенсионеров", lp:"bottom",
    seats:0, seatsBy:{8:0, 7:0}, color:"#a855f7", x:-4.2, y:3.2,
    ideology:"Левый социальный консерватизм",
    summary:"Одна из старейших малых партий: возникла в 1997 году и всю историю строит повестку вокруг одной темы — доходов и социальных гарантий старшего поколения. Политических требований не выдвигает и в конфликт с властью не входит.",
    leader:"Эрик Праздников",
    sub:{ property:-3.0, redistribution:-8.0, regulation:-1.6,
          civil:1.0, centralization:3.0, tradition:5.6 },
    declared:{ x:-4.5, y:0.5,
      note:"Называет себя независимой от власти партией социальной справедливости; на деле в конфликт с властью не входит.",
      en:{ note:"Calls itself a party of social justice independent of the authorities; in practice it never picks a fight with them." } },
    theses:[
      "Повышение пенсий, индексация выплат работающим пенсионерам",
      "Бесплатная медицина и лекарственное обеспечение для старшего поколения",
      "Государственный контроль над тарифами ЖКХ и социальной сферой",
      "Отсутствие радикальной политической повестки, системная лояльность"
    ],
    why:"Экономически левая позиция: перераспределение в пользу социально уязвимых групп и расширение государственных обязательств. По вертикали умеренно выше центра — партия просит от государства больше социального патернализма и не поднимает вопросов гражданских прав или ограничения власти.",
    en:{
      name:"Party of Pensioners for Social Justice", short:"Party of Pensioners", tag:"Party of Pensioners",
      ideology:"Left social conservatism",
      summary:"One of the oldest minor parties, formed in 1997, and it has organised its whole history around a single subject: the incomes and social guarantees of older Russians. It makes no political demands and picks no fight with the authorities.",
      leader:"Erik Prazdnikov",
      theses:[
        "Higher pensions and indexation of payments to working pensioners",
        "Free medicine and medication for the older generation",
        "State control over utility tariffs and the social sphere",
        "No radical political agenda; systemic loyalty"
      ],
      why:"Economically a left position: redistribution toward socially vulnerable groups and wider state obligations. Moderately above centre on the vertical — the party asks the state for more social paternalism and raises no questions about civil rights or limits on power."
    }
  },
  {
    id:"green", name:"Российская экологическая партия «Зелёные»", short:"Зелёные", tag:"«Зелёные»", lp:"top",
    seats:0, seatsBy:{8:0, 7:0}, color:"#10b981", x:-1.0, y:-1.5,
    ideology:"Экологизм, умеренный центризм",
    summary:"Экологическая партия с корнями в движении «Кедр» начала 1990-х, перезапущенная в 2019 году. Единственная в списке, у которой отраслевая повестка заменяет идеологическую: рамка «левые — правые» прикладывается к ней плохо.",
    leader:"Сопредседатели: А. Кудзагова, Р. Хвостов, А. Нагибин, С. Шахматов",
    sub:{ property:0.5, redistribution:-1.5, regulation:-2.0,
          civil:-3.0, centralization:-3.5, tradition:2.0 },
    declared:{ x:-1.5, y:-3.5,
      note:"Делает упор на общественный экологический контроль и местное самоуправление — заявленная точка чуть ниже реальной.",
      en:{ note:"Stresses public environmental oversight and local self-government — the stated point sits a little below the real one." } },
    theses:[
      "Экологическая безопасность как приоритет государственной политики",
      "Ужесточение ответственности промышленности за загрязнение",
      "Раздельный сбор отходов, «зелёная» энергетика, защита лесов и вод",
      "Поддержка общественного экологического контроля и местных инициатив"
    ],
    why:"Ближе всего к центру координат: экологическая повестка не привязана ни к плановой, ни к рыночной модели, а лёгкий левый крен даёт требование регулировать промышленность. Чуть ниже нуля по вертикали — партия делает ставку на гражданский и общественный контроль, а не на административное принуждение.",
    en:{
      name:"Russian Ecological Party “The Greens”", short:"The Greens", tag:"The Greens",
      ideology:"Environmentalism, moderate centrism",
      summary:"An ecological party with roots in the Kedr movement of the early 1990s, relaunched in 2019. It is the only one here where a sectoral agenda replaces an ideological one: the left-right frame fits it poorly.",
      leader:"Co-chairs: A. Kudzagova, R. Khvostov, A. Nagibin, S. Shakhmatov",
      theses:[
        "Environmental safety as a priority of state policy",
        "Tougher liability for industrial pollution",
        "Waste separation, green energy, protection of forests and waters",
        "Support for public environmental oversight and local initiatives"
      ],
      why:"The closest party to the origin: an environmental agenda is tied to neither the planned nor the market model, and the slight leftward lean comes from the demand to regulate industry. Just below zero on the vertical — the party bets on civic and public oversight rather than administrative coercion."
    }
  },
  {
    id:"rodina", name:"Родина", short:"Родина", tag:"Родина", lp:"right",
    seats:1, seatsBy:{8:1, 7:1, 4:37}, color:"#b45309", x:2.0, y:6.2,
    ideology:"Национал-консерватизм, державный патриотизм",
    summary:"Создана в 2003 году как левопатриотический блок, распущена в 2006-м и возрождена в 2012-м уже национал-консервативной партией. Сегодня держит один мандат и близка к «Единой России», но говорит о «русском вопросе» и миграции прямее.",
    leader:"Алексей Журавлёв",
    sub:{ property:-1.0, redistribution:2.0, regulation:5.0,
          civil:5.5, centralization:5.0, tradition:8.1 },
    declared:{ x:-1.0, y:4.0,
      note:"Помнит о себе как о левопатриотическом блоке 2003 года и говорит о «социальной справедливости»; программа и голосования давно правее.",
      en:{ note:"Remembers itself as the left-patriotic bloc of 2003 and speaks of “social justice”; its platform and votes have long sat further right." } },
    theses:[
      "Защита традиционных ценностей и русской национальной идентичности",
      "Мощный оборонно-промышленный комплекс и мобилизационная экономика",
      "Смешанная модель: госконтроль над стратегическими отраслями плюс частный сектор",
      "Жёсткая миграционная политика и «русский вопрос» в центре повестки"
    ],
    why:"Экономика — около центра с небольшим сдвигом вправо: партия не требует национализации, но настаивает на государственном руководстве стратегическими отраслями. Высокий этатизм обусловлен культом сильного государства, мобилизационной риторикой и приоритетом безопасности над личными свободами.",
    en:{
      name:"Rodina", short:"Rodina", tag:"Rodina",
      ideology:"National conservatism, great-power patriotism",
      summary:"Created in 2003 as a left-patriotic bloc, dissolved in 2006 and revived in 2012 as a national-conservative party. Today it holds a single seat and sits close to United Russia, but speaks about the Russian question and migration more bluntly.",
      leader:"Alexey Zhuravlyov",
      theses:[
        "Defence of traditional values and Russian national identity",
        "A powerful defence industry and a mobilisation economy",
        "A mixed model: state control of strategic sectors plus a private sector",
        "A hard migration policy, with the “Russian question” at the centre of the agenda"
      ],
      why:"The economy sits near the centre with a slight rightward shift: the party does not demand nationalisation but insists on state stewardship of strategic industries. Its high statism comes from a cult of the strong state, mobilisation rhetoric and the priority of security over personal freedoms."
    }
  },
  {
    id:"ppd", name:"Партия Прямой Демократии", short:"Прямая демократия", tag:"ППД", lp:"top",
    seats:0, seatsBy:{8:0, 7:0}, color:"#06b6d4", x:2.5, y:-7.0,
    ideology:"Цифровая прямая демократия, технолибертарианство",
    summary:"Основана в 2020 году продюсером игры World of Tanks Вячеславом Макаровым вокруг одной идеи: законы должны приниматься прямым электронным голосованием граждан. В Думу не проходила и остаётся скорее технологическим проектом, чем массовой партией.",
    leader:"Татьяна Колнауз",
    sub:{ property:2.0, redistribution:2.0, regulation:3.5,
          civil:-7.5, centralization:-9.5, tradition:-4.0 },
    declared:{ x:2.0, y:-9.0,
      note:"Разрыв невелик: партия не входила в Думу и проверить заявленное на голосованиях нельзя, поэтому обе точки выведены из программы.",
      en:{ note:"The gap is small: the party has never sat in the Duma, so its claims cannot be checked against votes and both points come from the platform." } },
    theses:[
      "Электронные референдумы: граждане голосуют по законам напрямую",
      "Сокращение роли бюрократии и посреднических представительных институтов",
      "Поддержка IT-отрасли, геймдева и цифрового предпринимательства",
      "Децентрализация принятия решений на уровень сообществ"
    ],
    why:"Умеренно правая экономика: ставка на технологический бизнес и предпринимательскую среду без перераспределительной программы. По вертикали — одна из самых либертарианских точек: сама идея прямой демократии предполагает передачу власти от государственного аппарата гражданам.",
    en:{
      name:"Party of Direct Democracy", short:"Direct Democracy", tag:"PDD",
      ideology:"Digital direct democracy, techno-libertarianism",
      summary:"Founded in 2020 by Vyacheslav Makarov, a producer of the game World of Tanks, around one idea: that laws should be passed by citizens voting electronically. It has never entered the Duma and remains more a technology project than a mass party.",
      leader:"Tatyana Kolnauz",
      theses:[
        "Electronic referendums: citizens vote on legislation directly",
        "A smaller role for bureaucracy and intermediary representative institutions",
        "Support for IT, game development and digital entrepreneurship",
        "Decentralising decisions down to the level of communities"
      ],
      why:"A moderately right economy: a bet on technology business and the entrepreneurial environment with no redistributive programme. On the vertical it is one of the most libertarian points on the board — the very idea of direct democracy means handing power from the state apparatus to citizens."
    }
  }
];

})(window.PC = window.PC || {});
