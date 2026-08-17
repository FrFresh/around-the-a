import type {
  PlayerId,
  PlayerSaveData,
  PlayerSaveEnvelope,
} from "../../types/index.ts";
import {
  assertPlayerSaveData,
  assertPlayerSaveEnvelope,
} from "../player-save-validator.ts";
import { StorageMigrationError } from "../storage-errors.ts";

export const CURRENT_PLAYER_SAVE_SCHEMA_VERSION = 2;

type Migration = (save: unknown) => unknown;

/**
 * Add one migration per historic version. The registry is the only place that
 * advances persisted player schemas.
 */
const migrations: Readonly<Record<number, Migration>> = {
  1: migrateVersion1ToVersion2,
};

export interface PlayerSaveMigrationResult {
  envelope: PlayerSaveEnvelope;
  migrated: boolean;
}

export function migratePlayerSave(
  value: unknown,
  expectedId?: PlayerId,
): PlayerSaveMigrationResult {
  let candidate = structuredClone(value);
  const startingVersion = readSchemaVersion(candidate);
  let version = startingVersion;

  if (version > CURRENT_PLAYER_SAVE_SCHEMA_VERSION) {
    throw new StorageMigrationError(
      `Player save schema version ${version} is newer than supported version ${CURRENT_PLAYER_SAVE_SCHEMA_VERSION}.`,
    );
  }

  while (version < CURRENT_PLAYER_SAVE_SCHEMA_VERSION) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new StorageMigrationError(
        `No player save migration is registered for schema version ${version}.`,
      );
    }
    try {
      candidate = migrate(candidate);
    } catch (cause) {
      if (cause instanceof StorageMigrationError) throw cause;
      throw new StorageMigrationError(
        `Failed to migrate player save from schema version ${version}.`,
        { cause },
      );
    }
    version = readSchemaVersion(candidate);
  }

  assertPlayerSaveEnvelope(
    candidate,
    CURRENT_PLAYER_SAVE_SCHEMA_VERSION,
    expectedId,
  );
  return {
    envelope: structuredClone(candidate),
    migrated: startingVersion !== CURRENT_PLAYER_SAVE_SCHEMA_VERSION,
  };
}

export function createPlayerSaveEnvelope(
  data: PlayerSaveData,
  savedAt: string,
): PlayerSaveEnvelope {
  assertPlayerSaveData(data);
  const envelope: PlayerSaveEnvelope = {
    schemaVersion: CURRENT_PLAYER_SAVE_SCHEMA_VERSION,
    playerId: data.player.id,
    savedAt,
    data: structuredClone(data),
  };
  assertPlayerSaveEnvelope(envelope, CURRENT_PLAYER_SAVE_SCHEMA_VERSION);
  return envelope;
}

function migrateVersion1ToVersion2(value: unknown): PlayerSaveEnvelope {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new StorageMigrationError("Schema version 1 player save is invalid.");
  }
  const data: unknown = {
    player: value.player,
    progress: value.progress,
    session: value.session,
  };
  assertPlayerSaveData(data);
  return createPlayerSaveEnvelope(data, data.progress.updatedAt);
}

function readSchemaVersion(value: unknown): number {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.schemaVersion) ||
    (value.schemaVersion as number) < 1
  ) {
    throw new StorageMigrationError(
      "Player save does not declare a valid schema version.",
    );
  }
  return value.schemaVersion as number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
