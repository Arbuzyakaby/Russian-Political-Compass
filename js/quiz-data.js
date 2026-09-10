/* ============ Вопросы теста ============
   40 утверждений: 20 про экономику (ось X) и 20 про отношение к власти
   государства (ось Y). Порядок в массиве — порядок показа, экономические
   и политические утверждения чередуются блоками, чтобы тест не выглядел
   как две анкеты подряд.

   axis — ось, на которую влияет ответ: "x" (экономика) или "y" (государство).
   dir  — куда двигает согласие: +1 к положительному полюсу оси
          (рынок / этатизм), −1 к отрицательному (план / свободы).
   w    — вес утверждения: 1 у обычных, 1.3 у ключевых, разводящих
          позиции сильнее всего (национализация, вертикаль власти).
   short — утверждение входит в короткую версию теста (20 из 40).
          Отбор не случайный: половина на каждую ось, все шесть под-осей
          покрыты, все пять «ключевых» утверждений с весом 1.3 на месте,
          а перекос по направлению внутри оси такой же, как в полной
          версии. Последнее важнее прочего: если бы в короткой версии
          согласие тянуло преимущественно в одну сторону, «соглашаюсь
          со всем» давало бы в двух версиях разные точки, и результаты
          перестали бы лежать на одной шкале. Проверяется тестом.
   sub  — под-ось из PC.SUBAXES, к которой относится утверждение. Она
          не влияет на две главные координаты: тот же ответ считается
          дважды — один раз в общую сумму по оси, второй раз в свою
          узкую шкалу. Так разбор результата показывает не только «где
          вы», но и «из чего это сложилось».

   Формулировки намеренно даны как позиции, а не как факты: тест измеряет
   взгляды отвечающего, а не проверяет знания. Английские варианты — это
   перевод той же позиции, а не её смягчение: вопрос, звучащий резко
   по-русски, обязан звучать так же резко по-английски, иначе две версии
   теста измеряли бы разное. */
