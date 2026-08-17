import type { EvaluationResult, ScenarioStageId } from "../types/index.ts";

export interface ScenarioEvaluationContext {
  scenarioId: string;
  stageId: ScenarioStageId;
  attempt: number;
  successCriteria: { minimumScore: number };
}

export interface ScenarioEvaluator {
  evaluate(
    input: unknown,
    context: ScenarioEvaluationContext,
  ): EvaluationResult;
}

export class EvaluatorRegistry {
  private readonly evaluators = new Map<string, ScenarioEvaluator>();

  register(id: string, evaluator: ScenarioEvaluator): void {
    if (!id.trim()) throw new Error("Evaluator ID must not be empty.");
    if (this.evaluators.has(id)) {
      throw new Error(`Evaluator already registered: ${id}`);
    }
    this.evaluators.set(id, evaluator);
  }

  has(id: string): boolean {
    return this.evaluators.has(id);
  }

  get(id: string): ScenarioEvaluator {
    const evaluator = this.evaluators.get(id);
    if (!evaluator) throw new Error(`Unknown evaluator: ${id}`);
    return evaluator;
  }
}
