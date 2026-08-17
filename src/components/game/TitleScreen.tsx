import { PixelButton } from "./PixelButton.tsx";

interface TitleScreenProps {
  canContinue: boolean;
  canOpenACard: boolean;
  playerName?: string;
  onStart(): void;
  onContinue(): void;
  onOpenACard(): void;
}

export function TitleScreen({
  canContinue,
  canOpenACard,
  playerName,
  onStart,
  onContinue,
  onOpenACard,
}: TitleScreenProps) {
  return (
    <main className="title-screen" data-testid="title-screen">
      <div className="title-skyline" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      <div className="title-rail" aria-hidden="true">
        <span className="title-train">A</span>
      </div>
      <section className="title-lockup">
        <p className="cartridge-label">ATLANTA · PLAYER ONE</p>
        <h1>
          <span>AROUND</span>
          <span className="title-a">THE A</span>
        </h1>
        <p className="title-subtitle">AI LITERACY QUEST</p>
        <div className="title-menu" aria-label="Main menu">
          <PixelButton onClick={onStart}>START GAME</PixelButton>
          <PixelButton
            onClick={onContinue}
            disabled={!canContinue}
            tone="green"
          >
            CONTINUE{playerName ? ` · ${playerName}` : ""}
          </PixelButton>
          <PixelButton
            onClick={onOpenACard}
            disabled={!canOpenACard}
            tone="ghost"
          >
            A-CARD
          </PixelButton>
        </div>
      </section>
      <p className="title-hint">PRESS A BUTTON TO BEGIN</p>
    </main>
  );
}
