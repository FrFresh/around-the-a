import type { ApplicationSnapshot } from "./game-manager.interface.ts";
import type { GameManager } from "./game-manager.ts";

export type ApplicationInitializationPhase =
  | "BOOTING"
  | "INITIALIZING_PLAYER"
  | "LOADING_SAVE"
  | "READY"
  | "ERROR";

export interface ApplicationInitializationError {
  phase: "ERROR";
  publicMessage: string;
  diagnosticMessage?: string;
}

export type ApplicationInitializationResult =
  | {
      phase: "READY";
      game: GameManager;
      snapshot: ApplicationSnapshot;
    }
  | ApplicationInitializationError;

export interface ApplicationInitializer {
  (
    report: (phase: ApplicationInitializationPhase) => void,
  ): Promise<GameManager>;
}

export async function initializeApplication(
  initialize: ApplicationInitializer,
  report: (phase: ApplicationInitializationPhase) => void,
): Promise<ApplicationInitializationResult> {
  report("BOOTING");
  try {
    const game = await initialize(report);
    const snapshot = game.getSnapshot();
    report("READY");
    return { phase: "READY", game, snapshot };
  } catch (error) {
    report("ERROR");
    return {
      phase: "ERROR",
      publicMessage: "The game engine could not initialize.",
      diagnosticMessage: error instanceof Error ? error.message : String(error),
    };
  }
}
