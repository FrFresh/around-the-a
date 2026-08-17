import { BaseManager } from "../foundation/manager.ts";
import { FuturePhaseError } from "../foundation/phase-error.ts";
import type {
  EvaluationResult,
  PlayerProgress,
  Reward,
} from "../types/index.ts";
import type { IRewardManager } from "./reward-manager.interface.ts";

export class RewardManager extends BaseManager implements IRewardManager {
  apply(
    _progress: PlayerProgress,
    _reward: Reward,
    _evaluation: EvaluationResult,
  ): PlayerProgress {
    void _progress;
    void _reward;
    void _evaluation;
    // TODO(Phase 8): Apply idempotent XP, A Points, and badge rewards.
    throw new FuturePhaseError("RewardManager", 8);
  }
}
