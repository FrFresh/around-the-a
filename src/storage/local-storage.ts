import { defaultPlayer, type PlayerState } from "../game/player-state.ts";
import type { GameStorage } from "./game-storage.ts";

const KEY = "around-the-a:player:v1";
export class LocalStorageGameStorage implements GameStorage {
  loadPlayer(): PlayerState {
    if (typeof window === "undefined") return structuredClone(defaultPlayer);
    try {
      const saved = window.localStorage.getItem(KEY);
      return saved ? { ...structuredClone(defaultPlayer), ...JSON.parse(saved) } : structuredClone(defaultPlayer);
    } catch { return structuredClone(defaultPlayer); }
  }
  savePlayer(state: PlayerState) {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(state));
  }
}
