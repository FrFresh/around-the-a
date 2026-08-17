"use client";

import { useState } from "react";
import type { GameSnapshot } from "../../game-engine/index.ts";

interface GameHUDProps {
  snapshot: GameSnapshot;
  onHome(): void;
  onOpenACard(): void;
  onReset(): void;
}

export function GameHUD({
  snapshot,
  onHome,
  onOpenACard,
  onReset,
}: GameHUDProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <header className="game-hud">
      <button
        className="hud-brand"
        type="button"
        onClick={onHome}
        aria-label="Return to title"
      >
        <span>A</span>
        <b>
          AROUND
          <br />
          THE A
        </b>
      </button>
      <div className="hud-stats" aria-label="Player status">
        <span>
          <small>XP</small>
          <b>{snapshot.rewards.xp}</b>
        </span>
        <span>
          <small>A PTS</small>
          <b>{snapshot.rewards.aPoints}</b>
        </span>
      </div>
      <button className="hud-card" type="button" onClick={onOpenACard}>
        A-CARD
      </button>
      <details className="playtest-menu">
        <summary aria-label="Open settings">⚙</summary>
        <div>
          <b>{snapshot.player.displayName}</b>
          {!confirmReset ? (
            <button type="button" onClick={() => setConfirmReset(true)}>
              RESET MY SAVE
            </button>
          ) : (
            <>
              <p>Start this traveler over?</p>
              <button type="button" onClick={onReset}>
                YES, RESET
              </button>
              <button type="button" onClick={() => setConfirmReset(false)}>
                CANCEL
              </button>
            </>
          )}
        </div>
      </details>
    </header>
  );
}
