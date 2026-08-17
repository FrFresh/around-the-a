"use client";

import { FIVE_POINTS_SCENARIO_ID } from "../game-engine/index.ts";
import { EngineDiagnostic } from "./EngineDiagnostic.tsx";
import { GameInitializationScreen } from "./GameInitializationScreen.tsx";
import { useGameRuntime } from "./use-game-runtime.ts";

export function EngineDiagnosticApp() {
  const runtime = useGameRuntime();

  if (runtime.phase !== "READY") {
    return (
      <GameInitializationScreen
        phase={runtime.phase}
        failure={runtime.failure}
        onRetry={runtime.retryInitialization}
        diagnostic
      />
    );
  }

  function stageAction(input: string): void {
    const stage = runtime.gameSnapshot?.currentStage;
    if (!stage) return;
    if (stage.type === "challenge") {
      runtime.submitAction({ type: "submit", input });
    } else if (stage.type === "reflection") {
      runtime.submitAction({ type: "reflect" });
    } else if (stage.type === "complete") {
      runtime.completeScenario();
    } else {
      runtime.submitAction({ type: "advance" });
    }
  }

  return (
    <EngineDiagnostic
      snapshot={runtime.snapshot}
      gameSnapshot={runtime.gameSnapshot}
      health={runtime.health}
      commandError={runtime.commandError}
      onCreatePlayer={(name) => runtime.createAndStart(name)}
      onSwitchPlayer={runtime.switchPlayer}
      onStartGame={runtime.continueActive}
      onResumeGame={runtime.continueActive}
      onPauseGame={runtime.pauseActive}
      onLoadScenario={() => runtime.loadScenario(FIVE_POINTS_SCENARIO_ID)}
      onSubmitAction={() =>
        stageAction(
          "I’m at Five Points. I need to reach my Midtown interview in 18 minutes with 9% battery. Give me two reliable routes and recommend one.",
        )
      }
      onSubmitFailedAction={() => stageAction("How do I get to Midtown?")}
      onResetProgress={runtime.resetActiveProgress}
    />
  );
}
