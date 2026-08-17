import type { StorageService } from "../storage/storage-service.interface.ts";
import {
  createPlayerSaveEnvelope,
  migratePlayerSave,
} from "../storage/migrations/index.ts";
import {
  StorageError,
  StorageImportConflictError,
  StorageRecoveryError,
  StorageValidationError,
} from "../storage/storage-errors.ts";
import type {
  Player,
  PlayerId,
  PlayerImportOptions,
  PlayerSaveEnvelope,
  SaveData,
} from "../types/index.ts";
import type { PlayerStorage } from "./player-storage.interface.ts";

const DIRECTORY_KEY = "around-the-a:players:v1";
const DIRECTORY_BACKUP_KEY = `${DIRECTORY_KEY}:backup`;
const PLAYER_KEY_PREFIX = "around-the-a:player:v1:";
const BACKUP_SUFFIX = ":backup";

interface PlayerDirectory {
  activePlayerId: PlayerId | null;
  playerIds: PlayerId[];
}

const emptyDirectory = (): PlayerDirectory => ({
  activePlayerId: null,
  playerIds: [],
});

export class PlayerSaveRepository implements PlayerStorage {
  private readonly storage: StorageService;
  private readonly now: () => string;

  constructor(storage: StorageService, options: { now?: () => string } = {}) {
    this.storage = storage;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  listPlayers(): Player[] {
    return this.readDirectory().playerIds.flatMap((id) => {
      const save = this.readPlayer(id);
      return save ? [save.player] : [];
    });
  }

  readPlayer(id: PlayerId): SaveData | null {
    const envelope = this.readPlayerEnvelope(id);
    return envelope ? structuredClone(envelope.data) : null;
  }

  writePlayer(save: SaveData): void {
    const id = save.player.id;
    const envelope = createPlayerSaveEnvelope(save, this.now());
    const key = this.playerKey(id);
    this.backUpValidPlayerSave(key, id);
    this.storage.write(key, envelope);
    const directory = this.readDirectory();
    if (!directory.playerIds.includes(id)) {
      this.writeDirectory({
        ...directory,
        playerIds: [...directory.playerIds, id],
      });
    }
  }

  exportPlayer(id: PlayerId): string {
    const envelope = this.readPlayerEnvelope(id);
    if (!envelope) throw new StorageValidationError(`Player not found: ${id}`);
    try {
      return JSON.stringify(envelope);
    } catch (cause) {
      throw new StorageError(
        "STORAGE_SERIALIZATION_FAILED",
        `Unable to export player ${id}.`,
        { key: this.playerKey(id), cause },
      );
    }
  }

  importPlayer(
    serializedSave: string,
    options: PlayerImportOptions = {},
  ): SaveData {
    let raw: unknown;
    try {
      raw = JSON.parse(serializedSave) as unknown;
    } catch (cause) {
      throw new StorageError(
        "STORAGE_SERIALIZATION_FAILED",
        "Imported player save is not valid JSON.",
        { cause },
      );
    }

    const { envelope } = migratePlayerSave(raw);
    const id = envelope.playerId;
    if (this.readPlayer(id) && !options.overwrite) {
      throw new StorageImportConflictError(
        `A save already exists for player ${id}. Import was not applied.`,
        { key: this.playerKey(id) },
      );
    }
    this.writePlayer(envelope.data);
    return structuredClone(envelope.data);
  }

  deletePlayer(id: PlayerId): void {
    this.storage.remove(this.playerKey(id));
    this.storage.remove(this.backupKey(this.playerKey(id)));
    const directory = this.readDirectory();
    const playerIds = directory.playerIds.filter((playerId) => playerId !== id);
    this.writeDirectory({
      playerIds,
      activePlayerId:
        directory.activePlayerId === id
          ? (playerIds[0] ?? null)
          : directory.activePlayerId,
    });
  }

  getActivePlayerId(): PlayerId | null {
    return this.readDirectory().activePlayerId;
  }

  setActivePlayerId(id: PlayerId | null): void {
    const directory = this.readDirectory();
    if (id !== null && !directory.playerIds.includes(id)) {
      throw new Error(`Cannot activate unknown player: ${id}`);
    }
    this.writeDirectory({ ...directory, activePlayerId: id });
  }

  private playerKey(id: PlayerId): string {
    return `${PLAYER_KEY_PREFIX}${id}`;
  }

  private backupKey(key: string): string {
    return `${key}${BACKUP_SUFFIX}`;
  }

  private readPlayerEnvelope(id: PlayerId): PlayerSaveEnvelope | null {
    const key = this.playerKey(id);
    let raw: unknown;
    try {
      raw = this.storage.read<unknown>(key);
      if (raw === null) return null;
      const result = migratePlayerSave(raw, id);
      if (result.migrated) this.storage.write(key, result.envelope);
      return structuredClone(result.envelope);
    } catch (cause) {
      return this.recoverPlayerEnvelope(id, key, cause);
    }
  }

  private recoverPlayerEnvelope(
    id: PlayerId,
    key: string,
    primaryFailure: unknown,
  ): PlayerSaveEnvelope {
    const backupKey = this.backupKey(key);
    try {
      const backup = this.storage.read<unknown>(backupKey);
      if (backup === null) {
        throw new StorageValidationError("No player save backup is available.");
      }
      const { envelope } = migratePlayerSave(backup, id);
      this.storage.write(key, envelope);
      return structuredClone(envelope);
    } catch (cause) {
      throw new StorageRecoveryError(
        `Player save ${id} is invalid and could not be recovered.`,
        { key, cause: { primaryFailure, backupFailure: cause } },
      );
    }
  }

  private backUpValidPlayerSave(key: string, id: PlayerId): void {
    let existing: unknown;
    try {
      existing = this.storage.read<unknown>(key);
    } catch (cause) {
      if (this.isInvalidStoredData(cause)) return;
      throw cause;
    }
    if (existing === null) return;

    let envelope: PlayerSaveEnvelope;
    try {
      envelope = migratePlayerSave(existing, id).envelope;
    } catch (cause) {
      if (this.isInvalidStoredData(cause)) return;
      throw cause;
    }
    // A backup write failure aborts the primary write; recoverability wins.
    this.storage.write(this.backupKey(key), envelope);
  }

  private readDirectory(): PlayerDirectory {
    try {
      const directory = this.storage.read<unknown>(DIRECTORY_KEY);
      if (directory === null) return emptyDirectory();
      return this.validateDirectory(directory);
    } catch (primaryFailure) {
      try {
        const backup = this.storage.read<unknown>(DIRECTORY_BACKUP_KEY);
        if (backup === null)
          throw new Error("No directory backup is available.");
        const directory = this.validateDirectory(backup);
        this.storage.write(DIRECTORY_KEY, directory);
        return directory;
      } catch (backupFailure) {
        throw new StorageRecoveryError(
          "The player directory is invalid and could not be recovered.",
          {
            key: DIRECTORY_KEY,
            cause: { primaryFailure, backupFailure },
          },
        );
      }
    }
  }

  private writeDirectory(directory: PlayerDirectory): void {
    let existing: unknown;
    try {
      existing = this.storage.read<unknown>(DIRECTORY_KEY);
    } catch (cause) {
      if (!this.isInvalidStoredData(cause)) throw cause;
      existing = null;
    }
    if (existing !== null) {
      let validDirectory: PlayerDirectory | null = null;
      try {
        validDirectory = this.validateDirectory(existing);
      } catch (cause) {
        if (!this.isInvalidStoredData(cause)) throw cause;
      }
      if (validDirectory) {
        // A backup write failure aborts the directory update.
        this.storage.write(DIRECTORY_BACKUP_KEY, validDirectory);
      }
    }
    this.storage.write(DIRECTORY_KEY, directory);
  }

  private isInvalidStoredData(cause: unknown): boolean {
    return (
      cause instanceof StorageError &&
      [
        "STORAGE_SERIALIZATION_FAILED",
        "STORAGE_VALIDATION_FAILED",
        "STORAGE_MIGRATION_FAILED",
      ].includes(cause.code)
    );
  }

  private validateDirectory(value: unknown): PlayerDirectory {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new StorageValidationError("Player directory must be an object.");
    }
    const candidate = value as Record<string, unknown>;
    const playerIds = candidate.playerIds;
    const activePlayerId = candidate.activePlayerId;
    if (
      !Array.isArray(playerIds) ||
      !playerIds.every((id) => typeof id === "string" && id.length > 0) ||
      new Set(playerIds).size !== playerIds.length ||
      !(
        activePlayerId === null ||
        (typeof activePlayerId === "string" &&
          playerIds.includes(activePlayerId))
      )
    ) {
      throw new StorageValidationError("Player directory fields are invalid.");
    }
    return {
      activePlayerId: activePlayerId as PlayerId | null,
      playerIds: [...playerIds] as PlayerId[],
    };
  }
}
