/* ============ Ядро данных: версия, созывы, под-оси, справочные функции ============

   Сами данные партий и голосований до 2.3.1 лежали в этом же файле и
   тянули его почти на тысячу строк — из них девять десятых были одним
   большим литералом, а не логикой. Теперь массивы живут в двух
   соседних файлах, которые ничего не знают друг о друге и не экспортируют
   ничего, кроме своего массива:

     js/data-parties.js — PC.PARTIES, формат описан в шапке того файла;
     js/data-votes.js   — PC.VOTES, формат описан в шапке того файла.

   Здесь остаётся то, что нужно, чтобы прочитать эти два массива: номер
   версии, список созывов, список под-осей и полтора десятка функций,
   которые данные не хранят, а только отвечают на вопросы о них
   («сколько мандатов у партии в этом созыве», «кто ближайший сосед»
   и так далее). Порядок подключения в index.html значения не имеет —
   PC.PARTIES и PC.VOTES читаются внутри функций в момент вызова, а не
   в момент загрузки скрипта. */
(function(PC){
  "use strict";

/* Единственное место, где записан номер версии в коде. Его печатает
   строка приветствия в консоли, им подписан подвал и по нему сверяется
   package.json — раньше номер жил в трёх местах и расходился при каждом
   выпуске. */
var VERSION = "2.3.3";

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
  var list = PC.PARTIES;
  for(var i = 0; i < list.length; i++) if(list[i].id === id) return list[i];
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
  PC.VOTES.forEach(function(v){
    var sa = voteStance(v, a), sb = voteStance(v, b);
    if(sa === "absent" || sb === "absent" || sa === "unknown" || sb === "unknown") return;
    common++;
    if(sa === sb) same++;
  });
  return { same:same, common:common, ratio: common ? same / common : null };
}

PC.VERSION = VERSION;
PC.TOTAL_SEATS = TOTAL_SEATS;
PC.CONVOCATIONS = convocations();
PC.CONVOCATIONS_ALL = CONVOCATIONS;
PC.CURRENT_CONVOCATION = CURRENT_CONVOCATION;
PC.SUBAXES = SUBAXES;
PC.seatsAt = seatsAt;
PC.partyById = partyById;
PC.convocations = convocations;
PC.convsAsc = convsAsc;
PC.voteStance = voteStance;
PC.voteAgreement = voteAgreement;
})(window.PC = window.PC || {});
