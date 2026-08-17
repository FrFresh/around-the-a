export type {
  GameSnapshot,
  IGameManager,
  SubmissionResult,
} from "./game-manager.interface.ts";
export { createBrowserGameManager } from "./create-browser-game-manager.ts";
export {
  createGameManager,
  type CreateGameManagerOptions,
} from "./create-game-manager.ts";
export { GameManager, type GameManagerDependencies } from "./game-manager.ts";
