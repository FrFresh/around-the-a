import { defaultPlayer, type PlayerState } from "../game/player-state.ts";
import type { StorageService } from "../storage/storage-service.interface.ts";
import type { SaveData } from "../types/index.ts";
import type { PlayerGameStorage } from "./player-game-storage.ts";
import type { PlayerManager } from "./player-manager.ts";

const LEGACY_SAVE_KEY = "around-the-a:player:v1";

export function migrateLegacySave(
  storage: StorageService,
  players: PlayerManager,
  gameStorage: PlayerGameStorage,
): SaveData | null {
  try {
    if (players.listPlayers().length > 0) return players.loadActivePlayer();
    const legacy = storage.read<Partial<PlayerState>>(LEGACY_SAVE_KEY);
    if (!legacy) return null;
    players.createPlayer("ATL Explorer");
    gameStorage.savePlayer({ ...structuredClone(defaultPlayer), ...legacy });
    storage.remove(LEGACY_SAVE_KEY);
    return players.loadActivePlayer();
  } catch {
    return null;
  }
}
