/* ============ Владимир Путин: единственный человек на поле ============

   Компас до 2.3.2 расставлял только партии — коллективных игроков с
   программой, фракцией и историей голосований. Путин — первое и пока
   единственное исключение: он не голосует фракцией, не участвует в
   выборах как список и с 2012 года формально ни в одной партии не
   состоит, хотя дважды возглавлял список «Единой России» и три года
   был её председателем. Втиснуть такую фигуру в формат PC.PARTIES
   значило бы либо выдумать ему мандаты и голосования, которых нет,
   либо тихо занизить требования формата для всех остальных — поэтому
   у него свой файл, свой узел на компасе (js/compass.js, drawPutin)
   и своя карточка (js/putin.js), а не место в общем списке.

   Координаты и обоснование — как у партий: экспертная оценка по
   документированной практике, а не измерение. Сравнивать here тоже
   можно, только вручную — PC.calc считает соседей внутри PC.PARTIES,
   и звать сюда отдельного «ближайшего человека» незачем ради одной
   точки. ============ */
(function(PC){
  "use strict";

PC.PUTIN = {
  id:"putin",
  name:"Владимир Путин", short:"В. Путин",
  role:"Президент Российской Федерации",
  color:"#c9a24a",
  x:3.0, y:9.4,
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
};

})(window.PC = window.PC || {});
