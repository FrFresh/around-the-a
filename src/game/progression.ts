import type { PlayerState } from "./player-state.ts";
import type { Scenario } from "./types.ts";

export function completeScenario(player: PlayerState, scenario: Scenario): PlayerState {
  if (player.completedScenarios.includes(scenario.id)) return player;
  const unlockedScenarios = scenario.nextScenarioId && !player.unlockedScenarios.includes(scenario.nextScenarioId)
    ? [...player.unlockedScenarios, scenario.nextScenarioId]
    : player.unlockedScenarios;

  return {
    ...player,
    currentScenarioId: scenario.nextScenarioId ?? scenario.id,
    completedScenarios: [...player.completedScenarios, scenario.id],
    unlockedScenarios,
    skills: { ...player.skills, [scenario.skill]: 1 },
    xp: player.xp + scenario.rewards.xp,
    aPoints: player.aPoints + scenario.rewards.points,
    badges: player.badges.includes(scenario.rewards.badge) ? player.badges : [...player.badges, scenario.rewards.badge],
  };
}
