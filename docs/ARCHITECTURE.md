# Around the A — ARCHITECTURE

## Core Systems

- Player Manager
- Game Engine
- Scenario Engine
- Evaluation Engine
- Reward Engine
- Storage Service

## Player Flow

Player → Player Profile → Player Progress → Scenario → Evaluation → Rewards → Save Progress

## Data Models

- Player
- PlayerProgress
- Scenario
- ScenarioState
- EvaluationResult
- Badge
- Skill
- Reward

## Persistence

- Every player has a unique player ID.
- Progress is stored independently.
- No global progress state.
- Browser storage is wrapped behind a storage interface.
- Future migration to Supabase must require no game-logic changes.

## Scenario Flow

Arrival → Dialogue → Challenge → Evaluation → Feedback → Reward → Reflection → Unlock Next Scenario

## Engineering Principles

- Data-driven scenarios
- Modular components
- Reusable engines
- No duplicated business logic
- UI never mutates player state directly

## Phase 0 Module Map

```text
src/
  foundation/       Composition root and shared manager lifecycle
  game-engine/      GameManager application boundary and composition factories
  scenario-engine/  ScenarioManager contract and placeholder implementation
  storage/          StorageManager contract and placeholder adapter boundary
  evaluation/       Evaluator contract only; rules begin in Phase 5
  rewards/          RewardManager contract and placeholder implementation
  types/            Shared domain models and identifiers
```

## Dependency Rules

1. Domain types do not import managers, UI, framework, or infrastructure.
2. Manager interfaces depend only on domain types and shared lifecycle contracts.
3. Manager implementations may depend on interfaces, never concrete peer managers.
4. The composition root is the only module that constructs the manager graph.
5. React components consume initialized services; they do not mutate domain state.
6. Storage and evaluation providers remain replaceable at their interfaces.

## Phase Boundary

Phase 0 defines and initializes contracts. It does not implement player profiles, persistence, game orchestration, scenario transitions, evaluation rules, or reward calculations. Those behaviors remain TODOs for their roadmap phases.

The pre-existing Five Points prototype remains operational during the foundation refactor. It is not expanded as part of Phase 0 and will be migrated onto these contracts in its designated roadmap phase.

## Player Save System

Player persistence is device-local and divided into explicit layers:

- `PlayerManager` owns profile creation, loading, saving, switching, and deletion.
- `PlayerStorage` defines the replaceable persistence boundary.
- `StorageService` is the only production contract permitted to access browser persistence.
- `BrowserStorageService` is the only production class that touches `window.localStorage`.
- `StorageManager` owns the replaceable `StorageService` adapter used by game systems.
- `PlayerSaveRepository` stores a small player directory and one isolated save record per player ID through `StorageService`.
- `PlayerGameStorage` adapts the active player's save to the existing game-engine storage contract.
- `GameManager` is the UI-facing boundary for all profile and progress operations.
- `createGameManager` is the reusable composition factory; the browser factory supplies browser storage.

The directory key contains only the active player ID and known player IDs. Complete saves use ID-scoped keys, so saving one profile never writes another profile's record. Every save validates that `Player`, `PlayerProgress`, and `PlayerSession` contain the same player ID before persistence.

No mutable progress singleton exists. The active player ID is a persisted selection; all progress remains inside that player's `SaveData` record.

React may render a `GameSnapshot`, but it cannot construct storage/player services or invoke them directly. Components emit intent to `GameManager`, which coordinates persistence and returns the next immutable snapshot.

On first launch of the profile system, an existing anonymous prototype save is migrated once into an `ATL Explorer` profile and the obsolete single-save key is removed.

## Phase 2 Persistence Hardening

The game uses two distinct save representations:

- `PlayerSaveData` is validated domain data used by `PlayerManager`, `GameManager`, and gameplay adapters.
- `PlayerSaveEnvelope` is the persistence and transfer format. It contains `schemaVersion`, `playerId`, `savedAt`, and `data`.

