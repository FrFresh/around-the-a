import { useState } from "react";
import type { Player, PlayerId } from "../types/index.ts";

interface PlayerSelectorProps {
  players: Player[];
  activePlayerId: PlayerId | null;
  onCreate(displayName: string): void;
  onSelect(id: PlayerId): void;
  onDelete(id: PlayerId): void;
  onClose?: () => void;
}

export function PlayerSelector({
  players,
  activePlayerId,
  onCreate,
  onSelect,
  onDelete,
  onClose,
}: PlayerSelectorProps) {
  const [displayName, setDisplayName] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!displayName.trim()) return;
    onCreate(displayName);
    setDisplayName("");
  }

  return (
    <section className="players-screen">
      {onClose && (
        <button className="back" onClick={onClose}>
          ← MAP
        </button>
      )}
      <p className="eyebrow">ATLANTA AI TRANSIT AUTHORITY</p>
      <h1>
        CHOOSE YOUR
        <br />
        TRAVELER
      </h1>
      <p className="players-intro">
        Each traveler has a separate route, passport, and progress save on this
        device.
      </p>

      {players.length > 0 && (
        <div className="player-list">
          {players.map((player) => (
            <div
              className={
                player.id === activePlayerId
                  ? "player-row active"
                  : "player-row"
              }
              key={player.id}
            >
              <button
                className="player-choice"
                onClick={() => onSelect(player.id)}
              >
                <span>{player.displayName.slice(0, 1).toUpperCase()}</span>
                <p>
                  <b>{player.displayName}</b>
                  <small>
                    {player.id === activePlayerId
                      ? "CURRENT TRAVELER"
                      : "LOAD SAVE"}
                  </small>
                </p>
                <strong>→</strong>
              </button>
              <button
                className="delete-player"
                onClick={() => onDelete(player.id)}
                aria-label={`Delete ${player.displayName}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="create-player" onSubmit={submit}>
        <label htmlFor="display-name">NEW TRAVELER NAME</label>
        <div>
          <input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={24}
            placeholder="Enter a display name"
            autoComplete="off"
          />
          <button type="submit" disabled={!displayName.trim()}>
            CREATE <span>→</span>
          </button>
        </div>
        <small>Saved only in this browser.</small>
      </form>
    </section>
  );
}
