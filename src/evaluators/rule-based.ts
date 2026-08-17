import type { Dimension, EvaluationResult, Scenario } from "../game/types.ts";
import type { ResponseEvaluator } from "./response-evaluator.ts";

const patterns: Record<Dimension, RegExp[]> = {
  goal: [
    /need to/i,
    /trying to/i,
    /get to/i,
    /reach/i,
    /interview/i,
    /appointment/i,
    /arrive/i,
  ],
  context: [
    /five points/i,
    /gold line/i,
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
  ],
  desiredOutput: [
    /two (?:options|ways|routes)/i,
    /step[- ]by[- ]step/i,
    /recommend/i,
    /which (?:one|route|option)/i,
    /list/i,
    /compare/i,
    /tell me/i,
    /give me/i,
  ],
};

export class RuleBasedEvaluator implements ResponseEvaluator {
  async evaluate(input: string, scenario: Scenario): Promise<EvaluationResult> {
    const dimensions = Object.fromEntries(
      Object.entries(patterns).map(([key, values]) => [
        key,
        values.some((pattern) => pattern.test(input.trim())),
      ]),
    ) as EvaluationResult["dimensions"];
    const score = Object.values(dimensions).filter(Boolean).length;
    const passed =
      score >= scenario.successCriteria.minimumScore &&
      scenario.successCriteria.requiredDimensions.every(
        (key) => dimensions[key],
      );
    const missing = (Object.keys(dimensions) as Dimension[]).filter(
      (key) => !dimensions[key],
    );
    const tips: Record<Dimension, string> = {
      goal: "Say exactly what you’re trying to accomplish.",
      context: "Add where you are and what went wrong.",
      constraints: "Include a limit—like your deadline, budget, or battery.",
      desiredOutput:
        "Ask for the kind of answer you want, such as two options and a recommendation.",
    };
    return {
      score,
      maxScore: 4,
      dimensions,
      passed,
      feedback: passed
        ? "That question gives someone enough to act."
        : `${tips[missing[0]]} You can revise and try again.`,
      npcResponse:
        score <= 1
          ? "Yeah, just head north."
          : score === 2
            ? "Midtown’s north, but I don’t know how much time you’ve got or what matters most."
            : "Almost there—tell me what kind of answer would help you move.",
    };
  }
}
