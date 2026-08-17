import { toProgressionScenario } from "../scenario-engine/index.ts";
import {
  FIVE_POINTS_SCENARIO_ID,
  PONCE_TEASER_SCENARIO_ID,
  fivePointsScenarioDefinition,
} from "../scenarios/index.ts";
import type { Scenario } from "../types/index.ts";

export const PLACEHOLDER_SCENARIO_ID = FIVE_POINTS_SCENARIO_ID;
export const PLACEHOLDER_NEXT_SCENARIO_ID = PONCE_TEASER_SCENARIO_ID;

/** @deprecated Compatibility projection of the authored Phase 4 fixture. */
export const placeholderScenario: Scenario = toProgressionScenario(
  fivePointsScenarioDefinition,
);
