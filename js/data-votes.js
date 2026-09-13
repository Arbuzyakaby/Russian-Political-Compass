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
(function(PC){
  "use strict";

PC.VOTES = [
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

})(window.PC = window.PC || {});
