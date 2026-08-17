import { PlaceholderEvaluator } from "../evaluation/index.ts";
import { GameManager } from "../game-engine/index.ts";
import { RewardManager } from "../rewards/index.ts";
import { ScenarioManager } from "../scenario-engine/index.ts";
import { StorageManager } from "../storage/index.ts";

export interface FoundationManagers {
  game: GameManager;
  scenarios: ScenarioManager;
  storage: StorageManager;
  rewards: RewardManager;
  evaluator: PlaceholderEvaluator;
}

export async function createFoundation(): Promise<FoundationManagers> {
  const scenarios = new ScenarioManager();
  const storage = new StorageManager();
  const rewards = new RewardManager();
  const evaluator = new PlaceholderEvaluator();
  const game = new GameManager({ scenarios, storage, rewards, evaluator });

  await Promise.all([
    scenarios.initialize(),
    storage.initialize(),
    rewards.initialize(),
  ]);
  await game.initialize();

  return { game, scenarios, storage, rewards, evaluator };
}
