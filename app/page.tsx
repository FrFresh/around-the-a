"use client";

import { useCallback, useEffect, useState } from "react";
import { EngineDiagnostic } from "../src/components/EngineDiagnostic";
import {
  PLACEHOLDER_SCENARIO_ID,
  createBrowserGameManager,
  initializeApplication,
  type ApplicationInitializationError,
  type ApplicationInitializationPhase,
  type ApplicationSnapshot,
  type GameHealthCheck,
  type GameManager,
  type GameSnapshot,
} from "../src/game-engine";
import { defaultPlayer } from "../src/game/player-state";
import type { PlayerId } from "../src/types";

const emptySnapshot: ApplicationSnapshot = {
  players: [],
  activeSave: null,
  state: defaultPlayer,
};

export default function Home() {
  const [phase, setPhase] = useState<ApplicationInitializationPhase>("BOOTING");
  const [failure, setFailure] = useState<ApplicationInitializationError | null>(
    null,
  );
  const [game, setGame] = useState<GameManager | null>(null);
  const [snapshot, setSnapshot] = useState<ApplicationSnapshot>(emptySnapshot);
  const [gameSnapshot, setGameSnapshot] = useState<GameSnapshot | null>(null);
  const [health, setHealth] = useState<GameHealthCheck | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const refresh = useCallback((manager: GameManager) => {
    const next = manager.getSnapshot();
    setSnapshot(next);
    setGameSnapshot(
      next.activeSave
        ? manager.getGameSnapshot(next.activeSave.player.id)
        : null,
    );
    setHealth(manager.getHealthCheck());
  }, []);

  useEffect(() => {
    let active = true;
    const report = (nextPhase: ApplicationInitializationPhase) => {
      if (active) setPhase(nextPhase);
    };
    void initializeApplication(createBrowserGameManager, report).then(
      (result) => {
        if (!active) return;
        if (result.phase === "ERROR") {
          setFailure(result);
          return;
        }
        setFailure(null);
        setGame(result.game);
        setSnapshot(result.snapshot);
        setGameSnapshot(
          result.snapshot.activeSave
            ? result.game.getGameSnapshot(result.snapshot.activeSave.player.id)
            : null,
        );
        setHealth(result.game.getHealthCheck());
      },
    );
    return () => {
      active = false;
    };
  }, [retryKey]);

  function execute(command: (manager: GameManager) => void): void {
    if (!game) return;
    setCommandError(null);
    try {
      command(game);
      refresh(game);
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : String(error));
    }
  }

  function createPlayer(displayName: string): void {
    execute((manager) => {
      manager.createPlayer(displayName);
    });
  }

  function switchPlayer(playerId: PlayerId): void {
    execute((manager) => {
      manager.switchPlayer(playerId);
    });
  }

  function withActivePlayer(
    command: (manager: GameManager, playerId: PlayerId) => void,
  ): void {
    const playerId = snapshot.activeSave?.player.id;
    if (!playerId) {
      setCommandError("Create or select a player first.");
      return;
    }
    execute((manager) => command(manager, playerId));
  }

  function submitStageAction(input = "clear"): void {
    withActivePlayer((manager, playerId) => {
      const current = manager.getGameSnapshot(playerId);
      const scenarioId = current.session.currentScenarioId;
      const stage = current.currentStage;
      if (!scenarioId || !stage) {
        throw new Error("Load the test scenario before submitting an action.");
      }
      const scope = {
        sessionId: current.session.id,
        scenarioId,
      };
      switch (stage.type) {
        case "challenge":
          manager.submitAction(playerId, { ...scope, type: "submit", input });
          break;
        case "reflection":
          manager.submitAction(playerId, { ...scope, type: "reflect" });
          break;
        case "complete":
          manager.completeScenario(playerId);
          break;
        default:
          manager.submitAction(playerId, { ...scope, type: "advance" });
      }
    });
  }

  if (phase !== "READY") {
    return (
      <InitializationScreen
        phase={phase}
        failure={failure}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    );
  }

  return (
    <EngineDiagnostic
      snapshot={snapshot}
      gameSnapshot={gameSnapshot}
      health={health}
      commandError={commandError}
      onCreatePlayer={createPlayer}
      onSwitchPlayer={switchPlayer}
      onStartGame={() =>
        withActivePlayer((manager, playerId) => manager.startGame(playerId))
      }
      onResumeGame={() =>
        withActivePlayer((manager, playerId) => manager.resumeGame(playerId))
      }
      onPauseGame={() =>
        withActivePlayer((manager, playerId) => manager.pauseGame(playerId))
      }
      onLoadScenario={() =>
        withActivePlayer((manager, playerId) =>
          manager.loadScenario(playerId, PLACEHOLDER_SCENARIO_ID),
        )
      }
      onSubmitAction={() => submitStageAction("clear")}
      onSubmitFailedAction={() => submitStageAction("vague")}
      onResetProgress={() =>
        withActivePlayer((manager, playerId) =>
          manager.resetPlayerProgress(playerId),
        )
      }
    />
  );
}

function InitializationScreen({
  phase,
  failure,
  onRetry,
}: {
  phase: ApplicationInitializationPhase;
  failure: ApplicationInitializationError | null;
  onRetry: () => void;
}) {
  const showDiagnostics = process.env.NODE_ENV !== "production";
  return (
    <main className="initialization-screen" data-testid="initialization-screen">
      <p className="diagnostic-kicker">AROUND THE A</p>
      <h1>{failure ? "INITIALIZATION FAILED" : phase}</h1>
      <p>
        {failure?.publicMessage ??
          "Connecting the player profile and game engine."}
      </p>
      {failure && showDiagnostics && failure.diagnosticMessage && (
        <pre>{failure.diagnosticMessage}</pre>
      )}
      {failure && (
        <button type="button" onClick={onRetry}>
          RETRY
        </button>
      )}
    </main>
  );
}
