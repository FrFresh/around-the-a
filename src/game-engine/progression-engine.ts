import type {
  PlayerProgress,
  Scenario,
  ScenarioId,
  ScenarioState,
} from "../types/index.ts";
import {
  ScenarioAlreadyCompletedError,
  ScenarioLockedError,
  ScenarioOwnershipError,
  UnknownScenarioError,
} from "./game-errors.ts";

export class ProgressionEngine {
  private readonly scenarios: ReadonlyMap<ScenarioId, Scenario>;

  constructor(scenarios: readonly Scenario[]) {
    this.scenarios = new Map(
      scenarios.map((scenario) => [scenario.id, scenario]),
    );
    if (this.scenarios.size !== scenarios.length) {
      throw new Error("Scenario IDs must be unique.");
    }
  }

  getScenario(id: ScenarioId): Scenario {
    const scenario = this.scenarios.get(id);
    if (!scenario) throw new UnknownScenarioError(id);
    return scenario;
  }

  getAvailableScenarios(progress: PlayerProgress): ScenarioId[] {
    return [...this.scenarios.values()]
      .filter(
        (scenario) =>
          !progress.completedScenarioIds.includes(scenario.id) &&
          this.isScenarioUnlocked(progress, scenario.id),
      )
      .map((scenario) => scenario.id);
  }

  isScenarioUnlocked(progress: PlayerProgress, id: ScenarioId): boolean {
    if (progress.unlockedScenarioIds.includes(id)) return true;
    const scenario = this.scenarios.get(id);
    return Boolean(
      scenario &&
        scenario.prerequisiteScenarioIds.every((required) =>
          progress.completedScenarioIds.includes(required),
        ),
    );
  }

  unlockScenario(progress: PlayerProgress, id: ScenarioId): PlayerProgress {
    const known = this.scenarios.get(id);
    if (
      known &&
      !known.prerequisiteScenarioIds.every((required) =>
        progress.completedScenarioIds.includes(required),
      )
    ) {
      throw new ScenarioLockedError(progress.playerId, id);
    }
    if (progress.unlockedScenarioIds.includes(id)) return progress;
    return {
      ...progress,
      unlockedScenarioIds: [...progress.unlockedScenarioIds, id],
    };
  }

  createScenarioState(progress: PlayerProgress, id: ScenarioId): ScenarioState {
    if (!this.isScenarioUnlocked(progress, id)) {
      throw new ScenarioLockedError(progress.playerId, id);
    }
    return {
      playerId: progress.playerId,
      scenarioId: id,
      status: "available",
      currentStageId: null,
      completedStageIds: [],
      attempts: 0,
      attemptsByStageId: {},
      latestEvaluation: null,
      availableHint: null,
      reflectionResponses: {},
    };
  }

  completeScenario(
    progress: PlayerProgress,
    scenario: Scenario,
    state: ScenarioState,
  ): PlayerProgress {
    if (state.playerId !== progress.playerId) {
      throw new ScenarioOwnershipError(progress.playerId, scenario.id);
    }
    if (progress.completedScenarioIds.includes(scenario.id)) {
      throw new ScenarioAlreadyCompletedError(progress.playerId, scenario.id);
    }

    let next: PlayerProgress = {
      ...progress,
      currentScenarioId: null,
      completedScenarioIds: [...progress.completedScenarioIds, scenario.id],
      xp: progress.xp + scenario.reward.xp,
      aPoints: progress.aPoints + scenario.reward.aPoints,
      passport: {
        ...progress.passport,
        earnedBadgeIds: unique([
          ...progress.passport.earnedBadgeIds,
          ...scenario.reward.badgeIds,
        ]),
      },
      scenarioStates: {
        ...progress.scenarioStates,
        [scenario.id]: state,
      },
    };
    for (const nextScenarioId of scenario.nextScenarioIds) {
      next = this.unlockScenario(next, nextScenarioId);
    }
    return next;
  }

  getNextScenario(scenario: Scenario): ScenarioId | null {
    return scenario.nextScenarioIds[0] ?? null;
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
