import type {
  PlayerId,
  PlayerSaveData,
  PlayerSaveEnvelope,
} from "../types/index.ts";
import { StorageValidationError } from "./storage-errors.ts";

type UnknownRecord = Record<string, unknown>;

export function assertPlayerSaveData(
  value: unknown,
  expectedId?: PlayerId,
): asserts value is PlayerSaveData {
  if (!isRecord(value)) fail("Player save data must be an object.");

  const { player, progress, session } = value;
  if (!isRecord(player) || !nonEmptyString(player.id)) {
    fail("Player save is missing a valid player ID.");
  }
  if (!nonEmptyString(player.displayName) || !validDate(player.createdAt)) {
    fail("Player profile fields are invalid.");
  }

  const playerId = player.id as PlayerId;
  if (expectedId && playerId !== expectedId) {
    fail("Save data contains mismatched player IDs.");
  }
  if (!isRecord(progress) || progress.playerId !== playerId) {
    fail("Save data contains mismatched player IDs.");
  }
  if (
    !(
      progress.currentScenarioId === null ||
      nonEmptyString(progress.currentScenarioId)
    ) ||
    !stringArray(progress.completedScenarioIds) ||
    !stringArray(progress.unlockedScenarioIds) ||
    !nonNegativeNumber(progress.xp) ||
    !nonNegativeNumber(progress.aPoints) ||
    !stringArray(progress.unlockedSkillIds) ||
    !numberRecord(progress.skillLevels) ||
    !validInventory(progress.inventory) ||
    !validPassport(progress.passport) ||
    !numberRecord(progress.scenarioAttempts) ||
    !validScenarioStates(progress.scenarioStates, playerId) ||
    !validDate(progress.updatedAt)
  ) {
    fail("Player progress fields are invalid.");
  }

  if (
    !isRecord(session) ||
    !nonEmptyString(session.id) ||
    session.playerId !== playerId ||
    !gameSessionStatus(session.status) ||
    !(
      session.currentScenarioId === null ||
      nonEmptyString(session.currentScenarioId)
    ) ||
    !(
      session.currentStageId === null || scenarioStageId(session.currentStageId)
    ) ||
    !(session.startedAt === null || validDate(session.startedAt)) ||
    !validDate(session.updatedAt)
  ) {
    fail("Player session fields are invalid or use a mismatched player ID.");
  }
  if (session.currentScenarioId === null && session.currentStageId !== null) {
    fail("A game session without a scenario cannot reference a stage.");
  }
  if (session.currentScenarioId !== null) {
    const states = progress.scenarioStates as Record<string, unknown>;
    const state = states[session.currentScenarioId];
    if (
      !isRecord(state) ||
      state.playerId !== playerId ||
      state.currentStageId !== session.currentStageId
    ) {
      fail("Game session scenario state is missing or inconsistent.");
    }
  }
}

function validScenarioStates(value: unknown, playerId: PlayerId): boolean {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([scenarioId, state]) => {
    if (!isRecord(state)) return false;
    return (
      state.playerId === playerId &&
      state.scenarioId === scenarioId &&
      scenarioStatus(state.status) &&
      (state.currentStageId === null ||
        scenarioStageId(state.currentStageId)) &&
      Array.isArray(state.completedStageIds) &&
      state.completedStageIds.every(scenarioStageId) &&
      Number.isInteger(state.attempts) &&
      (state.attempts as number) >= 0 &&
      numberRecord(state.attemptsByStageId) &&
      validEvaluation(state.latestEvaluation) &&
      (state.availableHint === null || nonEmptyString(state.availableHint)) &&
      stringRecord(state.reflectionResponses)
    );
  });
}

function gameSessionStatus(value: unknown): boolean {
  return ["not_started", "active", "paused", "completed"].includes(
    value as string,
  );
}

function scenarioStatus(value: unknown): boolean {
  return ["locked", "available", "active", "completed"].includes(
    value as string,
  );
}

function scenarioStageId(value: unknown): boolean {
  return nonEmptyString(value);
}

function validEvaluation(value: unknown): boolean {
  if (value === null) return true;
  return (
    isRecord(value) &&
    typeof value.passed === "boolean" &&
    nonNegativeNumber(value.score) &&
    nonEmptyString(value.feedback) &&
    (value.hint === undefined || nonEmptyString(value.hint)) &&
    (value.metadata === undefined || isRecord(value.metadata)) &&
    (value.maxScore === undefined || nonNegativeNumber(value.maxScore)) &&
    (value.dimensions === undefined || booleanRecord(value.dimensions))
  );
}

export function assertPlayerSaveEnvelope(
  value: unknown,
  expectedVersion: number,
  expectedId?: PlayerId,
): asserts value is PlayerSaveEnvelope {
  if (!isRecord(value)) fail("Player save envelope must be an object.");
  if (value.schemaVersion !== expectedVersion) {
    fail(`Expected player save schema version ${expectedVersion}.`);
  }
  if (!nonEmptyString(value.playerId) || !validDate(value.savedAt)) {
    fail("Player save envelope metadata is invalid.");
  }
  if (expectedId && value.playerId !== expectedId) {
    fail("Player save envelope belongs to a different player.");
  }
  assertPlayerSaveData(value.data, value.playerId as PlayerId);
}

function validInventory(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.items)) return false;
  return value.items.every(
    (item) =>
      isRecord(item) &&
      nonEmptyString(item.id) &&
      nonEmptyString(item.name) &&
      Number.isInteger(item.quantity) &&
      (item.quantity as number) >= 0,
  );
}

function validPassport(value: unknown): boolean {
  return (
    isRecord(value) &&
    stringArray(value.earnedBadgeIds) &&
    stringArray(value.unlockedSkillIds)
  );
}

function numberRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => nonNegativeNumber(entry))
  );
}

function booleanRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "boolean")
  );
}

function stringRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(nonEmptyString);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmptyString);
}

function nonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value: unknown): value is string {
  // ISODateString is currently an opaque domain type. Semantic date parsing
  // would reject historic Phase 1 test/adaptor values and belongs in a future
  // schema migration if the domain tightens this contract.
  return nonEmptyString(value);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new StorageValidationError(message);
}
