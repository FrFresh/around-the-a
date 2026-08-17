# Around the A

Around the A is a mobile-first, 8-bit AI literacy adventure set in Atlanta. The first playable stop, Five Points, teaches players that better questions unlock better information.

## First playable vertical slice

The player creates or selects a traveler, rides into Five Points, meets Maya, and asks for help reaching an important Midtown interview. A deterministic evaluator checks the question for goal, context, constraints, and desired output. Demonstrating at least three earns 100 XP, 100 A Points, the Better Questions badge, and the ASK BETTER stamp on the AI Literacy A-Card.

Ponce City Market is revealed only as the next-stop teaser. Its lesson is not implemented.

Progress is persisted locally in the browser using versioned, validated,
player-scoped save envelopes. Existing saves migrate forward, last-known-good
copies support safe recovery, and saves can be exported or imported through the
Game Manager without silently replacing another profile.

Multiple travelers can create independent profiles on one device. Use the traveler control in the header to create, switch, or delete profiles; each profile keeps separate XP, A Points, skills, scenarios, inventory, and passport progress.

The normal player experience is available at `/`. The engine diagnostic remains available separately at `/dev/engine` for development and QA.

## Architecture

```text
docs/                         Constitutional product, learning, architecture, and art systems
src/
  foundation/                 Composition root and manager lifecycle
  player/                     Profiles, sessions, isolated saves, and game adapter
  game-engine/                UI-facing GameManager and reusable composition factories
                              Player-scoped lifecycle, transitions, and progression
  scenario-engine/            Phase 0 ScenarioManager contract and placeholder
  evaluation/                 Replaceable evaluation contract
  rewards/                    Phase 0 RewardManager contract and placeholder
  types/                      Shared domain models and identifiers
  game/                       Engine, progression, player state, shared types
  scenarios/                  Data-driven scenario definitions
  evaluators/                 Swappable response-evaluation interface and rules
  storage/                    Adapters, typed errors, validation, migrations, recovery
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

The default command uses Vinext's local Node runtime so it also works on macOS versions that cannot run Cloudflare's current local Worker emulator. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for preview and production workflows.

## Validate

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Collaboration branches

- `francis/five-points-gameplay`
- `camille/learning-content`
- `sebastian/mobile-qa`

Keep scenarios data-driven and preserve the storage and evaluator interfaces so production persistence or an LLM evaluator can be introduced without rewriting the game screens.
