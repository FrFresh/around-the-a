import type { PlayerState } from "../game/player-state.ts";
export interface GameStorage {
  loadPlayer(): PlayerState;
  savePlayer(state: PlayerState): void;
}
