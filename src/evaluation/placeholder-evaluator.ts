import { FuturePhaseError } from "../foundation/phase-error.ts";
import type { EvaluationResult } from "../types/index.ts";
import type { EvaluationInput, IEvaluator } from "./evaluator.interface.ts";

export class PlaceholderEvaluator implements IEvaluator {
  async evaluate(_input: EvaluationInput): Promise<EvaluationResult> {
    void _input;
    // TODO(Phase 5): Implement deterministic, rule-based evaluation.
    throw new FuturePhaseError("EvaluationEngine", 5);
  }
}
