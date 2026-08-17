import { BrowserStorageService } from "../storage/index.ts";
import { createGameManager } from "./create-game-manager.ts";
import type { ApplicationInitializationPhase } from "./application-bootstrap.ts";

export function createBrowserGameManager(
  report: (phase: ApplicationInitializationPhase) => void = () => {},
) {
  report("INITIALIZING_PLAYER");
  const storage = new BrowserStorageService();
  report("LOADING_SAVE");
  return createGameManager({ storage });
}
