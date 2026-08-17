declare const brand: unique symbol;

export type Identifier<Entity extends string> = string & {
  readonly [brand]: Entity;
};

export type PlayerId = Identifier<"Player">;
export type ScenarioId = Identifier<"Scenario">;
export type BadgeId = Identifier<"Badge">;
export type SkillId = Identifier<"Skill">;
