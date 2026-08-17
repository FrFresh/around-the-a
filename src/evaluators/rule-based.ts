import type { Dimension, EvaluationResult, Scenario } from "../game/types.ts";
import type { ResponseEvaluator } from "./response-evaluator.ts";
import { evaluateAskBetterQuestion } from "./ask-better.ts";

export class RuleBasedEvaluator implements ResponseEvaluator {
  async evaluate(input: string, scenario: Scenario): Promise<EvaluationResult> {
    const result = evaluateAskBetterQuestion(
      input,
      scenario.successCriteria.minimumScore,
    );
    const dimensions = result.dimensions as EvaluationResult["dimensions"];
    const passed =
      result.passed &&
      scenario.successCriteria.requiredDimensions.every(
        (key) => dimensions[key],
      );
    const missing = (Object.keys(dimensions) as Dimension[]).filter(
      (key) => !dimensions[key],
    );
    return {
      score: result.score,
      maxScore: 4,
      dimensions,
      passed,
      feedback: passed
        ? result.feedback
        : result.feedback ||
          `Add ${missing[0] ?? "more detail"} and try again.`,
      npcResponse: result.npcResponse ?? "Tell me a little more.",
    };
  }
}
