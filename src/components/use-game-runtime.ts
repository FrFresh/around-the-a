"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createBrowserGameManager,
  initializeApplication,
  type ApplicationInitializationError,
  type ApplicationInitializationPhase,
  type ApplicationSnapshot,
  type GameHealthCheck,
  type GameManager,
  type GameSnapshot,
} from "../game-engine/index.ts";
import { defaultPlayer } from "../game/player-state.ts";
import type { ScenarioAction } from "../scenario-engine/index.ts";
import type { PlayerId, ScenarioId } from "../types/index.ts";

const emptySnapshot: ApplicationSnapshot = {
  players: [],
  activeSave: null,
  state: defaultPlayer,
};

export interface GameRuntime {
  phase: ApplicationInitializationPhase;
  failure: ApplicationInitializationError | null;
  snapshot: ApplicationSnapshot;
  gameSnapshot: GameSnapshot | null;
  health: GameHealthCheck | null;
  commandError: string | null;
  retryInitialization(): void;
  createAndStart(displayName: string): boolean;
  selectAndContinue(playerId: PlayerId): boolean;
  continueActive(): boolean;
  switchPlayer(playerId: PlayerId): void;
  deletePlayer(playerId: PlayerId): void;
  pauseActive(): void;
  loadScenario(scenarioId: ScenarioId): void;
  submitAction(action: ScenarioAction): void;
  completeScenario(): void;
  resetActiveProgress(): void;
}

export function useGameRuntime(): GameRuntime {
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

  function run(command: (manager: GameManager) => void): boolean {
    if (!game) return false;
    setCommandError(null);
    try {
      command(game);
      refresh(game);
      return true;
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  function activePlayerId(): PlayerId | null {
    return snapshot.activeSave?.player.id ?? null;
  }

  function continuePlayer(manager: GameManager, playerId: PlayerId): void {
    manager.switchPlayer(playerId);
    const current = manager.getGameSnapshot(playerId);
    if (current.session.status === "not_started") manager.startGame(playerId);
    if (current.session.status === "paused") manager.resumeGame(playerId);
  }

  return {
    phase,
    failure,
    snapshot,
    gameSnapshot,
    health,
    commandError,
    retryInitialization: () => setRetryKey((value) => value + 1),
    createAndStart: (displayName) =>
      run((manager) => {
        const created = manager.createPlayer(displayName).activeSave;
        if (!created) throw new Error("Player profile was not created.");
        manager.startGame(created.player.id);
      }),
    selectAndContinue: (playerId) =>
      run((manager) => continuePlayer(manager, playerId)),
    continueActive: () => {
      const playerId = activePlayerId();
      return playerId
        ? run((manager) => continuePlayer(manager, playerId))
        : false;
    },
    switchPlayer: (playerId) => {
      run((manager) => manager.switchPlayer(playerId));
    },
    deletePlayer: (playerId) => {
      run((manager) => manager.deletePlayer(playerId));
    },
    pauseActive: () => {
      const playerId = activePlayerId();
      if (playerId) run((manager) => manager.pauseGame(playerId));
    },
    loadScenario: (scenarioId) => {
      const playerId = activePlayerId();
      if (playerId)
        run((manager) => manager.loadScenario(playerId, scenarioId));
    },
    submitAction: (action) => {
      const playerId = activePlayerId();
      if (!playerId || !gameSnapshot?.session.currentScenarioId) return;
      run((manager) =>
        manager.submitAction(playerId, {
          ...action,
          sessionId: gameSnapshot.session.id,
          scenarioId: gameSnapshot.session.currentScenarioId as ScenarioId,
        }),
      );
    },
    completeScenario: () => {
      const playerId = activePlayerId();
      if (playerId) run((manager) => manager.completeScenario(playerId));
    },
    resetActiveProgress: () => {
      const playerId = activePlayerId();
      if (playerId) run((manager) => manager.resetPlayerProgress(playerId));
    },
  };
}
