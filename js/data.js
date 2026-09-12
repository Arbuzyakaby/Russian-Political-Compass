/* Данные партий. Координаты: x — экономика (−10 левые … +10 правые),
   y — отношение к государству (−10 либертарианство … +10 этатизм).
   lp — предпочтительная сторона подписи: top | bottom | left | right.
   seats — мандаты в Госдуме VIII созыва (текущий созыв, база по умолчанию).
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

   history — необязательная траектория партии во времени: точки от самой
   ранней к самой поздней, последняя совпадает с текущими x/y. Это такая же
   экспертная оценка, как и основные координаты: положение выведено из
   программ и риторики соответствующих лет, а не измерено. Партии без
   заметного дрейфа поля history не имеют — рисовать стрелку длиной
   в полделения смысла нет.

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

/* Единственное место, где записан номер версии в коде. Его печатает
   строка приветствия в консоли, им подписан подвал и по нему сверяется
   package.json — раньше номер жил в трёх местах и расходился при каждом
   выпуске. */
var VERSION = "2.0.1";

/* Созывы, от нового к старому — в этом порядке они и стоят в списке
   над компасом. Необязательное поле draft означает, что созыв заведён
   заранее и данных по нему ещё нет: такой созыв не попадает ни в
   список, ни на график динамики, ни в выгрузки. Он существует только
   для того, чтобы после выборов правка сводилась к снятию одного флага
   и подстановке мандатов, а не к поиску всех мест, где число созывов
   зашито в код. Подробный порядок действий — в разделе README
   «Как внести новый созыв». */
var CONVOCATIONS = [
  { id:9, label:"IX созыв", years:"2026–2031", draft:true, en:{ label:"IX convocation" } },
  { id:8, label:"VIII созыв", years:"2021–2026", en:{ label:"VIII convocation" } },
  { id:7, label:"VII созыв",  years:"2016–2021", en:{ label:"VII convocation" } },
  { id:6, label:"VI созыв",   years:"2011–2016", en:{ label:"VI convocation" } },
  { id:5, label:"V созыв",    years:"2007–2011", en:{ label:"V convocation" } },
  { id:4, label:"IV созыв",   years:"2003–2007", en:{ label:"IV convocation" } }
];

/* Порядок лучей на диаграмме-пауке: сначала три экономические шкалы,
   затем три политические — чтобы половины диаграммы соответствовали
   половинам компаса и её можно было читать как развёрнутую точку. */
var SUBAXES = [
  { id:"property",       axis:"x" },
  { id:"redistribution", axis:"x" },
  { id:"regulation",     axis:"x" },
  { id:"civil",          axis:"y" },
  { id:"centralization", axis:"y" },
  { id:"tradition",      axis:"y" }
];

