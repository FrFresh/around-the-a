import { RuleBasedEvaluator } from "../evaluators/ruleBased.ts";
import { fivePoints } from "../scenarios/fivePoints.ts";
import type { GameStorage } from "../storage/localStorage.ts";
import type { PlayerState, Scenario } from "./types.ts";

const scenarios: Record<string, Scenario> = { [fivePoints.id]: fivePoints };
export class GameEngine {
  private storage: GameStorage;
  private evaluator: RuleBasedEvaluator;
  constructor(storage: GameStorage, evaluator = new RuleBasedEvaluator()) { this.storage = storage; this.evaluator = evaluator; }
  load() { return this.storage.loadPlayer(); }
  async submitPlayerResponse(id: string, input: string) {
    const scenario = scenarios[id]; if (!scenario) throw new Error(`Unknown scenario: ${id}`);
    const evaluation = await this.evaluator.evaluate(input, scenario);
    const previous = this.storage.loadPlayer();
    const attempts = (previous.scenarioAttempts[id] ?? 0) + 1;
    let player: PlayerState = { ...previous, scenarioAttempts: { ...previous.scenarioAttempts, [id]: attempts } };
    const newlyCompleted = evaluation.passed && !previous.completedScenarios.includes(id);
    if (newlyCompleted) {
      player = { ...player,
        currentScenarioId: scenario.nextScenarioId ?? id,
        completedScenarios: [...player.completedScenarios, id],
        unlockedScenarios: scenario.nextScenarioId && !player.unlockedScenarios.includes(scenario.nextScenarioId) ? [...player.unlockedScenarios, scenario.nextScenarioId] : player.unlockedScenarios,
        skills: { ...player.skills, [scenario.skill]: 1 }, xp: player.xp + scenario.rewards.xp, aPoints: player.aPoints + scenario.rewards.points,
        badges: player.badges.includes(scenario.rewards.badge) ? player.badges : [...player.badges, scenario.rewards.badge],
      };
    }
    this.storage.savePlayer(player);
    return { evaluation, player, completed: evaluation.passed };
  }
}
