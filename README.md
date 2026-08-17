# Around the A

Around the A is a mobile-first, 8-bit AI literacy adventure set in Atlanta. The first playable stop, Five Points, teaches players that better questions unlock better information.

## First playable flow

The player arrives at Five Points, asks a weak transit question, receives a vague clue, and revises the question using four fundamentals: goal, context, constraints, and desired output. Demonstrating at least three—including the first three required dimensions—earns 100 XP, 100 A Points, the Better Questions badge, and unlocks Ponce City Market.

Progress is persisted locally in the browser.

## Architecture

```text
docs/                         Product and learning framework
src/
  game/                       Engine, progression, player state, shared types
  scenarios/                  Data-driven scenario definitions
  evaluators/                 Swappable response-evaluation interface and rules
  storage/                    Persistence interface and localStorage adapter
  components/                 Reusable game UI
  data/                       Locations and literacy skills
app/                          Mobile-first application shell and styles
public/pixel-assets/          Original game-art asset surface
tests/                        Progression and reward tests
```

The UI never awards rewards or unlocks stops directly. It submits player input to the game engine and renders the resulting evaluation and player state.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Validate

```bash
npm test
npm run build
```

## Collaboration branches

- `francis/five-points-gameplay`
- `camille/learning-content`
- `sebastian/mobile-qa`

Keep scenarios data-driven and preserve the storage and evaluator interfaces so production persistence or an LLM evaluator can be introduced without rewriting the game screens.
