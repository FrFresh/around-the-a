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
