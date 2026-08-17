import type { BadgeId, PlayerId, ScenarioId, SkillId } from "./identifiers.ts";

export type ISODateString = string;

export interface Player {
  id: PlayerId;
  displayName: string;
  createdAt: ISODateString;
}

export interface PlayerProgress {
  playerId: PlayerId;
  currentScenarioId: ScenarioId | null;
  completedScenarioIds: ScenarioId[];
  unlockedScenarioIds: ScenarioId[];
  xp: number;
  aPoints: number;
  unlockedSkillIds: SkillId[];
  skillLevels: Partial<Record<SkillId, number>>;
  inventory: Inventory;
  passport: Passport;
  scenarioAttempts: Partial<Record<ScenarioId, number>>;
  scenarioStates: Partial<Record<ScenarioId, ScenarioState>>;
  updatedAt: ISODateString;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface Inventory {
  items: InventoryItem[];
}

export interface Passport {
  earnedBadgeIds: BadgeId[];
  unlockedSkillIds: SkillId[];
}

export type GameSessionStatus =
  | "not_started"
  | "active"
  | "paused"
  | "completed";

export interface GameSession {
  id: string;
  playerId: PlayerId;
  status: GameSessionStatus;
  currentScenarioId: ScenarioId | null;
  currentStageId: ScenarioStageId | null;
  startedAt: ISODateString | null;
  updatedAt: ISODateString;
}

/** @deprecated Use GameSession. Retained as a source-compatible alias. */
export type PlayerSession = GameSession;

export interface PlayerSaveData {
  player: Player;
  progress: PlayerProgress;
  session: GameSession;
}

/** Domain save data used by the game engine after persistence validation. */
export type SaveData = PlayerSaveData;

/** Versioned representation used at persistence and transfer boundaries. */
export interface PlayerSaveEnvelope {
  schemaVersion: number;
  playerId: PlayerId;
  savedAt: ISODateString;
  data: PlayerSaveData;
}

export interface PlayerImportOptions {
  /** Existing saves are rejected unless replacement is explicitly authorized. */
  overwrite?: boolean;
  /** Imported players become active by default. */
  activate?: boolean;
}

export type ScenarioStatus = "locked" | "available" | "active" | "completed";

export type ScenarioStageId = string;

export type ScenarioStageType =
  | "intro"
  | "dialogue"
  | "challenge"
  | "feedback"
  | "reflection"
  | "reward"
  | "complete";

export interface ScenarioState {
  playerId: PlayerId;
  scenarioId: ScenarioId;
  status: ScenarioStatus;
  currentStageId: ScenarioStageId | null;
  completedStageIds: ScenarioStageId[];
  attempts: number;
  attemptsByStageId: Partial<Record<ScenarioStageId, number>>;
  latestEvaluation: EvaluationResult | null;
  availableHint: string | null;
  reflectionResponses: Partial<Record<ScenarioStageId, string>>;
}

export interface Reward {
  xp: number;
  aPoints: number;
  badgeIds: BadgeId[];
}

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  skillId: SkillId;
}

export interface Skill {
  id: SkillId;
  name: string;
  description: string;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  literacySkillId: SkillId;
  prerequisiteScenarioIds: ScenarioId[];
  nextScenarioIds: ScenarioId[];
  stageIds: ScenarioStageId[];
  reward: Reward;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  feedback: string;
  hint?: string;
  metadata?: Readonly<Record<string, unknown>>;
  /** Compatibility detail for existing rule-based evaluators. */
  maxScore?: number;
  /** Compatibility detail for existing rule-based evaluators. */
  dimensions?: Readonly<Record<string, boolean>>;
  /** Optional in-world response authored by a deterministic or remote evaluator. */
  npcResponse?: string;
}
