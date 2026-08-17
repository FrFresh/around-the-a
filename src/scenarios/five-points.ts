import type { Scenario as LegacyScenario } from "../game/types.ts";
import type { ScenarioDefinition } from "../scenario-engine/index.ts";
import type { BadgeId, ScenarioId, SkillId } from "../types/index.ts";
import { ASK_BETTER_EVALUATOR_ID } from "../evaluators/ask-better.ts";

export const FIVE_POINTS_SCENARIO_ID = "five-points-prompting" as ScenarioId;
export const PONCE_TEASER_SCENARIO_ID = "ponce-verification" as ScenarioId;
export const ASK_BETTER_SKILL_ID = "ask-better" as SkillId;
export const ASK_BETTER_BADGE_ID = "better-questions" as BadgeId;

/** Production authored content for the first playable Around the A stop. */
export const fivePointsScenarioDefinition: ScenarioDefinition = {
  id: FIVE_POINTS_SCENARIO_ID,
  version: 1,
  location: {
    id: "five-points-station",
    name: "five-points",
    displayName: "Five Points Station",
  },
  title: "Ask Better",
  literacySkillId: ASK_BETTER_SKILL_ID,
  prerequisiteScenarioIds: [],
  startStageId: "intro",
  stages: [
    {
      id: "intro",
      type: "intro",
      text: "Atlanta is changing. AI is becoming part of everyday life. Learn to use it without letting it use you.",
      nextStageId: "dialogue",
    },
    {
      id: "dialogue",
      type: "dialogue",
      speaker: "Maya",
      portraitId: "five-points-guide",
      text: "Five Points is packed, the Gold Line board says DELAYED, and your Midtown interview starts in 18 minutes. You have $6 and 9% phone battery. Ask me what you need to know.",
      nextStageId: "challenge",
    },
    {
      id: "challenge",
      type: "challenge",
      objective: "Ask Maya for a plan that fits your real situation.",
      inputPrompt: "Type your question to Maya…",
      evaluatorId: ASK_BETTER_EVALUATOR_ID,
      successCriteria: { minimumScore: 3 },
      retryAllowed: true,
      hints: [
        "Your destination is clear. What does Maya need to know about where you are and what limits you?",
        "Try including your goal, Five Points context, one real constraint, and the kind of answer you want.",
        "Example shape: I’m at ___. I need ___. I only have ___. Give me ___.",
      ],
      successFeedback: "Now Maya can give you a route you can actually use.",
      retryFeedback:
        "That answer leaves Maya guessing. Add the missing details and ask again.",
      nextOnSuccess: "reflection",
      nextOnRetry: "feedback",
    },
    {
      id: "feedback",
      type: "feedback",
      text: "A better question gives the helper enough to work with. Keep your good details and add what is missing.",
      nextStageId: "challenge",
    },
    {
      id: "reflection",
      type: "reflection",
      prompt:
        "Notice what changed: your goal, context, constraints, and requested output turned a vague clue into a usable plan.",
      responseOptional: true,
      nextStageId: "reward",
    },
    {
      id: "reward",
      type: "reward",
      text: "ASK BETTER is ready to stamp onto your AI Literacy A-Card.",
      nextStageId: "complete",
    },
    {
      id: "complete",
      type: "complete",
      text: "Five Points complete. Collect your A Points and see where the train goes next.",
    },
  ],
  reward: {
    xp: 100,
    aPoints: 100,
    badgeIds: [ASK_BETTER_BADGE_ID],
  },
  nextScenarioIds: [PONCE_TEASER_SCENARIO_ID],
};

/** @deprecated Compatibility data for the original prototype engine. */
export const fivePoints: LegacyScenario = {
  id: "five-points-prompting",
  title: "The Midtown Move",
  location: { name: "Five Points", district: "Downtown Atlanta" },
  skill: "askBetter",
  successCriteria: {
    minimumScore: 3,
    requiredDimensions: ["goal", "context", "constraints"],
  },
  rewards: { xp: 100, points: 100, badge: "Better Questions" },
  nextScenarioId: "ponce-verification",
};
