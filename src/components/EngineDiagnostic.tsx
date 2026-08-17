"use client";

import { useState } from "react";
import type {
  ApplicationSnapshot,
  GameHealthCheck,
  GameSnapshot,
} from "../game-engine/index.ts";
import type { PlayerId } from "../types/index.ts";

export interface EngineDiagnosticProps {
  snapshot: ApplicationSnapshot;
  gameSnapshot: GameSnapshot | null;
  health: GameHealthCheck | null;
  commandError: string | null;
  onCreatePlayer(displayName: string): void;
  onSwitchPlayer(playerId: PlayerId): void;
  onStartGame(): void;
  onResumeGame(): void;
  onPauseGame(): void;
  onLoadScenario(): void;
  onSubmitAction(): void;
  onSubmitFailedAction(): void;
  onResetProgress(): void;
}

export function EngineDiagnostic(props: EngineDiagnosticProps) {
  const [displayName, setDisplayName] = useState("");
  const active = props.snapshot.activeSave;
  const session = props.gameSnapshot?.session;
  const scenario = props.gameSnapshot?.scenario;
  const progression = props.gameSnapshot?.progression;
  const rewards = props.gameSnapshot?.rewards;

  function submitPlayer(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!displayName.trim()) return;
    props.onCreatePlayer(displayName);
    setDisplayName("");
  }

  return (
    <main className="diagnostic-shell" data-testid="engine-diagnostic">
      <header className="diagnostic-header">
        <div>
          <p className="diagnostic-kicker">AROUND THE A</p>
          <h1>ENGINE DIAGNOSTIC</h1>
          <p>DEVELOPMENT ONLY</p>
        </div>
        <HealthBadge health={props.health} />
      </header>

      {props.commandError && (
        <div className="diagnostic-error" role="alert">
          <b>COMMAND FAILED</b>
          <span>{props.commandError}</span>
        </div>
      )}

      <section className="diagnostic-grid" aria-label="Current engine state">
        <DiagnosticValue label="Player ID" value={active?.player.id} />
        <DiagnosticValue
          label="Display Name"
          value={active?.player.displayName}
        />
        <DiagnosticValue label="Session Status" value={session?.status} />
        <DiagnosticValue
          label="Scenario ID"
          value={session?.currentScenarioId}
        />
        <DiagnosticValue label="Stage ID" value={session?.currentStageId} />
        <DiagnosticValue label="XP" value={rewards?.xp} />
        <DiagnosticValue label="A Points" value={rewards?.aPoints} />
        <DiagnosticValue label="Current Attempts" value={scenario?.attempts} />
        <DiagnosticValue
          label="Save Schema"
          value={props.health?.saveSchemaVersion}
        />
        <DiagnosticValue
          label="Completed Scenarios"
          value={progression?.completedScenarioIds.join(", ") || "None"}
        />
        <DiagnosticValue
          label="Unlocked Scenarios"
          value={progression?.unlockedScenarioIds.join(", ") || "None"}
        />
        <DiagnosticValue
          label="Current Stage Type"
          value={props.gameSnapshot?.currentStage?.type}
        />
      </section>

      <section className="diagnostic-panel">
        <h2>PLAYER PROFILES</h2>
        <form className="diagnostic-form" onSubmit={submitPlayer}>
          <label htmlFor="diagnostic-player-name">Display name</label>
          <input
            id="diagnostic-player-name"
            value={displayName}
            maxLength={32}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Player A"
          />
          <button type="submit" disabled={!displayName.trim()}>
            CREATE PLAYER
          </button>
        </form>
        <div className="profile-list">
          {props.snapshot.players.length ? (
            props.snapshot.players.map((player) => (
              <button
                type="button"
                key={player.id}
                className={player.id === active?.player.id ? "selected" : ""}
                onClick={() => props.onSwitchPlayer(player.id)}
              >
                {player.displayName}
                <small>{player.id}</small>
              </button>
            ))
          ) : (
            <p>No player profiles exist on this device.</p>
          )}
        </div>
      </section>

      <section className="diagnostic-panel">
        <h2>GAME MANAGER COMMANDS</h2>
        <div className="command-grid">
          <button
            type="button"
            onClick={props.onStartGame}
            disabled={!active || session?.status !== "not_started"}
          >
            START GAME
          </button>
          <button
            type="button"
            onClick={props.onResumeGame}
            disabled={session?.status !== "paused"}
          >
            RESUME GAME
          </button>
          <button
            type="button"
            onClick={props.onPauseGame}
            disabled={session?.status !== "active"}
          >
            PAUSE GAME
          </button>
          <button
            type="button"
            onClick={props.onLoadScenario}
            disabled={session?.status !== "active"}
          >
            LOAD TEST SCENARIO
          </button>
          <button
            type="button"
            onClick={props.onSubmitAction}
            disabled={!session?.currentStageId || session.status !== "active"}
          >
            SUBMIT TEST ACTION
          </button>
          <button
            type="button"
            onClick={props.onSubmitFailedAction}
            disabled={props.gameSnapshot?.currentStage?.type !== "challenge"}
          >
            SUBMIT FAILED ACTION
          </button>
          <button
            type="button"
            className="danger"
            onClick={props.onResetProgress}
            disabled={!active}
          >
            RESET TEST PROGRESS
          </button>
        </div>
      </section>

      <section className="diagnostic-panel health-details">
        <h2>HEALTH CHECK</h2>
        <ul>
          <HealthRow
            label="Application boot"
            value={props.health?.applicationBootSucceeded}
          />
          <HealthRow
            label="GameManager"
            value={props.health?.gameManagerInitialized}
          />
          <HealthRow
            label="Storage adapter"
            value={props.health?.storageAdapterAvailable}
          />
          <HealthRow
            label="Scenario Registry"
            value={props.health?.scenarioRegistryValid}
          />
        </ul>
      </section>
    </main>
  );
}

function DiagnosticValue({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="diagnostic-value">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

function HealthBadge({ health }: { health: GameHealthCheck | null }) {
  return (
    <div className={`health-badge ${health?.status ?? "pending"}`}>
      <span></span>
      {health?.status === "ok" ? "SYSTEM READY" : "SYSTEM CHECK"}
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value?: boolean }) {
  return (
    <li>
      <span>{value ? "PASS" : "WAIT"}</span>
      {label}
    </li>
  );
}
