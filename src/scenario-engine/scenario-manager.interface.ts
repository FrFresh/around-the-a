import type { InitializableManager } from "../foundation/manager.ts";
import type { Scenario, ScenarioId } from "../types/index.ts";

export interface IScenarioManager extends InitializableManager {
  getScenario(id: ScenarioId): Scenario;
}