The current persisted schema is version 4. Phase 1's top-level version 1 shape remains readable and migrates forward through the registry in `src/storage/migrations`. A schema change must add one ordered migration to that registry and advance `CURRENT_PLAYER_SAVE_SCHEMA_VERSION`; feature modules must never implement migrations themselves. Successfully migrated saves are immediately rewritten in the current format.

### Read lifecycle

```text
ID-scoped key
  → adapter JSON decoding
  → ordered migration
  → envelope validation
  → nested ID validation
  → cloned PlayerSaveData
  → PlayerManager / GameManager
```

Malformed JSON, unsupported versions, invalid domain fields, or mismatched IDs cannot cross the repository boundary. Storage failures use typed `StorageError` subclasses/codes so a future UI or telemetry provider can respond without parsing error messages.

### Recovery

Before replacing an existing valid player save, `PlayerSaveRepository` stores that envelope at an ID-scoped backup key. If the primary cannot be decoded, migrated, or validated, the repository validates the backup, restores it as the primary, and returns the recovered data. If both copies fail, it throws `StorageRecoveryError`; it never substitutes an empty save. The player directory uses the same last-known-good strategy.

Recovery is intentionally conservative: it can lose changes made after the last successful backup, but it cannot merge untrusted data into game state. This is local redundancy, not a substitute for cloud backup.

### Export and import

Exports are serialized current-version envelopes. Imports pass through the same migration and validation pipeline as normal reads. The imported envelope determines its player ID; callers cannot redirect it into a different player's key. If that ID already exists, the default behavior is `StorageImportConflictError`. Replacement occurs only when a caller explicitly passes `{ overwrite: true }`.

`GameManager` remains the application boundary for export/import. React does not call storage or player repositories directly.

### Backend migration seam

`StorageService` remains a small synchronous key/value contract. Browser persistence is implemented only by `BrowserStorageService`; no other production module accesses `window.localStorage`. A future Supabase adapter can implement the same contract initially, or the interface can become asynchronous in one coordinated infrastructure migration. Save envelopes, validation, migrations, conflict behavior, and player isolation remain repository concerns and do not depend on the browser API.

## Phase 3 Game Lifecycle

```text
Player
  ↓
GameSession
  ↓
Scenario
  ↓
Stage
  ↓
PlayerAction
  ↓
Transition
  ↓
Progression / Reward
  ↓
PlayerManager save
  ↓
GameSnapshot
```

### Responsibilities

`GameManager` is the public application boundary. It accepts lifecycle intent, delegates to `GameOrchestrator`, and returns player-only `GameSnapshot` projections. It does not expose the orchestrator, transition state, repositories, or mutable save records to React.

`GameOrchestrator` coordinates start, resume, pause, scenario loading, actions, stage completion, scenario completion, domain events, and persistence checkpoints. It never accesses browser storage directly; every checkpoint passes through `PlayerManager` and the Phase 2 repository.

The pre-existing prototype uses `ApplicationSnapshot` and its legacy gameplay adapter until its later migration phase. This compatibility surface does not control Phase 3 progression.

### Session and player isolation

Schema version 3 evolves the previous activity session into `GameSession`. Each session contains its own ID and player ID plus lifecycle status, current scenario, current stage, and timestamps. Scenario states also contain their owning player ID. Version 2 saves migrate forward with a `not_started` player-owned session and an empty scenario-state collection.

Every orchestration command begins by loading the explicitly requested player. Actions carry the expected session and scenario IDs; mismatches throw `ScenarioOwnershipError` before any save occurs. Switching the selected profile does not move or share sessions because sessions live inside each ID-scoped save.

### Scenario state machine

The reusable stage vocabulary is:

```text
LOCKED → AVAILABLE → INTRO → ENCOUNTER → CHALLENGE
       → FEEDBACK → REFLECTION → COMPLETE
```

Individual scenario definitions declare an ordered subset of those stages. `transitionScenario` is the only mechanism that starts, advances, or completes a scenario state. It rejects locked starts, skipped stages, completion before the final `complete` stage, ownership mismatches, and replay of completed state.

Phase 3 includes exactly one deliberately generic engine fixture using `intro → challenge → feedback → complete`. It contains no Atlanta or educational scenario content and will be replaced during later scenario work.

### Data-driven progression

