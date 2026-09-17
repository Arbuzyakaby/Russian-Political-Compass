/* ============ Люди на поле: не партии, а отдельные фигуры ============

   Компас до 2.3.2 расставлял только партии — коллективных игроков с
   программой, фракцией и историей голосований. Путин был первым
   исключением: он не голосует фракцией, не участвует в выборах как
   список и с 2012 года формально ни в одной партии не состоит. Втиснуть
   такую фигуру в формат PC.PARTIES значило бы либо выдумать ей мандаты
   и голосования, которых нет, либо тихо занизить требования формата для
   всех остальных.

   С 2.4 исключений три, и держать их тремя копиями одного кода было бы
   ровно той ошибкой, от которой этот файл и уводит. Поэтому здесь не
   один объект, а список PC.PEOPLE: компас (js/compass.js, drawPeople)
   обходит его целиком, а карточка (js/people.js) одна на всех и
   получает человека параметром. Добавить четвёртого — дописать сюда
   объект, и всё; ни новых файлов, ни нового модального листа.

   Формат одного человека:
     id        строковый ключ, попадает в data-id точки на поле;
     name/short/role/badge   подписи; short идёт на поле, name — в карточку;
     color     цвет точки и акцент карточки;
     seal      ключ формы печати из таблицы SEALS в js/compass.js;
     lp        предпочтительная сторона подписи (как lp у партий);
     x, y      координаты: x — экономика (−10 левые … +10 правые),
               y — государство (−10 свобода … +10 вертикаль);
     summary / theses[] / why / note   содержательная часть карточки;
     updatedAt дата последней сверки позиции и статуса, ISO YYYY-MM-DD;
     en{}      английские версии всех текстовых полей.

   Про updatedAt отдельно. У партии позиция меняется программой и
   съездом — медленно и публично. У живого человека меняются вещи
   быстрее и тише: место жительства, юридический статус, роль в
   собственной организации. Дата сверки нужна, чтобы через полгода было
   видно, какую карточку пора перечитать, а не гадать по git blame.

   Координаты и обоснование — как у партий: экспертная оценка по
   документированной публичной практике, а не измерение. Сравнивать
   людей с партиями тоже можно, только вручную: PC.calc считает соседей
   внутри PC.PARTIES, и звать сюда отдельного «ближайшего человека»
   незачем ради трёх точек. ============ */
