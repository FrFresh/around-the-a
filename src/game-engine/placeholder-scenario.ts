import type { BadgeId, Scenario, ScenarioId } from "../types/index.ts";

export const PLACEHOLDER_SCENARIO_ID = "engine-test-scenario" as ScenarioId;
export const PLACEHOLDER_NEXT_SCENARIO_ID = "engine-test-next" as ScenarioId;

/** Generic engine fixture only. It is not Atlanta or learning content. */
export const placeholderScenario: Scenario = {
  id: PLACEHOLDER_SCENARIO_ID,
  title: "Engine Test Scenario",
  prerequisiteScenarioIds: [],
  nextScenarioIds: [PLACEHOLDER_NEXT_SCENARIO_ID],
  stageIds: ["intro", "challenge", "feedback", "complete"],
  reward: {
    xp: 10,
    aPoints: 5,
    badgeIds: ["engine-test-complete" as BadgeId],
  },
};
