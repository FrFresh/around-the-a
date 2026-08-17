interface SpriteProps {
  label?: string;
  pose?: "idle" | "talk" | "celebrate";
}

export function PlayerSprite({ label = "Player", pose = "idle" }: SpriteProps) {
  return (
    <div
      className={`pixel-person player-character pose-${pose}`}
      role="img"
      aria-label={label}
    >
      <i className="pixel-head" />
      <i className="pixel-hair" />
      <i className="pixel-body" />
      <i className="pixel-leg pixel-leg-left" />
      <i className="pixel-leg pixel-leg-right" />
    </div>
  );
}

export function NPCSprite({ label = "Maya", pose = "idle" }: SpriteProps) {
  return (
    <div
      className={`pixel-person npc-character pose-${pose}`}
      role="img"
      aria-label={label}
    >
      <i className="pixel-head" />
      <i className="pixel-hair" />
      <i className="pixel-body" />
      <i className="pixel-leg pixel-leg-left" />
      <i className="pixel-leg pixel-leg-right" />
    </div>
  );
}