(function(PC){
  "use strict";

PC.PEOPLE = [
  {
    id:"putin",
    name:"Владимир Путин", short:"В. Путин",
    role:"Президент Российской Федерации",
    color:"#c9a24a", seal:"hex", lp:"right",
    x:3.0, y:9.4,
    updatedAt:"2026-09-17",
    badge:"Беспартийный (по паспорту)",
    summary:"Президент России с 2000 года, с перерывом на премьерство в 2008–2012-м при формально ином президенте. Дважды возглавлял федеральный список «Единой России» на думских выборах и три года был её председателем, но с 2012 года в самой партии не состоит: должность важнее билета.",
    theses:[
      "Курс исполнительной власти определяет лично, а не через партийную программу — «Единая Россия» в основном оформляет то, что уже решено",
      "Государственный капитализм: рынок и частная собственность сохраняются, но стратегические отрасли идут через государство и доверенных руководителей",
      "Последовательное расширение президентских полномочий: обнуление сроков поправками 2020 года, прямой контроль над силовым блоком",
      "Внешняя политика построена вокруг суверенитета и статуса великой державы, а не вокруг многосторонних институтов"
    ],
    why:"Экономически — почти там же, где «Единая Россия»: рынок и частная собственность сохранены, но ключевые отрасли идут через государство и доверенных людей, а не через свободную конкуренцию. Разница с партией не в направлении, а в механизме: то, что для ЕР — программа, для него — принятое решение. По вертикали — выше любой партии в списке: он не голосует за усиление вертикали, он и есть вертикаль, а формальная беспартийность только помогает стоять над системой, не будучи частью ни одной её фракции.",
    note:"Отдельная карточка — не привилегия, а следствие формата: он не голосует фракцией и не участвует в выборах как партия, так что складывать его в один список с ними и сравнивать по фракционным метрикам было бы нечестно по отношению к самим партиям.",
    en:{
      name:"Vladimir Putin", short:"V. Putin",
      role:"President of the Russian Federation",
      badge:"Independent (officially)",
      summary:"President of Russia since 2000, with a break for the premiership in 2008–2012 under a formally different president. He has twice led United Russia's federal list in Duma elections and chaired the party for three years, but has not been a member of it since 2012 — the office outranks the card.",
      theses:[
        "Sets the course of the executive personally rather than through a party platform — United Russia mostly writes up what has already been decided",
        "State capitalism: the market and private property remain, but strategic industries run through the state and trusted managers",
        "A steady expansion of presidential powers: the 2020 amendments reset his term count, and he keeps direct control of the security bloc",
        "Foreign policy is built around sovereignty and great-power status rather than multilateral institutions"
      ],
      why:"Economically he sits almost where United Russia does: the market and private property remain, but the key industries run through the state and trusted people rather than open competition. The difference from the party is not direction but mechanism — what is a platform for United Russia is a decision already taken for him. On the vertical axis he is above every party on the board: he does not vote to strengthen the power vertical, he is the power vertical, and formal non-membership only makes it easier to stand above a system without belonging to any one faction of it.",
      note:"A separate card is not a privilege but a consequence of the format: he does not vote as a faction and does not run as a party, so filing him into the same list and scoring him by faction metrics would be unfair to the parties themselves."
    }
  },

  {
    id:"kats",
    name:"Максим Кац", short:"М. Кац",
    role:"Оппозиционный политик и видеоблогер",
    color:"#7c5cff", seal:"rhomb", lp:"right",
    x:4.4, y:-6.0,
    updatedAt:"2026-09-17",
    badge:"Бывший муниципальный депутат",
    summary:"Муниципальный депутат района Щукино в 2012–2017 годах, соруководитель нескольких кампаний на московских выборах, с конца 2010-х — в первую очередь публицист на YouTube. С 2022 года живёт за пределами России и внесён российскими властями в реестр иноагентов; политика для него давно идёт не через мандат, а через аудиторию.",
    theses:[
      "Парламентская республика вместо президентской: премьер, зависимый от Думы, вместо фигуры, стоящей над всеми институтами",
      "Реальное местное самоуправление с собственными деньгами — городская политика как школа и фильтр для политики федеральной",
      "Рыночная экономика без государственного капитализма: приватизация несырьевых госактивов, конкуренция вместо назначенных чемпионов",
      "Прагматизм вместо радикализма: участие в любых доступных выборах и институтах, даже несвободных, если это даёт реальный результат",
      "Урбанистика как политика: общественный транспорт, пешеходные улицы и качество городской среды — не благоустройство, а перераспределение власти в городе"
    ],
    why:"По экономике — самая правая точка среди людей на поле и правее большинства партий: Кац последовательно говорит о конкуренции, частной инициативе и уходе государства из хозяйства, а его урбанистические расходы — это инвестиция в общественную инфраструктуру, а не социальное перераспределение. По вертикали — глубоко в свободной половине: вся его повестка построена на разборке президентской вертикали в пользу парламента и муниципалитетов. Но не у самого края: он спорит с теми, кто требует слома системы целиком, и много лет доказывает, что участвовать в несовершенных институтах полезнее, чем их бойкотировать — эта ставка на институты и удерживает его выше самого либертарианского угла.",
    note:"Координаты описывают его публичную политическую позицию, а не его репутацию в оппозиционной среде: споры вокруг тактики «умного голосования» и полемика с ФБК — вопрос стратегии, а не места на этих двух осях.",
    en:{
      name:"Maxim Katz", short:"M. Katz",
      role:"Opposition politician and video blogger",
      badge:"Former municipal deputy",
      summary:"A municipal deputy for Moscow's Shchukino district from 2012 to 2017 and co-runner of several Moscow election campaigns, he has since the late 2010s worked mainly as a YouTube commentator. He has lived outside Russia since 2022 and has been placed on the Russian authorities' foreign-agent register; his politics has long run through an audience rather than a mandate.",
      theses:[
        "A parliamentary republic instead of a presidential one: a prime minister answerable to the Duma rather than a figure standing above every institution",
        "Genuine local self-government with money of its own — city politics as the training ground and filter for federal politics",
        "A market economy without state capitalism: privatising non-resource state assets, competition instead of appointed champions",
        "Pragmatism over radicalism: taking part in whatever elections and institutions are available, even unfree ones, when that produces a real result",
        "Urbanism as politics: public transport, pedestrian streets and the quality of the urban environment are not landscaping but a redistribution of power inside a city"
      ],
      why:"Economically he is the furthest right of the people on the board and to the right of most parties: Katz argues consistently for competition, private initiative and a state that withdraws from the economy, and his urbanist spending is an investment in shared infrastructure rather than social redistribution. On the vertical axis he sits deep in the free half — his whole platform is about dismantling the presidential vertical in favour of parliament and municipalities. But not at the very edge: he argues with those who demand the system be broken outright, and has spent years making the case that taking part in imperfect institutions beats boycotting them, and it is that bet on institutions that keeps him above the most libertarian corner.",
      note:"The coordinates describe his public political position, not his standing inside the opposition: the arguments over \"smart voting\" tactics and his polemics with the Anti-Corruption Foundation are questions of strategy, not of where he sits on these two axes."
    }
  },

  {
    id:"navalnaya",
    name:"Юлия Навальная", short:"Ю. Навальная",
    role:"Председатель Фонда борьбы с коррупцией",
    color:"#ef4d8f", seal:"shield", lp:"left",
    x:1.2, y:-8.4,
    updatedAt:"2026-09-17",
    badge:"Лидер оппозиции вне России",
    summary:"Вдова Алексея Навального, с 2024 года возглавляет Фонд борьбы с коррупцией и публично приняла на себя роль лидера той части оппозиции, которая выросла вокруг ФБК. Живёт за пределами России; российские власти завели на неё уголовное дело и объявили в розыск. Своей программы «с нуля» не писала — она продолжает и удерживает линию «Прекрасной России будущего».",
    theses:[
      "Демонтаж авторитарной конструкции как первоочередная задача: свободные выборы, независимый суд, освобождение политических заключённых",
      "Антикоррупционное расследование как главный политический инструмент — власть описывается через деньги и собственность, а не через идеологию",
      "Парламентская республика и сменяемость власти вместо персоналистского режима",
      "Рыночная экономика с сильными социальными обязательствами: возврат активов, полученных коррупционно, и честные налоги вместо сырьевой ренты в частных руках",
      "Европейский выбор: Россия как обычная европейская страна, а не отдельная цивилизация с особым путём"
    ],
    why:"По вертикали — самая нижняя точка на поле среди людей: вся её публичная повестка построена вокруг снятия принуждения, освобождения заключённых и возврата политической конкуренции, и в этом она радикальнее умеренных либералов, потому что говорит не о поправках к системе, а о её замене. По экономике — заметно ближе к центру, чем к правому краю: ФБК всегда говорил о рынке и частной собственности, но его главный сюжет — не свобода предпринимателя, а изъятие того, что было взято коррупционно, и сильные социальные обязательства государства. Правее нуля — но не на территории чистого экономического либерализма.",
    note:"Позиция намеренно снята с линии ФБК, а не с личной биографии: у Навальной нет собственной партии и мандата, и оценивать её как индивидуального идеолога значило бы придумать позицию там, где она сама подчёркивает преемственность.",
    en:{
      name:"Yulia Navalnaya", short:"Y. Navalnaya",
      role:"Chair of the Anti-Corruption Foundation",
      badge:"Opposition leader outside Russia",
      summary:"The widow of Alexei Navalny, she has chaired the Anti-Corruption Foundation since 2024 and has publicly taken on the role of leader for the part of the opposition that grew up around it. She lives outside Russia; the Russian authorities have opened a criminal case against her and put her on a wanted list. She has not written a platform from scratch — she continues and holds the line of the \"Beautiful Russia of the Future\".",
      theses:[
        "Dismantling the authoritarian construction comes first: free elections, an independent judiciary, the release of political prisoners",
        "Anti-corruption investigation as the central political instrument — power is described through money and property rather than through ideology",
        "A parliamentary republic and rotation of power instead of a personalist regime",
        "A market economy with strong social obligations: recovering assets taken corruptly and honest taxes instead of resource rent in private hands",
        "A European choice: Russia as an ordinary European country rather than a separate civilisation on a special path"
      ],
      why:"On the vertical axis she is the lowest point among the people on the board: her entire public agenda is built around removing coercion, freeing prisoners and restoring political competition, and in that she is more radical than the moderate liberals, because she speaks of replacing the system rather than amending it. Economically she sits much closer to the centre than to the right edge: the Anti-Corruption Foundation has always spoken for the market and private property, but its main storyline is not the freedom of the entrepreneur — it is taking back what was taken corruptly, plus strong social obligations for the state. To the right of zero, but not in the territory of pure economic liberalism.",
      note:"The position is deliberately read off the Foundation's line rather than off her personal biography: Navalnaya has no party and no mandate of her own, and grading her as an individual ideologue would mean inventing a position where she herself stresses continuity."
    }
  }
];

/* Точечный доступ по id — компасу и карточке нужен именно он, а
   перебирать массив в трёх местах подряд незачем. */
PC.personById = function(id){
  for(var i = 0; i < PC.PEOPLE.length; i++){
    if(PC.PEOPLE[i].id === id) return PC.PEOPLE[i];
  }
  return null;
};

})(window.PC = window.PC || {});
