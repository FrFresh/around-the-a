import type {
  Player,
  PlayerId,
  PlayerImportOptions,
  SaveData,
} from "../types/index.ts";

export interface PlayerStorage {
  listPlayers(): Player[];
  readPlayer(id: PlayerId): SaveData | null;
  writePlayer(save: SaveData): void;
  exportPlayer(id: PlayerId): string;
  importPlayer(serializedSave: string, options?: PlayerImportOptions): SaveData;
  deletePlayer(id: PlayerId): void;
  getActivePlayerId(): PlayerId | null;
  setActivePlayerId(id: PlayerId | null): void;
}
