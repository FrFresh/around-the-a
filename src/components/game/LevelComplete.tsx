import type { EvaluationResult } from "../../types/index.ts";
import { EvaluationFeedback } from "./EvaluationFeedback.tsx";
import { FivePointsScene } from "./FivePointsScene.tsx";
import { PixelButton } from "./PixelButton.tsx";

interface LevelCompleteProps {
  evaluation: EvaluationResult | null;
  reward: { xp: number; aPoints: number };
  mode: "success" | "collect";
  onContinue(): void;
}

export function LevelComplete({
  evaluation,
  reward,
  mode,
  onContinue,
}: LevelCompleteProps) {
  const collecting = mode === "collect";
  return (
    <main className="level-complete" data-testid={`level-${mode}`}>
      <FivePointsScene mood="success" />
      <section className="level-complete-panel">
        <p className="screen-kicker">
          {collecting ? "LEVEL COMPLETE" : "QUESTION UPGRADED"}
        </p>
        <h1>{collecting ? "FIVE POINTS" : "THAT’LL WORK"}</h1>
        {evaluation?.npcResponse && (
          <blockquote>
            <b>MAYA</b>“{evaluation.npcResponse}”
          </blockquote>
        )}
        {evaluation && !collecting && (
          <EvaluationFeedback evaluation={evaluation} />
        )}
        {collecting && (
          <div className="reward-tally">
            <span>
              <b>+{reward.xp}</b>
              <small>XP</small>
            </span>
            <span>
              <b>+{reward.aPoints}</b>
              <small>A POINTS</small>
            </span>
          </div>
        )}
        <PixelButton onClick={onContinue} tone={collecting ? "green" : "gold"}>
          {collecting ? "COLLECT REWARD" : "CHECK YOUR A-CARD"}
        </PixelButton>
      </section>
    </main>
  );
}
