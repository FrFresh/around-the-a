import type { Scenario } from "../game/types.ts";

export const fivePoints: Scenario = {
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
