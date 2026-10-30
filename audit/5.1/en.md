# Аудит английских строк

Создан `node scripts/i18n-audit.cjs`. Строк словаря: 1215, партий: 11, голосований: 44.

| Признак | Число |
| --- | --- |
| кириллица в английском | 0 |
| пусто | 0 |
| совпадает с русским | 1 |
| длиннее русского на 40%+ | 33 |

## Строки с признаками

| Где | Признаки | Русский | Английский |
| --- | --- | --- | --- |
| `ex.noCompass` | длинно | Компас ещё не отрисован | The compass has not been drawn yet |
| `csv.id` | =ru | id | id |
| `csv.claimNote` | длинно | Откуда разрыв | Where the gap comes from |
| `ab.aq.res.h` | длинно | Раздел прочитан | The section has been read |
| `ab.aq.res.mid` | длинно | Основное на месте, но кое-что стоит перечитать | The main points are there, but a few things are worth a second look |
| `ab.aq.res.low` | длинно | Похоже, раздел ещё не читан | It looks as though the section has not been read yet |
| `ab.aq.progress` | длинно | Ход теста по разделу | Progress through the section quiz |
| `bk.eyebrow` | длинно | Книга о проекте | The book of the project |
| `bk.search.none` | длинно | В книге этого нет | Nothing in the book matches |
| `bk.axes.d` | длинно | Почему осей две и что значат числа | Why there are two axes and what the numbers mean |
| `bk.duel.t` | длинно | Дуэль и «Голосую сам» | Face-off and Cast your own votes |
| `bk.history.t` | длинно | История проекта | History of the project |
| `co.opp` | длинно | Остальная палата | The rest of the chamber |
| `co.oppD` | длинно | {n} фракций вне коалиции, их центр {v} | {n} factions outside the coalition, their centre at {v} |
| `co.oppD.none` | длинно | в коалиции вся палата | the coalition is the whole chamber |
| `ch.hemi.h` | длинно | Состав палаты | Composition of the chamber |
| `ft.fig.parties` | длинно | Партий на поле | Parties on the compass |
| `ft.l.about` | длинно | О проекте и методике | About the project and its method |
| `wel.quiz` | длинно | Сразу к тесту | Straight to the quiz |
| `egg.grave.tip` | длинно | Здесь покоится Horse Update. Плита накрыта вышиванкой — так теплее | Here lies the Horse Update. The slab is covered with an embroidered cloth — it is warmer that way |
| `w.econ.left` | длинно | умеренно левые | moderately left-wing |
| `res.completion` | длинно | {n} из {all} ответов | {n} of {all} questions answered |
| `guide.palette.h` | длинно | Поиск и палитра | Search and the palette |
| `guide.book.h` | длинно | Книга о проекте | The book of the project |
| `set.store.h` | длинно | Что лежит в браузере | What is stored in your browser |
| `set.transparent` | длинно | Прозрачный фон | Transparent background |
| `sv.cleared` | длинно | Ваши голоса стёрты | Your votes have been cleared |
| `offline.update` | длинно | Доступна новая версия сайта | A new version of the site is available |
| `votes.benefits-2004.title` | длинно | Монетизация льгот (ФЗ-122) | Monetisation of social benefits (Law 122-FZ) |
| `votes.term-2008.title` | длинно | Продление сроков президента и Думы | Extending the terms of the president and the Duma |
| `votes.yarovaya-2016.title` | длинно | «Пакет Яровой» | The “Yarovaya package” |
| `votes.torture-2021.title` | длинно | Парламентское расследование пыток в ФСИН | A parliamentary inquiry into torture in the prison service |
| `votes.dnr-2022.title` | длинно | Признание ДНР и ЛНР | Recognition of the DPR and LPR |
| `votes.gender-2023.title` | длинно | Запрет смены пола | Ban on gender reassignment |
