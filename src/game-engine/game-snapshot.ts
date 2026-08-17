import type {
  GameSession,
  Player,
  PlayerProgress,
  ScenarioId,
  ScenarioState,
} from "../types/index.ts";
import type {
  ScenarioContentSnapshot,
  ScenarioEngine,
  ScenarioStageSnapshot,
} from "../scenario-engine/index.ts";

export interface PlayerSnapshot {
  readonly id: Player["id"];
  readonly displayName: string;
}

/** Player-only, immutable projection intended for game UI rendering. */
export interface GameSnapshot {
  readonly player: PlayerSnapshot;
  readonly session: Readonly<GameSession>;
  readonly scenario: Readonly<ScenarioState> | null;
  readonly scenarioContent: Readonly<ScenarioContentSnapshot> | null;
  readonly currentStage: Readonly<ScenarioStageSnapshot> | null;
  readonly progression: {
    readonly completedScenarioIds: readonly ScenarioId[];
    readonly unlockedScenarioIds: readonly ScenarioId[];
    readonly availableScenarioIds: readonly ScenarioId[];
  };
  readonly rewards: {
    readonly xp: number;
    readonly aPoints: number;
    readonly badgeIds: readonly string[];
  };
}

export function createGameSnapshot(
  player: Player,
  progress: PlayerProgress,
  session: GameSession,
  availableScenarioIds: ScenarioId[],
  scenarios?: ScenarioEngine,
): GameSnapshot {
  const scenario = session.currentScenarioId
    ? (progress.scenarioStates[session.currentScenarioId] ?? null)
    : null;
  return structuredClone({
    player: { id: player.id, displayName: player.displayName },
    session,
    scenario,
    scenarioContent:
      scenario && scenarios ? scenarios.getContentSnapshot(scenario) : null,
    currentStage:
      scenario && scenarios ? scenarios.getStageSnapshot(scenario) : null,
    progression: {
      completedScenarioIds: progress.completedScenarioIds,
      unlockedScenarioIds: progress.unlockedScenarioIds,
      availableScenarioIds,
    },
    rewards: {
      xp: progress.xp,
      aPoints: progress.aPoints,
      badgeIds: progress.passport.earnedBadgeIds,
    },
  });
}
