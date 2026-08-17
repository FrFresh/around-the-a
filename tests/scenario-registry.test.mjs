import assert from "node:assert/strict";
import test from "node:test";
import {
  DeterministicTestEvaluator,
  EvaluatorRegistry,
  PHASE_FOUR_EVALUATOR_ID,
  ScenarioDefinitionValidationError,
  ScenarioRegistry,
  phaseFourTestScenario,
} from "../src/scenario-engine/index.ts";

function createRegistry() {
  const evaluators = new EvaluatorRegistry();
  evaluators.register(
    PHASE_FOUR_EVALUATOR_ID,
    new DeterministicTestEvaluator(),
  );
  return { evaluators, registry: new ScenarioRegistry(evaluators) };
}

test("scenario registry registers and resolves immutable authored definitions", () => {
  const { registry } = createRegistry();
  registry.register(phaseFourTestScenario);

  const definition = registry.get(phaseFourTestScenario.id);
  definition.stages[0].id = "mutated";

  assert.equal(registry.get(phaseFourTestScenario.id).stages[0].id, "intro");
  assert.equal(registry.getAll().length, 1);
});

test("scenario registry rejects duplicate stage IDs", () => {
  const { registry } = createRegistry();
  const malformed = structuredClone(phaseFourTestScenario);
  malformed.stages[1].id = malformed.stages[0].id;

  assert.throws(
    () => registry.register(malformed),
    ScenarioDefinitionValidationError,
  );
});

test("scenario registry rejects missing stage transitions", () => {
  const { registry } = createRegistry();
  const malformed = structuredClone(phaseFourTestScenario);
  malformed.stages[0].nextStageId = "missing";

  assert.throws(() => registry.register(malformed), /references missing stage/);
});

test("scenario registry rejects challenges with unregistered evaluators", () => {
  const { registry } = createRegistry();
  const malformed = structuredClone(phaseFourTestScenario);
  malformed.stages[2].evaluatorId = "missing-evaluator";

  assert.throws(() => registry.register(malformed), /Missing evaluator/);
});

test("scenario registry rejects malformed rewards and prerequisites", () => {
  const { registry } = createRegistry();
  const malformedReward = structuredClone(phaseFourTestScenario);
  malformedReward.reward.xp = -1;
  assert.throws(() => registry.register(malformedReward), /reward/i);

  const malformedPrerequisite = structuredClone(phaseFourTestScenario);
  malformedPrerequisite.prerequisiteScenarioIds = [malformedPrerequisite.id];
  assert.throws(
    () => registry.register(malformedPrerequisite),
    /prerequisites/i,
  );
});