var PARTIES = [
  {
    id:"er", name:"Единая Россия", short:"Единая Россия", tag:"Единая Россия", lp:"left",
    seats:324, seatsBy:{7:343, 6:238, 5:315, 4:223}, color:"#2f6fe0", x:3.2, y:8.2,
    ideology:"Государственный консерватизм, центризм «партии власти»",
    summary:"Партия власти, созданная в 2001 году слиянием «Единства» и «Отечества» и с тех пор не терявшая большинства в Госдуме. Собственной идеологии в привычном смысле не имеет: её позиция — это позиция исполнительной власти, оформленная в программу.",
    leader:"Дмитрий Медведев (председатель партии)",
    sub:{ property:1.0, redistribution:4.5, regulation:4.0,
          civil:8.5, centralization:9.0, tradition:7.1 },
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
    },
    history:[
      { year:2003, x:2.4, y:6.4, note:"Партия центристского большинства: ставка на стабильность и экономический рост, вертикаль ещё достраивается",
        en:{ note:"The party of a centrist majority: a bet on stability and economic growth, with the power vertical still under construction" } },
      { year:2007, x:3.0, y:7.2, note:"«План Путина»: консолидация вертикали, госкорпорации в стратегических отраслях",
        en:{ note:"“Putin's Plan”: consolidation of the vertical and state corporations in strategic sectors" } },
      { year:2011, x:2.6, y:7.6, note:"После протестной зимы — консервативный поворот и ужесточение законов о митингах и НКО",
        en:{ note:"After the winter of protest — a conservative turn and tighter laws on rallies and NGOs" } },
      { year:2016, x:3.0, y:7.9, note:"Суверенитет и традиционные ценности как рамка повестки, экономика — умеренно рыночная",
        en:{ note:"Sovereignty and traditional values as the framing of the agenda; the economy stays moderately market-based" } },
      { year:2021, x:3.2, y:8.2, note:"Мобилизационный консерватизм: расширение полномочий государства при сохранении рынка",
        en:{ note:"Mobilisation conservatism: the state's powers expand while the market is preserved" } }
    ]
  },
  {
    id:"ldpr", name:"ЛДПР", short:"ЛДПР", tag:"ЛДПР", lp:"left",
    seats:21, seatsBy:{7:39, 6:56, 5:40, 4:36}, color:"#eab308", x:1.0, y:7.0,
    ideology:"Национал-популизм, державный дирижизм",
    summary:"Старейшая из ныне действующих партий страны: основана в 1989 году и до смерти Владимира Жириновского в 2022-м была построена вокруг его фигуры. Голосует с большинством, но занимает нишу громкого национал-популизма, который «Единая Россия» себе позволить не может.",
    leader:"Леонид Слуцкий",
    sub:{ property:-1.0, redistribution:1.5, regulation:2.5,
          civil:7.5, centralization:8.5, tradition:5.0 },
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
    },
    history:[
      { year:2003, x:0.2, y:6.2, note:"Популистская эклектика Жириновского: рыночные лозунги вперемешку с требованием госрегулирования цен",
        en:{ note:"Zhirinovsky's populist eclecticism: market slogans mixed with demands for state price controls" } },
      { year:2011, x:0.4, y:6.6, note:"Усиление национал-патриотического ядра повестки",
        en:{ note:"The national-patriotic core of the agenda hardens" } },
      { year:2016, x:0.8, y:6.8, note:"Смещение к поддержке силового блока и жёсткой миграционной политики",
        en:{ note:"A shift toward backing the security bloc and a hard migration policy" } },
      { year:2022, x:1.0, y:7.0, note:"После смены руководства — дисциплинированная системная лояльность вместо прежнего эпатажа",
        en:{ note:"After the change of leadership — disciplined systemic loyalty in place of the old showmanship" } }
    ]
  },
  {
    id:"kprf", name:"КПРФ", short:"КПРФ", tag:"КПРФ", lp:"bottom",
    seats:57, seatsBy:{7:42, 6:92, 5:57, 4:52}, color:"#dc2626", x:-8.0, y:4.8,
    ideology:"Марксизм-ленинизм, левый национал-патриотизм",
    summary:"Прямая наследница КПСС и крупнейшая оппозиционная фракция все пять созывов подряд. Совмещает требование вернуть экономику государству с державной риторикой, из-за чего по вопросам суверенитета голосует заодно с властью, а по социальным — против неё.",
    leader:"Геннадий Зюганов",
    sub:{ property:-9.5, redistribution:-8.5, regulation:-6.0,
          civil:2.0, centralization:6.0, tradition:6.4 },
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
      summary:"The direct heir of the Soviet Communist Party and the largest opposition faction in all five convocations. It pairs a demand to return the economy to the state with great-power rhetoric, so on sovereignty it votes with the authorities and on social policy against them.",
      leader:"Gennady Zyuganov",
      theses:[
        "Nationalisation of natural resources, banks and strategic industry",
        "State planning of the economy and control over prices",
        "Expanded social guarantees, “people's enterprises”, progressive taxation",
        "Soviet nostalgia combined with great-power patriotic rhetoric"
      ],
      why:"The demand for nationalisation and planned management of the economy places the party at the left edge of the scale. On the vertical it shows marked but not extreme statism: the KPRF looks to the Soviet model of a strong state, yet regularly campaigns for fair elections and against particular restrictions on civil rights."
    },
    history:[
      { year:2003, x:-8.6, y:5.6, note:"Ортодоксальная советская повестка: национализация и восстановление плановой модели",
        en:{ note:"An orthodox Soviet agenda: nationalisation and restoration of the planned model" } },
      { year:2011, x:-8.2, y:4.0, note:"Кампания «За честные выборы»: избирательные права выходят на первый план",
        en:{ note:"The “For Fair Elections” campaign: electoral rights move to the front of the agenda" } },
      { year:2016, x:-8.0, y:4.4, note:"Возврат к державной риторике при сохранении критики выборной системы",
        en:{ note:"A return to great-power rhetoric while criticism of the electoral system persists" } },
      { year:2021, x:-8.0, y:4.8, note:"Патриотическая консолидация: споры с властью сместились с прав на экономику",
        en:{ note:"Patriotic consolidation: the quarrel with the authorities moves from rights to the economy" } }
    ]
  },
  {
    id:"sr", name:"Справедливая Россия", short:"СР", tag:"Справедливая Россия", lp:"right",
    seats:27, seatsBy:{7:23, 6:64, 5:38}, color:"#f97316", x:-5.0, y:4.0,
    ideology:"Социал-демократия с патриотическим уклоном",
    summary:"Собрана в 2006 году как вторая, «левая нога» партийной системы, а в 2021-м поглотила движения Захара Прилепина и Геннадия Семигина. Место в спектре — социал-демократия: перераспределение и социальные выплаты без национализации.",
    leader:"Сергей Миронов",
    sub:{ property:-4.5, redistribution:-7.5, regulation:-3.0,
          civil:2.0, centralization:4.5, tradition:5.5 },
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
    },
    history:[
      { year:2006, x:-4.4, y:2.2, note:"Создание партии как левоцентристской «второй ноги» системы",
        en:{ note:"The party is founded as the centre-left “second leg” of the system" } },
      { year:2011, x:-5.6, y:1.4, note:"Пик оппозиционности: часть фракции поддержала протесты и требование честных выборов",
        en:{ note:"Peak opposition: part of the faction backed the protests and the demand for fair elections" } },
      { year:2016, x:-4.8, y:3.0, note:"Возврат к системной лояльности, социальная повестка без политических требований",
        en:{ note:"A return to systemic loyalty: a social agenda stripped of political demands" } },
      { year:2021, x:-5.0, y:4.0, note:"Объединение с «За правду» и «Патриотами России»: патриотическая мобилизационная рамка поверх социал-демократии",
        en:{ note:"Merger with For Truth and Patriots of Russia: a patriotic mobilisation frame laid over social democracy" } }
    ]
  },
  {
    id:"nl", name:"Новые люди", short:"Новые люди", tag:"Новые люди", lp:"top",
    seats:13, color:"#f43f5e", x:6.0, y:-2.9,
    ideology:"Либеральный центризм, про-предпринимательский прагматизм",
    summary:"Самая молодая партия в Думе: основана в 2020 году владельцем косметической компании Faberlic Алексеем Нечаевым и с первой попытки взяла мандаты. Обращается к малому бизнесу и городским профессионалам, а не к идеологизированному избирателю.",
    leader:"Алексей Нечаев",
    sub:{ property:5.0, redistribution:6.5, regulation:6.5,
          civil:-4.7, centralization:-1.7, tradition:-2.3 },
    theses:[
      "Снижение налоговой и административной нагрузки на малый и средний бизнес",
      "Ставка на цифровую экономику, стартапы и креативные индустрии",
      "Критика избыточного регулирования, проверок и бюрократии",
      "Осторожная риторика о свободе интернета и гуманизации законодательства"
    ],
    why:"Самая прорыночная позиция в списке: дерегулирование, поддержка частной инициативы и снижение налогов. Ниже нуля по вертикали — партия выступает за сокращение вмешательства государства в бизнес и частную жизнь. С 2.0 точка чуть поднята: за три года во фракции риторика о свободах стала осторожнее, а голосования по охранительным законам — ближе к линии большинства, и прежняя оценка переоценивала дистанцию.",
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
      why:"The most pro-market position on the board: deregulation, support for private initiative and lower taxes. Below zero on the vertical — the party argues for less state interference in business and private life. Since 2.0 the point sits slightly higher: over three years the faction's rhetoric about freedoms has grown more careful and its votes on restrictive laws have moved closer to the majority line, so the earlier estimate overstated the distance."
    }
  },
  {
    id:"yabloko", name:"Яблоко", short:"Яблоко", tag:"Яблоко", lp:"bottom",
    seats:0, seatsBy:{7:0, 6:0, 5:0, 4:4}, color:"#22c55e", x:-3.0, y:-8.0,
    ideology:"Социальный либерализм, правозащитная демократия",
    summary:"Основана в 1993 году Григорием Явлинским и была в Думе до 2003 года; с тех пор мандатов не получает, но остаётся действующей партией. Единственная в списке, чья программа целиком построена вокруг прав человека, независимого суда и антивоенной позиции.",
    leader:"Николай Рыбаков",
    sub:{ property:-1.5, redistribution:-6.0, regulation:-1.5,
          civil:-9.5, centralization:-8.0, tradition:-6.5 },
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
    },
    history:[
      { year:2003, x:-1.0, y:-6.4, note:"Наследие 1990-х: рыночные реформы с социальными поправками, демократическая повестка",
        en:{ note:"The legacy of the 1990s: market reform with social corrections and a democratic agenda" } },
      { year:2011, x:-2.2, y:-7.2, note:"Социальный поворот: доступное жильё, здравоохранение, критика сырьевой ренты",
        en:{ note:"A social turn: affordable housing, healthcare, criticism of resource rent" } },
      { year:2021, x:-3.0, y:-8.0, note:"Правозащита и антивоенная позиция как ядро программы",
        en:{ note:"Human rights and an anti-war stance become the core of the platform" } }
    ]
  },
  {
    id:"kr", name:"Коммунисты России", short:"Коммунисты России", tag:"Коммунисты России", lp:"top",
    seats:0, seatsBy:{7:0}, color:"#8b1f3f", x:-9.0, y:5.5,
    ideology:"Ортодоксальный коммунизм сталинистского толка",
    summary:"Партия-спутник, созданная в 2009 году и известная прежде всего критикой КПРФ «слева» и программой «10 сталинских ударов по капитализму». Мандатов не получала ни разу, но стабильно участвует в выборах.",
    leader:"Максим Сурайкин",
    sub:{ property:-10.0, redistribution:-9.5, regulation:-7.5,
          civil:3.5, centralization:6.5, tradition:6.5 },
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
    seats:0, seatsBy:{7:0}, color:"#a855f7", x:-4.2, y:3.2,
    ideology:"Левый социальный консерватизм",
    summary:"Одна из старейших малых партий: возникла в 1997 году и всю историю строит повестку вокруг одной темы — доходов и социальных гарантий старшего поколения. Политических требований не выдвигает и в конфликт с властью не входит.",
    leader:"Эрик Праздников",
    sub:{ property:-3.0, redistribution:-8.0, regulation:-1.6,
          civil:1.0, centralization:3.0, tradition:5.6 },
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
    seats:0, seatsBy:{7:0}, color:"#10b981", x:-1.0, y:-1.5,
    ideology:"Экологизм, умеренный центризм",
    summary:"Экологическая партия с корнями в движении «Кедр» начала 1990-х, перезапущенная в 2019 году. Единственная в списке, у которой отраслевая повестка заменяет идеологическую: рамка «левые — правые» прикладывается к ней плохо.",
    leader:"Сопредседатели: А. Кудзагова, Р. Хвостов, А. Нагибин, С. Шахматов",
    sub:{ property:0.5, redistribution:-1.5, regulation:-2.0,
          civil:-3.0, centralization:-3.5, tradition:2.0 },
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
    seats:1, seatsBy:{7:1, 4:37}, color:"#b45309", x:2.0, y:6.2,
    ideology:"Национал-консерватизм, державный патриотизм",
    summary:"Создана в 2003 году как левопатриотический блок, распущена в 2006-м и возрождена в 2012-м уже национал-консервативной партией. Сегодня держит один мандат и близка к «Единой России», но говорит о «русском вопросе» и миграции прямее.",
    leader:"Алексей Журавлёв",
    sub:{ property:-1.0, redistribution:2.0, regulation:5.0,
          civil:5.5, centralization:5.0, tradition:8.1 },
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
    },
    history:[
      { year:2003, x:-2.5, y:5.0, note:"Левопатриотический блок: природная рента, изъятие сверхдоходов сырьевых компаний",
        en:{ note:"A left-patriotic bloc: resource rent and the clawback of windfall profits from commodity firms" } },
      { year:2012, x:1.0, y:5.8, note:"Воссоздание партии: экономический популизм уходит, остаётся национал-консерватизм",
        en:{ note:"The party is re-founded: economic populism recedes and national conservatism remains" } },
      { year:2021, x:2.0, y:6.2, note:"Оборонно-промышленная повестка и «русский вопрос» вместо перераспределения",
        en:{ note:"A defence-industrial agenda and the “Russian question” in place of redistribution" } }
    ]
  },
  {
    id:"ppd", name:"Партия Прямой Демократии", short:"Прямая демократия", tag:"ППД", lp:"top",
    seats:0, seatsBy:{7:0}, color:"#06b6d4", x:2.5, y:-7.0,
    ideology:"Цифровая прямая демократия, технолибертарианство",
    summary:"Основана в 2020 году продюсером игры World of Tanks Вячеславом Макаровым вокруг одной идеи: законы должны приниматься прямым электронным голосованием граждан. В Думу не проходила и остаётся скорее технологическим проектом, чем массовой партией.",
    leader:"Татьяна Колнауз",
    sub:{ property:2.0, redistribution:2.0, regulation:3.5,
          civil:-7.5, centralization:-9.5, tradition:-4.0 },
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

/* ============ КЛЮЧЕВЫЕ ГОЛОСОВАНИЯ ============

   Координаты партий выводятся в том числе из практики голосований, а не
   только из программных документов, — здесь эта часть доказательной базы
   выложена отдельно и проверяемо.

   pos — позиция фракции: "for" | "against" | "abstain" | "split".
   Партии, у которой в этом созыве не было фракции, в объекте нет вовсе:
   её состояние выводится из seatsAt() и показывается прочерком. Фракция,
   присутствовавшая в Думе, но не попавшая в pos, отмечается как «нет
   данных» — сознательно, вместо того чтобы догадываться: единственная
   ценность этого блока в том, что ему можно верить.

   tally — итог голосования словами, ровно в том виде, в каком он
   приводится в открытых стенограммах. axis — какую ось компаса это
   голосование разводит сильнее: "x" (экономика) или "y" (государство). */
var VOTES = [
  {
    id:"benefits-2004", conv:4, date:"2004-08-05", topic:"econ", axis:"x",
    title:"Монетизация льгот (ФЗ-122)",
    summary:"Замена натуральных льгот денежными выплатами и передача части социальных обязательств регионам.",
    tally:"309 голосов за в третьем чтении",
    why:"Первое голосование созыва, где социальная повестка отделилась от лояльности: против выступили и левая КПРФ, и патриотическая «Родина», хотя по оси власти эти партии стоят по-разному.",
    pos:{ er:"for", ldpr:"for", kprf:"against", rodina:"against" },
    en:{
      title:"Monetisation of social benefits (Law 122-FZ)",
      summary:"Replacing in-kind benefits with cash payments and shifting part of the social obligations to the regions.",
      tally:"309 votes in favour at third reading",
      why:"The first vote of the convocation where the social agenda separated from loyalty: both the left-wing KPRF and the patriotic Rodina voted against, even though the two sit far apart on the authority axis."
    }
  },
  {
    id:"governors-2004", conv:4, date:"2004-12-03", topic:"state", axis:"y",
    title:"Отмена прямых выборов губернаторов",
    summary:"Главы регионов наделяются полномочиями региональными парламентами по представлению президента вместо всенародных выборов.",
    tally:"принят в третьем чтении голосами «Единой России» и ЛДПР",
    why:"Первый крупный шаг к вертикали власти. Разделение прошло по оси отношения к государству, а не по экономике: ЛДПР поддержала закон вместе с большинством, КПРФ голосовала против. Позиция «Родины» в наборе не приводится — надёжного подтверждения единой позиции фракции нет.",
    pos:{ er:"for", ldpr:"for", kprf:"against" },
    en:{
      title:"Abolition of direct gubernatorial elections",
      summary:"Regional heads are vested with power by regional parliaments on the president's nomination instead of by popular vote.",
      tally:"passed at third reading with the votes of United Russia and the LDPR",
      why:"The first major step towards the power vertical. The split ran along the authority axis rather than the economic one: the LDPR backed the law together with the majority, while the KPRF voted against. Rodina's stance is not given: there is no reliable confirmation of a single faction position."
    }
  },
  {
    id:"term-2008", conv:5, date:"2008-11-21", topic:"state", axis:"y",
    title:"Продление сроков президента и Думы",
    summary:"Поправка к Конституции: срок полномочий президента увеличен с четырёх до шести лет, Государственной думы — с четырёх до пяти.",
    tally:"392 за, 57 против в третьем чтении",
    why:"Первая поправка к тексту Конституции 1993 года. Против проголосовала только фракция КПРФ — её 57 голосов и составили всё «против»; ЛДПР и «Справедливая Россия» поддержали поправку вместе с «Единой Россией».",
    pos:{ er:"for", ldpr:"for", sr:"for", kprf:"against" },
    en:{
      title:"Extending the terms of the president and the Duma",
      summary:"A constitutional amendment extending the presidential term from four to six years and the State Duma term from four to five.",
      tally:"392 for, 57 against at third reading",
      why:"The first amendment to the text of the 1993 Constitution. Only the KPRF faction voted against — its 57 votes made up the entire “against”; the LDPR and A Just Russia supported the amendment together with United Russia."
    }
  },
  {
    id:"rallies-2012", conv:6, date:"2012-06-05", topic:"state", axis:"y",
    title:"Ужесточение закона о митингах",
    summary:"Многократное повышение штрафов за нарушения на публичных мероприятиях и обязательные работы как наказание — после протестов 2011–2012 годов.",
    tally:"241 за, 147 против, 3 воздержались",
    why:"Принят после попытки «итальянской забастовки»: оппозиционные депутаты внесли сотни поправок, чтобы затянуть рассмотрение. Все три фракции меньшинства проголосовали против — по свободе собраний системная оппозиция совпала целиком.",
    pos:{ er:"for", kprf:"against", ldpr:"against", sr:"against" },
    en:{
      title:"Tightening the law on rallies",
      summary:"A manifold increase in fines for violations at public events and community service as a penalty, following the 2011–2012 protests.",
      tally:"241 for, 147 against, 3 abstentions",
      why:"Passed after an attempted “work-to-rule” filibuster: opposition deputies tabled hundreds of amendments to drag out the reading. All three minority factions voted against — on freedom of assembly the systemic opposition agreed completely."
    }
  },
  {
    id:"wto-2012", conv:6, date:"2012-07-10", topic:"econ", axis:"x",
    title:"Ратификация протокола о вступлении в ВТО",
    summary:"Присоединение России к Всемирной торговой организации: снижение ввозных пошлин и обязательства по доступу иностранных компаний на рынок.",
    tally:"238 за, 208 против",
    why:"Голосование, где «Единая Россия» осталась совсем одна: 238 голосов «за» — ровно её фракция. Против выступили и левые, и националисты, и социал-демократы: по экономической оси это спор о защите внутреннего рынка.",
    pos:{ er:"for", kprf:"against", ldpr:"against", sr:"against" },
    en:{
      title:"Ratification of the WTO accession protocol",
      summary:"Russia joining the World Trade Organization: lower import duties and commitments on market access for foreign companies.",
      tally:"238 for, 208 against",
      why:"A vote in which United Russia stood entirely alone: 238 votes in favour — exactly its faction. The left, the nationalists and the social democrats all voted against: on the economic axis this is a dispute about protecting the domestic market."
    }
  },
  {
    id:"dima-2012", conv:6, date:"2012-12-21", topic:"state", axis:"y",
    title:"«Закон Димы Яковлева»",
    summary:"Запрет усыновления российских детей гражданами США и ответные меры на «акт Магнитского».",
    tally:"420 за, 7 против, 1 воздержался",
    why:"Голосование, на котором системные фракции сошлись почти полностью: несогласие выражали отдельные депутаты, а не партии. Такие эпизоды и объясняют, почему по вертикальной оси четыре думские партии стоят кучно.",
    pos:{ er:"for", ldpr:"for", kprf:"for", sr:"for" },
    en:{
      title:"The “Dima Yakovlev law”",
      summary:"A ban on the adoption of Russian children by US citizens and countermeasures to the Magnitsky Act.",
      tally:"420 for, 7 against, 1 abstention",
      why:"A vote where the systemic factions converged almost completely: dissent came from individual deputies, not parties. Episodes like this explain why the four Duma parties cluster so tightly on the vertical axis."
    }
  },
  {
    id:"lgbt-2013", conv:6, date:"2013-06-11", topic:"state", axis:"y",
    title:"Запрет «пропаганды нетрадиционных отношений» среди несовершеннолетних",
    summary:"Административная ответственность за распространение среди детей сведений о нетрадиционных сексуальных отношениях.",
    tally:"436 за, 0 против, 1 воздержался",
    why:"Чистое голосование по под-оси традиционализма: экономические разногласия здесь не работают вовсе, и результат почти единогласный.",
    pos:{ er:"for", ldpr:"for", kprf:"for", sr:"for" },
    en:{
      title:"Ban on “propaganda of non-traditional relations” among minors",
      summary:"Administrative liability for distributing information about non-traditional sexual relations to children.",
      tally:"436 for, 0 against, 1 abstention",
      why:"A clean vote on the traditionalism sub-axis: economic disagreements play no part here at all, and the outcome is near-unanimous."
    }
  },
  {
    id:"crimea-2014", conv:6, date:"2014-03-20", topic:"foreign", axis:"y",
    title:"Ратификация договора о принятии Крыма в состав России",
    summary:"Договор о принятии Республики Крым и города Севастополя в состав Российской Федерации.",
    tally:"443 за, 1 против",
    why:"Единственный голос против подал депутат от «Справедливой России», сама фракция голосовала за. Голосование показывает предел применимости двух осей: внешнеполитическая повестка ими не измеряется вовсе.",
    pos:{ er:"for", ldpr:"for", kprf:"for", sr:"for" },
    en:{
      title:"Ratification of the treaty on Crimea joining Russia",
      summary:"The treaty admitting the Republic of Crimea and the city of Sevastopol into the Russian Federation.",
      tally:"443 for, 1 against",
      why:"The single vote against came from a deputy of A Just Russia; the faction itself voted in favour. This vote marks the limit of the two axes: they do not measure the foreign-policy agenda at all."
    }
  },
  {
    id:"yarovaya-2016", conv:6, date:"2016-06-24", topic:"state", axis:"y",
    title:"«Пакет Яровой»",
    summary:"Хранение переписки и звонков операторами связи, расширение уголовной ответственности за экстремизм и недонесение, ограничения миссионерской деятельности.",
    tally:"287 за, 147 против",
    why:"Одно из последних голосований VI созыва и одно из самых спорных по под-оси гражданских свобод: КПРФ и «Справедливая Россия» голосовали против. Позиция ЛДПР в наборе не приводится — надёжного подтверждения единой позиции фракции нет.",
    pos:{ er:"for", kprf:"against", sr:"against" },
    en:{
      title:"The “Yarovaya package”",
      summary:"Retention of messages and calls by telecom operators, wider criminal liability for extremism and failure to report, restrictions on missionary activity.",
      tally:"287 for, 147 against",
      why:"One of the last votes of the VI convocation and one of the most contested on the civil-liberties sub-axis: the KPRF and A Just Russia voted against. The LDPR's stance is not given: there is no reliable confirmation of a single faction position."
    }
  },
  {
    id:"vat-2018", conv:7, date:"2018-07-24", topic:"econ", axis:"x",
    title:"Повышение НДС до 20%",
    summary:"Рост базовой ставки налога на добавленную стоимость с 18% до 20% в третьем чтении.",
    tally:"303 за, 90 против в третьем чтении",
    why:"Голосование того же года, что и пенсионная реформа, но по чистому вопросу налоговой нагрузки: «Единая Россия» снова голосует в одиночестве, три оппозиционные фракции — единым фронтом против повышения налога.",
    pos:{ er:"for", ldpr:"against", kprf:"against", sr:"against" },
    en:{
      title:"Raising VAT to 20%",
      summary:"An increase of the base value-added tax rate from 18% to 20% at third reading.",
      tally:"303 for, 90 against at third reading",
      why:"A vote from the same year as the pension reform, but on a pure tax-burden question: United Russia again votes alone, while the three opposition factions form a united front against the increase."
    }
  },
  {
    id:"pension-2018", conv:7, date:"2018-09-27", topic:"econ", axis:"x",
    title:"Повышение пенсионного возраста",
    summary:"Поэтапное повышение возраста выхода на пенсию до 65 лет для мужчин и 60 лет для женщин.",
    tally:"332 за, 83 против в третьем чтении",
    why:"Самое разводящее голосование двух последних созывов: «Единая Россия» осталась в одиночестве, а три оппозиционные фракции проголосовали одинаково, несмотря на разницу в 9 единиц по экономической оси между КПРФ и ЛДПР.",
    pos:{ er:"for", kprf:"against", ldpr:"against", sr:"against" },
    en:{
      title:"Raising the retirement age",
      summary:"A phased increase of the retirement age to 65 for men and 60 for women.",
      tally:"332 for, 83 against at third reading",
      why:"The most divisive vote of the last two convocations: United Russia stood alone while all three opposition factions voted alike, despite a nine-unit gap on the economic axis between the KPRF and the LDPR."
    }
  },
  {
    id:"internet-2019", conv:7, date:"2019-04-16", topic:"state", axis:"y",
    title:"«Суверенный интернет»",
    summary:"Централизованное управление сетями связи и техническая возможность изолировать российский сегмент интернета.",
    tally:"307 за, 68 против",
    why:"Одно из немногих голосований VII созыва, где системная оппозиция разошлась с большинством по вопросу гражданских свобод, а не по деньгам.",
    pos:{ er:"for", kprf:"against", sr:"against" },
    en:{
      title:"The “sovereign internet” law",
      summary:"Centralised management of communication networks and the technical means to isolate the Russian segment of the internet.",
      tally:"307 for, 68 against",
      why:"One of the few votes of the VII convocation where the systemic opposition parted with the majority over civil liberties rather than money."
    }
  },
  {
    id:"constitution-2020", conv:7, date:"2020-03-11", topic:"state", axis:"y",
    title:"Поправки к Конституции",
    summary:"Пакет поправок, включая обнуление президентских сроков, приоритет Конституции над решениями международных органов и социальные гарантии.",
    tally:"383 за, 0 против, 43 воздержались",
    why:"Воздержавшаяся фракция КПРФ — редкий случай, когда несогласие оформлено не голосом «против», а отказом поддержать. Именно такие эпизоды держат КПРФ ниже «Единой России» по вертикальной оси.",
    pos:{ er:"for", ldpr:"for", sr:"for", kprf:"abstain" },
    en:{
      title:"Amendments to the Constitution",
      summary:"A package of amendments including the reset of presidential terms, the primacy of the Constitution over international rulings, and social guarantees.",
      tally:"383 for, 0 against, 43 abstentions",
      why:"The KPRF's abstention is a rare case of dissent expressed by refusing support rather than by voting against. Episodes like this are what keep the KPRF below United Russia on the vertical axis."
    }
  },
  {
    id:"dnr-2022", conv:8, date:"2022-02-22", topic:"foreign", axis:"y",
    title:"Признание ДНР и ЛНР",
    summary:"Ратификация договоров о дружбе и взаимопомощи с самопровозглашёнными республиками.",
    tally:"401 голос за, единогласно",
    why:"Единогласное голосование всех пяти фракций VIII созыва — верхняя граница того, что видно на компасе: по этому вопросу расстояния между партиями обнуляются.",
    pos:{ er:"for", ldpr:"for", kprf:"for", sr:"for", nl:"for", rodina:"for" },
    en:{
      title:"Recognition of the DPR and LPR",
      summary:"Ratification of treaties of friendship and mutual assistance with the self-proclaimed republics.",
      tally:"401 votes in favour, unanimously",
      why:"A unanimous vote by all five factions of the VIII convocation — the upper bound of what the compass can show: on this question the distances between parties collapse to zero."
    }
  },
  {
    id:"fakes-2022", conv:8, date:"2022-03-04", topic:"state", axis:"y",
    title:"Уголовная ответственность за «фейки» об армии",
    summary:"Статья 207.3 УК: до 15 лет лишения свободы за распространение «заведомо ложной информации» о действиях Вооружённых сил.",
    tally:"принят единогласно",
    why:"Принят в трёх чтениях за один день и без голосов против. Самое сильное ограничение свободы слова за все созывы — и ни одного различия между фракциями: по оси государства разброс партий в VIII созыве практически исчез.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    en:{
      title:"Criminal liability for army “fakes”",
      summary:"Article 207.3 of the Criminal Code: up to 15 years in prison for spreading “knowingly false information” about the actions of the Armed Forces.",
      tally:"passed unanimously",
      why:"Passed in all three readings in a single day with no votes against. The strongest restriction on free speech across all convocations — and not a single difference between the factions: on the authority axis the spread of parties in the VIII convocation has all but vanished."
    }
  },
  {
    id:"annex-2022", conv:8, date:"2022-10-03", topic:"foreign", axis:"y",
    title:"Принятие в состав России ДНР, ЛНР, Запорожской и Херсонской областей",
    summary:"Ратификация договоров о вхождении четырёх регионов в состав Российской Федерации.",
    tally:"принято единогласно",
    why:"Как и признание ДНР и ЛНР в феврале, решение прошло без единого голоса против. Внешнеполитическую повестку две оси компаса не измеряют, и здесь это видно особенно наглядно.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    en:{
      title:"Admission of the DPR, LPR, Zaporizhzhia and Kherson regions into Russia",
      summary:"Ratification of the treaties on four regions joining the Russian Federation.",
      tally:"passed unanimously",
      why:"Like the recognition of the DPR and LPR in February, the decision passed without a single vote against. The two compass axes do not measure the foreign-policy agenda, and here that is especially plain."
    }
  },
  {
    id:"lgbt-2022", conv:8, date:"2022-11-24", topic:"state", axis:"y",
    title:"Полный запрет «пропаганды ЛГБТ» для всех возрастов",
    summary:"Расширение запрета 2013 года с несовершеннолетних на всех граждан, включая рекламу, кино и интернет.",
    tally:"397 за, единогласно",
    why:"Расширение голосования 2013 года на всех совершеннолетних прошло без единого голоса против — редкий случай, когда все шесть фракций VIII созыва, включая рыночных «Новых людей», совпали по вопросу вне экономической оси.",
    pos:{ er:"for", ldpr:"for", kprf:"for", sr:"for", nl:"for", rodina:"for" },
    en:{
      title:"Full ban on “LGBT propaganda” for all ages",
      summary:"An extension of the 2013 ban from minors to all citizens, covering advertising, film and the internet.",
      tally:"397 for, unanimously",
      why:"Extending the 2013 vote to all adults passed without a single vote against — a rare case where all six factions of the VIII convocation, including the market-oriented New People, agreed on a question outside the economic axis."
    }
  },
  {
    id:"gender-2023", conv:8, date:"2023-07-14", topic:"state", axis:"y",
    title:"Запрет смены пола",
    summary:"Запрет медицинских вмешательств для смены пола и изменения пола в документах, расторжение браков, в которых один из супругов сменил пол.",
    tally:"принят единогласно",
    why:"Продолжение линии законов 2013 и 2022 годов по под-оси традиционализма — и снова без различий между фракциями, включая «Новых людей».",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    en:{
      title:"Ban on gender reassignment",
      summary:"A ban on medical interventions for gender reassignment and on changing gender in documents; marriages in which one spouse has changed gender are dissolved.",
      tally:"passed unanimously",
      why:"A continuation of the 2013 and 2022 laws on the traditionalism sub-axis — and again with no differences between the factions, New People included."
    }
  },
  {
    id:"ctbt-2023", conv:8, date:"2023-10-18", topic:"foreign", axis:"y",
    title:"Отзыв ратификации Договора о запрещении ядерных испытаний",
    summary:"Россия отзывает ратификацию Договора о всеобъемлющем запрещении ядерных испытаний, выравнивая свой статус с США, которые договор подписали, но не ратифицировали.",
    tally:"принят единогласно",
    why:"Ещё одно единогласное внешнеполитическое голосование: в VIII созыве фракции не расходятся ни по одному вопросу этой темы.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    en:{
      title:"Revoking the ratification of the nuclear test ban treaty",
      summary:"Russia revokes its ratification of the Comprehensive Nuclear-Test-Ban Treaty, aligning its status with the United States, which signed the treaty but never ratified it.",
      tally:"passed unanimously",
      why:"Another unanimous foreign-policy vote: in the VIII convocation the factions do not diverge on a single question of this kind."
    }
  },
  {
    id:"childfree-2024", conv:8, date:"2024-11-12", topic:"state", axis:"y",
    title:"Запрет «пропаганды чайлдфри»",
    summary:"Штрафы за распространение информации, «склоняющей к отказу от деторождения», в СМИ, кино, рекламе и интернете.",
    tally:"принят единогласно",
    why:"Самое свежее голосование в наборе и ещё одно единогласное по под-оси традиционализма. Для компаса это важный сигнал: фракции VIII созыва, заметно различающиеся по экономике, по культурной повестке неразличимы.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    en:{
      title:"Ban on “child-free propaganda”",
      summary:"Fines for spreading information “inducing people to refuse to have children” in the media, film, advertising and on the internet.",
      tally:"passed unanimously",
      why:"The most recent vote in the set and another unanimous one on the traditionalism sub-axis. For the compass this is an important signal: the VIII-convocation factions, clearly different on economics, are indistinguishable on the cultural agenda."
    }
  }
];

