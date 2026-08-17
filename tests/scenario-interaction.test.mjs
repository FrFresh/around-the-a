import assert from "node:assert/strict";
import test from "node:test";
import {
  PLACEHOLDER_SCENARIO_ID,
  createGameManager,
} from "../src/game-engine/index.ts";
import { BrowserStorageService } from "../src/storage/index.ts";

class MemoryLocalStorage {
  values = new Map();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  key(index) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key) {
    this.values.delete(key);
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

async function setup(storage = new MemoryLocalStorage(), ids = ["player-a"]) {
  const game = await createGameManager({
    storage: new BrowserStorageService(storage),
    player: {
      createId: () => ids.shift(),
      createSessionId: () => `session-${ids.length}`,
      now: () => "2026-04-01T00:00:00.000Z",
    },
  });
  return { game, storage };
}

function act(game, playerId, snapshot, action) {
  return game.submitAction(playerId, {
    ...action,
    sessionId: snapshot.session.id,
    scenarioId: snapshot.session.currentScenarioId,
  });
}

function reachChallenge(game, playerId) {
  const started = game.startGame(playerId);
  const dialogue = act(game, playerId, started, { type: "advance" });
  return act(game, playerId, dialogue, { type: "advance" });
}

test("snapshot exposes only the authored dialogue needed by the renderer", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const started = game.startGame(playerId);
  const dialogue = act(game, playerId, started, { type: "advance" });

  assert.equal(dialogue.currentStage.type, "dialogue");
  assert.equal(dialogue.currentStage.speaker, "Test Guide");
  assert.equal(dialogue.scenarioContent.title, "Scenario Engine Test");
  assert.ok(!("stages" in dialogue.scenarioContent));
});

test("failed evaluation routes through feedback, reveals hints, and retries", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const challenge = reachChallenge(game, playerId);

  const failed = act(game, playerId, challenge, {
    type: "submit",
    input: "vague",
  });
  assert.equal(failed.currentStage.type, "feedback");
  assert.equal(failed.currentStage.evaluation.passed, false);
  assert.equal(failed.currentStage.availableHint, "Try a more precise value.");
  assert.equal(failed.scenario.attempts, 1);

  const retry = act(game, playerId, failed, { type: "advance" });
  assert.equal(retry.currentStage.type, "challenge");
  const failedAgain = act(game, playerId, retry, {
    type: "submit",
    input: "still vague",
  });
  assert.equal(
    failedAgain.currentStage.availableHint,
    "The deterministic value is clear.",
  );
  assert.equal(failedAgain.scenario.attemptsByStageId.challenge, 2);
});

test("successful evaluation routes to reflection using a standardized result", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const challenge = reachChallenge(game, playerId);

  const reflection = act(game, playerId, challenge, {
    type: "submit",
    input: "clear",
  });

  assert.equal(reflection.currentStage.type, "reflection");
  assert.equal(reflection.scenario.latestEvaluation.passed, true);
  assert.equal(reflection.scenario.latestEvaluation.score, 1);
  assert.equal(typeof reflection.scenario.latestEvaluation.feedback, "string");
});

test("reflection is lightweight and rewards route only through the orchestrator", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const challenge = reachChallenge(game, playerId);
  const reflection = act(game, playerId, challenge, {
    type: "submit",
    input: "clear",
  });
  const reward = act(game, playerId, reflection, {
    type: "reflect",
    response: "Specific input made the result deterministic.",
  });

  assert.equal(reward.currentStage.type, "reward");
  assert.equal(reward.rewards.xp, 0);
  assert.equal(
    reward.scenario.reflectionResponses.reflection,
    "Specific input made the result deterministic.",
  );

  const completeStage = act(game, playerId, reward, { type: "advance" });
  assert.equal(completeStage.currentStage.type, "complete");
  assert.equal(completeStage.rewards.xp, 0);

  const completed = game.completeScenario(playerId);
  assert.equal(completed.rewards.xp, 10);
  assert.ok(
    completed.progression.completedScenarioIds.includes(
      PLACEHOLDER_SCENARIO_ID,
    ),
  );
});

test("attempts persist across refresh and remain isolated by player", async () => {
  const storage = new MemoryLocalStorage();
  const { game } = await setup(storage, ["player-a", "player-b"]);
  const playerA = game.createPlayer("Alex").activeSave.player.id;
  const playerB = game.createPlayer("Blair").activeSave.player.id;
  const challengeA = reachChallenge(game, playerA);
  act(game, playerA, challengeA, { type: "submit", input: "vague" });
  reachChallenge(game, playerB);

  assert.equal(game.getGameSnapshot(playerA).scenario.attempts, 1);
  assert.equal(game.getGameSnapshot(playerB).scenario.attempts, 0);

  const refreshed = await createGameManager({
    storage: new BrowserStorageService(storage),
  });
  assert.equal(refreshed.getGameSnapshot(playerA).scenario.attempts, 1);
  assert.equal(
    refreshed.getGameSnapshot(playerA).currentStage.availableHint,
    "Try a more precise value.",
  );
  assert.equal(refreshed.getGameSnapshot(playerB).scenario.attempts, 0);
});
