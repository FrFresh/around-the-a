import type { EvaluationResult, Scenario } from "../game/types.ts";

export interface ResponseEvaluator {
  evaluate(input: string, scenario: Scenario): Promise<EvaluationResult>;
}
