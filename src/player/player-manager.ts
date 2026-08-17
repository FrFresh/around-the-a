import type {
  Player,
  PlayerId,
  PlayerImportOptions,
  PlayerProgress,
  SaveData,
  ScenarioId,
  SkillId,
} from "../types/index.ts";
import type { PlayerStorage } from "./player-storage.interface.ts";

export interface PlayerManagerOptions {
  createId?: () => string;
  createSessionId?: () => string;
  now?: () => string;
}

export class PlayerManager {
  private readonly storage: PlayerStorage;
  private readonly createId: () => string;
  private readonly createSessionId: () => string;
  private readonly now: () => string;

  constructor(storage: PlayerStorage, options: PlayerManagerOptions = {}) {
    this.storage = storage;
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.createSessionId =
      options.createSessionId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  listPlayers(): Player[] {
    return this.storage.listPlayers();
  }

  createPlayer(displayName: string): SaveData {
    const name = displayName.trim();
    if (!name) throw new Error("Display name is required.");
    const id = this.createId() as PlayerId;
    if (this.storage.readPlayer(id)) {
      throw new Error("Generated player ID already exists.");
    }
    const timestamp = this.now();
    const player: Player = { id, displayName: name, createdAt: timestamp };
    const save = this.createFreshSave(player, timestamp);
    this.storage.writePlayer(save);
    this.storage.setActivePlayerId(id);
    return structuredClone(save);
  }

  loadPlayer(id: PlayerId): SaveData | null {
    return this.storage.readPlayer(id);
  }

  loadActivePlayer(): SaveData | null {
    const id = this.storage.getActivePlayerId();
    return id ? this.storage.readPlayer(id) : null;
  }

  switchPlayer(id: PlayerId): SaveData {
    const save = this.storage.readPlayer(id);
    if (!save) throw new Error(`Player not found: ${id}`);
    const updated = {
      ...save,
      session: { ...save.session, updatedAt: this.now() },
    };
    this.storage.writePlayer(updated);
    this.storage.setActivePlayerId(id);
    return structuredClone(updated);
  }

  savePlayer(save: SaveData): SaveData {
    this.assertMatchingPlayerIds(save);
    if (!this.storage.readPlayer(save.player.id)) {
      throw new Error(`Player not found: ${save.player.id}`);
    }
    const updated: SaveData = {
      ...structuredClone(save),
      progress: { ...save.progress, updatedAt: this.now() },
      session: { ...save.session, updatedAt: this.now() },
    };
    this.storage.writePlayer(updated);
    return structuredClone(updated);
  }

  exportPlayer(id: PlayerId): string {
    return this.storage.exportPlayer(id);
  }

  importPlayer(
    serializedSave: string,
    options: PlayerImportOptions = {},
  ): SaveData {
    const save = this.storage.importPlayer(serializedSave, options);
    if (options.activate !== false) {
      this.storage.setActivePlayerId(save.player.id);
    }
    return structuredClone(save);
  }

  deletePlayer(id: PlayerId): SaveData | null {
    this.storage.deletePlayer(id);
    return this.loadActivePlayer();
  }

  resetPlayerProgress(id: PlayerId): SaveData {
    const existing = this.storage.readPlayer(id);
    if (!existing) throw new Error(`Player not found: ${id}`);
    const reset = this.createFreshSave(existing.player, this.now());
    this.storage.writePlayer(reset);
    this.storage.setActivePlayerId(id);
    return structuredClone(reset);
  }

  private createFreshSave(player: Player, timestamp: string): SaveData {
    return {
      player,
      progress: this.createProgress(player.id, timestamp),
      session: {
        id: this.createSessionId(),
        playerId: player.id,
        status: "not_started",
        currentScenarioId: null,
        currentStageId: null,
        startedAt: null,
        updatedAt: timestamp,
      },
    };
  }

  private createProgress(id: PlayerId, timestamp: string): PlayerProgress {
    const firstScenario = "five-points-prompting" as ScenarioId;
    return {
      playerId: id,
      currentScenarioId: null,
      completedScenarioIds: [],
      unlockedScenarioIds: [firstScenario],
      xp: 0,
      aPoints: 0,
      unlockedSkillIds: [],
      skillLevels: {} as Partial<Record<SkillId, number>>,
      inventory: { items: [] },
      passport: { earnedBadgeIds: [], unlockedSkillIds: [] },
      scenarioAttempts: {},
      scenarioStates: {},
      updatedAt: timestamp,
    };
  }

  private assertMatchingPlayerIds(save: SaveData): void {
    const id = save.player.id;
    if (save.progress.playerId !== id || save.session.playerId !== id) {
      throw new Error("Save data contains mismatched player IDs.");
    }
  }
}
