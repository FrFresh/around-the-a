import type { InitializableManager } from "../foundation/manager.ts";
import type { PlayerState } from "../game/player-state.ts";
import type { EvaluationResult } from "../game/types.ts";
import type {
  Player,
  PlayerId,
  PlayerImportOptions,
  SaveData,
  ScenarioId,
} from "../types/index.ts";
import type { PlayerAction } from "./game-orchestrator.ts";
import type { GameSnapshot } from "./game-snapshot.ts";

/** Compatibility snapshot for the existing prototype application shell. */
export interface ApplicationSnapshot {
  players: Player[];
  activeSave: SaveData | null;
  state: PlayerState;
}

export interface SubmissionResult {
  snapshot: ApplicationSnapshot;
  evaluation: EvaluationResult;
  completed: boolean;
}

export interface GameHealthCheck {
  status: "ok" | "error";
  applicationBootSucceeded: boolean;
  gameManagerInitialized: boolean;
  storageAdapterAvailable: boolean;
  scenarioRegistryValid: boolean;
  registeredScenarioCount: number;
  saveSchemaVersion: number;
}

export interface IGameManager extends InitializableManager {
  getSnapshot(): ApplicationSnapshot;
  getGameSnapshot(playerId: PlayerId): GameSnapshot;
  startGame(playerId: PlayerId): GameSnapshot;
  resumeGame(playerId: PlayerId): GameSnapshot;
  pauseGame(playerId: PlayerId): GameSnapshot;
  loadScenario(playerId: PlayerId, scenarioId: ScenarioId): GameSnapshot;
  submitAction(playerId: PlayerId, action: PlayerAction): GameSnapshot;
  completeStage(playerId: PlayerId): GameSnapshot;
  completeScenario(playerId: PlayerId): GameSnapshot;
  getHealthCheck(): GameHealthCheck;
  createPlayer(displayName: string): ApplicationSnapshot;
  loadPlayer(id: PlayerId): SaveData | null;
  savePlayer(save: SaveData): ApplicationSnapshot;
  exportPlayer(id: PlayerId): string;
  importPlayer(
    serializedSave: string,
    options?: PlayerImportOptions,
  ): ApplicationSnapshot;
  switchPlayer(id: PlayerId): ApplicationSnapshot;
  deletePlayer(id: PlayerId): ApplicationSnapshot;
  resetPlayerProgress(id: PlayerId): ApplicationSnapshot;
  submitPlayerResponse(
    scenarioId: string,
    input: string,
  ): Promise<SubmissionResult>;
}
