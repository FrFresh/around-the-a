import type {
  EvaluationResult,
  Scenario,
  ScenarioState,
} from "../types/index.ts";

export interface EvaluationInput {
  response: string;
  scenario: Scenario;
  state: ScenarioState;
}

export interface IEvaluator {
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}
