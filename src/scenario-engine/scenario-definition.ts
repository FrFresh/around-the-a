import type {
  Reward,
  ScenarioId,
  ScenarioStageId,
  ScenarioStageType,
  SkillId,
} from "../types/index.ts";

export interface ScenarioLocationDefinition {
  id: string;
  name: string;
  displayName: string;
}

interface BaseStageDefinition {
  id: ScenarioStageId;
  type: ScenarioStageType;
}

export interface IntroStageDefinition extends BaseStageDefinition {
  type: "intro";
  text: string;
  nextStageId: ScenarioStageId;
}

export interface DialogueResponseDefinition {
  id: string;
  text: string;
  nextStageId: ScenarioStageId;
}

export interface DialogueStageDefinition extends BaseStageDefinition {
  type: "dialogue";
  speaker: string;
  portraitId?: string;
  text: string;
  responses?: DialogueResponseDefinition[];
  nextStageId?: ScenarioStageId;
}

export interface ChallengeSuccessCriteria {
  minimumScore: number;
}

export interface ChallengeStageDefinition extends BaseStageDefinition {
  type: "challenge";
  objective: string;
  inputPrompt: string;
  evaluatorId: string;
  successCriteria: ChallengeSuccessCriteria;
  retryAllowed: boolean;
  hints: string[];
  successFeedback: string;
  retryFeedback: string;
  nextOnSuccess: ScenarioStageId;
  nextOnRetry: ScenarioStageId;
}

export interface FeedbackStageDefinition extends BaseStageDefinition {
  type: "feedback";
  text: string;
  nextStageId: ScenarioStageId;
}

export interface ReflectionStageDefinition extends BaseStageDefinition {
  type: "reflection";
  prompt: string;
  responseOptional: boolean;
  nextStageId: ScenarioStageId;
}

export interface RewardStageDefinition extends BaseStageDefinition {
  type: "reward";
  text: string;
  nextStageId: ScenarioStageId;
}

export interface CompleteStageDefinition extends BaseStageDefinition {
  type: "complete";
  text: string;
}

export type ScenarioStageDefinition =
  | IntroStageDefinition
  | DialogueStageDefinition
  | ChallengeStageDefinition
  | FeedbackStageDefinition
  | ReflectionStageDefinition
  | RewardStageDefinition
  | CompleteStageDefinition;

export interface ScenarioDefinition {
  id: ScenarioId;
  version: number;
  location: ScenarioLocationDefinition;
  title: string;
  literacySkillId: SkillId;
  prerequisiteScenarioIds: ScenarioId[];
  startStageId: ScenarioStageId;
  stages: ScenarioStageDefinition[];
  reward: Reward;
  nextScenarioIds: ScenarioId[];
}
