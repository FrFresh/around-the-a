import type { InitializableManager } from "../foundation/manager.ts";
import type {
  EvaluationResult,
  PlayerProgress,
  Reward,
} from "../types/index.ts";

export interface IRewardManager extends InitializableManager {
  apply(
    progress: PlayerProgress,
    reward: Reward,
    evaluation: EvaluationResult,
  ): PlayerProgress;
}
