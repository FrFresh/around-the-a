import { BaseManager } from "../foundation/manager.ts";
import { FuturePhaseError } from "../foundation/phase-error.ts";
import type { Scenario, ScenarioId } from "../types/index.ts";
import type { IScenarioManager } from "./scenario-manager.interface.ts";

export class ScenarioManager extends BaseManager implements IScenarioManager {
  getScenario(_id: ScenarioId): Scenario {
    void _id;
    // TODO(Phase 4): Resolve data-driven scenarios from a scenario repository.
    throw new FuturePhaseError("ScenarioManager", 4);
  }
}
