import {
  PHASE_FOUR_NEXT_SCENARIO_ID,
  PHASE_FOUR_TEST_SCENARIO_ID,
  phaseFourTestScenario,
  toProgressionScenario,
} from "../scenario-engine/index.ts";
import type { Scenario } from "../types/index.ts";

export const PLACEHOLDER_SCENARIO_ID = PHASE_FOUR_TEST_SCENARIO_ID;
export const PLACEHOLDER_NEXT_SCENARIO_ID = PHASE_FOUR_NEXT_SCENARIO_ID;

/** @deprecated Compatibility projection of the authored Phase 4 fixture. */
export const placeholderScenario: Scenario = toProgressionScenario(
  phaseFourTestScenario,
);
