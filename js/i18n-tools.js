/* ============ Словарь: инструменты 4.3 ============
   «Дуэль партий» (duel.*), «Голосую сам» (sv.*) и работа без сети
   (offline.*). Формат — как в остальных файлах словаря, см. шапку
   js/i18n.js. ============ */
(function(PC){
  "use strict";
  PC.i18nDict = PC.i18nDict || {};
  Object.assign(PC.i18nDict, {
    /* ===== дуэль партий ===== */
    "duel.title":     ["Дуэль партий", "Party face-off"],
    "duel.type":      ["Инструмент", "Tool"],
    "duel.open":      ["Дуэль двух партий", "Compare two parties"],
    "duel.more":      ["Подробная дуэль", "Full face-off"],
    "duel.close":     ["Закрыть дуэль", "Close the face-off"],
    "duel.first":     ["Первая партия", "First party"],
    "duel.second":    ["Вторая партия", "Second party"],
    "duel.swap":      ["Поменять местами", "Swap sides"],
    "duel.same":      ["Выберите две разные партии — с самой собой партия совпадает во всём.",
                       "Pick two different parties: a party always agrees with itself."],
    "duel.mapAria":   ["Мини-карта: {a} и {b}, расстояние {d}", "Mini map: {a} and {b}, {d} apart"],
    "duel.v.near":    ["Почти соседи: позиции на компасе рядом", "Close neighbours: their positions nearly overlap"],
    "duel.v.close":   ["Недалеко друг от друга", "Not far apart"],
    "duel.v.apart":   ["Заметно расходятся", "Clearly apart"],
    "duel.v.opposite":["Почти противоположности", "Nearly opposite"],
    "duel.distance":  ["— расстояние на компасе (самое большое возможное — {max})",
                       "— distance on the compass (the largest possible is {max})"],
    "duel.biggest":   ["Сильнее всего расходятся по шкале «{axis}»: на {d}",
                       "The widest gap is on “{axis}”: {d} points"],
    "duel.declared":  ["заявленная позиция", "stated position"],
    "duel.axes":      ["Шкалы", "Scales"],
    "duel.votes":     ["Голосования фракций", "How their factions voted"],
    "duel.agree":     ["совпадений: {k} из {n} общих голосований", "agreement: {k} of {n} votes they both took part in"],
    "duel.noCommon":  ["Общих голосований нет: фракции не заседали в Думе одновременно или по ним нет данных.",
                       "No shared votes: the two factions never sat in the Duma at the same time, or there is no record."],
    "duel.differ":    ["Голосования, в которых фракции разошлись: {n}", "Votes where the factions differed: {n}"],
    "duel.allSame":   ["Во всех общих голосованиях фракции заняли одну позицию.",
                       "In every vote they shared, the two factions took the same side."],

    /* ===== голосую сам ===== */
    "sv.h":           ["Проголосуйте сами", "Cast your own votes"],
    "sv.p":           ["Те же законопроекты, что у фракций. Отвечайте «за», «против» или «воздержусь» — и смотрите, чья фракция голосовала как вы.",
                       "The same bills the factions voted on. Answer for, against or abstain, and see which faction voted the way you would."],
    "sv.count":       ["Отвечено: {k} из {n}", "Answered: {k} of {n}"],
    "sv.of":          ["Законопроект {k} из {n}", "Bill {k} of {n}"],
    "sv.choose":      ["Ваш голос", "Your vote"],
    "sv.for":         ["За", "For"],
    "sv.against":     ["Против", "Against"],
    "sv.abstain":     ["Воздержусь", "Abstain"],
    "sv.prev":        ["Назад", "Back"],
    "sv.skip":        ["Пропустить", "Skip"],
    "sv.done":        ["Готово: вы проголосовали по всем {n} законопроектам. Ответы можно поменять в любой момент.",
                       "Done: you have voted on all {n} bills. You can change any answer at any time."],
    "sv.review":      ["Пересмотреть ответы", "Review my answers"],
    "sv.finished":    ["Все законопроекты пройдены — рейтинг фракций рядом", "All bills done: the faction ranking is ready"],
    "sv.empty":       ["Ответьте хотя бы на один законопроект — здесь появится рейтинг фракций по совпадению с вами.",
                       "Answer at least one bill and a ranking of factions by agreement with you will appear here."],
    "sv.noCommon":    ["По отвеченным законопроектам нет известных позиций фракций. Ответьте ещё на несколько.",
                       "None of the bills you answered has a recorded faction position. Try a few more."],
    "sv.closest":     ["Ближе всех к вам — {party}: {p}% совпадений", "Closest to you: {party}, with {p}% agreement"],
    "sv.thin":        ["Бледные строки — меньше четырёх общих голосований: процент пока неустойчив.",
                       "Faded rows share fewer than four votes with you, so the percentage is still shaky."],
    "sv.reset":       ["Начать заново", "Start over"],
    "sv.cleared":     ["Ваши голоса стёрты", "Your votes have been cleared"],

    /* ===== работа без сети ===== */
    "offline.ready":  ["Сайт сохранён и откроется даже без интернета", "The site is saved and will open even without a connection"],
    "offline.update": ["Доступна новая версия сайта", "A new version of the site is available"],
    "offline.reload": ["Обновить", "Reload"]
  });
})(window.PC = window.PC || {});
