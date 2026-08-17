import type { EvaluationResult } from "../types/index.ts";
import type {
  ScenarioEvaluationContext,
  ScenarioEvaluator,
} from "../scenario-engine/evaluator-registry.ts";

export type AskBetterDimension =
  | "goal"
  | "context"
  | "constraints"
  | "desiredOutput";

export type AskBetterDimensions = Record<AskBetterDimension, boolean>;

const dimensionPatterns: Record<AskBetterDimension, readonly RegExp[]> = {
  goal: [
    /need to/i,
    /trying to/i,
    /get to/i,
    /reach/i,
    /interview/i,
    /appointment/i,
    /arrive/i,
    /midtown/i,
  ],
  context: [
    /five points/i,
    /marta/i,
    /gold line/i,
    /red line/i,
    /train/i,
    /delay/i,
    /station/i,
    /right now/i,
    /i(?:’|')m at/i,
  ],
  constraints: [
    /\b\d{1,2}(:\d{2})?\s?(?:am|pm)?\b/i,
    /by\s+\d/i,
    /budget/i,
    /\$\d+/i,
    /phone/i,
    /battery/i,
    /reliable/i,
    /minutes?/i,
    /time/i,
  ],
  desiredOutput: [
    /(?:two|2) (?:options|ways|routes)/i,
    /step[- ]by[- ]step/i,
    /recommend/i,
    /which (?:one|route|option)/i,
    /list/i,
    /compare/i,
    /tell me/i,
    /give me/i,
    /best (?:route|option|way)/i,
  ],
};

const tips: Record<AskBetterDimension, string> = {
  goal: "Say exactly what you need to accomplish.",
  context: "Add where you are and what is happening around you.",
  constraints: "Include a real limit, like time, money, or phone battery.",
  desiredOutput:
    "Ask for the answer shape you need, like two options and a recommendation.",
};

export const ASK_BETTER_EVALUATOR_ID = "ask-better-v1";

export function evaluateAskBetterQuestion(
  input: string,
  minimumScore = 3,
): EvaluationResult {
  const normalized = input.trim();
  const dimensions = Object.fromEntries(
    Object.entries(dimensionPatterns).map(([dimension, patterns]) => [
      dimension,
      patterns.some((pattern) => pattern.test(normalized)),
    ]),
  ) as AskBetterDimensions;
  const score = Object.values(dimensions).filter(Boolean).length;
  const missing = (Object.keys(dimensions) as AskBetterDimension[]).filter(
    (dimension) => !dimensions[dimension],
  );
  const passed = normalized.length > 0 && score >= minimumScore;

  return {
    passed,
    score,
    maxScore: 4,
    dimensions,
    feedback: passed
      ? "That question gives someone enough to help you act."
      : `${tips[missing[0] ?? "goal"]} Revise your question and try again.`,
    npcResponse: passed
      ? "With your deadline and low battery, take the northbound Gold Line to Midtown. If the platform still shows a delay, use the Red Line—it stops there too. Save your phone for the interview address."
      : score <= 1
        ? "Midtown is north. Take a northbound train."
        : "You’re headed north, but I need a little more about your situation before I can give you a solid plan.",
  };
}

export class AskBetterEvaluator implements ScenarioEvaluator {
  evaluate(
    input: unknown,
    context: ScenarioEvaluationContext,
  ): EvaluationResult {
    const result = evaluateAskBetterQuestion(
      typeof input === "string" ? input : "",
      context.successCriteria.minimumScore,
    );
    return {
      ...result,
      metadata: {
        evaluatorId: ASK_BETTER_EVALUATOR_ID,
        attempt: context.attempt,
      },
    };
  }
}
