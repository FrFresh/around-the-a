import type {
  EvaluationResult,
  PlayerProgress,
  Scenario,
  ScenarioId,
  ScenarioStageId,
  ScenarioState,
} from "../types/index.ts";
import type { EvaluatorRegistry } from "./evaluator-registry.ts";
import type {
  ChallengeStageDefinition,
  ScenarioDefinition,
  ScenarioStageDefinition,
} from "./scenario-definition.ts";
import type { ScenarioRegistry } from "./scenario-registry.ts";

export type ScenarioAction =
  | { type: "advance" }
  | { type: "choose"; responseId: string }
  | { type: "submit"; input: unknown }
  | { type: "reflect"; response?: string };

export interface ScenarioTransitionResult {
  state: ScenarioState;
  completedStageId: ScenarioStageId | null;
  evaluation: EvaluationResult | null;
}

export interface ScenarioContentSnapshot {
  id: ScenarioId;
  version: number;
  title: string;
  location: ScenarioDefinition["location"];
  literacySkillId: ScenarioDefinition["literacySkillId"];
  reward: ScenarioDefinition["reward"];
}

export type ScenarioStageSnapshot = ScenarioStageDefinition & {
  attemptCount: number;
  evaluation: EvaluationResult | null;
  availableHint: string | null;
};

export class ScenarioInteractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioInteractionError";
  }
}

export class ScenarioEngine {
  private readonly registry: ScenarioRegistry;
  private readonly evaluators: EvaluatorRegistry;

  constructor(registry: ScenarioRegistry, evaluators: EvaluatorRegistry) {
    this.registry = registry;
    this.evaluators = evaluators;
  }

  getProgressionScenarios(): Scenario[] {
    return this.registry.getAll().map(toProgressionScenario);
  }

  start(state: ScenarioState): ScenarioState {
    if (state.status !== "available") {
      throw new ScenarioInteractionError(
        "Only an available scenario can start.",
      );
    }
    const definition = this.registry.get(state.scenarioId);
    return {
      ...state,
      status: "active",
      currentStageId: definition.startStageId,
    };
  }

  submit(
    state: ScenarioState,
    action: ScenarioAction,
  ): ScenarioTransitionResult {
    if (state.status !== "active" || !state.currentStageId) {
      throw new ScenarioInteractionError("No scenario stage is active.");
    }
    const definition = this.registry.get(state.scenarioId);
    const stage = requireStage(definition, state.currentStageId);

    switch (stage.type) {
      case "intro":
      case "feedback":
      case "reward":
        requireAction(action, "advance", stage.id);
        return advance(state, stage.id, stage.nextStageId);
      case "dialogue":
        return this.submitDialogue(state, stage, action);
      case "challenge":
        return this.submitChallenge(state, stage, action);
      case "reflection":
        return this.submitReflection(state, stage, action);
      case "complete":
        throw new ScenarioInteractionError(
          "The completion stage must be finalized by the Game Orchestrator.",
        );
    }
  }

  complete(state: ScenarioState): ScenarioState {
    if (!state.currentStageId) {
      throw new ScenarioInteractionError("No completion stage is active.");
    }
    const definition = this.registry.get(state.scenarioId);
    const stage = requireStage(definition, state.currentStageId);
    if (stage.type !== "complete") {
      throw new ScenarioInteractionError(
        "Scenario cannot complete before its completion stage.",
      );
    }
    return {
      ...state,
      status: "completed",
      currentStageId: null,
      completedStageIds: unique([...state.completedStageIds, stage.id]),
    };
  }

  getContentSnapshot(state: ScenarioState): ScenarioContentSnapshot {
    const definition = this.registry.get(state.scenarioId);
    return structuredClone({
      id: definition.id,
      version: definition.version,
      title: definition.title,
      location: definition.location,
      literacySkillId: definition.literacySkillId,
      reward: definition.reward,
    });
  }

  getStageSnapshot(state: ScenarioState): ScenarioStageSnapshot | null {
    if (!state.currentStageId) return null;
    const stage = requireStage(
      this.registry.get(state.scenarioId),
      state.currentStageId,
    );
    return structuredClone({
      ...stage,
      attemptCount: state.attemptsByStageId[stage.id] ?? 0,
      evaluation: state.latestEvaluation,
      availableHint: state.availableHint,
    });
  }

