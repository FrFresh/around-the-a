import { BaseManager } from "../foundation/manager.ts";
import type { ScenarioId } from "../types/index.ts";
import { EvaluatorRegistry } from "./evaluator-registry.ts";
import type { ScenarioDefinition } from "./scenario-definition.ts";
import type { IScenarioManager } from "./scenario-manager.interface.ts";
import { ScenarioRegistry } from "./scenario-registry.ts";

export class ScenarioManager extends BaseManager implements IScenarioManager {
  private readonly registry: ScenarioRegistry;

  constructor(registry = new ScenarioRegistry(new EvaluatorRegistry())) {
    super();
    this.registry = registry;
  }

  getScenario(id: ScenarioId): ScenarioDefinition {
    return this.registry.get(id);
  }

  getAllScenarios(): ScenarioDefinition[] {
    return this.registry.getAll();
  }
}
