import type {
  BadgeId,
  ISODateString,
  PlayerId,
  ScenarioId,
  ScenarioStageId,
} from "../types/index.ts";

interface GameEventBase {
  playerId: PlayerId;
  occurredAt: ISODateString;
}

export type GameEvent =
  | (GameEventBase & { type: "GameStarted" })
  | (GameEventBase & { type: "GameResumed" })
  | (GameEventBase & { type: "GamePaused" })
  | (GameEventBase & { type: "ScenarioStarted"; scenarioId: ScenarioId })
  | (GameEventBase & {
      type: "StageCompleted";
      scenarioId: ScenarioId;
      stageId: ScenarioStageId;
    })
  | (GameEventBase & { type: "ScenarioCompleted"; scenarioId: ScenarioId })
  | (GameEventBase & {
      type: "RewardGranted";
      scenarioId: ScenarioId;
      xp: number;
      aPoints: number;
      badgeIds: BadgeId[];
    })
  | (GameEventBase & { type: "ScenarioUnlocked"; scenarioId: ScenarioId });