(function(PC){
  "use strict";

  var QUESTIONS = [
    /* --- экономика --- */
    { id:"e1",  short:true, axis:"x", dir:-1, w:1.3, sub:"property",
      t:"Недра, крупные месторождения нефти, газа и металлов должны быть в государственной собственности.",
      en:{ t:"Mineral resources and major oil, gas and metal deposits should be state property." } },
    { id:"e2",  axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Государство должно устанавливать предельные цены на базовые продукты питания.",
      en:{ t:"The state should cap the prices of basic foodstuffs." } },
    { id:"e3",  short:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Прогрессивная шкала подоходного налога справедливее плоской.",
      en:{ t:"A progressive income tax is fairer than a flat one." } },
    { id:"e4",  short:true, axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Малому бизнесу нужно снизить налоги и число проверок, даже ценой падения бюджетных доходов.",
      en:{ t:"Small business should get lower taxes and fewer inspections, even at the cost of falling budget revenue." } },
    { id:"e5",  axis:"x", dir:-1, w:1, sub:"property",
      t:"Убыточные, но социально значимые предприятия должно поддерживать государство, а не банкротить.",
      en:{ t:"Loss-making but socially important enterprises should be supported by the state rather than wound up." } },

    /* --- государство --- */
    { id:"a1",  short:true, axis:"y", dir:+1, w:1.3, sub:"civil",
      t:"Государство вправе блокировать сайты и сервисы, которые считает опасными.",
      en:{ t:"The state has the right to block websites and services it considers dangerous." } },
    { id:"a2",  axis:"y", dir:+1, w:1, sub:"civil",
      t:"Митинги должны согласовываться с властями, а несогласованные — прекращаться.",
      en:{ t:"Rallies should be cleared with the authorities, and unsanctioned ones should be broken up." } },
    { id:"a3",  short:true, axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Губернаторов должны выбирать жители региона, а не утверждать по представлению центра.",
      en:{ t:"Governors should be elected by the region's residents, not confirmed on the centre's nomination." } },
    { id:"a4",  axis:"y", dir:+1, w:1, sub:"civil",
      t:"Спецслужбы могут читать переписку граждан без решения суда, если речь идёт о безопасности.",
      en:{ t:"The security services may read citizens' correspondence without a court order when security is at stake." } },
    { id:"a5",  short:true, axis:"y", dir:-1, w:1, sub:"civil",
      t:"Критика власти в СМИ идёт стране на пользу.",
      en:{ t:"Criticism of the authorities in the media does the country good." } },

    /* --- экономика --- */
    { id:"e6",  short:true, axis:"x", dir:-1, w:1, sub:"property",
      t:"Приватизация 1990-х принесла стране больше вреда, чем пользы.",
      en:{ t:"The privatisation of the 1990s did the country more harm than good." } },
    { id:"e7",  axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Пенсионный возраст следует снизить, даже если для этого придётся поднять налоги.",
      en:{ t:"The retirement age should be lowered, even if taxes have to rise to pay for it." } },
    { id:"e8",  axis:"x", dir:+1, w:1, sub:"property",
      t:"Частные компании управляют ЖКХ и общественным транспортом лучше муниципальных.",
      en:{ t:"Private companies run utilities and public transport better than municipal ones." } },
    { id:"e9",  short:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Государство обязано гарантировать каждому работу или пособие не ниже прожиточного минимума.",
      en:{ t:"The state must guarantee everyone either a job or benefits no lower than the subsistence minimum." } },
    { id:"e10", axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Трудовое законодательство стоит смягчить, чтобы работодателю было проще нанимать и увольнять.",
      en:{ t:"Labour law should be relaxed so that employers can hire and fire more easily." } },

    /* --- государство --- */
    { id:"a6",  axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Регионам нужно оставлять больше собранных налогов и больше самостоятельности.",
      en:{ t:"Regions should keep more of the taxes they collect and enjoy more autonomy." } },
    { id:"a7",  short:true, axis:"y", dir:+1, w:1, sub:"tradition",
      t:"Призыв на срочную военную службу должен сохраниться.",
      en:{ t:"Conscription into military service should be retained." } },
    { id:"a8",  short:true, axis:"y", dir:+1, w:1.3, sub:"tradition",
      t:"Государство должно законодательно защищать традиционные ценности.",
      en:{ t:"The state should protect traditional values through legislation." } },
    { id:"a9",  short:true, axis:"y", dir:-1, w:1.3, sub:"centralization",
      t:"Полномочия президента следует сократить в пользу парламента.",
      en:{ t:"The president's powers should be cut back in favour of parliament." } },
    { id:"a10", axis:"y", dir:+1, w:1, sub:"civil",
      t:"Городское видеонаблюдение с распознаванием лиц делает жизнь безопаснее.",
      en:{ t:"Urban video surveillance with facial recognition makes life safer." } },

    /* --- экономика --- */
    { id:"e11", axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Налог на прибыль крупных корпораций нужно повысить.",
      en:{ t:"Corporate profit tax on large companies should be raised." } },
    { id:"e12", axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Высшее образование должно быть бесплатным для всех, кто сдал вступительные испытания.",
      en:{ t:"Higher education should be free for everyone who passes the entrance exams." } },
    { id:"e13", axis:"x", dir:+1, w:1, sub:"property",
      t:"Иностранным инвесторам стоит открыть доступ даже к стратегическим отраслям.",
      en:{ t:"Foreign investors should be given access even to strategic industries." } },
    { id:"e14", short:true, axis:"x", dir:+1, w:1, sub:"property",
      t:"Госкорпорации скорее душат конкуренцию, чем развивают экономику.",
      en:{ t:"State corporations stifle competition more than they develop the economy." } },
    { id:"e15", short:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Нужны налог на роскошь и налог на крупные наследства.",
      en:{ t:"A luxury tax and a tax on large inheritances are needed." } },

    /* --- государство --- */
    { id:"a11", axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Наказание за хранение наркотиков без цели сбыта следует смягчить.",
      en:{ t:"Punishment for possessing drugs without intent to supply should be reduced." } },
    { id:"a12", short:true, axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Церковь должна быть полностью отделена от школы и государственных институтов.",
      en:{ t:"The church should be completely separated from schools and state institutions." } },
    { id:"a13", axis:"y", dir:+1, w:1, sub:"civil",
      t:"Иностранные организации, работающие в России, нуждаются в жёстком государственном контроле.",
      en:{ t:"Foreign organisations operating in Russia require strict state control." } },
    { id:"a14", short:true, axis:"y", dir:-1, w:1, sub:"civil",
      t:"Суд присяжных нужно распространить на большинство уголовных дел.",
      en:{ t:"Jury trials should be extended to most criminal cases." } },
    { id:"a15", short:true, axis:"y", dir:+1, w:1, sub:"civil",
      t:"В кризисной ситуации государство вправе временно ограничивать права граждан.",
      en:{ t:"In a crisis the state has the right to restrict citizens' rights temporarily." } },

    /* --- экономика --- */
    { id:"e16", short:true, axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Тарифы на электричество и топливо должен определять рынок, а не государство.",
      en:{ t:"Electricity and fuel tariffs should be set by the market, not by the state." } },
    { id:"e17", axis:"x", dir:+1, w:1, sub:"property",
      t:"Сельскохозяйственная земля должна свободно продаваться и покупаться.",
      en:{ t:"Agricultural land should be freely bought and sold." } },
    { id:"e18", short:true, axis:"x", dir:-1, w:1.3, sub:"regulation",
      t:"Экономике нужен возврат к государственному планированию по пятилеткам.",
      en:{ t:"The economy needs a return to state planning in five-year plans." } },
    { id:"e19", axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Безусловный базовый доход — разумная идея для России.",
      en:{ t:"An unconditional basic income is a sensible idea for Russia." } },
    { id:"e20", short:true, axis:"x", dir:+1, w:1, sub:"redistribution",
      t:"Сбалансированный бюджет важнее, чем сохранение социальных расходов любой ценой.",
      en:{ t:"A balanced budget matters more than preserving social spending at any cost." } },

    /* --- государство --- */
    { id:"a16", axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Цензура в кино, музыке и компьютерных играх недопустима.",
      en:{ t:"Censorship in film, music and video games is unacceptable." } },
    { id:"a17", axis:"y", dir:+1, w:1, sub:"civil",
      t:"Полиции и Росгвардии нужно больше полномочий, а не меньше.",
      en:{ t:"The police and the National Guard need more powers, not fewer." } },
    { id:"a18", axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Местное самоуправление должно самостоятельно распоряжаться своим бюджетом.",
      en:{ t:"Local self-government should control its own budget independently." } },
    { id:"a19", short:true, axis:"y", dir:+1, w:1, sub:"tradition",
      t:"Смертную казнь следует вернуть.",
      en:{ t:"The death penalty should be reinstated." } },
    { id:"a20", axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Совершеннолетний гражданин вправе свободно приобретать оружие для самозащиты.",
      en:{ t:"An adult citizen should be free to buy a firearm for self-defence." } }
  ];

  /* Шкала ответа. Значение — множитель: «затрудняюсь» не двигает позицию
     вовсе, поэтому пропущенные вопросы и нейтральные ответы эквивалентны
     и не тянут результат к центру искусственно.

     key — ключ словаря локализации; short остаётся общим для двух языков,
     это математический знак, а не слово. */
  var SCALE = [
    { v:-2, key:"scale.--", label:"Полностью не согласен", short:"−−" },
    { v:-1, key:"scale.-",  label:"Скорее не согласен",    short:"−" },
    { v: 0, key:"scale.0",  label:"Затрудняюсь ответить",  short:"0" },
    { v:+1, key:"scale.+",  label:"Скорее согласен",       short:"+" },
    { v:+2, key:"scale.++", label:"Полностью согласен",    short:"++" }
  ];

  PC.QUIZ = {
    QUESTIONS: QUESTIONS,
    SHORT: QUESTIONS.filter(function(q){ return q.short; }),
    SCALE: SCALE
  };
})(window.PC = window.PC || {});
