import { NPCSprite, PlayerSprite } from "./Sprites.tsx";

interface FivePointsSceneProps {
  mood?: "arrival" | "talking" | "success";
}

export function FivePointsScene({ mood = "arrival" }: FivePointsSceneProps) {
  return (
    <section
      className={`five-points-scene scene-${mood}`}
      aria-label="Five Points MARTA station"
    >
      <div className="scene-sky" aria-hidden="true" />
      <div className="scene-skyline" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      <div className="station-canopy" aria-hidden="true" />
      <div className="station-sign">FIVE POINTS</div>
      <div className="marta-roundel" aria-label="MARTA station sign">
        M
      </div>
      <div className="arrival-board" aria-label="Gold Line status delayed">
        <span>GOLD LINE</span>
        <b>DELAYED</b>
      </div>
      <div className="pixel-train" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="platform-edge" aria-hidden="true" />
      <NPCSprite
        pose={
          mood === "talking"
            ? "talk"
            : mood === "success"
              ? "celebrate"
              : "idle"
        }
      />
      <PlayerSprite pose={mood === "success" ? "celebrate" : "idle"} />
      {mood === "success" && (
        <div className="success-pixels" aria-hidden="true">
          ✦ · ✦
        </div>
      )}
    </section>
  );
}
