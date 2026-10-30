# Russian Political Compass

**Make Compass Great Again.**

**Where Russia's parties stand, by their words and by their votes.** An interactive map, parliamentary analytics, landmark Duma votes and a political quiz in one static web app.

[Open the site](https://rupolitcompass.website/en/) · [Русская версия](README.md) · [Changelog (in Russian)](CHANGELOG.md)

**Current version: 5.1 “Narew”** · Russian and English interface · Runs from source with no build step; published as a bundle

![The party compass: actual and stated positions](docs/images/compass.png)

## What you can do

| Section | What it offers |
| --- | --- |
| Compass | Compare 11 parties on economics and state power; see each party's actual and stated position, party and politician cards, and the chamber centre. Run a face-off between two parties: distance, eight scales, agreement by topic and by convocation, and the bills on which their factions split. |
| Analytics | Switch between the 4th and 9th convocations; see how the 450 seats were shared out, how the Duma changed and each party's six sub-axes. |
| Coalitions | Put factions together and see the majority, the centre of gravity and the group's figures. |
| Votes | 44 bills from 2004–2025 and every faction's position, each linked to the Duma's own voting record. Cast your own votes, mark bills as important, see who voted like you and share your answers by link. |
| Quiz | Answer 20, 40 or 90 statements; get coordinates, a breakdown of your answers and a comparison with the parties. |
| About | A short book of twelve chapters and three appendices: the axes, the method, the votes, the quiz, the limits and the version history, with search, a bookmark and printing. |
| Guided tour | A five-step quick start and a twelve-step full tour that run over the live page and pick up where you left off after a reload. |

Six themes plus a system theme, an accent colour, readability and accessibility settings, full keyboard control and a responsive layout, in both languages. After the first visit the published site works offline.

## Data and limits

Party coordinates are expert judgements, not measurements, and not voting advice. The quiz's match percentage is closeness on the map, not a probability of support. Faction positions are the majority of those who voted at the final reading; where fewer than a third of a faction voted, the position is shown as “no data”, not as an abstention. See the [glossary](docs/GLOSSARY.md) for the terms and the [user guide](docs/USER_GUIDE.en.md) for how everything works.

## Run locally

```sh
npm run serve
```

Then open `http://localhost:4173`; add `?lang=en` for English. Tests: `npm test`; browser checks: `npm run test:visual` (needs `npm install --package-lock=false` and `npx playwright install chromium webkit`). The developer documentation is in Russian: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Contributing and licence

Report issues and suggest changes through [Issues](https://github.com/Arbuzyakaby/Russian-Political-Compass/issues). For data changes, please attach a source and your reasoning.

Licensed under [CC BY 4.0](LICENSE). Icons by [Lucide](https://lucide.dev), ISC licence.
