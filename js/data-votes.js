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
   голосование разводит сильнее: "x" (экономика) или "y" (государство).

   src (5.1) — источник: vote — номер протокола в системе анализа
   голосований Госдумы (vote.duma.gov.ru/vote/<номер>), bill — номер
   законопроекта (sozd.duma.gov.ru/bill/<номер>), url — публикация, если
   протокола нет. Позиция фракции считается по финальному чтению: как
   проголосовало большинство участвовавших членов фракции. Если
   голосовало меньше трети фракции, позиции нет («нет данных»):
   неучастие — не воздержание. "split" — когда «за» и «против» почти
   поровну. */
(function(PC){
  "use strict";

PC.VOTES = [
  {
    id:"benefits-2004", conv:4, date:"2004-08-05", topic:"econ", axis:"x",
    title:"Монетизация льгот (ФЗ-122)",
    summary:"Замена натуральных льгот денежными выплатами и передача части социальных обязательств регионам.",
    tally:"309 за, 118 против в третьем чтении",
    why:"Первое голосование созыва, где социальная повестка отделилась от лояльности: против выступили и левая КПРФ, и патриотическая «Родина», хотя по оси власти эти партии стоят по-разному. ЛДПР раскололась почти поровну: 12 за, 13 против.",
    pos:{ er:"for", ldpr:"split", kprf:"against", rodina:"against" },
    src:{ vote:53943, bill:"58338-4" },
    en:{
      title:"Monetisation of social benefits (Law 122-FZ)",
      summary:"Replacing in-kind benefits with cash payments and shifting part of the social obligations to the regions.",
      tally:"309 for, 118 against at third reading",
      why:"The first vote of the convocation where the social agenda separated from loyalty: both the left-wing KPRF and the patriotic Rodina voted against, even though the two sit far apart on the authority axis. The LDPR split almost evenly: 12 for, 13 against."
    }
  },
  {
    id:"kyoto-2004", conv:4, date:"2004-10-22", topic:"foreign", axis:"x",
    title:"Ратификация Киотского протокола",
    summary:"Россия присоединяется к международным обязательствам по ограничению выбросов парниковых газов; ратификация позволила протоколу вступить в силу во всём мире в 2005 году.",
    tally:"334 за, 73 против, 2 воздержались",
    why:"Внешнеполитическое решение с экономической ценой: КПРФ и «Родина» голосовали против, считая обязательства угрозой росту промышленности, ЛДПР поддержала протокол вместе с «Единой Россией».",
    pos:{ er:"for", ldpr:"for", kprf:"against", rodina:"against" },
    src:{ vote:54242, bill:"95355-4" },
    en:{
      title:"Ratification of the Kyoto Protocol",
      summary:"Russia takes on international commitments to limit greenhouse-gas emissions; its ratification let the protocol enter into force worldwide in 2005.",
      tally:"334 for, 73 against, 2 abstentions",
      why:"A foreign-policy decision with an economic price tag: the KPRF and Rodina voted against, seeing the commitments as a threat to industrial growth, while the LDPR backed the protocol together with United Russia."
    }
  },
  {
    id:"governors-2004", conv:4, date:"2004-12-03", topic:"state", axis:"y",
    title:"Отмена прямых выборов губернаторов",
    summary:"Главы регионов наделяются полномочиями региональными парламентами по представлению президента вместо всенародных выборов.",
    tally:"358 за, 62 против, 2 воздержались",
    why:"Первый крупный шаг к вертикали власти. Разделение прошло по оси отношения к государству, а не по экономике: ЛДПР поддержала закон вместе с большинством, КПРФ голосовала против всей фракцией. «Родина» в большинстве тоже поддержала закон (21 за, 5 против).",
    pos:{ er:"for", ldpr:"for", rodina:"for", kprf:"against" },
    src:{ vote:54802, bill:"93081-4" },
    en:{
      title:"Abolition of direct gubernatorial elections",
      summary:"Regional heads are vested with power by regional parliaments on the president's nomination instead of by popular vote.",
      tally:"358 for, 62 against, 2 abstentions",
      why:"The first major step towards the power vertical. The split ran along the authority axis rather than the economic one: the LDPR backed the law together with the majority, while the KPRF voted against as a whole faction. Most of Rodina also backed it (21 for, 5 against)."
    }
  },
  {
    id:"term-2008", conv:5, date:"2008-11-21", topic:"state", axis:"y",
    title:"Продление сроков президента и Думы",
    summary:"Поправка к Конституции: срок полномочий президента увеличен с четырёх до шести лет, Государственной думы — с четырёх до пяти.",
    tally:"392 за, 57 против в третьем чтении",
    why:"Первая поправка к тексту Конституции 1993 года. Против проголосовала только фракция КПРФ — её 57 голосов и составили всё «против»; ЛДПР и «Справедливая Россия» поддержали поправку вместе с «Единой Россией».",
    pos:{ er:"for", ldpr:"for", sr:"for", kprf:"against" },
    src:{ vote:62912, bill:"124578-5" },
    en:{
      title:"Extending the terms of the president and the Duma",
      summary:"A constitutional amendment extending the presidential term from four to six years and the State Duma term from four to five.",
      tally:"392 for, 57 against at third reading",
      why:"The first amendment to the text of the 1993 Constitution. Only the KPRF faction voted against — its 57 votes made up the entire “against”; the LDPR and A Just Russia supported the amendment together with United Russia."
    }
  },
  {
    id:"kharkiv-2010", conv:5, date:"2010-04-27", topic:"foreign", axis:"y",
    title:"Ратификация Харьковских соглашений",
    summary:"Соглашение с Украиной продлевает базирование Черноморского флота в Севастополе на 25 лет после 2017 года в обмен на скидку на российский газ.",
    tally:"410 за, 0 против",
    why:"Редкое единодушие: «Единая Россия», КПРФ и «Справедливая Россия» проголосовали за всеми присутствовавшими. Фракция ЛДПР в голосовании не участвовала, поэтому её позиция не приводится.",
    pos:{ er:"for", kprf:"for", sr:"for" },
    src:{ vote:68944, bill:"363935-5" },
    en:{
      title:"Ratification of the Kharkiv Accords",
      summary:"An agreement with Ukraine extends the basing of the Black Sea Fleet in Sevastopol by 25 years beyond 2017 in exchange for a discount on Russian gas.",
      tally:"410 for, 0 against",
      why:"Rare unanimity: United Russia, the KPRF and A Just Russia voted in favour with every member present. The LDPR faction did not take part in the vote, so its position is not given."
    }
  },
  {
    id:"start-2011", conv:5, date:"2011-01-25", topic:"foreign", axis:"y",
    title:"Ратификация договора СНВ-III",
    summary:"Договор с США о сокращении стратегических наступательных вооружений: потолки по развёрнутым боезарядам и носителям, взаимные инспекции.",
    tally:"350 за, 96 против, 1 воздержался",
    why:"Голосование разделило оппозицию: «Справедливая Россия» поддержала договор, а КПРФ и ЛДПР выступили против почти в полном составе, считая, что он ограничивает Россию сильнее, чем США.",
    pos:{ er:"for", sr:"for", kprf:"against", ldpr:"against" },
    src:{ vote:71722, bill:"382931-5" },
    en:{
      title:"Ratification of the New START treaty",
      summary:"A treaty with the United States reducing strategic offensive arms: ceilings on deployed warheads and launchers, plus mutual inspections.",
      tally:"350 for, 96 against, 1 abstention",
      why:"The vote split the opposition: A Just Russia backed the treaty, while the KPRF and the LDPR voted against almost to a man, arguing that it constrained Russia more than the US."
    }
  },
  {
    id:"police-2011", conv:5, date:"2011-01-28", topic:"state", axis:"y",
    title:"Закон «О полиции»",
    summary:"Милиция переименована в полицию с переаттестацией личного состава; закон расширил права полицейских на применение силы, проверку документов и проникновение в жилище.",
    tally:"315 за, 130 против",
    why:"Принят голосами одной «Единой России». Все три фракции меньшинства — КПРФ, ЛДПР и «Справедливая Россия» — голосовали против: реформа, по их мнению, свелась к смене вывески при росте полномочий.",
    pos:{ er:"for", kprf:"against", ldpr:"against", sr:"against" },
    src:{ vote:71875, bill:"446526-5" },
    en:{
      title:"The Police Act",
      summary:"The militsiya is renamed the police and its staff re-certified; the act widened officers' powers to use force, check documents and enter homes.",
      tally:"315 for, 130 against",
      why:"Passed by United Russia alone. All three minority factions, the KPRF, the LDPR and A Just Russia, voted against, arguing that the reform amounted to a new sign over the door and broader powers."
    }
  },
  {
    id:"rallies-2012", conv:6, date:"2012-06-05", topic:"state", axis:"y",
    title:"Ужесточение закона о митингах",
    summary:"Многократное повышение штрафов за нарушения на публичных мероприятиях и обязательные работы как наказание — после протестов 2011–2012 годов.",
    tally:"241 за, 147 против, 3 воздержались",
    why:"Принят после попытки «итальянской забастовки»: оппозиционные депутаты внесли сотни поправок, чтобы затянуть рассмотрение. Все три фракции меньшинства проголосовали против — по свободе собраний системная оппозиция совпала целиком.",
    pos:{ er:"for", kprf:"against", ldpr:"against", sr:"against" },
    src:{ bill:"70631-6", url:"https://www.amic.ru/news/183044/" },
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
    src:{ vote:77866, bill:"89689-6" },
    en:{
      title:"Ratification of the WTO accession protocol",
      summary:"Russia joining the World Trade Organization: lower import duties and commitments on market access for foreign companies.",
      tally:"238 for, 208 against",
      why:"A vote in which United Russia stood entirely alone: 238 votes in favour — exactly its faction. The left, the nationalists and the social democrats all voted against: on the economic axis this is a dispute about protecting the domestic market."
    }
  },
  {
    id:"ngo-agents-2012", conv:6, date:"2012-07-13", topic:"state", axis:"y",
    title:"НКО — «иностранные агенты»",
    summary:"Некоммерческие организации с иностранным финансированием и «политической деятельностью» обязаны регистрироваться как иностранные агенты и маркировать свои материалы.",
    tally:"374 за, 3 против, 1 воздержался",
    why:"С этого закона начинается вся последующая система «иноагентов». Его поддержали «Единая Россия», КПРФ и ЛДПР; фракция «Справедливая Россия» в основном не голосовала (участвовали 7 из 64), поэтому её позиция не приводится.",
    pos:{ er:"for", kprf:"for", ldpr:"for" },
    src:{ vote:77988, bill:"102766-6" },
    en:{
      title:"NGOs as “foreign agents”",
      summary:"Non-profits with foreign funding and “political activity” must register as foreign agents and label their materials.",
      tally:"374 for, 3 against, 1 abstention",
      why:"The whole later “foreign agent” system starts with this law. United Russia, the KPRF and the LDPR backed it; most of A Just Russia did not vote (7 of 64 took part), so its position is not given."
    }
  },
  {
    id:"libel-2012", conv:6, date:"2012-07-13", topic:"state", axis:"y",
    title:"Возвращение уголовной ответственности за клевету",
    summary:"Клевета снова становится уголовным преступлением — через полгода после перевода в административные правонарушения; максимальный штраф — до 5 млн рублей.",
    tally:"238 за, 91 против",
    why:"КПРФ голосовала против всей фракцией. ЛДПР в голосовании не участвовала, из «Справедливой России» голосовали лишь 7 депутатов из 64 — их позиции не приводятся.",
    pos:{ er:"for", kprf:"against" },
    src:{ vote:77990, bill:"106999-6" },
    en:{
      title:"Libel made a criminal offence again",
      summary:"Libel becomes a crime again, half a year after it had been downgraded to an administrative offence; the maximum fine is up to 5 million roubles.",
      tally:"238 for, 91 against",
      why:"The KPRF voted against as a whole faction. The LDPR took no part, and only 7 of A Just Russia's 64 deputies voted, so their positions are not given."
    }
  },
  {
    id:"dima-2012", conv:6, date:"2012-12-21", topic:"state", axis:"y",
    title:"«Закон Димы Яковлева»",
    summary:"Запрет усыновления российских детей гражданами США и ответные меры на «акт Магнитского».",
    tally:"420 за, 7 против, 1 воздержался",
    why:"Голосование, на котором системные фракции сошлись почти полностью: несогласие выражали отдельные депутаты, а не партии. Такие эпизоды и объясняют, почему по вертикальной оси четыре думские партии стоят кучно.",
    pos:{ er:"for", ldpr:"for", kprf:"for", sr:"for" },
    src:{ vote:80026, bill:"186614-6" },
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
    src:{ vote:81454, bill:"44554-6" },
    en:{
      title:"Ban on “propaganda of non-traditional relations” among minors",
      summary:"Administrative liability for distributing information about non-traditional sexual relations to children.",
      tally:"436 for, 0 against, 1 abstention",
      why:"A clean vote on the traditionalism sub-axis: economic disagreements play no part here at all, and the outcome is near-unanimous."
    }
  },
  {
    id:"believers-2013", conv:6, date:"2013-06-11", topic:"state", axis:"y",
    title:"Оскорбление чувств верующих",
    summary:"Уголовная ответственность за публичные действия, «выражающие явное неуважение к обществу» и совершённые с целью оскорбить религиозные чувства верующих, — до трёх лет лишения свободы.",
    tally:"308 за, 2 против",
    why:"Принят после дела Pussy Riot. «Единая Россия» и ЛДПР поддержали закон почти полностью; КПРФ и «Справедливая Россия» в основном не голосовали (8 из 92 и 12 из 64), поэтому их позиции не приводятся.",
    pos:{ er:"for", ldpr:"for" },
    src:{ vote:81443, bill:"142303-6" },
    en:{
      title:"Insulting the feelings of believers",
      summary:"Criminal liability for public acts “expressing clear disrespect for society” committed to insult the religious feelings of believers, punishable by up to three years in prison.",
      tally:"308 for, 2 against",
      why:"Passed after the Pussy Riot case. United Russia and the LDPR backed it almost unanimously; most of the KPRF and A Just Russia did not vote (8 of 92 and 12 of 64), so their positions are not given."
    }
  },
  {
    id:"crimea-2014", conv:6, date:"2014-03-20", topic:"foreign", axis:"y",
    title:"Ратификация договора о принятии Крыма в состав России",
    summary:"Договор о принятии Республики Крым и города Севастополя в состав Российской Федерации.",
    tally:"443 за, 1 против",
    why:"Единственный голос против подал депутат от «Справедливой России», сама фракция голосовала за. Голосование показывает предел применимости двух осей: внешнеполитическая повестка ими не измеряется вовсе.",
    pos:{ er:"for", ldpr:"for", kprf:"for", sr:"for" },
    src:{ vote:85090, bill:"475948-6" },
    en:{
      title:"Ratification of the treaty on Crimea joining Russia",
      summary:"The treaty admitting the Republic of Crimea and the city of Sevastopol into the Russian Federation.",
      tally:"443 for, 1 against",
      why:"The single vote against came from a deputy of A Just Russia; the faction itself voted in favour. This vote marks the limit of the two axes: they do not measure the foreign-policy agenda at all."
    }
  },
  {
    id:"undesirable-2015", conv:6, date:"2015-05-19", topic:"state", axis:"y",
    title:"«Нежелательные» иностранные организации",
    summary:"Генпрокуратура получает право без суда признавать иностранные и международные организации «нежелательными»; участие в их деятельности становится правонарушением, а при повторе — преступлением.",
    tally:"301 за, 0 против",
    why:"Против не проголосовал никто, но и единодушия не было: КПРФ в голосовании не участвовала, из ЛДПР голосовали двое. Закон поддержали «Единая Россия» и «Справедливая Россия».",
    pos:{ er:"for", sr:"for" },
    src:{ vote:90758, bill:"648549-6" },
    en:{
      title:"“Undesirable” foreign organisations",
      summary:"The Prosecutor General may declare foreign and international organisations “undesirable” without a court ruling; taking part in their work becomes an offence, and a repeat offence a crime.",
      tally:"301 for, 0 against",
      why:"Nobody voted against, yet there was no unanimity: the KPRF took no part and only two LDPR deputies voted. The law was backed by United Russia and A Just Russia."
    }
  },
  {
    id:"yarovaya-2016", conv:6, date:"2016-06-24", topic:"state", axis:"y",
    title:"«Пакет Яровой»",
    summary:"Хранение переписки и звонков операторами связи, расширение уголовной ответственности за экстремизм и недонесение, ограничения миссионерской деятельности.",
    tally:"287 за, 147 против",
    why:"Одно из последних голосований VI созыва и одно из самых спорных по под-оси гражданских свобод: КПРФ и ЛДПР голосовали против почти в полном составе, а «Справедливая Россия» поддержала пакет вместе с «Единой Россией» (51 за, 6 против).",
    pos:{ er:"for", sr:"for", kprf:"against", ldpr:"against" },
    src:{ vote:95967, bill:"1039149-6" },
    en:{
      title:"The “Yarovaya package”",
      summary:"Retention of messages and calls by telecom operators, wider criminal liability for extremism and failure to report, restrictions on missionary activity.",
      tally:"287 for, 147 against",
      why:"One of the last votes of the 6th convocation and one of the most contested on the civil-liberties sub-axis: the KPRF and the LDPR voted against almost to a man, while A Just Russia backed the package together with United Russia (51 for, 6 against)."
    }
  },
  {
    id:"battery-2017", conv:7, date:"2017-01-27", topic:"state", axis:"y",
    title:"Декриминализация побоев в семье",
    summary:"Первые побои в отношении близких переведены из уголовных преступлений в административные правонарушения: штраф, арест или обязательные работы.",
    tally:"380 за, 3 против",
    why:"За — «Единая Россия», ЛДПР и «Справедливая Россия». КПРФ в голосовании почти не участвовала (4 из 42), поэтому её позиция не приводится.",
    pos:{ er:"for", ldpr:"for", sr:"for" },
    src:{ vote:97268, bill:"26265-7" },
    en:{
      title:"Decriminalising domestic battery",
      summary:"First-time battery against family members is moved from the criminal code to administrative offences: a fine, short arrest or community service.",
      tally:"380 for, 3 against",
      why:"United Russia, the LDPR and A Just Russia voted for. The KPRF barely took part (4 of 42), so its position is not given."
    }
  },
  {
    id:"renovation-2017", conv:7, date:"2017-06-14", topic:"econ", axis:"x",
    title:"Реновация жилья в Москве",
    summary:"Особый порядок сноса пятиэтажек в Москве и переселения жителей: равнозначное жильё в том же районе, денежная компенсация по выбору, судебная защита собственников.",
    tally:"399 за, 2 против, 1 воздержался",
    why:"Голосование о собственности, в котором все четыре фракции оказались по одну сторону: после весенних протестов москвичей закон дополнили гарантиями, и КПРФ его поддержала.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for" },
    src:{ vote:99192, bill:"120505-7" },
    en:{
      title:"Housing renovation in Moscow",
      summary:"A special procedure for demolishing five-storey blocks in Moscow and rehousing residents: equivalent flats in the same district, cash compensation as an option, and court protection for owners.",
      tally:"399 for, 2 against, 1 abstention",
      why:"A property vote in which all four factions ended up on the same side: after Muscovites protested in the spring, guarantees were added and the KPRF supported the law."
    }
  },
  {
    id:"vat-2018", conv:7, date:"2018-07-24", topic:"econ", axis:"x",
    title:"Повышение НДС до 20%",
    summary:"Рост базовой ставки налога на добавленную стоимость с 18% до 20% в третьем чтении.",
    tally:"302 за, 90 против в третьем чтении",
    why:"Голосование того же года, что и пенсионная реформа, но по чистому вопросу налоговой нагрузки: «Единая Россия» снова голосует в одиночестве, три оппозиционные фракции — единым фронтом против повышения налога.",
    pos:{ er:"for", ldpr:"against", kprf:"against", sr:"against" },
    src:{ vote:104928, bill:"489169-7" },
    en:{
      title:"Raising VAT to 20%",
      summary:"An increase of the base value-added tax rate from 18% to 20% at third reading.",
      tally:"302 for, 90 against at third reading",
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
    src:{ vote:105658, bill:"489161-7" },
    en:{
      title:"Raising the retirement age",
      summary:"A phased increase of the retirement age to 65 for men and 60 for women.",
      tally:"332 for, 83 against at third reading",
      why:"The most divisive vote of the last two convocations: United Russia stood alone while all three opposition factions voted alike, despite a nine-unit gap on the economic axis between the KPRF and the LDPR."
    }
  },
  {
    id:"disrespect-2019", conv:7, date:"2019-03-07", topic:"state", axis:"y",
    title:"«Неуважение к власти» в интернете",
    summary:"Блокировка материалов, выражающих «явное неуважение» к обществу, государству, его символам и органам власти; парный закон ввёл за это штрафы и арест.",
    tally:"327 за, 40 против, 1 воздержался",
    why:"КПРФ голосовала против почти всей фракцией. ЛДПР и «Справедливая Россия» в голосовании в основном не участвовали (1 из 39 и 4 из 23), поэтому их позиции не приводятся.",
    pos:{ er:"for", kprf:"against" },
    src:{ vote:107129, bill:"606594-7" },
    en:{
      title:"“Disrespect for the authorities” online",
      summary:"Blocking of material expressing “clear disrespect” for society, the state, its symbols and its authorities; a companion law introduced fines and arrest for it.",
      tally:"327 for, 40 against, 1 abstention",
      why:"The KPRF voted against almost as a whole faction. The LDPR and A Just Russia mostly did not take part (1 of 39 and 4 of 23), so their positions are not given."
    }
  },
  {
    id:"internet-2019", conv:7, date:"2019-04-16", topic:"state", axis:"y",
    title:"«Суверенный интернет»",
    summary:"Централизованное управление сетями связи и техническая возможность изолировать российский сегмент интернета.",
    tally:"307 за, 68 против",
    why:"Одно из немногих голосований VII созыва, где системная оппозиция разошлась с большинством по вопросу гражданских свобод, а не по деньгам: КПРФ и ЛДПР голосовали против. «Справедливая Россия» в основном не голосовала (5 из 23), поэтому её позиция не приводится.",
    pos:{ er:"for", kprf:"against", ldpr:"against" },
    src:{ vote:107479, bill:"608767-7" },
    en:{
      title:"The “sovereign internet” law",
      summary:"Centralised management of communication networks and the technical means to isolate the Russian segment of the internet.",
      tally:"307 for, 68 against",
      why:"One of the few votes of the 7th convocation where the systemic opposition parted with the majority over civil liberties rather than money: the KPRF and the LDPR voted against. Most of A Just Russia did not vote (5 of 23), so its position is not given."
    }
  },
  {
    id:"constitution-2020", conv:7, date:"2020-03-11", topic:"state", axis:"y",
    title:"Поправки к Конституции",
    summary:"Пакет поправок, включая обнуление президентских сроков, приоритет Конституции над решениями международных органов и социальные гарантии.",
    tally:"383 за, 0 против, 43 воздержались",
    why:"Воздержавшаяся фракция КПРФ — редкий случай, когда несогласие оформлено не голосом «против», а отказом поддержать. Именно такие эпизоды держат КПРФ ниже «Единой России» по вертикальной оси.",
    pos:{ er:"for", ldpr:"for", sr:"for", kprf:"abstain" },
    src:{ vote:110467, bill:"885214-7" },
    en:{
      title:"Amendments to the Constitution",
      summary:"A package of amendments including the reset of presidential terms, the primacy of the Constitution over international rulings, and social guarantees.",
      tally:"383 for, 0 against, 43 abstentions",
      why:"The KPRF's abstention is a rare case of dissent expressed by refusing support rather than by voting against. Episodes like this are what keep the KPRF below United Russia on the vertical axis."
    }
  },
  {
    id:"ndfl-2020", conv:7, date:"2020-11-11", topic:"econ", axis:"x",
    title:"НДФЛ 15% с доходов свыше 5 млн рублей",
    summary:"Первый отход от плоской шкалы 2001 года: доход сверх 5 млн рублей в год облагается по ставке 15% вместо 13%; деньги направляются на лечение детей с тяжёлыми болезнями.",
    tally:"361 за, 0 против",
    why:"Все фракции — за: для левых это шаг к прогрессивной шкале, для «Единой России» — адресная мера с понятной целью. Через четыре года шкала стала пятиступенчатой (см. «Прогрессивная шкала НДФЛ»).",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for" },
    src:{ vote:112261, bill:"1022669-7" },
    en:{
      title:"15% income tax above 5 million roubles",
      summary:"The first departure from the 2001 flat tax: income above 5 million roubles a year is taxed at 15% instead of 13%, with the money going to treat children with serious illnesses.",
      tally:"361 for, 0 against",
      why:"Every faction voted for: to the left it was a step towards a progressive scale, to United Russia a targeted measure with a clear purpose. Four years later the scale grew to five brackets (see “Progressive income tax”)."
    }
  },
  {
    id:"education-2021", conv:7, date:"2021-03-16", topic:"state", axis:"y",
    title:"Контроль над «просветительской деятельностью»",
    summary:"Лекции, курсы и другие просветительские проекты вне школ и вузов подпадают под регулирование правительства; сотрудничество с иностранными организациями — по согласованию с Минобрнауки.",
    tally:"308 за, 95 против, 1 воздержался",
    why:"Принят голосами одной «Единой России». КПРФ, ЛДПР и «Справедливая Россия» голосовали против почти в полном составе — по гражданским свободам системная оппозиция снова совпала.",
    pos:{ er:"for", kprf:"against", ldpr:"against", sr:"against" },
    src:{ vote:113771, bill:"1057895-7" },
    en:{
      title:"State control over “educational activity”",
      summary:"Lectures, courses and other educational projects outside schools and universities come under government regulation; cooperation with foreign organisations requires approval by the science ministry.",
      tally:"308 for, 95 against, 1 abstention",
      why:"Passed by United Russia alone. The KPRF, the LDPR and A Just Russia voted against almost to a man: on civil liberties the systemic opposition lined up together once again."
    }
  },
  {
    id:"torture-2021", conv:8, date:"2021-10-14", topic:"state", axis:"y",
    title:"Парламентское расследование пыток в ФСИН",
    summary:"Предложение КПРФ создать комиссию Госдумы по расследованию пыток в колониях после публикации видеозаписей из саратовской тюремной больницы.",
    tally:"отклонено: против — 258 депутатов «Единой России», за — вся оппозиция",
    why:"Первое крупное голосование VIII созыва и самое чистое разделение по оси государства в наборе: все четыре фракции меньшинства — от КПРФ до «Новых людей» — поддержали расследование, «Единая Россия» провалила его почти в полном составе.",
    pos:{ er:"against", kprf:"for", sr:"for", ldpr:"for", nl:"for" },
    src:{ url:"https://novayagazeta.ru/articles/2021/10/14/fraktsiia-edinoi-rossii-zablokirovala-initsiativu-kprf-po-parlamentskomu-rassledovaniiu-pytok-v-sisteme-fsin-news" },
    en:{
      title:"A parliamentary inquiry into torture in the prison service",
      summary:"A KPRF proposal to set up a Duma commission on torture in penal colonies after videos from the Saratov prison hospital were published.",
      tally:"rejected: 258 United Russia deputies against, the whole opposition in favour",
      why:"The first major vote of the VIII convocation and the cleanest split along the authority axis in the set: all four minority factions — from the KPRF to New People — backed the inquiry, and United Russia sank it almost to a member."
    }
  },
  {
    id:"dnr-2022", conv:8, date:"2022-02-22", topic:"foreign", axis:"y",
    title:"Признание ДНР и ЛНР",
    summary:"Ратификация договоров о дружбе и взаимопомощи с самопровозглашёнными республиками.",
    tally:"400 за, единогласно",
    why:"Единогласное голосование всех пяти фракций VIII созыва — верхняя граница того, что видно на компасе: по этому вопросу расстояния между партиями обнуляются.",
    pos:{ er:"for", ldpr:"for", kprf:"for", sr:"for", nl:"for", rodina:"for" },
    src:{ vote:117233, bill:"75578-8" },
    en:{
      title:"Recognition of the DPR and LPR",
      summary:"Ratification of treaties of friendship and mutual assistance with the self-proclaimed republics.",
      tally:"400 for, unanimously",
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
    src:{ vote:117350, bill:"464757-7" },
    en:{
      title:"Criminal liability for army “fakes”",
      summary:"Article 207.3 of the Criminal Code: up to 15 years in prison for spreading “knowingly false information” about the actions of the Armed Forces.",
      tally:"passed unanimously",
      why:"Passed in all three readings in a single day with no votes against. The strongest restriction on free speech across all convocations — and not a single difference between the factions: on the authority axis the spread of parties in the VIII convocation has all but vanished."
    }
  },
  {
    id:"echr-2022", conv:8, date:"2022-06-07", topic:"foreign", axis:"y",
    title:"Отказ исполнять решения ЕСПЧ",
    summary:"Решения Европейского суда по правам человека, вступившие в силу после 15 марта 2022 года, в России больше не исполняются.",
    tally:"361 за, 1 против; КПРФ в голосовании не участвовала",
    why:"Разрыв с последним внешним механизмом защиты прав граждан поддержали «Единая Россия», ЛДПР, «Справедливая Россия» и «Новые люди». Фракция КПРФ в голосовании не участвовала — проголосовал один депутат из 56, — поэтому её позиция не приводится: неучастие не то же самое, что воздержание.",
    pos:{ er:"for", sr:"for", ldpr:"for", nl:"for" },
    src:{ vote:118071, bill:"124020-8" },
    en:{
      title:"Refusing to enforce ECHR judgments",
      summary:"Judgments of the European Court of Human Rights that entered into force after 15 March 2022 are no longer enforced in Russia.",
      tally:"361 for, 1 against; the KPRF did not take part",
      why:"The break with the last external mechanism protecting citizens' rights was backed by United Russia, the LDPR, A Just Russia and New People. The KPRF faction did not take part (one deputy out of 56 voted), so its position is not given: not voting is not the same as abstaining."
    }
  },
  {
    id:"agents-2022", conv:8, date:"2022-06-29", topic:"state", axis:"y",
    title:"Закон о контроле за деятельностью иноагентов",
    summary:"Единый закон об «иностранных агентах»: статус можно присвоить за «иностранное влияние» без иностранного финансирования, с запретами на преподавание, госзаказ и работу с детьми.",
    tally:"331 за, 5 против, 11 воздержались",
    why:"Одно из немногих голосований созыва, где «Новые люди» не поддержали охранительный закон: десять депутатов воздержались, трое голосовали за. Фракция КПРФ в голосовании почти не участвовала (5 из 56), поэтому её позиция не приводится.",
    pos:{ er:"for", sr:"for", ldpr:"for", nl:"abstain" },
    src:{ vote:118599, bill:"113045-8" },
    en:{
      title:"Law on the control of foreign agents' activities",
      summary:"A single law on “foreign agents”: the label can be assigned for “foreign influence” without foreign funding, with bans on teaching, public contracts and work with children.",
      tally:"331 for, 5 against, 11 abstentions",
      why:"One of the few votes of the convocation in which New People did not back a restrictive law: ten deputies abstained and three voted in favour. The KPRF faction barely took part (5 of 56), so its position is not given."
    }
  },
  {
    id:"annex-2022", conv:8, date:"2022-10-03", topic:"foreign", axis:"y",
    title:"Принятие в состав России ДНР, ЛНР, Запорожской и Херсонской областей",
    summary:"Ратификация договоров о вхождении четырёх регионов в состав Российской Федерации.",
    tally:"принято единогласно",
    why:"Как и признание ДНР и ЛНР в феврале, решение прошло без единого голоса против. Внешнеполитическую повестку две оси компаса не измеряют, и здесь это видно особенно наглядно.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    src:{ vote:119232, bill:"203812-8" },
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
    src:{ vote:120074, bill:"217471-8" },
    en:{
      title:"Full ban on “LGBT propaganda” for all ages",
      summary:"An extension of the 2013 ban from minors to all citizens, covering advertising, film and the internet.",
      tally:"397 for, unanimously",
      why:"Extending the 2013 vote to all adults passed without a single vote against — a rare case where all six factions of the VIII convocation, including the market-oriented New People, agreed on a question outside the economic axis."
    }
  },
  {
    id:"declarations-2023", conv:8, date:"2023-01-25", topic:"state", axis:"y",
    title:"Отмена публикации деклараций депутатов",
    summary:"Сведения о доходах и имуществе депутатов и сенаторов перестают публиковаться; декларации подаются, но остаются закрытыми.",
    tally:"принят; КПРФ в основном против, «Справедливая Россия» воздержалась",
    why:"Голосование о прозрачности самой власти разделило оппозицию: КПРФ голосовала против, «Справедливая Россия» большинством воздержалась, а ЛДПР и «Новые люди» поддержали закрытие деклараций вместе с «Единой Россией».",
    pos:{ er:"for", kprf:"against", sr:"abstain", ldpr:"for", nl:"for" },
    src:{ vote:120801, bill:"247501-8" },
    en:{
      title:"Ending publication of deputies' declarations",
      summary:"Information on the income and assets of deputies and senators is no longer published; declarations are still filed but stay closed.",
      tally:"passed; the KPRF mostly against, A Just Russia abstained",
      why:"A vote on the transparency of power itself split the opposition: the KPRF voted against, A Just Russia mostly abstained, while the LDPR and New People backed closing the declarations together with United Russia."
    }
  },
  {
    id:"summons-2023", conv:8, date:"2023-04-11", topic:"state", axis:"y",
    title:"Электронные повестки",
    summary:"Повестка считается врученной с момента размещения в личном кабинете на «Госуслугах»; уклонившимся запрещают выезд за границу, регистрацию бизнеса и сделки с недвижимостью.",
    tally:"390 за, 0 против",
    why:"Принят в один день во втором и третьем чтениях, и все пять фракций проголосовали за. Против не было ни одного голоса — даже у «Новых людей», которые через три месяца выступят против повышения призывного возраста.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    src:{ vote:121897, bill:"1161250-7" },
    en:{
      title:"Electronic call-up notices",
      summary:"A call-up notice counts as served once it appears in the person's account on the Gosuslugi portal; those who evade it are barred from leaving the country, registering a business or dealing in property.",
      tally:"390 for, 0 against",
      why:"Passed at second and third reading on the same day, with all five factions voting for. There was not a single vote against, not even from New People, who would oppose raising the conscription age a few months later."
    }
  },
  {
    id:"gender-2023", conv:8, date:"2023-07-14", topic:"state", axis:"y",
    title:"Запрет смены пола",
    summary:"Запрет медицинских вмешательств для смены пола и изменения пола в документах, расторжение браков, в которых один из супругов сменил пол.",
    tally:"принят единогласно",
    why:"Продолжение линии законов 2013 и 2022 годов по под-оси традиционализма — и снова без различий между фракциями, включая «Новых людей».",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    src:{ vote:123408, bill:"369814-8" },
    en:{
      title:"Ban on gender reassignment",
      summary:"A ban on medical interventions for gender reassignment and on changing gender in documents; marriages in which one spouse has changed gender are dissolved.",
      tally:"passed unanimously",
      why:"A continuation of the 2013 and 2022 laws on the traditionalism sub-axis — and again with no differences between the factions, New People included."
    }
  },
  {
    id:"windfall-2023", conv:8, date:"2023-07-21", topic:"econ", axis:"x",
    title:"Налог на сверхприбыль",
    summary:"Разовый налог 10% с превышения средней прибыли 2021–2022 годов над 2018–2019 годами для крупных компаний; при досрочной уплате ставка вдвое ниже.",
    tally:"294 за, 14 против, 14 воздержались",
    why:"Голосование, где экономическая ось развела оппозицию: ЛДПР поддержала налог, «Новые люди» выступили против как партия бизнеса, «Справедливая Россия» воздержалась. КПРФ в голосовании почти не участвовала (4 из 57).",
    pos:{ er:"for", ldpr:"for", nl:"against", sr:"abstain" },
    src:{ vote:123702, bill:"379248-8" },
    en:{
      title:"Windfall tax",
      summary:"A one-off 10% tax for large companies on the amount by which their average 2021–2022 profit exceeded that of 2018–2019; paying early halves the rate.",
      tally:"294 for, 14 against, 14 abstentions",
      why:"A vote in which the economic axis split the opposition: the LDPR supported the tax, New People opposed it as a pro-business party, and A Just Russia abstained. The KPRF barely took part (4 of 57)."
    }
  },
  {
    id:"draftage-2023", conv:8, date:"2023-07-25", topic:"state", axis:"y",
    title:"Повышение призывного возраста до 30 лет",
    summary:"Верхняя граница призыва на срочную службу поднята с 27 до 30 лет с 1 января 2024 года, выезд за границу после получения повестки запрещён.",
    tally:"335 за, 13 против, 28 воздержались",
    why:"«Новые люди» — единственная фракция, выступившая против: двенадцать из тринадцати голосовавших. КПРФ закон поддержала вместе с «Единой Россией», «Справедливая Россия» воздержалась всей фракцией. ЛДПР в голосовании не участвовала, её позиция не приводится.",
    pos:{ er:"for", kprf:"for", sr:"abstain", nl:"against" },
    src:{ vote:123855, bill:"312507-8" },
    en:{
      title:"Raising the conscription age to 30",
      summary:"The upper age limit for military conscription is raised from 27 to 30 from 1 January 2024, and leaving the country after receiving a summons is prohibited.",
      tally:"335 for, 13 against, 28 abstentions",
      why:"New People were the only faction to oppose it: twelve of the thirteen who voted. The KPRF backed the law together with United Russia, and A Just Russia abstained as a whole faction. The LDPR took no part, so its position is not given."
    }
  },
  {
    id:"ctbt-2023", conv:8, date:"2023-10-18", topic:"foreign", axis:"y",
    title:"Отзыв ратификации Договора о запрещении ядерных испытаний",
    summary:"Россия отзывает ратификацию Договора о всеобъемлющем запрещении ядерных испытаний, выравнивая свой статус с США, которые договор подписали, но не ратифицировали.",
    tally:"принят единогласно",
    why:"Ещё одно единогласное внешнеполитическое голосование: в VIII созыве фракции не расходятся ни по одному вопросу этой темы.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    src:{ vote:124290, bill:"458681-8" },
    en:{
      title:"Revoking the ratification of the nuclear test ban treaty",
      summary:"Russia revokes its ratification of the Comprehensive Nuclear-Test-Ban Treaty, aligning its status with the United States, which signed the treaty but never ratified it.",
      tally:"passed unanimously",
      why:"Another unanimous foreign-policy vote: in the VIII convocation the factions do not diverge on a single question of this kind."
    }
  },
  {
    id:"taxreform-2024", conv:8, date:"2024-07-10", topic:"econ", axis:"x",
    title:"Прогрессивная шкала НДФЛ",
    summary:"Налоговая реформа: пять ступеней подоходного налога от 13 до 22%, налог на прибыль 25%, расширение порога упрощённой системы для малого бизнеса.",
    tally:"409 за (90,9%)",
    why:"Редкий случай, когда экономическое голосование совпало с тем, чего годами требовали левые: прогрессивную шкалу поддержали и «Единая Россия», и КПРФ, и «Справедливая Россия». Коммунисты оговорились, что дивиденды стоило бы облагать по той же шкале, но за закон голосовали. ЛДПР и «Новые люди» тоже голосовали за.",
    pos:{ er:"for", kprf:"for", sr:"for", ldpr:"for", nl:"for" },
    src:{ vote:127514, bill:"639663-8" },
    en:{
      title:"A progressive income tax scale",
      summary:"Tax reform: five personal income tax brackets from 13 to 22%, a 25% corporate profit tax, and a higher threshold for the simplified regime for small business.",
      tally:"409 for (90.9%)",
      why:"A rare case of an economic vote matching what the left had demanded for years: the progressive scale was backed by United Russia, the KPRF and A Just Russia alike. The communists noted that dividends ought to be taxed on the same scale, but voted for the law. The LDPR and New People voted for it as well."
    }
  },
  {
    id:"dprk-2024", conv:8, date:"2024-10-24", topic:"foreign", axis:"y",
    title:"Договор о стратегическом партнёрстве с КНДР",
    summary:"Ратификация договора о всеобъемлющем стратегическом партнёрстве с Северной Кореей, включая обязательство оказать военную помощь при нападении на одну из сторон.",
    tally:"397 за, 0 против",
    why:"Внешнеполитическое единодушие VIII созыва: все пять фракций за, ни одного «против» и ни одного воздержавшегося.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    src:{ vote:128927, bill:"740196-8" },
    en:{
      title:"Strategic partnership treaty with North Korea",
      summary:"Ratification of a comprehensive strategic partnership treaty with North Korea, including a commitment to provide military assistance if either side is attacked.",
      tally:"397 for, 0 against",
      why:"The foreign-policy unanimity of the 8th convocation: all five factions in favour, not a single vote against and no abstentions."
    }
  },
  {
    id:"childfree-2024", conv:8, date:"2024-11-12", topic:"state", axis:"y",
    title:"Запрет «пропаганды чайлдфри»",
    summary:"Штрафы за распространение информации, «склоняющей к отказу от деторождения», в СМИ, кино, рекламе и интернете.",
    tally:"принят единогласно",
    why:"Ещё одно единогласное голосование по под-оси традиционализма. Для компаса это важный сигнал: фракции VIII созыва, заметно различающиеся по экономике, по культурной повестке неразличимы.",
    pos:{ er:"for", kprf:"for", ldpr:"for", sr:"for", nl:"for" },
    src:{ vote:129033, bill:"724769-8" },
    en:{
      title:"Ban on “child-free propaganda”",
      summary:"Fines for spreading information “inducing people to refuse to have children” in the media, film, advertising and on the internet.",
      tally:"passed unanimously",
      why:"Another unanimous vote on the traditionalism sub-axis. For the compass this is an important signal: the VIII-convocation factions, clearly different on economics, are indistinguishable on the cultural agenda."
    }
  },
  {
    id:"extremism-2025", conv:8, date:"2025-07-22", topic:"state", axis:"y",
    title:"Штрафы за поиск экстремистских материалов",
    summary:"Административный штраф от 3 до 5 тысяч рублей за умышленный поиск в интернете материалов из федерального списка экстремистских и доступ к ним; запрет рекламы VPN.",
    tally:"306 за, 67 против, 22 воздержались",
    why:"Самое массовое «против» созыва: КПРФ и «Новые люди» голосовали против, «Справедливая Россия» воздержалась. Для «Новых людей» — первое голосование, где заявленная защита свободы интернета совпала с поведением фракции. Позиция ЛДПР в наборе не приводится.",
    pos:{ er:"for", kprf:"against", nl:"against", sr:"abstain" },
    src:{ vote:131816, bill:"755710-8" },
    en:{
      title:"Fines for searching for extremist materials",
      summary:"An administrative fine of 3,000–5,000 roubles for deliberately searching online for materials on the federal list of extremist materials and accessing them; a ban on advertising VPNs.",
      tally:"306 for, 67 against, 22 abstentions",
      why:"The largest “against” of the convocation: the KPRF and New People voted against, A Just Russia abstained. For New People it was the first vote in which its stated defence of internet freedom matched the faction's behaviour. The LDPR's position is not given."
    }
  },
  {
    id:"vat-2025", conv:8, date:"2025-11-20", topic:"econ", axis:"x",
    title:"Повышение НДС до 22%",
    summary:"Основная ставка НДС с 1 января 2026 года повышается с 20 до 22%, порог НДС для упрощённой системы снижен с 60 до 10 млн рублей.",
    tally:"343 за, 1 против, 56 воздержались",
    why:"Второе повышение НДС за два созыва — и первое, которое поддержали все фракции, кроме КПРФ: в 2018 году ЛДПР и «Справедливая Россия» голосовали против. КПРФ воздержалась почти в полном составе (54 из 56), «Новые люди» проголосовали за.",
    pos:{ er:"for", ldpr:"for", sr:"for", nl:"for", kprf:"abstain" },
    src:{ vote:133002, bill:"1026190-8" },
    en:{
      title:"Raising VAT to 22%",
      summary:"The standard VAT rate rises from 20 to 22% from 1 January 2026, and the VAT threshold for the simplified regime drops from 60 to 10 million roubles.",
      tally:"343 for, 1 against, 56 abstentions",
      why:"The second VAT rise in two convocations, and the first backed by every faction except the KPRF: in 2018 the LDPR and A Just Russia had voted against. The KPRF abstained almost to a man (54 of 56), and New People voted for."
    }
  }
];

})(window.PC = window.PC || {});