`ProgressionEngine` reads declarative `Scenario` metadata:

- prerequisite scenario IDs
- ordered stage IDs
- next scenario IDs
- completion reward metadata

Unlock checks, available-scenario queries, next-scenario lookup, completion marking, and reward application are centralized there. UI code contains no scenario-ID condition chains.

### Reward idempotency

A completed scenario ID is the idempotency key for its completion reward. The engine records completion, XP, A Points, badges, and next unlocks in one state change. A second completion attempt throws `ScenarioAlreadyCompletedError` before values can change. Badge arrays are deduplicated as an additional safeguard. This is orchestration only; the complete A-Card and reward-redemption system remains Phase 8 work.

### Autosave and events

The engine creates lightweight typed events such as `GameStarted`, `StageCompleted`, `ScenarioCompleted`, `RewardGranted`, and `ScenarioUnlocked`. They describe one domain operation without introducing an event bus.

One atomic primary save checkpoint occurs after each successful meaningful command:

- game start, pause, or resume
- scenario start or restore
- stage transition
- scenario completion, reward, and unlock transaction

Rejected transitions never save. React renders returned snapshots and never writes progression directly.

## Phase 4 Scenario Engine

Phase 4 replaces the generic ordered-stage fixture with an authored, data-driven scenario graph. It does not add the Five Points lesson or any Atlanta dialogue.

```text
Player intent
  → GameManager
  → GameOrchestrator
  → ScenarioEngine
  → ScenarioRegistry / ScenarioDefinition
  → EvaluatorRegistry (challenge stages only)
  → ScenarioTransitionResult
  → GameOrchestrator save / reward / unlock
  → GameSnapshot
```

### Authored content and registries

`ScenarioDefinition` is the content contract. A definition declares identity and version, location metadata, literacy skill, prerequisites, a start stage, typed stage data, rewards, and next-scenario IDs. The reusable stage union includes `intro`, `dialogue`, `challenge`, `feedback`, `reflection`, `reward`, and `complete`.

`ScenarioRegistry` owns registration, immutable retrieval, and graph validation. It rejects duplicate stage IDs, missing start or completion stages, broken stage references, unavailable evaluator IDs, malformed rewards/prerequisites, unreachable completion, and circular forward transitions. Explicit challenge retry edges are the only permitted loop.

`EvaluatorRegistry` resolves evaluator IDs declared by challenge content. Evaluators receive unknown player input plus a narrow evaluation context and return one standardized `EvaluationResult`. Phase 4 registers only a deterministic neutral evaluator. A later evaluation phase may provide a different adapter without changing scenario definitions.

### Runtime responsibilities

`ScenarioEngine` owns behavior inside a scenario:

- resolve the current authored stage
- validate stage-specific actions
- evaluate challenge attempts
- select authored hints by attempt number
- route success, feedback, retry, reflection, reward, and completion stages
- produce the current render-only content projection

`GameOrchestrator` continues to own player/session checks, autosave checkpoints, domain events, scenario completion, reward idempotency, and unlocks. A `reward` stage declares and previews content; it cannot mutate XP, A Points, badges, or progression. Rewards are applied only when the orchestrator completes the terminal `complete` stage.

React continues to call only `GameManager`. `GameSnapshot` now exposes the current scenario's safe content metadata and current stage data alongside player-owned state. It does not expose registries, evaluators, the full scenario graph, repositories, or mutable engine services.

### Retry persistence and privacy

Schema version 4 adds player-scoped retry state to each `ScenarioState`: total and per-stage attempt counts, the latest standardized evaluation, the currently available authored hint, and optional reflection responses. Version 3 saves migrate forward centrally with empty retry state.

Raw challenge inputs are deliberately not persisted. Only state required to render and resume the retry flow is saved. All scenario state remains nested under one player's ID-scoped save, so switching profiles or refreshing restores the exact stage and attempts without exposing or mutating another player's progress.

### Phase boundary

The Phase 4 fixture is neutral engine test data. Rule-based AI-literacy evaluation, the Five Points lesson, Atlanta NPC dialogue, world maps, movement, animation, and remote/LLM evaluation remain future work.
