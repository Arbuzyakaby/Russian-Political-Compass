/* ============ Вопросы теста ============
   90 утверждений: 45 про экономику (ось X) и 45 про отношение к власти
   государства (ось Y). Порядок в массиве — порядок показа, экономические
   и политические утверждения чередуются блоками, чтобы тест не выглядел
   как две анкеты подряд.

   Версий три, и все они — подмножества одного массива:
     расширенная  — все 90 утверждений;
     стандартная  — 40 с флагом std (ровно тот набор и тот порядок, что
                    были в версиях 1.x, поэтому старые ссылки на
                    результат продолжают раскодироваться);
     короткая     — 20 с флагом short, все они входят и в стандартную.
   Три версии измеряют одно и то же в одной шкале: нормировка всегда
   считается по пройденной выборке, а перекос по направлению внутри оси
   у всех трёх совпадает с точностью до нескольких процентных пунктов.
   Проверяется тестами.

   axis — ось, на которую влияет ответ: "x" (экономика) или "y" (государство).
   dir  — куда двигает согласие: +1 к положительному полюсу оси
          (рынок / этатизм), −1 к отрицательному (план / свободы).
   w    — вес утверждения: 1 у обычных, 1.3 у ключевых, разводящих
          позиции сильнее всего (национализация, вертикаль власти).
   std  — утверждение входит в стандартную версию (40 из 90). Порядок
          этих сорока и их формулировки менять нельзя: по ним строится
          код ссылки на результат, выданной любой прошлой версией сайта.
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
    { id:"e1", std:true,  short:true, axis:"x", dir:-1, w:1.3, sub:"property",
      t:"Недра, крупные месторождения нефти, газа и металлов должны быть в государственной собственности.",
      en:{ t:"Mineral resources and major oil, gas and metal deposits should be state property." } },
    { id:"e2", std:true,  axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Государство должно устанавливать предельные цены на базовые продукты питания.",
      en:{ t:"The state should cap the prices of basic foodstuffs." } },
    { id:"e3", std:true,  short:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Прогрессивная шкала подоходного налога справедливее плоской.",
      en:{ t:"A progressive income tax is fairer than a flat one." } },
    { id:"e4", std:true,  short:true, axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Малому бизнесу нужно снизить налоги и число проверок, даже ценой падения бюджетных доходов.",
      en:{ t:"Small business should get lower taxes and fewer inspections, even at the cost of falling budget revenue." } },
    { id:"e5", std:true,  axis:"x", dir:-1, w:1, sub:"property",
      t:"Убыточные, но социально значимые предприятия должно поддерживать государство, а не банкротить.",
      en:{ t:"Loss-making but socially important enterprises should be supported by the state rather than wound up." } },

    /* --- государство --- */
    { id:"a1", std:true,  short:true, axis:"y", dir:+1, w:1.3, sub:"civil",
      t:"Государство вправе блокировать сайты и сервисы, которые считает опасными.",
      en:{ t:"The state has the right to block websites and services it considers dangerous." } },
    { id:"a2", std:true,  axis:"y", dir:+1, w:1, sub:"civil",
      t:"Митинги должны согласовываться с властями, а несогласованные — прекращаться.",
      en:{ t:"Rallies should be cleared with the authorities, and unsanctioned ones should be broken up." } },
    { id:"a3", std:true,  short:true, axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Губернаторов должны выбирать жители региона, а не утверждать по представлению центра.",
      en:{ t:"Governors should be elected by the region's residents, not confirmed on the centre's nomination." } },
    { id:"a4", std:true,  axis:"y", dir:+1, w:1, sub:"civil",
      t:"Спецслужбы могут читать переписку граждан без решения суда, если речь идёт о безопасности.",
      en:{ t:"The security services may read citizens' correspondence without a court order when security is at stake." } },
    { id:"a5", std:true,  short:true, axis:"y", dir:-1, w:1, sub:"civil",
      t:"Критика власти в СМИ идёт стране на пользу.",
      en:{ t:"Criticism of the authorities in the media does the country good." } },

    /* --- экономика --- */
    { id:"e6", std:true,  short:true, axis:"x", dir:-1, w:1, sub:"property",
      t:"Приватизация 1990-х принесла стране больше вреда, чем пользы.",
      en:{ t:"The privatisation of the 1990s did the country more harm than good." } },
    { id:"e7", std:true,  axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Пенсионный возраст следует снизить, даже если для этого придётся поднять налоги.",
      en:{ t:"The retirement age should be lowered, even if taxes have to rise to pay for it." } },
    { id:"e8", std:true,  axis:"x", dir:+1, w:1, sub:"property",
      t:"Частные компании управляют ЖКХ и общественным транспортом лучше муниципальных.",
      en:{ t:"Private companies run utilities and public transport better than municipal ones." } },
    { id:"e9", std:true,  short:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Государство обязано гарантировать каждому работу или пособие не ниже прожиточного минимума.",
      en:{ t:"The state must guarantee everyone either a job or benefits no lower than the subsistence minimum." } },
    { id:"e10", std:true, axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Трудовое законодательство стоит смягчить, чтобы работодателю было проще нанимать и увольнять.",
      en:{ t:"Labour law should be relaxed so that employers can hire and fire more easily." } },

    /* --- государство --- */
    { id:"a6", std:true,  axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Регионам нужно оставлять больше собранных налогов и больше самостоятельности.",
      en:{ t:"Regions should keep more of the taxes they collect and enjoy more autonomy." } },
    { id:"a7", std:true,  short:true, axis:"y", dir:+1, w:1, sub:"tradition",
      t:"Призыв на срочную военную службу должен сохраниться.",
      en:{ t:"Conscription into military service should be retained." } },
    { id:"a8", std:true,  short:true, axis:"y", dir:+1, w:1.3, sub:"tradition",
      t:"Государство должно законодательно защищать традиционные ценности.",
      en:{ t:"The state should protect traditional values through legislation." } },
    { id:"a9", std:true,  short:true, axis:"y", dir:-1, w:1.3, sub:"centralization",
      t:"Полномочия президента следует сократить в пользу парламента.",
      en:{ t:"The president's powers should be cut back in favour of parliament." } },
    { id:"a10", std:true, axis:"y", dir:+1, w:1, sub:"civil",
      t:"Городское видеонаблюдение с распознаванием лиц делает жизнь безопаснее.",
      en:{ t:"Urban video surveillance with facial recognition makes life safer." } },

    /* --- экономика --- */
    { id:"e11", std:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Налог на прибыль крупных корпораций нужно повысить.",
      en:{ t:"Corporate profit tax on large companies should be raised." } },
    { id:"e12", std:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Высшее образование должно быть бесплатным для всех, кто сдал вступительные испытания.",
      en:{ t:"Higher education should be free for everyone who passes the entrance exams." } },
    { id:"e13", std:true, axis:"x", dir:+1, w:1, sub:"property",
      t:"Иностранным инвесторам стоит открыть доступ даже к стратегическим отраслям.",
      en:{ t:"Foreign investors should be given access even to strategic industries." } },
    { id:"e14", std:true, short:true, axis:"x", dir:+1, w:1, sub:"property",
      t:"Госкорпорации скорее душат конкуренцию, чем развивают экономику.",
      en:{ t:"State corporations stifle competition more than they develop the economy." } },
    { id:"e15", std:true, short:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Нужны налог на роскошь и налог на крупные наследства.",
      en:{ t:"A luxury tax and a tax on large inheritances are needed." } },

    /* --- государство --- */
    { id:"a11", std:true, axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Наказание за хранение наркотиков без цели сбыта следует смягчить.",
      en:{ t:"Punishment for possessing drugs without intent to supply should be reduced." } },
    { id:"a12", std:true, short:true, axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Церковь должна быть полностью отделена от школы и государственных институтов.",
      en:{ t:"The church should be completely separated from schools and state institutions." } },
    { id:"a13", std:true, axis:"y", dir:+1, w:1, sub:"civil",
      t:"Иностранные организации, работающие в России, нуждаются в жёстком государственном контроле.",
      en:{ t:"Foreign organisations operating in Russia require strict state control." } },
    { id:"a14", std:true, short:true, axis:"y", dir:-1, w:1, sub:"civil",
      t:"Суд присяжных нужно распространить на большинство уголовных дел.",
      en:{ t:"Jury trials should be extended to most criminal cases." } },
    { id:"a15", std:true, short:true, axis:"y", dir:+1, w:1, sub:"civil",
      t:"В кризисной ситуации государство вправе временно ограничивать права граждан.",
      en:{ t:"In a crisis the state has the right to restrict citizens' rights temporarily." } },

    /* --- экономика --- */
    { id:"e16", std:true, short:true, axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Тарифы на электричество и топливо должен определять рынок, а не государство.",
      en:{ t:"Electricity and fuel tariffs should be set by the market, not by the state." } },
    { id:"e17", std:true, axis:"x", dir:+1, w:1, sub:"property",
      t:"Сельскохозяйственная земля должна свободно продаваться и покупаться.",
      en:{ t:"Agricultural land should be freely bought and sold." } },
    { id:"e18", std:true, short:true, axis:"x", dir:-1, w:1.3, sub:"regulation",
      t:"Экономике нужен возврат к государственному планированию по пятилеткам.",
      en:{ t:"The economy needs a return to state planning in five-year plans." } },
    { id:"e19", std:true, axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Безусловный базовый доход — разумная идея для России.",
      en:{ t:"An unconditional basic income is a sensible idea for Russia." } },
    { id:"e20", std:true, short:true, axis:"x", dir:+1, w:1, sub:"redistribution",
      t:"Сбалансированный бюджет важнее, чем сохранение социальных расходов любой ценой.",
      en:{ t:"A balanced budget matters more than preserving social spending at any cost." } },

    /* --- государство --- */
    { id:"a16", std:true, axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Цензура в кино, музыке и компьютерных играх недопустима.",
      en:{ t:"Censorship in film, music and video games is unacceptable." } },
    { id:"a17", std:true, axis:"y", dir:+1, w:1, sub:"civil",
      t:"Полиции и Росгвардии нужно больше полномочий, а не меньше.",
      en:{ t:"The police and the National Guard need more powers, not fewer." } },
    { id:"a18", std:true, axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Местное самоуправление должно самостоятельно распоряжаться своим бюджетом.",
      en:{ t:"Local self-government should control its own budget independently." } },
    { id:"a19", std:true, short:true, axis:"y", dir:+1, w:1, sub:"tradition",
      t:"Смертную казнь следует вернуть.",
      en:{ t:"The death penalty should be reinstated." } },
    { id:"a20", std:true, axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Совершеннолетний гражданин вправе свободно приобретать оружие для самозащиты.",
      en:{ t:"An adult citizen should be free to buy a firearm for self-defence." } },

    /* ============================================================
       Версия на 90 утверждений: пятьдесят дополнительных позиций.
       Первые сорок (e1…e20, a1…a20) помечены std и составляют
       стандартную версию — их порядок и формулировки неприкосновенны,
       потому что по ним строится код старых ссылок на результат.
       ============================================================ */

    /* --- экономика --- */
    { id:"e21", axis:"x", dir:-1, w:1, sub:"property",
      t:"Железные дороги и магистральные трубопроводы должны оставаться в собственности государства.",
      en:{ t:"Railways and trunk pipelines should remain in state ownership." } },
    { id:"e22", axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Безусловный базовый доход стоит ввести хотя бы для наименее обеспеченных.",
      en:{ t:"A basic income should be introduced, at least for the least well-off." } },
    { id:"e23", axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Тарифы жилищно-коммунальных услуг должно устанавливать государство, а не рынок.",
      en:{ t:"Utility tariffs should be set by the state, not by the market." } },
    { id:"e24", axis:"x", dir:-1, w:1, sub:"property",
      t:"Крупные банки должны быть государственными, а не частными.",
      en:{ t:"Major banks should be state-owned rather than private." } },
    { id:"e25", axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Внешняя торговля должна быть свободной: пошлины и квоты в итоге бьют по покупателю.",
      en:{ t:"Foreign trade should be free: tariffs and quotas end up hitting the buyer." } },

    /* --- государство --- */
    { id:"a21", axis:"y", dir:+1, w:1, sub:"civil",
      t:"Полиции нужен доступ к переписке и звонкам без решения суда, когда речь идёт о терроризме.",
      en:{ t:"The police need access to messages and calls without a court order when terrorism is involved." } },
    { id:"a22", axis:"y", dir:+1, w:1, sub:"centralization",
      t:"Регионы слишком разные, чтобы решать бюджетные вопросы самостоятельно: центр распорядится лучше.",
      en:{ t:"Regions are too different to decide budget matters on their own: the centre will do it better." } },
    { id:"a23", axis:"y", dir:+1, w:1, sub:"tradition",
      t:"Школа должна воспитывать патриотизм наравне с преподаванием предметов.",
      en:{ t:"Schools should instil patriotism alongside teaching academic subjects." } },
    { id:"a24", axis:"y", dir:+1, w:1, sub:"civil",
      t:"Иностранное финансирование общественных организаций должно быть запрещено.",
      en:{ t:"Foreign funding of civil-society organisations should be banned." } },
    { id:"a25", axis:"y", dir:+1, w:1, sub:"centralization",
      t:"Мэров крупных городов должен назначать губернатор, а не избирать жители.",
      en:{ t:"Mayors of large cities should be appointed by the governor rather than elected by residents." } },

    /* --- экономика --- */
    { id:"e26", axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Государство обязано обеспечить рабочим местом каждого, кто готов работать.",
      en:{ t:"The state must provide a job for everyone willing to work." } },
    { id:"e27", axis:"x", dir:-1, w:1, sub:"property",
      t:"Приватизация девяностых годов была ошибкой, и её итоги следует пересмотреть.",
      en:{ t:"The privatisation of the 1990s was a mistake and its results should be revisited." } },
    { id:"e28", axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Разрыв между самой высокой и самой низкой зарплатой в компании должен ограничиваться законом.",
      en:{ t:"The gap between the highest and the lowest wage in a company should be capped by law." } },
    { id:"e29", axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Минимальную оплату труда нужно поднять до уровня, на который реально прожить, даже если часть малых фирм этого не выдержит.",
      en:{ t:"The minimum wage should be raised to a level one can actually live on, even if some small firms cannot survive it." } },
    { id:"e30", axis:"x", dir:-1, w:1, sub:"property",
      t:"Коммунальной инфраструктурой должен распоряжаться муниципалитет, а не частные компании.",
      en:{ t:"Utility infrastructure should be run by the municipality rather than by private companies." } },

    /* --- государство --- */
    { id:"a26", axis:"y", dir:+1, w:1, sub:"tradition",
      t:"Церковь вправе влиять на решения государства в вопросах морали.",
      en:{ t:"The church has the right to influence state decisions on matters of morality." } },
    { id:"a27", axis:"y", dir:-1, w:1, sub:"civil",
      t:"Анонимность в интернете — право, а не лазейка: обязательная привязка аккаунтов к паспорту недопустима.",
      en:{ t:"Anonymity online is a right, not a loophole: tying accounts to a passport must not be mandatory." } },
    { id:"a28", axis:"y", dir:+1, w:1, sub:"centralization",
      t:"Единые федеральные стандарты в школе важнее права региона на собственную программу.",
      en:{ t:"Uniform federal school standards matter more than a region's right to its own curriculum." } },
    { id:"a29", axis:"y", dir:+1, w:1, sub:"tradition",
      t:"Прерывание беременности следует ограничить законом.",
      en:{ t:"Abortion should be restricted by law." } },
    { id:"a30", axis:"y", dir:-1, w:1, sub:"civil",
      t:"Журналист не обязан раскрывать свой источник даже по требованию следствия.",
      en:{ t:"A journalist should not have to reveal a source even at the demand of investigators." } },

    /* --- экономика --- */
    { id:"e31", axis:"x", dir:+1, w:1, sub:"redistribution",
      t:"Человек должен сам копить на старость, а не рассчитывать на государственную пенсию.",
      en:{ t:"People should save for old age themselves rather than count on a state pension." } },
    { id:"e32", axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Экологические требования к промышленности надо ужесточать, даже ценой закрытия предприятий.",
      en:{ t:"Environmental rules for industry should be tightened, even at the cost of closing plants." } },
    { id:"e33", axis:"x", dir:-1, w:1, sub:"property",
      t:"В стратегических отраслях контрольный пакет должен быть у государства, даже если это снижает их эффективность.",
      en:{ t:"In strategic industries the state should hold the controlling stake, even if that makes them less efficient." } },
    { id:"e34", axis:"x", dir:+1, w:1, sub:"redistribution",
      t:"Пособие по безработице должно быть небольшим и недолгим, иначе оно отучает искать работу.",
      en:{ t:"Unemployment benefit should be small and short, otherwise it teaches people not to look for work." } },
    { id:"e35", axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Вывоз капитала за рубеж должен ограничиваться государством.",
      en:{ t:"The export of capital abroad should be restricted by the state." } },

    /* --- государство --- */
    { id:"a31", axis:"y", dir:+1, w:1, sub:"centralization",
      t:"Президент должен иметь право распускать региональные парламенты.",
      en:{ t:"The president should have the right to dissolve regional parliaments." } },
    { id:"a32", axis:"y", dir:+1, w:1, sub:"tradition",
      t:"Начальная военная подготовка должна быть обязательной частью школьной программы.",
      en:{ t:"Basic military training should be a compulsory part of the school curriculum." } },
    { id:"a33", axis:"y", dir:-1, w:1, sub:"civil",
      t:"Уголовное преследование за слова и публикации следует отменить полностью.",
      en:{ t:"Criminal prosecution for words and publications should be abolished entirely." } },
    { id:"a34", axis:"y", dir:+1, w:1, sub:"centralization",
      t:"Сильная вертикаль власти важнее разделения властей: страна такого размера иначе не управляется.",
      en:{ t:"A strong power vertical matters more than the separation of powers: a country this size cannot be run otherwise." } },
    { id:"a35", axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Зарегистрировать брак должны иметь право любые двое совершеннолетних.",
      en:{ t:"Any two adults should have the right to register a marriage." } },

    /* --- экономика --- */
    { id:"e36", axis:"x", dir:+1, w:1, sub:"property",
      t:"Государственные компании следует приватизировать: частный собственник управляет ими лучше.",
      en:{ t:"State companies should be privatised: a private owner runs them better." } },
    { id:"e37", axis:"x", dir:+1, w:1, sub:"redistribution",
      t:"Бесплатное высшее образование для всех — роскошь: часть расходов должен нести сам студент.",
      en:{ t:"Free higher education for everyone is a luxury: students should bear part of the cost." } },
    { id:"e38", axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Профсоюз должен иметь право остановить работу предприятия забастовкой без разрешения властей.",
      en:{ t:"A trade union should be able to halt an enterprise by strike without permission from the authorities." } },
    { id:"e39", axis:"x", dir:+1, w:1, sub:"property",
      t:"Частная собственность на землю должна быть полной, включая свободную продажу и залог.",
      en:{ t:"Private ownership of land should be full, including free sale and mortgage." } },
    { id:"e40", axis:"x", dir:+1, w:1, sub:"redistribution",
      t:"Адресная помощь нуждающимся лучше всеобщих льгот и дотаций.",
      en:{ t:"Targeted help for those in need is better than universal benefits and subsidies." } },

    /* --- государство --- */
    { id:"a36", axis:"y", dir:-1, w:1, sub:"civil",
      t:"Суд присяжных должен рассматривать больше категорий дел, включая экономические.",
      en:{ t:"Jury trials should cover more categories of cases, including economic ones." } },
    { id:"a37", axis:"y", dir:+1, w:1, sub:"centralization",
      t:"Национальные языки в республиках должны изучаться по желанию, а не в обязательном порядке.",
      en:{ t:"National languages in the republics should be studied by choice, not as a requirement." } },
    { id:"a38", axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Призыв в армию следует отменить и перейти к полностью контрактной службе.",
      en:{ t:"Conscription should be abolished in favour of a fully contract army." } },
    { id:"a39", axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Наркополитику стоит смягчить: зависимость — вопрос медицины, а не тюрьмы.",
      en:{ t:"Drug policy should be softened: addiction is a medical question, not a prison one." } },
    { id:"a40", axis:"y", dir:+1, w:1, sub:"centralization",
      t:"Силовые структуры должны подчиняться только федеральному центру.",
      en:{ t:"Law-enforcement bodies should answer to the federal centre alone." } },

    /* --- экономика --- */
    { id:"e41", axis:"x", dir:-1, w:1, sub:"regulation",
      t:"Цены на лекарства и топливо должны регулироваться государством.",
      en:{ t:"The prices of medicines and fuel should be regulated by the state." } },
    { id:"e42", axis:"x", dir:+1, w:1, sub:"property",
      t:"Государству не место в конкурентных отраслях: ему следует выйти из торговли, банков и медиа.",
      en:{ t:"The state has no place in competitive industries: it should exit retail, banking and the media." } },
    { id:"e43", axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Трудовой кодекс слишком жёсткий: работодателю нужно облегчить увольнение сотрудника.",
      en:{ t:"The labour code is too rigid: it should be easier for an employer to dismiss an employee." } },
    { id:"e44", axis:"x", dir:+1, w:1, sub:"regulation",
      t:"Лицензирование и обязательную сертификацию в большинстве отраслей следует отменить.",
      en:{ t:"Licensing and mandatory certification should be abolished in most industries." } },
    { id:"e45", axis:"x", dir:-1, w:1, sub:"redistribution",
      t:"Налог на крупные состояния и наследство необходим.",
      en:{ t:"A tax on large fortunes and inheritance is necessary." } },

    /* --- государство --- */
    { id:"a41", axis:"y", dir:-1, w:1, sub:"tradition",
      t:"Государство не должно вмешиваться в то, как человек выражает свою идентичность.",
      en:{ t:"The state should not interfere in how a person expresses their identity." } },
    { id:"a42", axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Референдум по важному вопросу должен запускаться по инициативе граждан, а не только власти.",
      en:{ t:"A referendum on an important question should be launched on the initiative of citizens, not only of the authorities." } },
    { id:"a43", axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Регионы должны оставлять у себя большую часть собранных на их территории налогов.",
      en:{ t:"Regions should keep the larger share of the taxes collected on their territory." } },
    { id:"a44", axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Парламент должен иметь право отправить правительство в отставку без согласия президента.",
      en:{ t:"Parliament should be able to dismiss the government without the president's consent." } },
    { id:"a45", axis:"y", dir:-1, w:1, sub:"centralization",
      t:"Судей должны выбирать или утверждать независимо от исполнительной власти.",
      en:{ t:"Judges should be elected or confirmed independently of the executive." } }
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

  /* Порядок внутри выборки — порядок исходного массива: filter его
     сохраняет, и это не деталь реализации, а требование. Код ссылки на
     результат стандартной версии — сорок символов в порядке STD, и
     перестановка любых двух утверждений тихо испортила бы все ссылки,
     выданные прошлыми версиями сайта. */
  PC.QUIZ = {
    QUESTIONS: QUESTIONS,
    STD:   QUESTIONS.filter(function(q){ return q.std; }),
    SHORT: QUESTIONS.filter(function(q){ return q.short; }),
    SCALE: SCALE
  };
})(window.PC = window.PC || {});
