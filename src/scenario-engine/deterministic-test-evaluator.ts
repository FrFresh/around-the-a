import type { EvaluationResult } from "../types/index.ts";
import type {
  ScenarioEvaluationContext,
  ScenarioEvaluator,
} from "./evaluator-registry.ts";

/** Neutral deterministic fixture used to prove engine behavior without lesson content. */
export class DeterministicTestEvaluator implements ScenarioEvaluator {
  evaluate(
    input: unknown,
    context: ScenarioEvaluationContext,
  ): EvaluationResult {
    const normalized =
      typeof input === "string" ? input.trim().toLowerCase() : "";
    const score = normalized === "clear" ? 1 : 0;
    const passed = score >= context.successCriteria.minimumScore;
    return {
      passed,
      score,
      feedback: passed
        ? "The test input met the configured criterion."
        : "The test input did not meet the configured criterion.",
      metadata: {
        evaluatorId: "phase-4-deterministic",
        attempt: context.attempt,
      },
    };
  }
}
