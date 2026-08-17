import type { BadgeId, ScenarioId, SkillId } from "../types/index.ts";
import type { ScenarioDefinition } from "./scenario-definition.ts";

export const PHASE_FOUR_TEST_SCENARIO_ID = "engine-test-scenario" as ScenarioId;
export const PHASE_FOUR_NEXT_SCENARIO_ID = "engine-test-next" as ScenarioId;
export const PHASE_FOUR_EVALUATOR_ID = "phase-4-deterministic";

/** Neutral engine fixture only. It intentionally contains no Atlanta lesson content. */
export const phaseFourTestScenario: ScenarioDefinition = {
  id: PHASE_FOUR_TEST_SCENARIO_ID,
  version: 1,
  location: {
    id: "engine-test-location",
    name: "engine-test-location",
    displayName: "Test Location",
  },
  title: "Scenario Engine Test",
  literacySkillId: "engine-test-skill" as SkillId,
  prerequisiteScenarioIds: [],
  startStageId: "intro",
  stages: [
    {
      id: "intro",
      type: "intro",
      text: "Begin the neutral scenario-engine test.",
      nextStageId: "dialogue",
    },
    {
      id: "dialogue",
      type: "dialogue",
      speaker: "Test Guide",
      text: "This dialogue is authored data.",
      nextStageId: "challenge",
    },
    {
      id: "challenge",
      type: "challenge",
      objective: "Submit the deterministic success value.",
      inputPrompt: "Enter the configured test value.",
      evaluatorId: PHASE_FOUR_EVALUATOR_ID,
      successCriteria: { minimumScore: 1 },
      retryAllowed: true,
      hints: ["Try a more precise value.", "The deterministic value is clear."],
      successFeedback: "The configured criterion was met.",
      retryFeedback: "Review the hint and retry.",
      nextOnSuccess: "reflection",
      nextOnRetry: "feedback",
    },
    {
      id: "feedback",
      type: "feedback",
      text: "Use the evaluation feedback before trying again.",
      nextStageId: "challenge",
    },
    {
      id: "reflection",
      type: "reflection",
      prompt: "What made the successful input effective?",
      responseOptional: true,
      nextStageId: "reward",
    },
    {
      id: "reward",
      type: "reward",
      text: "The scenario reward is ready to be committed by the game engine.",
      nextStageId: "complete",
    },
    {
      id: "complete",
      type: "complete",
      text: "The neutral scenario-engine test is complete.",
    },
  ],
  reward: {
    xp: 10,
    aPoints: 5,
    badgeIds: ["engine-test-complete" as BadgeId],
  },
  nextScenarioIds: [PHASE_FOUR_NEXT_SCENARIO_ID],
};