var TOTAL_SEATS = 450;
var CURRENT_CONVOCATION = 8;   /* созыв, мандаты которого лежат в поле seats */

/* Мандаты партии в конкретном созыве. null — партии в этом созыве
   не существовало (не участвовала / не была зарегистрирована), 0 —
   участвовала, но мандатов не получила. Единая точка правды: раньше
   эта же логика жила отдельно в app.js и в charts.js. */
function seatsAt(p, conv){
  if(conv === CURRENT_CONVOCATION) return p.seats;
  return (p.seatsBy && conv in p.seatsBy) ? p.seatsBy[conv] : null;
}

function partyById(id){
  for(var i = 0; i < PARTIES.length; i++) if(PARTIES[i].id === id) return PARTIES[i];
  return null;
}

/* Созывы, по которым есть данные. Единственная точка, через которую
   интерфейс узнаёт о наборе созывов: заготовка будущего созыва живёт
   в CONVOCATIONS, но до снятия флага draft её не видит никто. */
function convocations(){
  return CONVOCATIONS.filter(function(c){ return !c.draft; });
}

/* созывы от старого к новому — порядок оси X на графике динамики */
function convsAsc(){
  return convocations().sort(function(a, b){ return a.id - b.id; });
}

/* Позиция фракции по голосованию в виде, пригодном для отрисовки.
   Отсутствие мандатов и отсутствие данных — разные вещи, и различать
   их обязательно: первое ничего не говорит о партии, второе говорит,
   что мы не знаем. */
