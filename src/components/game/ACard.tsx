import { skills } from "../../data/skills.ts";
import { ASK_BETTER_SKILL_ID } from "../../game-engine/index.ts";
import { PixelButton } from "./PixelButton.tsx";

interface ACardProps {
  playerName: string;
  xp: number;
  aPoints: number;
  unlockedSkillIds: readonly string[];
  previewAskBetter?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onBack?: () => void;
}

const skillIds = [
  ASK_BETTER_SKILL_ID,
  "assess",
  "adapt",
  "avoid-oversharing",
  "authorize-carefully",
] as const;

export function ACard({
  playerName,
  xp,
  aPoints,
  unlockedSkillIds,
  previewAskBetter = false,
  actionLabel,
  onAction,
  onBack,
}: ACardProps) {
  return (
    <main className="a-card-screen" data-testid="a-card-screen">
      <p className="screen-kicker">ATLANTA AI TRANSIT AUTHORITY</p>
      <h1>YOUR A-CARD</h1>
      <section
        className="a-card"
        aria-label={`${playerName}'s AI Literacy A-Card`}
      >
        <header>
          <div className="a-card-mark">A</div>
          <div>
            <small>CARD HOLDER</small>
            <b>{playerName}</b>
          </div>
          <div className="a-card-balance">
            <small>A POINTS</small>
            <b>{aPoints}</b>
          </div>
        </header>
        <div className="a-card-line">
          <span>AI LITERACY ROUTE</span>
          <b>{xp} XP</b>
        </div>
        <div className="a-card-skills">
          {skills.map((skill, index) => {
            const id = skillIds[index];
            const unlocked =
              unlockedSkillIds.includes(id) ||
              (id === ASK_BETTER_SKILL_ID && previewAskBetter);
            return (
              <div
                className={unlocked ? "a-slot unlocked" : "a-slot locked"}
                key={skill}
              >
                <span>{unlocked ? "A" : "×"}</span>
                <p>
                  <b>{skill}</b>
                  <small>{unlocked ? "UNLOCKED" : "LOCKED"}</small>
                </p>
              </div>
            );
          })}
        </div>
        <footer>
          <span>VALID: ATLANTA</span>
          <span>KEEP HUMANS IN CONTROL</span>
        </footer>
      </section>
      {previewAskBetter && (
        <p className="unlock-callout">A-CARD EARNED · ASK BETTER READY</p>
      )}
      <div className="screen-actions">
        {actionLabel && onAction && (
          <PixelButton onClick={onAction}>{actionLabel}</PixelButton>
        )}
        {onBack && (
          <PixelButton tone="ghost" onClick={onBack}>
            BACK
          </PixelButton>
        )}
      </div>
    </main>
  );
}
