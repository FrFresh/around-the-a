import type { ReactNode } from "react";
import { PixelButton } from "./PixelButton.tsx";

interface DialogueBoxProps {
  speaker: string;
  role?: string;
  children: ReactNode;
  actionLabel?: string;
  onAdvance?: () => void;
}

export function DialogueBox({
  speaker,
  role,
  children,
  actionLabel,
  onAdvance,
}: DialogueBoxProps) {
  return (
    <section className="game-dialogue" aria-label={`${speaker} dialogue`}>
      <header>
        <span className="dialogue-portrait" aria-hidden="true">
          {speaker.slice(0, 1)}
        </span>
        <div>
          <b>{speaker}</b>
          {role && <small>{role}</small>}
        </div>
      </header>
      <div className="dialogue-copy">{children}</div>
      {actionLabel && onAdvance && (
        <PixelButton onClick={onAdvance} className="dialogue-action">
          {actionLabel} <span aria-hidden="true">▶</span>
        </PixelButton>
      )}
    </section>
  );
}
