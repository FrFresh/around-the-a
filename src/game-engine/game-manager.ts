import type { IEvaluator } from "../evaluation/index.ts";
import { BaseManager } from "../foundation/manager.ts";
import type { GameEngine } from "../game/engine.ts";
import type { PlayerManager } from "../player/index.ts";
import type { IRewardManager } from "../rewards/index.ts";
import type { IScenarioManager } from "../scenario-engine/index.ts";
import type { IStorageManager } from "../storage/storage-manager.interface.ts";
import type {
  PlayerId,
  PlayerImportOptions,
  SaveData,
} from "../types/index.ts";
import type {
  GameSnapshot,
  IGameManager,
  SubmissionResult,
} from "./game-manager.interface.ts";

export interface GameManagerDependencies {
  scenarios: IScenarioManager;
  storage: IStorageManager;
  rewards: IRewardManager;
  evaluator: IEvaluator;
  players?: PlayerManager;
  gameplay?: GameEngine;
  migrateLegacySave?: () => void;
}

export class GameManager extends BaseManager implements IGameManager {
  readonly dependencies: GameManagerDependencies;

  constructor(dependencies: GameManagerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  protected async onInitialize(): Promise<void> {
    this.dependencies.migrateLegacySave?.();
  }

  getSnapshot(): GameSnapshot {
    const { players, gameplay } = this.requirePlayerSystem();
    return {
      players: players.listPlayers(),
      activeSave: players.loadActivePlayer(),
      state: gameplay.load(),
    };
  }

  createPlayer(displayName: string): GameSnapshot {
    const { players } = this.requirePlayerSystem();
    players.createPlayer(displayName);
    return this.getSnapshot();
  }

  loadPlayer(id: PlayerId): SaveData | null {
    return this.requirePlayerSystem().players.loadPlayer(id);
  }

  savePlayer(save: SaveData): GameSnapshot {
    this.requirePlayerSystem().players.savePlayer(save);
    return this.getSnapshot();
  }

  exportPlayer(id: PlayerId): string {
    return this.requirePlayerSystem().players.exportPlayer(id);
  }

  importPlayer(
    serializedSave: string,
    options?: PlayerImportOptions,
  ): GameSnapshot {
    this.requirePlayerSystem().players.importPlayer(serializedSave, options);
    return this.getSnapshot();
  }

  switchPlayer(id: PlayerId): GameSnapshot {
    this.requirePlayerSystem().players.switchPlayer(id);
    return this.getSnapshot();
  }

  deletePlayer(id: PlayerId): GameSnapshot {
    this.requirePlayerSystem().players.deletePlayer(id);
    return this.getSnapshot();
  }

  async submitPlayerResponse(
    scenarioId: string,
    input: string,
  ): Promise<SubmissionResult> {
    const { gameplay } = this.requirePlayerSystem();
    const result = await gameplay.submitPlayerResponse(scenarioId, input);
    return {
      snapshot: this.getSnapshot(),
      evaluation: result.evaluation,
      completed: result.completed,
    };
  }

  private requirePlayerSystem(): {
    players: PlayerManager;
    gameplay: GameEngine;
  } {
    const { players, gameplay } = this.dependencies;
    if (!players || !gameplay) {
      throw new Error("The player system is unavailable in this runtime.");
    }
    return { players, gameplay };
  }
}
