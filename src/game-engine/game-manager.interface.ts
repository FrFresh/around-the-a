import type { InitializableManager } from "../foundation/manager.ts";
import type { PlayerState } from "../game/player-state.ts";
import type { EvaluationResult } from "../game/types.ts";
import type {
  Player,
  PlayerId,
  PlayerImportOptions,
  SaveData,
} from "../types/index.ts";

export interface GameSnapshot {
  players: Player[];
  activeSave: SaveData | null;
  state: PlayerState;
}

export interface SubmissionResult {
  snapshot: GameSnapshot;
  evaluation: EvaluationResult;
  completed: boolean;
}

export interface IGameManager extends InitializableManager {
  getSnapshot(): GameSnapshot;
  createPlayer(displayName: string): GameSnapshot;
  loadPlayer(id: PlayerId): SaveData | null;
  savePlayer(save: SaveData): GameSnapshot;
  exportPlayer(id: PlayerId): string;
  importPlayer(
    serializedSave: string,
    options?: PlayerImportOptions,
  ): GameSnapshot;
  switchPlayer(id: PlayerId): GameSnapshot;
  deletePlayer(id: PlayerId): GameSnapshot;
  submitPlayerResponse(
    scenarioId: string,
    input: string,
  ): Promise<SubmissionResult>;
}
