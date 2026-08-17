import type { PlayerId, ScenarioId } from "../types/index.ts";

export type GameErrorCode =
  | "PLAYER_NOT_FOUND"
  | "INVALID_GAME_TRANSITION"
  | "SCENARIO_LOCKED"
  | "SCENARIO_OWNERSHIP"
  | "SCENARIO_ALREADY_COMPLETED"
  | "UNKNOWN_SCENARIO";

export class GameDomainError extends Error {
  readonly code: GameErrorCode;
  readonly playerId?: PlayerId;
  readonly scenarioId?: ScenarioId;

  constructor(
    code: GameErrorCode,
    message: string,
    context: { playerId?: PlayerId; scenarioId?: ScenarioId } = {},
  ) {
    super(message);
    this.name = "GameDomainError";
    this.code = code;
    this.playerId = context.playerId;
    this.scenarioId = context.scenarioId;
  }
}

export class InvalidGameTransitionError extends GameDomainError {
  constructor(
    message: string,
    context: { playerId?: PlayerId; scenarioId?: ScenarioId } = {},
  ) {
    super("INVALID_GAME_TRANSITION", message, context);
    this.name = "InvalidGameTransitionError";
  }
}

export class ScenarioLockedError extends GameDomainError {
  constructor(playerId: PlayerId, scenarioId: ScenarioId) {
    super("SCENARIO_LOCKED", `Scenario ${scenarioId} is locked.`, {
      playerId,
      scenarioId,
    });
    this.name = "ScenarioLockedError";
  }
}

export class ScenarioOwnershipError extends GameDomainError {
  constructor(playerId: PlayerId, scenarioId?: ScenarioId) {
    super(
      "SCENARIO_OWNERSHIP",
      "Game state belongs to another player session.",
      {
        playerId,
        scenarioId,
      },
    );
    this.name = "ScenarioOwnershipError";
  }
}

export class ScenarioAlreadyCompletedError extends GameDomainError {
  constructor(playerId: PlayerId, scenarioId: ScenarioId) {
    super(
      "SCENARIO_ALREADY_COMPLETED",
      `Scenario ${scenarioId} is already complete.`,
      { playerId, scenarioId },
    );
    this.name = "ScenarioAlreadyCompletedError";
  }
}

export class PlayerNotFoundError extends GameDomainError {
  constructor(playerId: PlayerId) {
    super("PLAYER_NOT_FOUND", `Player not found: ${playerId}`, { playerId });
    this.name = "PlayerNotFoundError";
  }
}

export class UnknownScenarioError extends GameDomainError {
  constructor(scenarioId: ScenarioId) {
    super("UNKNOWN_SCENARIO", `Unknown scenario: ${scenarioId}`, {
      scenarioId,
    });
    this.name = "UnknownScenarioError";
  }
}
