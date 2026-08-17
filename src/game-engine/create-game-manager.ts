import { PlaceholderEvaluator } from "../evaluation/index.ts";
import { GameEngine } from "../game/engine.ts";
import {
  migrateLegacySave,
  PlayerGameStorage,
  PlayerManager,
  type PlayerManagerOptions,
  PlayerSaveRepository,
} from "../player/index.ts";
import { RewardManager } from "../rewards/index.ts";
import {
  DeterministicTestEvaluator,
  EvaluatorRegistry,
  PHASE_FOUR_EVALUATOR_ID,
  ScenarioManager,
  ScenarioRegistry,
  phaseFourTestScenario,
} from "../scenario-engine/index.ts";
import { StorageManager, type StorageService } from "../storage/index.ts";
import { GameOrchestrator } from "./game-orchestrator.ts";
import { GameManager } from "./game-manager.ts";
import { placeholderScenario } from "./placeholder-scenario.ts";
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
  const progression = new ProgressionEngine([placeholderScenario]);
  const orchestrator = new GameOrchestrator(players, progression, {
    now: playerOptions?.now,
  });
  const evaluatorRegistry = new EvaluatorRegistry();
  evaluatorRegistry.register(
    PHASE_FOUR_EVALUATOR_ID,
    new DeterministicTestEvaluator(),
  );
  const scenarioRegistry = new ScenarioRegistry(evaluatorRegistry);
  scenarioRegistry.register(phaseFourTestScenario);
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
