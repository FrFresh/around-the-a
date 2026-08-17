export type Dimension = "goal" | "context" | "constraints" | "desiredOutput";
export type Dimensions = Record<Dimension, boolean>;

export type EvaluationResult = {
  score: number;
  maxScore: number;
  dimensions: Dimensions;
  feedback: string;
  npcResponse: string;
  passed: boolean;
};

export type Scenario = {
  id: string;
  title: string;
  location: { name: string; district: string };
  skill: "askBetter" | "assess" | "adapt" | "privacy" | "oversight";
  successCriteria: { minimumScore: number; requiredDimensions: Dimension[] };
  rewards: { xp: number; points: number; badge: string };
  nextScenarioId: string | null;
};

export type PlayerState = {
  currentScenarioId: string;
  completedScenarios: string[];
  unlockedScenarios: string[];
  skills: Record<Scenario["skill"], number>;
  xp: number;
  aPoints: number;
  badges: string[];
  scenarioAttempts: Record<string, number>;
};

export const defaultPlayer: PlayerState = {
  currentScenarioId: "five-points-prompting",
  completedScenarios: [],
  unlockedScenarios: ["five-points-prompting"],
  skills: { askBetter: 0, assess: 0, adapt: 0, privacy: 0, oversight: 0 },
  xp: 0, aPoints: 0, badges: [], scenarioAttempts: {},
};
