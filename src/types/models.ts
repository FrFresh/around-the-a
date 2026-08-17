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

export interface PlayerSession {
  playerId: PlayerId;
  startedAt: ISODateString;
  lastActiveAt: ISODateString;
}

export interface PlayerSaveData {
  player: Player;
  progress: PlayerProgress;
  session: PlayerSession;
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

export interface ScenarioState {
  scenarioId: ScenarioId;
  status: ScenarioStatus;
  currentStageIndex: number;
  attempts: number;
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
  skillId: SkillId;
  reward: Reward;
  nextScenarioId: ScenarioId | null;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  maxScore: number;
  dimensions: Readonly<Record<string, boolean>>;
  feedback: string;
}
