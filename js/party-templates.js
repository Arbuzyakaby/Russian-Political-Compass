/* Шаблоны, копия реальной партии и случайная партия — чистые функции без DOM.
   Реальные данные не изменяются: из них только читаются координаты и голоса.
   Все построители возвращают «сырой» объект для PC.partyModel.normalize. */
(function(PC){
  "use strict";
  var M = function(){ return PC.partyModel; };
  function ru(){ return !PC.i18n || PC.i18n.isRu(); }

  /* sub — шесть под-осей в порядке PC.SUBAXES: property, redistribution,
     regulation, civil, centralization, tradition. Среднее первых трёх — x,
     последних трёх — y. */
  var TEMPLATES = [
    { id:"socdem", color:"#f472b6", emblem:"heart", family:"social-democracy", kind:"parliamentary", sub:[-5, -7, -4, -3, -1, -1.5],
      ru:{ name:"Левые социал-демократы", short:"Соцдемы", tag:"СД", slogan:"Рынок для людей, а не люди для рынка",
        ideology:"Социал-демократия: рыночная экономика с сильными социальными гарантиями",
        summary:"Партия широкого социального государства: прогрессивные налоги, бесплатные медицина и образование, сильные профсоюзы и независимый суд.",
        theses:["Прогрессивный налог и единые социальные стандарты по всей стране", "Бесплатные медицина и образование, финансируемые из бюджета", "Сильные профсоюзы и защита трудовых прав", "Независимый суд и выборная местная власть"] },
      en:{ name:"Left Social Democrats", short:"Social Democrats", tag:"SD", slogan:"Markets serve people, not the other way round",
        ideology:"Social democracy: a market economy with strong social guarantees",
        summary:"A party of the broad welfare state: progressive taxes, free healthcare and education, strong trade unions and an independent judiciary.",
        theses:["Progressive taxation and common social standards across the country", "Free healthcare and education funded from the budget", "Strong trade unions and protected labour rights", "An independent judiciary and elected local government"] } },
    { id:"liberal", color:"#38bdf8", emblem:"sun", family:"liberalism", kind:"opposition", sub:[6, 4, 5, -5, -4, -3],
      ru:{ name:"Либеральные реформаторы", short:"Либералы", tag:"ЛР", slogan:"Свобода, право, конкуренция",
        ideology:"Классический либерализм и открытая экономика",
        summary:"Открытая экономика, равные правила для бизнеса и граждан, независимые суды и СМИ, настоящая децентрализация власти.",
        theses:["Равные правила для всех: защита собственности и независимый суд", "Низкие налоги, простое регулирование и честная конкуренция", "Свободные выборы и независимые СМИ", "Реальное самоуправление городов и регионов"] },
      en:{ name:"Liberal Reformers", short:"Liberals", tag:"LR", slogan:"Freedom, law, competition",
        ideology:"Classical liberalism and an open economy",
        summary:"An open economy, equal rules for business and citizens, independent courts and media, and genuine decentralisation of power.",
        theses:["Equal rules for all: property rights and an independent judiciary", "Low taxes, simple regulation and fair competition", "Free elections and independent media", "Real self-government for cities and regions"] } },
    { id:"libertarian", color:"#facc15", emblem:"bird", family:"libertarianism", kind:"movement", sub:[9, 8.5, 8.5, -9, -7, -6],
      ru:{ name:"Либертарианцы", short:"Либертарианцы", tag:"ЛП", slogan:"Меньше государства — больше жизни",
        ideology:"Либертарианство и минимальное государство",
        summary:"Государство ограничено защитой прав и безопасности: низкие налоги, свобода договора, отмена запретов на личный выбор.",
        theses:["Плоский низкий налог и резкое сокращение госрасходов", "Приватизация госкомпаний и отмена лицензирования", "Свобода слова, собраний и личного выбора без разрешений", "Добровольная служба вместо призыва"] },
      en:{ name:"Libertarians", short:"Libertarians", tag:"LP", slogan:"Less state, more life",
        ideology:"Libertarianism and a minimal state",
        summary:"The state is limited to protecting rights and security: low taxes, freedom of contract, no bans on personal choice.",
        theses:["A low flat tax and deep cuts in public spending", "Privatised state companies and no licensing", "Free speech, assembly and personal choice without permits", "Voluntary service instead of conscription"] } },
    { id:"statist", color:"#3f6ddb", emblem:"shield", family:"conservatism", kind:"parliamentary", sub:[2, 3.5, 3, 7.5, 8.5, 8.5],
      ru:{ name:"Консерваторы-государственники", short:"Государственники", tag:"КГ", slogan:"Порядок, суверенитет, преемственность",
        ideology:"Государственный консерватизм",
        summary:"Сильное централизованное государство, традиционные ценности, приоритет стабильности и суверенитета над реформами.",
        theses:["Сильная исполнительная власть и единая вертикаль управления", "Традиционные ценности и государственная культурная политика", "Госкорпорации в стратегических отраслях при сохранении рынка", "Суверенитет и приоритет национальной безопасности"] },
      en:{ name:"State Conservatives", short:"Statists", tag:"SC", slogan:"Order, sovereignty, continuity",
        ideology:"State conservatism",
        summary:"A strong centralised state, traditional values, and stability and sovereignty ahead of reform.",
        theses:["A strong executive and a single chain of command", "Traditional values and a state cultural policy", "State corporations in strategic sectors alongside a market", "Sovereignty and national security first"] } },
    { id:"green", color:"#34d399", emblem:"leaf", family:"green", kind:"movement", sub:[-3, -4, -5.5, -4.5, -3, -2.5],
      ru:{ name:"Зелёная альтернатива", short:"Зелёные", tag:"ЗА", slogan:"Экономика в границах планеты",
        ideology:"Зелёная политика и экосоциальный курс",
        summary:"Климатическая повестка, чистая энергетика и защита природы, дополненные местным самоуправлением и гражданскими свободами.",
        theses:["Налог на выбросы и отказ от угля к 2040 году", "Поддержка возобновляемой энергетики и общественного транспорта", "Охрана лесов, рек и особо охраняемых территорий", "Местные референдумы по крупным проектам"] },
      en:{ name:"Green Alternative", short:"Greens", tag:"GA", slogan:"An economy within planetary limits",
        ideology:"Green politics with an eco-social agenda",
        summary:"A climate agenda, clean energy and protection of nature, combined with local self-government and civil liberties.",
        theses:["A carbon tax and a coal phase-out by 2040", "Backing for renewables and public transport", "Protection of forests, rivers and nature reserves", "Local referendums on major projects"] } },
    { id:"centrist", color:"#9aa7bd", emblem:"scales", family:"centrism", kind:"movement", sub:[1, .5, 0, .5, 1, 0],
      ru:{ name:"Гражданский центр", short:"Центр", tag:"ГЦ", slogan:"Решения вместо крайностей",
        ideology:"Центризм и прагматичный компромисс",
        summary:"Партия без идеологической догмы: смешанная экономика, умеренные реформы и компромисс между разными группами избирателей.",
        theses:["Смешанная экономика: рынок и социальная защита в равной мере", "Постепенные реформы вместо резких поворотов", "Диалог с бизнесом, профсоюзами и регионами", "Решения на основе данных, а не лозунгов"] },
      en:{ name:"Civic Centre", short:"Centre", tag:"CC", slogan:"Solutions, not extremes",
        ideology:"Centrism and pragmatic compromise",
        summary:"A party without ideological dogma: a mixed economy, moderate reform and compromise between different groups of voters.",
        theses:["A mixed economy: market and social protection in equal measure", "Gradual reform instead of sharp turns", "Dialogue with business, unions and regions", "Decisions based on data, not slogans"] } },
    { id:"populist", color:"#fb923c", emblem:"flag", family:"populism", kind:"opposition", sub:[-1, -3.5, 0, 6, 7, 9],
      ru:{ name:"Национал-популисты", short:"Популисты", tag:"НП", slogan:"Власть народу, рабочие места своим",
        ideology:"Национальный популизм и социальный консерватизм",
        summary:"Социальные гарантии и защита внутреннего рынка в сочетании с жёстким порядком, традиционными ценностями и ограничением миграции.",
        theses:["Госгарантии занятости и защита отечественных производителей", "Ограничение трудовой миграции и жёсткий порядок", "Традиционная семья и ценности большинства", "Референдумы по ключевым решениям"] },
      en:{ name:"National Populists", short:"Populists", tag:"NP", slogan:"Power to the people, jobs for our own",
        ideology:"National populism and social conservatism",
        summary:"Social guarantees and a protected home market combined with strict order, traditional values and limits on migration.",
        theses:["State employment guarantees and protection for domestic producers", "Limits on labour migration and strict order", "The traditional family and majority values", "Referendums on key decisions"] } },
    { id:"techno", color:"#a78bfa", emblem:"orbit", family:"technocracy", kind:"movement", sub:[3, 2, 2.5, 2, 5, -2],
      ru:{ name:"Технократическая лига", short:"Технократы", tag:"ТЛ", slogan:"Управление на данных",
        ideology:"Технократия и управление на основе данных",
        summary:"Профессиональное управление, цифровое государство, инженерный подход к экономике и инфраструктуре.",
        theses:["Цифровое государство: все услуги онлайн и открытые данные", "Руководители назначаются по компетенциям, а не по лояльности", "Инвестиции в науку, инфраструктуру и образование", "Оценка законов по результатам и отмена неработающих"] },
      en:{ name:"Technocratic League", short:"Technocrats", tag:"TL", slogan:"Governance by evidence",
        ideology:"Technocracy and evidence-based government",
        summary:"Professional management, a digital state and an engineering approach to the economy and infrastructure.",
        theses:["A digital state: every service online, open data", "Officials appointed for competence, not loyalty", "Investment in science, infrastructure and education", "Laws judged by results and repealed when they fail"] } },
    { id:"radleft", color:"#ef4444", emblem:"star", family:"communism", kind:"opposition", sub:[-9, -9, -8, 2, 4, -1],
      ru:{ name:"Радикальные левые", short:"Левый фронт", tag:"ЛФ", slogan:"Богатство тем, кто его создаёт",
        ideology:"Демократический социализм",
        summary:"Общественная собственность на ключевые отрасли, плановые инвестиции и жёсткий налог на крупные состояния.",
        theses:["Национализация стратегических отраслей и недр", "Прогрессивный налог на роскошь и крупные состояния", "Рабочий контроль на предприятиях", "Государственная гарантия жилья и работы"] },
      en:{ name:"Radical Left", short:"Left Front", tag:"LF", slogan:"Wealth to those who create it",
        ideology:"Democratic socialism",
        summary:"Public ownership of key industries, planned investment and a heavy tax on large fortunes.",
        theses:["Nationalised strategic industries and natural resources", "A progressive tax on luxury and large fortunes", "Workers' control in enterprises", "A state guarantee of housing and work"] } }
  ];
  TEMPLATES.forEach(function(t){
    t.x = Math.round(t.sub.slice(0, 3).reduce(function(a, b){ return a + b; }, 0) / 3 * 10) / 10;
    t.y = Math.round(t.sub.slice(3).reduce(function(a, b){ return a + b; }, 0) / 3 * 10) / 10;
  });
  function find(id){ return TEMPLATES.filter(function(t){ return t.id === id; })[0] || null; }
  function subOf(arr){ var o = {}; PC.SUBAXES.forEach(function(a, i){ o[a.id] = arr[i]; }); return o; }

  /* Голоса «по координатам»: берутся позиции трёх ближайших реальных
     фракций, у которых по этому голосованию есть позиция; расстояние по оси
     самого голосования весит сильнее. Так голоса получаются связными с точкой
     на компасе, а не случайными. */
  function votesFromPosition(x, y){
    var out = {};
    PC.VOTES.forEach(function(v){
      var near = [];
      PC.PARTIES.forEach(function(p){
        var s = PC.voteStance(v, p);
        if(s === "split") s = "abstain";
        if(s !== "for" && s !== "against" && s !== "abstain") return;
        var dx = (p.x - x) * (v.axis === "x" ? 1.5 : .7), dy = (p.y - y) * (v.axis === "y" ? 1.5 : .7);
        near.push({ s:s, d:Math.sqrt(dx * dx + dy * dy) });
      });
      if(near.length < 2) return;
      near.sort(function(a, b){ return a.d - b.d; });
      var score = {};
      near.slice(0, 3).forEach(function(n){ score[n.s] = (score[n.s] || 0) + 1 / (n.d + .75); });
      out[v.id] = Object.keys(score).sort(function(a, b){ return score[b] - score[a] || (a < b ? -1 : 1); })[0];
    });
    return out;
  }

  /* Шаблон → «сырая» партия. Название, девиз и программа на нужном языке. */
  function build(id, lang){
    var t = find(id); if(!t) return null;
    lang = lang || (ru() ? "ru" : "en");
    var o = t[lang === "en" ? "en" : "ru"], sub = subOf(t.sub), pt = M().fromSub(sub);
    return { name:o.name, short:o.short, tag:o.tag, slogan:o.slogan, ideology:o.ideology, summary:o.summary,
      theses:o.theses.slice(), color:t.color, emblem:t.emblem, family:t.family, kind:t.kind, sub:sub,
      votes:votesFromPosition(pt.x, pt.y) };
  }

  /* Копия реальной партии: пользовательская, id u*, реальные данные не трогаются */
  function fromReal(id, lang, copy){
    var real = PC.partyById(id); if(!real) return null;
    lang = lang || (ru() ? "ru" : "en");
    var en = lang === "en" && real.en ? real.en : {}, p = M().normalize(real);
    function f(k){ return en[k] != null ? en[k] : real[k]; }
    p.name = String(f("name")).slice(0, 50) + (copy ? " · " + copy : "");
    p.short = String(f("short")); p.tag = String(f("tag")); p.summary = String(f("summary") || "");
    p.theses = (f("theses") || []).slice(0, 8); p.ideology = String(f("ideology") || ""); p.leader = "";
    p.votes = {};
    PC.VOTES.forEach(function(v){
      var s = PC.voteStance(v, real);
      if(["for", "against", "abstain", "absent"].indexOf(s) !== -1) p.votes[v.id] = s;
    });
    delete p.declared; p.seats = 0; p.inCoalition = false;
    return p;
  }

  /* ---------- случайная партия ---------- */
  function mulberry(seed){
    var a = (seed >>> 0) || 1;
    return function(){
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* Прилагательные записаны тремя родами через «|», чтобы название согласовывалось */
  var FLAVOURS = [
    { c:[-5.5, -1.5], hue:350, tpl:"socdem", emblems:["heart", "grain", "bridge", "star", "flag", "scales"],
      ru:{ adj:["Народный|Народная|Народное", "Трудовой|Трудовая|Трудовое", "Социальный|Социальная|Социальное", "Справедливый|Справедливая|Справедливое", "Общий|Общая|Общее"], gen:["труда", "справедливости", "равенства", "солидарности", "общего блага"] },
      en:{ adj:["Popular", "Labour", "Social", "Fair", "Common"], gen:["Labour", "Fairness", "Equality", "Solidarity", "the Common Good"] } },
    { c:[5.5, -2.5], hue:215, tpl:"liberal", emblems:["arrow", "bolt", "diamond", "anchor", "compass", "mountain"],
      ru:{ adj:["Деловой|Деловая|Деловое", "Свободный|Свободная|Свободное", "Рыночный|Рыночная|Рыночное", "Независимый|Независимая|Независимое", "Передовой|Передовая|Передовое"], gen:["инициативы", "достатка", "успеха", "предпринимателей", "роста"] },
      en:{ adj:["Enterprise", "Free", "Market", "Independent", "Forward"], gen:["Initiative", "Prosperity", "Success", "Enterprise", "Growth"] } },
    { c:[1.5, 6.5], hue:245, tpl:"statist", emblems:["shield", "flag", "mountain", "star", "scales", "anchor"],
      ru:{ adj:["Державный|Державная|Державное", "Национальный|Национальная|Национальное", "Единый|Единая|Единое", "Сильный|Сильная|Сильное", "Государственный|Государственная|Государственное"], gen:["порядка", "державы", "отечества", "стабильности", "единства"] },
      en:{ adj:["Sovereign", "National", "United", "Strong", "Steadfast"], gen:["Order", "the Realm", "the Homeland", "Stability", "Unity"] } },
    { c:[2, -6.5], hue:48, tpl:"libertarian", emblems:["bird", "wave", "spark", "compass", "sun", "arrow"],
      ru:{ adj:["Вольный|Вольная|Вольное", "Гражданский|Гражданская|Гражданское", "Открытый|Открытая|Открытое", "Личный|Личная|Личное", "Прямой|Прямая|Прямое"], gen:["воли", "личности", "выбора", "свободы", "перемен"] },
      en:{ adj:["Free", "Open", "Civic", "Direct", "Personal"], gen:["Liberty", "the Individual", "Choice", "Freedom", "Change"] } },
    { c:[0, 0], hue:195, tpl:"centrist", emblems:["circle", "orbit", "tree", "book", "globe", "bridge", "scales"],
      ru:{ adj:["Гражданский|Гражданская|Гражданское", "Новый|Новая|Новое", "Современный|Современная|Современное", "Общественный|Общественная|Общественное", "Открытый|Открытая|Открытое"], gen:["согласия", "будущего", "страны", "разума", "перемен"] },
      en:{ adj:["Civic", "New", "Modern", "Public", "Open"], gen:["Consensus", "the Future", "the Country", "Reason", "Change"] } },
    { c:[-3.5, -3], hue:150, tpl:"green", emblems:["leaf", "tree", "flower", "grain", "wave", "sun"],
      ru:{ adj:["Зелёный|Зелёная|Зелёное", "Экологический|Экологическая|Экологическое", "Живой|Живая|Живое", "Чистый|Чистая|Чистое", "Устойчивый|Устойчивая|Устойчивое"], gen:["природы", "климата", "будущего", "земли", "устойчивости"] },
      en:{ adj:["Green", "Ecological", "Living", "Clean", "Sustainable"], gen:["Nature", "the Climate", "the Future", "the Earth", "Sustainability"] } }
  ];
  var NOUNS = {
    ru:["союз|m", "фронт|m", "выбор|m", "альянс|m", "курс|m", "путь|m", "форум|m", "инициатива|f", "платформа|f", "альтернатива|f", "коалиция|f", "лига|f", "республика|f", "движение|n", "содружество|n"],
    en:["Union", "Front", "Choice", "Alliance", "Way", "Path", "Forum", "Initiative", "Platform", "Alternative", "Coalition", "League", "Republic", "Movement", "Commonwealth"]
  };
  function hex(h, s, l){
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    var k = function(n){ return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function(n){ var v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return Math.round(v * 255); };
    return "#" + [f(0), f(8), f(4)].map(function(v){ return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }
  function rgb(c){ return [1, 3, 5].map(function(i){ return parseInt(c.slice(i, i + 2), 16); }); }
  function gap(a, b){ var x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); }
  function nearestTemplate(x, y){
    return TEMPLATES.slice().sort(function(a, b){ return Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y); })[0];
  }
  function half(v){ return Math.round(Math.max(-10, Math.min(10, v)) * 2) / 2; }

  /* random(seed, lang) → связная случайная партия. Один и тот же seed даёт ту же
     партию: сначала выбирается «идеологический район», затем под него — позиция,
     название, цвет, эмблема, программа и голоса. */
  function random(seed, lang){
    lang = lang === "en" ? "en" : lang === "ru" ? "ru" : (ru() ? "ru" : "en");
    seed = (seed >>> 0) || 1;
    var r = mulberry(seed), pickOf = function(a){ return a[Math.floor(r() * a.length)]; };
    var fl = FLAVOURS[Math.floor(r() * FLAVOURS.length)];
    function jit(a){ return (r() + r() - 1) * a; }
    var X = Math.max(-9, Math.min(9, fl.c[0] + jit(2.2))), Y = Math.max(-9, Math.min(9, fl.c[1] + jit(2.2)));
    var sub = {};
    PC.SUBAXES.forEach(function(a){ sub[a.id] = half((a.axis === "x" ? X : Y) + jit(1.8)); });
    var pt = M().fromSub(sub), words = fl[lang], nouns = NOUNS[lang], name, form = r();
    var noun = pickOf(nouns), parts = noun.split("|"), gender = parts[1] || "m", n = parts[0];
    if(lang === "ru"){
      var adj = pickOf(words.adj).split("|"), g = pickOf(words.gen);
      var adjF = adj[gender === "f" ? 1 : gender === "n" ? 2 : 0];
      name = form < .4 ? adjF + " " + n : form < .65 ? "Партия " + g : n.charAt(0).toUpperCase() + n.slice(1) + " " + g;
    }else{
      var a2 = pickOf(words.adj), g2 = pickOf(words.gen);
      name = form < .4 ? a2 + " " + n : form < .65 ? "Party of " + g2 : n + " for " + g2;
    }
    name = name.charAt(0).toUpperCase() + name.slice(1);
    var tag = name.split(/\s+/).filter(function(w){ return !/^(of|for|the)$/i.test(w); }).map(function(w){ return w.charAt(0).toUpperCase(); }).join("").slice(0, 4) || name.charAt(0);
    var best = null, bestGap = -1;
    for(var i = 0; i < 6; i++){
      var c = hex(fl.hue + jit(26), 62 + Math.floor(r() * 12), 56 + Math.floor(r() * 10));
      var d = Math.min.apply(null, PC.PARTIES.map(function(p){ return gap(c, p.color); }));
      if(d > bestGap){ bestGap = d; best = c; }
    }
    var base = find(fl.tpl), bo = base[lang], theses = bo.theses.slice(), drop = Math.floor(r() * theses.length);
    theses.splice(drop, 1);
    return { name:name.slice(0, 60), short:name.slice(0, 24), tag:tag, color:best, emblem:pickOf(fl.emblems), family:base.family,
      kind:pickOf(["movement", "movement", "opposition", "parliamentary"]), slogan:bo.slogan, ideology:bo.ideology, summary:bo.summary,
      theses:theses, sub:sub, votes:votesFromPosition(pt.x, pt.y) };
  }

  PC.partyTemplates = { LIST:TEMPLATES, find:find, build:build, fromReal:fromReal, random:random, votesFromPosition:votesFromPosition,
    nearestTemplate:nearestTemplate };
})(window.PC = window.PC || {});
