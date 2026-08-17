import type { PlayerManager } from "../player/index.ts";
import {
  ScenarioEngine,
  ScenarioInteractionError,
  type ScenarioAction,
} from "../scenario-engine/index.ts";
import type {
  PlayerId,
  SaveData,
  ScenarioId,
  ScenarioState,
} from "../types/index.ts";
import {
  InvalidGameTransitionError,
  PlayerNotFoundError,
  ScenarioAlreadyCompletedError,
  ScenarioOwnershipError,
} from "./game-errors.ts";
import type { GameEvent } from "./game-events.ts";
import { createGameSnapshot, type GameSnapshot } from "./game-snapshot.ts";
import { ProgressionEngine } from "./progression-engine.ts";

export type PlayerAction = ScenarioAction & {
  sessionId: string;
  scenarioId: ScenarioId;
};

export interface GameOrchestrationResult {
  snapshot: GameSnapshot;
  events: readonly GameEvent[];
}

export interface GameOrchestratorOptions {
  now?: () => string;
}

export class GameOrchestrator {
  private readonly players: PlayerManager;
  private readonly progression: ProgressionEngine;
  private readonly scenarios: ScenarioEngine;
  private readonly now: () => string;

  constructor(
    players: PlayerManager,
    progression: ProgressionEngine,
    scenarios: ScenarioEngine,
    options: GameOrchestratorOptions = {},
  ) {
    this.players = players;
    this.progression = progression;
    this.scenarios = scenarios;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  startGame(playerId: PlayerId): GameOrchestrationResult {
    const save = this.load(playerId);
    if (save.session.status !== "not_started") {
      throw this.invalidSession(save, "Only a new game can be started.");
    }
    const occurredAt = this.now();
    const scenarioId = this.progression.getAvailableScenarios(save.progress)[0];
    let next = structuredClone(save);
    const events: GameEvent[] = [{ type: "GameStarted", playerId, occurredAt }];
    next.session = {
      ...next.session,
      status: "active",
      startedAt: occurredAt,
      updatedAt: occurredAt,
    };
    if (scenarioId) {
      next = this.startScenario(next, scenarioId, occurredAt, events);
    }
    return this.commit(next, events);
  }

  resumeGame(playerId: PlayerId): GameOrchestrationResult {
    const save = this.load(playerId);
    if (save.session.status !== "paused") {
      throw this.invalidSession(save, "Only a paused game can be resumed.");
    }
    const occurredAt = this.now();
    save.session = { ...save.session, status: "active", updatedAt: occurredAt };
    return this.commit(save, [{ type: "GameResumed", playerId, occurredAt }]);
  }

  pauseGame(playerId: PlayerId): GameOrchestrationResult {
    const save = this.load(playerId);
    if (save.session.status !== "active") {
      throw this.invalidSession(save, "Only an active game can be paused.");
    }
    const occurredAt = this.now();
    save.session = { ...save.session, status: "paused", updatedAt: occurredAt };
    return this.commit(save, [{ type: "GamePaused", playerId, occurredAt }]);
  }

  getGameSnapshot(playerId: PlayerId): GameSnapshot {
    return this.snapshot(this.load(playerId));
  }

  loadScenario(
    playerId: PlayerId,
    scenarioId: ScenarioId,
  ): GameOrchestrationResult {
    const save = this.load(playerId);
    this.requireActiveSession(save);
    const occurredAt = this.now();
    const events: GameEvent[] = [];
    const next = this.startScenario(save, scenarioId, occurredAt, events);
    return this.commit(next, events);
  }

  submitAction(
    playerId: PlayerId,
    action: PlayerAction,
  ): GameOrchestrationResult {
    const save = this.load(playerId);
    this.requireActiveSession(save);
    this.assertActionOwnership(save, action);
    return this.applyScenarioAction(save, toScenarioAction(action));
  }

  completeStage(playerId: PlayerId): GameOrchestrationResult {
    const save = this.load(playerId);
    this.requireActiveSession(save);
    return this.applyScenarioAction(save, { type: "advance" });
  }

  completeScenario(playerId: PlayerId): GameOrchestrationResult {
    const save = this.load(playerId);
    this.requireActiveSession(save);
    const scenarioId = save.session.currentScenarioId;
    if (!scenarioId) {
      throw this.invalidSession(save, "No scenario is active.");
    }
    const scenario = this.progression.getScenario(scenarioId);
    const state = this.requireOwnedScenarioState(save, scenarioId);
    if (save.progress.completedScenarioIds.includes(scenarioId)) {
      throw new ScenarioAlreadyCompletedError(playerId, scenarioId);
    }
    let completedState: ScenarioState;
    try {
      completedState = this.scenarios.complete(state);
    } catch (error) {
      if (error instanceof ScenarioInteractionError) {
        throw this.invalidSession(save, error.message);
      }
      throw error;
    }
    const occurredAt = this.now();
    const unlockedBefore = new Set(save.progress.unlockedScenarioIds);
    save.progress = this.progression.completeScenario(
      save.progress,
      scenario,
      completedState,
    );
    save.session = {
      ...save.session,
      status: scenario.nextScenarioIds.length ? "active" : "completed",
      currentScenarioId: null,
      currentStageId: null,
      updatedAt: occurredAt,
    };
    const events: GameEvent[] = [
      { type: "ScenarioCompleted", playerId, scenarioId, occurredAt },
      {
        type: "RewardGranted",
        playerId,
        scenarioId,
        occurredAt,
        ...scenario.reward,
      },
      ...scenario.nextScenarioIds
        .filter((id) => !unlockedBefore.has(id))
        .map(
          (id): GameEvent => ({
            type: "ScenarioUnlocked",
            playerId,
            scenarioId: id,
            occurredAt,
          }),
        ),
    ];
    return this.commit(save, events);
  }

  private startScenario(
    save: SaveData,
    scenarioId: ScenarioId,
    occurredAt: string,
    events: GameEvent[],
  ): SaveData {
    this.progression.getScenario(scenarioId);
    if (save.progress.completedScenarioIds.includes(scenarioId)) {
      throw new ScenarioAlreadyCompletedError(save.player.id, scenarioId);
    }
    const wasUnlocked = save.progress.unlockedScenarioIds.includes(scenarioId);
    save.progress = this.progression.unlockScenario(save.progress, scenarioId);
    if (!wasUnlocked) {
      events.push({
        type: "ScenarioUnlocked",
        playerId: save.player.id,
        scenarioId,
        occurredAt,
      });
    }
    const existing = save.progress.scenarioStates[scenarioId];
    if (existing && existing.playerId !== save.player.id) {
      throw new ScenarioOwnershipError(save.player.id, scenarioId);
    }
    const state =
      existing ??
      this.progression.createScenarioState(save.progress, scenarioId);
    const activeState =
      state.status === "available" ? this.scenarios.start(state) : state;
    if (activeState.status !== "active" || !activeState.currentStageId) {
      throw this.invalidSession(save, "Scenario cannot become active.");
    }
    save.progress = {
      ...save.progress,
      currentScenarioId: scenarioId,
      scenarioStates: {
        ...save.progress.scenarioStates,
        [scenarioId]: activeState,
      },
    };
    save.session = {
      ...save.session,
      currentScenarioId: scenarioId,
      currentStageId: activeState.currentStageId,
      updatedAt: occurredAt,
    };
    events.push({
      type: "ScenarioStarted",
      playerId: save.player.id,
      scenarioId,
      occurredAt,
    });
    return save;
  }

  private applyScenarioAction(
    save: SaveData,
    action: ScenarioAction,
  ): GameOrchestrationResult {
    const scenarioId = save.session.currentScenarioId;
    if (!scenarioId) throw this.invalidSession(save, "No scenario is active.");
    const state = this.requireOwnedScenarioState(save, scenarioId);
    if (!state.currentStageId) {
      throw this.invalidSession(save, "No scenario stage is active.");
    }
    const result = this.scenarios.submit(state, action);
    const nextState = result.state;
    const occurredAt = this.now();
    save.progress = {
      ...save.progress,
      scenarioAttempts: {
        ...save.progress.scenarioAttempts,
        [scenarioId]: nextState.attempts,
      },
      scenarioStates: {
        ...save.progress.scenarioStates,
        [scenarioId]: nextState,
      },
    };
    save.session = {
      ...save.session,
      currentStageId: nextState.currentStageId,
      updatedAt: occurredAt,
    };
    const events: GameEvent[] = result.completedStageId
      ? [
          {
            type: "StageCompleted",
            playerId: save.player.id,
            scenarioId,
            stageId: result.completedStageId,
            occurredAt,
          },
        ]
      : [];
    return this.commit(save, events);
  }

  private assertActionOwnership(save: SaveData, action: PlayerAction): void {
    if (
      save.session.id !== action.sessionId ||
      save.session.currentScenarioId !== action.scenarioId
    ) {
      throw new ScenarioOwnershipError(save.player.id, action.scenarioId);
    }
  }

  private requireOwnedScenarioState(
    save: SaveData,
    scenarioId: ScenarioId,
  ): ScenarioState {
    const state = save.progress.scenarioStates[scenarioId];
    if (!state || state.playerId !== save.player.id) {
      throw new ScenarioOwnershipError(save.player.id, scenarioId);
    }
    return state;
  }

  private requireActiveSession(save: SaveData): void {
    if (save.session.playerId !== save.player.id) {
      throw new ScenarioOwnershipError(save.player.id);
    }
    if (save.session.status !== "active") {
      throw this.invalidSession(save, "The game session is not active.");
    }
  }

  private invalidSession(
    save: SaveData,
    message: string,
  ): InvalidGameTransitionError {
    return new InvalidGameTransitionError(message, {
      playerId: save.player.id,
      scenarioId: save.session.currentScenarioId ?? undefined,
    });
  }

  private load(playerId: PlayerId): SaveData {
    const save = this.players.loadPlayer(playerId);
    if (!save) throw new PlayerNotFoundError(playerId);
    if (save.session.playerId !== playerId) {
      throw new ScenarioOwnershipError(playerId);
    }
    return structuredClone(save);
  }

  private commit(save: SaveData, events: GameEvent[]): GameOrchestrationResult {
    const persisted = this.players.savePlayer(save);
    return {
      snapshot: this.snapshot(persisted),
      events: structuredClone(events),
    };
  }

  private snapshot(save: SaveData): GameSnapshot {
    return createGameSnapshot(
      save.player,
      save.progress,
      save.session,
      this.progression.getAvailableScenarios(save.progress),
      this.scenarios,
    );
  }
}

function toScenarioAction(action: PlayerAction): ScenarioAction {
  switch (action.type) {
    case "advance":
      return { type: "advance" };
    case "choose":
      return { type: "choose", responseId: action.responseId };
    case "submit":
      return { type: "submit", input: action.input };
    case "reflect":
      return { type: "reflect", response: action.response };
  }
}
