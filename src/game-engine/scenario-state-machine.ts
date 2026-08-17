import type {
  Scenario,
  ScenarioState,
  ScenarioStageId,
} from "../types/index.ts";
import {
  InvalidGameTransitionError,
  ScenarioAlreadyCompletedError,
  ScenarioOwnershipError,
} from "./game-errors.ts";

export type ScenarioTransitionEvent =
  | { type: "start" }
  | { type: "advance" }
  | { type: "complete" };

export function transitionScenario(
  state: ScenarioState,
  scenario: Scenario,
  event: ScenarioTransitionEvent,
): ScenarioState {
  if (state.scenarioId !== scenario.id) {
    throw new ScenarioOwnershipError(state.playerId, scenario.id);
  }
  if (state.status === "completed") {
    throw new ScenarioAlreadyCompletedError(state.playerId, scenario.id);
  }

  if (event.type === "start") {
    if (state.status !== "available" || state.currentStageId !== null) {
      throw invalid(state, "Only an available scenario can be started.");
    }
    return {
      ...state,
      status: "active",
      currentStageId: firstStage(scenario),
      attempts: state.attempts + 1,
    };
  }

  if (event.type === "advance") {
    if (state.status !== "active" || state.currentStageId === null) {
      throw invalid(state, "Only an active scenario stage can advance.");
    }
    const currentIndex = scenario.stageIds.indexOf(state.currentStageId);
    const nextStage = scenario.stageIds[currentIndex + 1];
    if (currentIndex < 0 || !nextStage) {
      throw invalid(state, "The current stage has no valid next stage.");
    }
    return {
      ...state,
      currentStageId: nextStage,
      completedStageIds: addUnique(
        state.completedStageIds,
        state.currentStageId,
      ),
    };
  }

  if (
    state.status !== "active" ||
    state.currentStageId !== scenario.stageIds.at(-1) ||
    state.currentStageId !== "complete"
  ) {
    throw invalid(
      state,
      "A scenario can complete only after reaching its complete stage.",
    );
  }
  return {
    ...state,
    status: "completed",
    completedStageIds: addUnique(state.completedStageIds, state.currentStageId),
  };
}

function firstStage(scenario: Scenario): ScenarioStageId {
  const stage = scenario.stageIds[0];
  if (!stage) {
    throw new InvalidGameTransitionError(
      `Scenario ${scenario.id} has no stages.`,
      { scenarioId: scenario.id },
    );
  }
  return stage;
}

function addUnique(
  stages: ScenarioStageId[],
  stage: ScenarioStageId,
): ScenarioStageId[] {
  return stages.includes(stage) ? stages : [...stages, stage];
}

function invalid(
  state: ScenarioState,
  message: string,
): InvalidGameTransitionError {
  return new InvalidGameTransitionError(message, {
    playerId: state.playerId,
    scenarioId: state.scenarioId,
  });
}