  private submitDialogue(
    state: ScenarioState,
    stage: Extract<ScenarioStageDefinition, { type: "dialogue" }>,
    action: ScenarioAction,
  ): ScenarioTransitionResult {
    if (action.type === "choose") {
      const response = stage.responses?.find(
        (candidate) => candidate.id === action.responseId,
      );
      if (!response) {
        throw new ScenarioInteractionError("Unknown dialogue response.");
      }
      return advance(state, stage.id, response.nextStageId);
    }
    requireAction(action, "advance", stage.id);
    if (!stage.nextStageId) {
      throw new ScenarioInteractionError(
        "Dialogue requires a response choice.",
      );
    }
    return advance(state, stage.id, stage.nextStageId);
  }

  private submitChallenge(
    state: ScenarioState,
    stage: ChallengeStageDefinition,
    action: ScenarioAction,
  ): ScenarioTransitionResult {
    requireAction(action, "submit", stage.id);
    const attempt = (state.attemptsByStageId[stage.id] ?? 0) + 1;
    const evaluated = this.evaluators
      .get(stage.evaluatorId)
      .evaluate(action.input, {
        scenarioId: state.scenarioId,
        stageId: stage.id,
        attempt,
        successCriteria: stage.successCriteria,
      });
    const passed =
      evaluated.passed && evaluated.score >= stage.successCriteria.minimumScore;
    if (!passed && !stage.retryAllowed) {
      throw new ScenarioInteractionError(
        "This challenge does not allow retries.",
      );
    }
    const hint = passed ? undefined : selectHint(stage.hints, attempt);
    const evaluation: EvaluationResult = {
      ...evaluated,
      passed,
      feedback: passed ? stage.successFeedback : stage.retryFeedback,
      ...(hint ? { hint } : {}),
      metadata: {
        ...evaluated.metadata,
        evaluatorFeedback: evaluated.feedback,
      },
    };
    const nextStageId = passed ? stage.nextOnSuccess : stage.nextOnRetry;
    return {
      state: {
        ...state,
        currentStageId: nextStageId,
        completedStageIds: passed
          ? unique([...state.completedStageIds, stage.id])
          : state.completedStageIds,
        attempts: state.attempts + 1,
        attemptsByStageId: {
          ...state.attemptsByStageId,
          [stage.id]: attempt,
        },
        latestEvaluation: evaluation,
        availableHint: hint ?? null,
      },
      completedStageId: passed ? stage.id : null,
      evaluation,
    };
  }

  private submitReflection(
    state: ScenarioState,
    stage: Extract<ScenarioStageDefinition, { type: "reflection" }>,
    action: ScenarioAction,
  ): ScenarioTransitionResult {
    requireAction(action, "reflect", stage.id);
    const response = action.response?.trim();
    if (!stage.responseOptional && !response) {
      throw new ScenarioInteractionError("A reflection response is required.");
    }
    const transition = advance(state, stage.id, stage.nextStageId);
    return {
      ...transition,
      state: {
        ...transition.state,
        reflectionResponses: response
          ? { ...state.reflectionResponses, [stage.id]: response }
          : state.reflectionResponses,
      },
    };
  }
}

export function toProgressionScenario(
  definition: ScenarioDefinition,
): Scenario {
  return {
    id: definition.id,
    title: definition.title,
    prerequisiteScenarioIds: definition.prerequisiteScenarioIds,
    nextScenarioIds: definition.nextScenarioIds,
    stageIds: definition.stages.map((stage) => stage.id),
    reward: definition.reward,
  };
}

export function createInitialScenarioState(
  progress: PlayerProgress,
  id: ScenarioId,
): ScenarioState {
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

function advance(
  state: ScenarioState,
  completedStageId: ScenarioStageId,
  nextStageId: ScenarioStageId,
): ScenarioTransitionResult {
  return {
    state: {
      ...state,
      currentStageId: nextStageId,
      completedStageIds: unique([...state.completedStageIds, completedStageId]),
    },
    completedStageId,
    evaluation: null,
  };
}

function requireStage(
  definition: ScenarioDefinition,
  id: ScenarioStageId,
): ScenarioStageDefinition {
  const stage = definition.stages.find((candidate) => candidate.id === id);
  if (!stage) throw new ScenarioInteractionError(`Unknown stage: ${id}`);
  return stage;
}

function requireAction<T extends ScenarioAction["type"]>(
  action: ScenarioAction,
  expected: T,
  stageId: ScenarioStageId,
): asserts action is Extract<ScenarioAction, { type: T }> {
  if (action.type !== expected) {
    throw new ScenarioInteractionError(
      `Stage ${stageId} requires a ${expected} action.`,
    );
  }
}

function selectHint(hints: string[], attempt: number): string | undefined {
  if (!hints.length) return undefined;
  return hints[Math.min(attempt - 1, hints.length - 1)];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
