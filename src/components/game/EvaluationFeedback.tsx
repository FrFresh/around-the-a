import type { EvaluationResult } from "../../types/index.ts";

const dimensionLabels = {
  goal: ["GOAL", "What are you trying to do?"],
  context: ["CONTEXT", "What is happening right now?"],
  constraints: ["CONSTRAINTS", "What limits matter?"],
  desiredOutput: ["OUTPUT", "What answer would help?"],
} as const;

export function EvaluationFeedback({
  evaluation,
}: {
  evaluation: EvaluationResult;
}) {
  return (
    <section className="evaluation-feedback" aria-label="Question feedback">
      <header>
        <b>{evaluation.passed ? "CLEAR SIGNAL" : "SIGNAL CHECK"}</b>
        <span>{evaluation.score}/4</span>
      </header>
      <div className="evaluation-grid">
        {Object.entries(dimensionLabels).map(([dimension, [label, help]]) => {
          const hit = Boolean(evaluation.dimensions?.[dimension]);
          return (
            <div
              className={hit ? "dimension-hit" : "dimension-miss"}
              key={dimension}
            >
              <span aria-label={hit ? "included" : "missing"}>
                {hit ? "✓" : "×"}
              </span>
              <p>
                <b>{label}</b>
                <small>{help}</small>
              </p>
            </div>
          );
        })}
      </div>
      <p className="evaluation-note">{evaluation.feedback}</p>
    </section>
  );
}
