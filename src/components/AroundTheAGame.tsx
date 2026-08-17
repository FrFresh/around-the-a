"use client";

import { useState } from "react";
import {
  ASK_BETTER_SKILL_ID,
  FIVE_POINTS_SCENARIO_ID,
} from "../game-engine/index.ts";
import { PlayerSelector } from "./PlayerSelector.tsx";
import { GameInitializationScreen } from "./GameInitializationScreen.tsx";
import {
  ACard,
  AtlantaTransition,
  ChallengePanel,
  DialogueBox,
  FivePointsScene,
  GameHUD,
  LevelComplete,
  PixelButton,
  TitleScreen,
} from "./game/index.ts";
import { useGameRuntime } from "./use-game-runtime.ts";

type PlayerView = "title" | "players" | "game" | "a-card";

export function AroundTheAGame() {
  const runtime = useGameRuntime();
  const [view, setView] = useState<PlayerView>("title");
  const [returnView, setReturnView] = useState<PlayerView>("title");

  if (runtime.phase !== "READY") {
    return (
      <GameInitializationScreen
        phase={runtime.phase}
        failure={runtime.failure}
        onRetry={runtime.retryInitialization}
      />
    );
  }

  const activeSave = runtime.snapshot.activeSave;
  const game = runtime.gameSnapshot;

  function continueActive(): void {
    if (runtime.continueActive()) setView("game");
  }

  function selectAndContinue(
    playerId: Parameters<typeof runtime.selectAndContinue>[0],
  ): void {
    if (runtime.selectAndContinue(playerId)) setView("game");
  }

  function createAndStart(displayName: string): void {
    if (runtime.createAndStart(displayName)) setView("game");
  }

  function openACard(from: PlayerView): void {
    setReturnView(from);
    setView("a-card");
  }

  function returnToTitle(): void {
    if (game?.session.status === "active") runtime.pauseActive();
    setView("title");
  }

  if (view === "title") {
    return (
      <TitleScreen
        canContinue={Boolean(activeSave)}
        canOpenACard={Boolean(activeSave)}
        playerName={activeSave?.player.displayName}
        onStart={() => setView("players")}
        onContinue={continueActive}
        onOpenACard={() => openACard("title")}
      />
    );
  }

  if (view === "players") {
    return (
      <main className="game-shell player-entry-shell">
        <PlayerSelector
          players={runtime.snapshot.players}
          activePlayerId={activeSave?.player.id ?? null}
          onCreate={createAndStart}
          onSelect={selectAndContinue}
          onDelete={runtime.deletePlayer}
          onClose={() => setView("title")}
        />
      </main>
    );
  }

  if (view === "a-card" && activeSave && game) {
    return (
      <GameFrame
        game={game}
        onHome={returnToTitle}
        onOpenACard={() => undefined}
        onReset={() => {
          runtime.resetActiveProgress();
          setView("title");
        }}
      >
        <ACard
          playerName={game.player.displayName}
          xp={game.rewards.xp}
          aPoints={game.rewards.aPoints}
          unlockedSkillIds={game.progression.unlockedSkillIds}
          onBack={() => setView(returnView)}
        />
      </GameFrame>
    );
  }

  if (!activeSave || !game) {
    return (
      <main className="empty-game-state">
        <p>NO TRAVELER SELECTED</p>
        <PixelButton onClick={() => setView("players")}>
          CHOOSE PLAYER
        </PixelButton>
      </main>
    );
  }

  const stage = game.currentStage;
  const evaluation = game.scenario?.latestEvaluation ?? null;
  const completedFivePoints = game.progression.completedScenarioIds.includes(
    FIVE_POINTS_SCENARIO_ID,
  );

  return (
    <GameFrame
      game={game}
      onHome={returnToTitle}
      onOpenACard={() => openACard("game")}
      onReset={() => {
        runtime.resetActiveProgress();
        setView("title");
      }}
    >
      {runtime.commandError && (
        <div className="game-error" role="alert">
          {runtime.commandError}
        </div>
      )}
      {!stage && completedFivePoints ? (
        <AtlantaTransition mode="next" onContinue={() => setView("title")} />
      ) : stage?.type === "intro" ? (
        <AtlantaTransition
          text={stage.text}
          onContinue={() => runtime.submitAction({ type: "advance" })}
        />
      ) : stage?.type === "dialogue" ? (
        <ScenarioLayout>
          <FivePointsScene mood="talking" />
          <DialogueBox
            speaker={stage.speaker}
            role="FIVE POINTS REGULAR"
            actionLabel="ASK FOR HELP"
            onAdvance={() => runtime.submitAction({ type: "advance" })}
          >
            <p>{stage.text}</p>
          </DialogueBox>
        </ScenarioLayout>
      ) : stage?.type === "challenge" ? (
        <ScenarioLayout>
          <FivePointsScene mood="talking" />
          <DialogueBox speaker="Maya" role="FIVE POINTS REGULAR">
            <p>Go ahead—what do you need to know?</p>
          </DialogueBox>
          <ChallengePanel
            objective={stage.objective}
            inputPrompt={stage.inputPrompt}
            attempt={stage.attemptCount}
            hint={stage.availableHint}
            onSubmit={(input) =>
              runtime.submitAction({ type: "submit", input })
            }
            onRetry={() => undefined}
          />
        </ScenarioLayout>
      ) : stage?.type === "feedback" && evaluation ? (
        <ScenarioLayout>
          <FivePointsScene mood="talking" />
          <DialogueBox speaker="Maya" role="FIVE POINTS REGULAR">
            <p>{evaluation.npcResponse ?? stage.text}</p>
          </DialogueBox>
          <ChallengePanel
            objective={stage.text}
            inputPrompt=""
            attempt={stage.attemptCount}
            hint={stage.availableHint}
            evaluation={evaluation}
            feedbackMode
            onSubmit={() => undefined}
            onRetry={() => runtime.submitAction({ type: "advance" })}
          />
        </ScenarioLayout>
      ) : stage?.type === "reflection" ? (
        <LevelComplete
          mode="success"
          evaluation={evaluation}
          reward={game.scenarioContent?.reward ?? { xp: 100, aPoints: 100 }}
          onContinue={() => runtime.submitAction({ type: "reflect" })}
        />
      ) : stage?.type === "reward" ? (
        <ACard
          playerName={game.player.displayName}
          xp={game.rewards.xp}
          aPoints={game.rewards.aPoints}
          unlockedSkillIds={game.progression.unlockedSkillIds}
          previewAskBetter={
            !game.progression.unlockedSkillIds.includes(ASK_BETTER_SKILL_ID)
          }
          actionLabel="STAMP ASK BETTER"
          onAction={() => runtime.submitAction({ type: "advance" })}
        />
      ) : stage?.type === "complete" ? (
        <LevelComplete
          mode="collect"
          evaluation={evaluation}
          reward={game.scenarioContent?.reward ?? { xp: 100, aPoints: 100 }}
          onContinue={runtime.completeScenario}
        />
      ) : (
        <main className="empty-game-state">
          <p>FIVE POINTS IS READY</p>
          <PixelButton
            onClick={() => runtime.loadScenario(FIVE_POINTS_SCENARIO_ID)}
          >
            ENTER STATION
          </PixelButton>
        </main>
      )}
    </GameFrame>
  );
}

function GameFrame({
  game,
  children,
  onHome,
  onOpenACard,
  onReset,
}: {
  game: NonNullable<ReturnType<typeof useGameRuntime>["gameSnapshot"]>;
  children: React.ReactNode;
  onHome(): void;
  onOpenACard(): void;
  onReset(): void;
}) {
  return (
    <div className="game-shell">
      <GameHUD
        snapshot={game}
        onHome={onHome}
        onOpenACard={onOpenACard}
        onReset={onReset}
      />
      {children}
      <footer className="game-footer">
        <span>AROUND THE A · MILESTONE 2</span>
        <span>FIVE POINTS</span>
      </footer>
    </div>
  );
}

function ScenarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="scenario-layout" data-testid="five-points-gameplay">
      <header className="level-banner">
        <span>STOP 01 · DOWNTOWN ATLANTA</span>
        <h1>FIVE POINTS</h1>
        <p>ASK BETTER</p>
      </header>
      {children}
    </main>
  );
}
