import { PHASE_FOUR_TEST_SCENARIO_ID } from "../scenario-engine/index.ts";
import type { PlayerManager } from "./player-manager.ts";

/**
 * Removes progress created only by the development diagnostic before the first
 * playable scenario shipped. Player identity is preserved; gameplay restarts
 * at Five Points through PlayerManager's normal fresh-save path.
 */
export function migratePhaseFourFixtureSaves(players: PlayerManager): void {
  for (const player of players.listPlayers()) {
    const save = players.loadPlayer(player.id);
    if (!save) continue;
    const containsFixture =
      save.session.currentScenarioId === PHASE_FOUR_TEST_SCENARIO_ID ||
      save.progress.completedScenarioIds.includes(
        PHASE_FOUR_TEST_SCENARIO_ID,
      ) ||
      PHASE_FOUR_TEST_SCENARIO_ID in save.progress.scenarioStates;
    if (containsFixture) players.resetPlayerProgress(player.id);
  }
}
