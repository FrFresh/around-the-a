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

export const CURRENT_PLAYER_SAVE_SCHEMA_VERSION = 4;

type Migration = (save: unknown) => unknown;

/**
 * Add one migration per historic version. The registry is the only place that
 * advances persisted player schemas.
 */
const migrations: Readonly<Record<number, Migration>> = {
  1: migrateVersion1ToVersion2,
  2: migrateVersion2ToVersion3,
  3: migrateVersion3ToVersion4,
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
  const data = {
    player: value.player,
    progress: value.progress,
    session: value.session,
  } as unknown as PlayerSaveData;
  return {
    schemaVersion: 2,
    playerId: data.player.id,
    savedAt: data.progress.updatedAt,
    data,
  };
}

function migrateVersion2ToVersion3(value: unknown): PlayerSaveEnvelope {
  if (!isRecord(value) || value.schemaVersion !== 2 || !isRecord(value.data)) {
    throw new StorageMigrationError("Schema version 2 player save is invalid.");
  }
  const data = value.data;
  if (
    !isRecord(data.player) ||
    typeof data.player.id !== "string" ||
    !isRecord(data.progress) ||
    !isRecord(data.session)
  ) {
    throw new StorageMigrationError("Schema version 2 player data is invalid.");
  }
  const playerId = data.player.id as PlayerId;
  const updatedAt =
    typeof data.session.lastActiveAt === "string"
      ? data.session.lastActiveAt
      : value.savedAt;
  const migratedData: PlayerSaveData = {
    player: data.player as unknown as PlayerSaveData["player"],
    progress: {
      ...(data.progress as unknown as PlayerSaveData["progress"]),
      scenarioStates: {},
    },
    session: {
      id: `migrated-session:${playerId}`,
      playerId,
      status: "not_started",
      currentScenarioId: null,
      currentStageId: null,
      startedAt: null,
      updatedAt:
        typeof updatedAt === "string" ? updatedAt : new Date(0).toISOString(),
    },
  };
  return {
    schemaVersion: 3,
    playerId,
    savedAt: migratedData.session.updatedAt,
    data: migratedData,
  };
}

function migrateVersion3ToVersion4(value: unknown): PlayerSaveEnvelope {
  if (!isRecord(value) || value.schemaVersion !== 3 || !isRecord(value.data)) {
    throw new StorageMigrationError("Schema version 3 player save is invalid.");
  }
  const data = structuredClone(value.data) as unknown as PlayerSaveData;
  if (!isRecord(data.progress) || !isRecord(data.progress.scenarioStates)) {
    throw new StorageMigrationError("Schema version 3 player data is invalid.");
  }
  for (const state of Object.values(data.progress.scenarioStates)) {
    if (!isRecord(state)) {
      throw new StorageMigrationError(
        "Schema version 3 scenario state is invalid.",
      );
    }
    state.attemptsByStageId = {};
    state.latestEvaluation = null;
    state.availableHint = null;
    state.reflectionResponses = {};
  }
  return {
    schemaVersion: 4,
    playerId: value.playerId as PlayerId,
    savedAt: value.savedAt as string,
    data,
  };
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
