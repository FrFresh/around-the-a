import { PlaceholderEvaluator } from "../evaluation/index.ts";
import { GameEngine } from "../game/engine.ts";
import {
  migrateLegacySave,
  migratePhaseFourFixtureSaves,
  PlayerGameStorage,
  PlayerManager,
  type PlayerManagerOptions,
  PlayerSaveRepository,
} from "../player/index.ts";
import { RewardManager } from "../rewards/index.ts";
import {
  EvaluatorRegistry,
  ScenarioEngine,
  ScenarioManager,
  ScenarioRegistry,
} from "../scenario-engine/index.ts";
import {
  AskBetterEvaluator,
  ASK_BETTER_EVALUATOR_ID,
} from "../evaluators/ask-better.ts";
import { fivePointsScenarioDefinition } from "../scenarios/index.ts";
import { StorageManager, type StorageService } from "../storage/index.ts";
import { GameOrchestrator } from "./game-orchestrator.ts";
import { GameManager } from "./game-manager.ts";
import { ProgressionEngine } from "./progression-engine.ts";

export interface CreateGameManagerOptions {
  storage: StorageService;
  player?: PlayerManagerOptions;
}

export async function createGameManager({
  storage: service,
  player: playerOptions,
}: CreateGameManagerOptions): Promise<GameManager> {
  const storage = new StorageManager(service);
  const players = new PlayerManager(
    new PlayerSaveRepository(storage, { now: playerOptions?.now }),
    playerOptions,
  );
  const gameStorage = new PlayerGameStorage(players);
  const gameplay = new GameEngine(gameStorage);
  const evaluatorRegistry = new EvaluatorRegistry();
  evaluatorRegistry.register(ASK_BETTER_EVALUATOR_ID, new AskBetterEvaluator());
  const scenarioRegistry = new ScenarioRegistry(evaluatorRegistry);
  scenarioRegistry.register(fivePointsScenarioDefinition);
  const scenarioEngine = new ScenarioEngine(
    scenarioRegistry,
    evaluatorRegistry,
  );
  const progression = new ProgressionEngine(
    scenarioEngine.getProgressionScenarios(),
  );
  const orchestrator = new GameOrchestrator(
    players,
    progression,
    scenarioEngine,
    { now: playerOptions?.now },
  );
  const scenarios = new ScenarioManager(scenarioRegistry);
  const rewards = new RewardManager();
  const evaluator = new PlaceholderEvaluator();
  const game = new GameManager({
    scenarios,
    storage,
    rewards,
    evaluator,
    players,
    gameplay,
    orchestrator,
    migrateLegacySave: () => {
      migrateLegacySave(storage, players, gameStorage);
      migratePhaseFourFixtureSaves(players);
    },
  });

  await Promise.all([
    scenarios.initialize(),
    storage.initialize(),
    rewards.initialize(),
  ]);
  await game.initialize();
  return game;
}
