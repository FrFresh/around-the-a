import { defaultPlayer, type PlayerState } from "../game/player-state.ts";
import type { GameStorage } from "../storage/game-storage.ts";
import type { BadgeId, SaveData, ScenarioId, SkillId } from "../types/index.ts";
import type { PlayerManager } from "./player-manager.ts";

export class PlayerGameStorage implements GameStorage {
  private readonly players: PlayerManager;

  constructor(players: PlayerManager) {
    this.players = players;
  }

  loadPlayer(): PlayerState {
    const save = this.players.loadActivePlayer();
    return save ? this.toGameState(save) : structuredClone(defaultPlayer);
  }

  savePlayer(state: PlayerState): void {
    const save = this.players.loadActivePlayer();
    if (!save)
      throw new Error("Cannot save progress without an active player.");
    const unlockedSkillIds = Object.entries(state.skills)
      .filter(([, level]) => level > 0)
      .map(([skill]) => skill as SkillId);

    this.players.savePlayer({
      ...save,
      progress: {
        ...save.progress,
        currentScenarioId: state.currentScenarioId as ScenarioId,
        completedScenarioIds: state.completedScenarios as ScenarioId[],
        unlockedScenarioIds: state.unlockedScenarios as ScenarioId[],
        xp: state.xp,
        aPoints: state.aPoints,
        unlockedSkillIds,
        skillLevels: state.skills as Partial<Record<SkillId, number>>,
        passport: {
          earnedBadgeIds: state.badges as BadgeId[],
          unlockedSkillIds,
        },
        scenarioAttempts: state.scenarioAttempts as Partial<
          Record<ScenarioId, number>
        >,
      },
    });
  }

  private toGameState(save: SaveData): PlayerState {
    const skills = { ...defaultPlayer.skills };
    for (const [skill, level] of Object.entries(save.progress.skillLevels)) {
      if (skill in skills) {
        skills[skill as keyof typeof skills] = level ?? 0;
      }
    }
    return {
      currentScenarioId:
        save.progress.currentScenarioId ?? defaultPlayer.currentScenarioId,
      completedScenarios: [...save.progress.completedScenarioIds],
      unlockedScenarios: [...save.progress.unlockedScenarioIds],
      skills,
      xp: save.progress.xp,
      aPoints: save.progress.aPoints,
      badges: [...save.progress.passport.earnedBadgeIds],
      scenarioAttempts: Object.fromEntries(
        Object.entries(save.progress.scenarioAttempts).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      ),
    };
  }
}
