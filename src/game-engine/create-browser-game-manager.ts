import { BrowserStorageService } from "../storage/index.ts";
import { createGameManager } from "./create-game-manager.ts";

export function createBrowserGameManager() {
  return createGameManager({ storage: new BrowserStorageService() });
}