function voteStance(vote, party){
  var seats = seatsAt(party, vote.conv);
  if(seats === null || seats === 0) return "absent";
  var v = vote.pos && vote.pos[party.id];
  return v || "unknown";
}

/* Доля голосований, в которых две партии заняли одну позицию.
   Считается только по тем голосованиям, где обе были фракциями:
   иначе отсутствие в созыве засчитывалось бы как согласие и «Новые
   люди» оказались бы союзниками всем сразу. */
function voteAgreement(a, b){
  var same = 0, common = 0;
  VOTES.forEach(function(v){
    var sa = voteStance(v, a), sb = voteStance(v, b);
    if(sa === "absent" || sb === "absent" || sa === "unknown" || sb === "unknown") return;
    common++;
    if(sa === sb) same++;
  });
  return { same:same, common:common, ratio: common ? same / common : null };
}

PC.VERSION = VERSION;
PC.PARTIES = PARTIES;
PC.TOTAL_SEATS = TOTAL_SEATS;
PC.CONVOCATIONS = convocations();
PC.CONVOCATIONS_ALL = CONVOCATIONS;
PC.CURRENT_CONVOCATION = CURRENT_CONVOCATION;
PC.SUBAXES = SUBAXES;
PC.VOTES = VOTES;
PC.seatsAt = seatsAt;
PC.partyById = partyById;
PC.convocations = convocations;
PC.convsAsc = convsAsc;
PC.voteStance = voteStance;
PC.voteAgreement = voteAgreement;
})(window.PC = window.PC || {});
