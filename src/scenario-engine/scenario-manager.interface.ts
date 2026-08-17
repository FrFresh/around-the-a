import type { InitializableManager } from "../foundation/manager.ts";
import type { ScenarioId } from "../types/index.ts";
import type { ScenarioDefinition } from "./scenario-definition.ts";

export interface IScenarioManager extends InitializableManager {
  getScenario(id: ScenarioId): ScenarioDefinition;
  getAllScenarios(): ScenarioDefinition[];
}
