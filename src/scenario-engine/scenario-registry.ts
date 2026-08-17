import type { ScenarioId, ScenarioStageId } from "../types/index.ts";
import type { EvaluatorRegistry } from "./evaluator-registry.ts";
import type {
  ScenarioDefinition,
  ScenarioStageDefinition,
} from "./scenario-definition.ts";

export class ScenarioDefinitionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioDefinitionValidationError";
  }
}

export class ScenarioRegistry {
  private readonly definitions = new Map<ScenarioId, ScenarioDefinition>();
  private readonly evaluators: EvaluatorRegistry;

  constructor(evaluators: EvaluatorRegistry) {
    this.evaluators = evaluators;
  }

  register(definition: ScenarioDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new ScenarioDefinitionValidationError(
        `Scenario already registered: ${definition.id}`,
      );
    }
    validateScenarioDefinition(definition, this.evaluators);
    this.definitions.set(definition.id, structuredClone(definition));
  }

  has(id: ScenarioId): boolean {
    return this.definitions.has(id);
  }

  get(id: ScenarioId): ScenarioDefinition {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown scenario: ${id}`);
    return structuredClone(definition);
  }

  getAll(): ScenarioDefinition[] {
    return [...this.definitions.values()].map((value) =>
      structuredClone(value),
    );
  }
}

export function validateScenarioDefinition(
  definition: ScenarioDefinition,
  evaluators: EvaluatorRegistry,
): void {
  if (!definition.id || !definition.title.trim() || definition.version < 1) {
    invalid("Scenario identity, title, and version are required.");
  }
  if (
    !definition.location.id.trim() ||
    !definition.location.name.trim() ||
    !definition.location.displayName.trim()
  ) {
    invalid("Scenario location is invalid.");
  }
  if (
    definition.prerequisiteScenarioIds.includes(definition.id) ||
    new Set(definition.prerequisiteScenarioIds).size !==
      definition.prerequisiteScenarioIds.length
  ) {
    invalid("Scenario prerequisites are invalid.");
  }
  if (
    definition.reward.xp < 0 ||
    definition.reward.aPoints < 0 ||
    !Number.isFinite(definition.reward.xp) ||
    !Number.isFinite(definition.reward.aPoints)
  ) {
    invalid("Scenario reward values must be finite and non-negative.");
  }

  const stages = new Map<ScenarioStageId, ScenarioStageDefinition>();
  for (const stage of definition.stages) {
    if (!stage.id.trim() || stages.has(stage.id)) {
      invalid(`Duplicate or empty stage ID: ${stage.id}`);
    }
    stages.set(stage.id, stage);
    if (stage.type === "challenge" && !evaluators.has(stage.evaluatorId)) {
      invalid(`Missing evaluator: ${stage.evaluatorId}`);
    }
  }
  if (!stages.has(definition.startStageId)) invalid("Start stage is missing.");
  if (![...stages.values()].some((stage) => stage.type === "complete")) {
    invalid("A completion stage is required.");
  }

  for (const stage of stages.values()) {
    for (const nextId of getNextStageIds(stage)) {
      if (!stages.has(nextId)) {
        invalid(`Stage ${stage.id} references missing stage ${nextId}.`);
      }
    }
    if (
      stage.type === "dialogue" &&
      !stage.nextStageId &&
      !stage.responses?.length
    ) {
      invalid(`Dialogue stage ${stage.id} has no transition.`);
    }
    if (
      stage.type === "challenge" &&
      (!Number.isFinite(stage.successCriteria.minimumScore) ||
        stage.successCriteria.minimumScore < 0 ||
        stage.hints.some((hint) => !hint.trim()))
    ) {
      invalid(`Challenge stage ${stage.id} is invalid.`);
    }
  }

  const reachable = collectReachable(definition.startStageId, stages);
  if (![...reachable].some((id) => stages.get(id)?.type === "complete")) {
    invalid("No completion stage is reachable from the start stage.");
  }
  if (hasDisallowedCycle(definition.startStageId, stages)) {
    invalid("Scenario contains a circular non-retry transition.");
  }
}

function getNextStageIds(stage: ScenarioStageDefinition): ScenarioStageId[] {
  switch (stage.type) {
    case "complete":
      return [];
    case "dialogue":
      return [
        ...(stage.nextStageId ? [stage.nextStageId] : []),
        ...(stage.responses?.map((response) => response.nextStageId) ?? []),
      ];
    case "challenge":
      return [stage.nextOnSuccess, stage.nextOnRetry];
    default:
      return [stage.nextStageId];
  }
}

function collectReachable(
  start: ScenarioStageId,
  stages: ReadonlyMap<ScenarioStageId, ScenarioStageDefinition>,
): Set<ScenarioStageId> {
  const seen = new Set<ScenarioStageId>();
  const pending = [start];
  while (pending.length) {
    const id = pending.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const stage = stages.get(id);
    if (stage) pending.push(...getNextStageIds(stage));
  }
  return seen;
}

/** Retry edges are intentionally cyclic; authored forward transitions are not. */
function hasDisallowedCycle(
  start: ScenarioStageId,
  stages: ReadonlyMap<ScenarioStageId, ScenarioStageDefinition>,
): boolean {
  const visiting = new Set<ScenarioStageId>();
  const visited = new Set<ScenarioStageId>();
  const visit = (id: ScenarioStageId): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const stage = stages.get(id);
    const nextIds = stage
      ? stage.type === "challenge"
        ? [stage.nextOnSuccess]
        : getNextStageIds(stage)
      : [];
    if (nextIds.some(visit)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return visit(start);
}

function invalid(message: string): never {
  throw new ScenarioDefinitionValidationError(message);
}
