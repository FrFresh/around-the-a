export type {
  ApplicationSnapshot,
  GameHealthCheck,
  IGameManager,
  SubmissionResult,
} from "./game-manager.interface.ts";
export type { GameSnapshot, PlayerSnapshot } from "./game-snapshot.ts";
export {
  GameOrchestrator,
  type GameOrchestrationResult,
  type GameOrchestratorOptions,
  type PlayerAction,
} from "./game-orchestrator.ts";
export * from "./game-errors.ts";
export type { GameEvent } from "./game-events.ts";
export {
  PLACEHOLDER_NEXT_SCENARIO_ID,
  PLACEHOLDER_SCENARIO_ID,
  placeholderScenario,
} from "./placeholder-scenario.ts";
export { ProgressionEngine } from "./progression-engine.ts";
export {
  transitionScenario,
  type ScenarioTransitionEvent,
} from "./scenario-state-machine.ts";
export { createBrowserGameManager } from "./create-browser-game-manager.ts";
export {
  initializeApplication,
  type ApplicationInitializationError,
  type ApplicationInitializationPhase,
  type ApplicationInitializationResult,
  type ApplicationInitializer,
} from "./application-bootstrap.ts";
export {
  createGameManager,
  type CreateGameManagerOptions,
} from "./create-game-manager.ts";
export { GameManager, type GameManagerDependencies } from "./game-manager.ts";
