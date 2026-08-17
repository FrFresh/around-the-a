import { RuleBasedEvaluator } from "../evaluators/rule-based.ts";
import { scenarios } from "../scenarios/index.ts";
import type { GameStorage } from "../storage/game-storage.ts";
import { completeScenario } from "./progression.ts";

export class GameEngine {
  private storage: GameStorage;
  private evaluator: RuleBasedEvaluator;

  constructor(storage: GameStorage, evaluator = new RuleBasedEvaluator()) {
    this.storage = storage;
    this.evaluator = evaluator;
  }

  load() { return this.storage.loadPlayer(); }

  async submitPlayerResponse(id: string, input: string) {
    const scenario = scenarios[id];
    if (!scenario) throw new Error(`Unknown scenario: ${id}`);
    const evaluation = await this.evaluator.evaluate(input, scenario);
    const previous = this.storage.loadPlayer();
    const attempts = (previous.scenarioAttempts[id] ?? 0) + 1;
    let player = { ...previous, scenarioAttempts: { ...previous.scenarioAttempts, [id]: attempts } };
    if (evaluation.passed) player = completeScenario(player, scenario);
    this.storage.savePlayer(player);
    return { evaluation, player, completed: evaluation.passed };
  }
}
