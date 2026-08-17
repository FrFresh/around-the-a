import type { EvaluationResult } from "../../types/index.ts";
import { EvaluationFeedback } from "./EvaluationFeedback.tsx";
import { PromptInput } from "./PromptInput.tsx";
import { PixelButton } from "./PixelButton.tsx";

interface ChallengePanelProps {
  objective: string;
  inputPrompt: string;
  attempt: number;
  hint: string | null;
  evaluation?: EvaluationResult | null;
  feedbackMode?: boolean;
  onSubmit(value: string): void;
  onRetry(): void;
}

export function ChallengePanel({
  objective,
  inputPrompt,
  attempt,
  hint,
  evaluation,
  feedbackMode = false,
  onSubmit,
  onRetry,
}: ChallengePanelProps) {
  return (
    <section className="challenge-panel">
      <div className="objective-strip">
        <span>OBJECTIVE</span>
        <p>{objective}</p>
      </div>
      {feedbackMode && evaluation ? (
        <>
          <EvaluationFeedback evaluation={evaluation} />
          {hint && (
            <p className="progressive-hint">
              <b>CLUE</b>
              {hint}
            </p>
          )}
          <PixelButton onClick={onRetry}>TRY AGAIN</PixelButton>
        </>
      ) : (
        <PromptInput
          label="WHAT DO YOU ASK?"
          placeholder={inputPrompt}
          attempt={attempt}
          onSubmit={onSubmit}
        />
      )}
    </section>
  );
}
