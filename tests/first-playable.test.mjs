import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ASK_BETTER_SKILL_ID,
  FIVE_POINTS_SCENARIO_ID,
  PONCE_TEASER_SCENARIO_ID,
  createGameManager,
} from "../src/game-engine/index.ts";
import { evaluateAskBetterQuestion } from "../src/evaluators/ask-better.ts";
import { BrowserStorageService } from "../src/storage/index.ts";

const strongQuestion =
  "I’m at Five Points. I need to reach my Midtown interview in 18 minutes with 9% phone battery. Give me two reliable routes and recommend one.";

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
      now: () => "2026-08-17T12:00:00.000Z",
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

function enterChallenge(game, playerId) {
  const intro = game.startGame(playerId);
  const encounter = act(game, playerId, intro, { type: "advance" });
  return act(game, playerId, encounter, { type: "advance" });
}

test("Ask Better evaluator reports all four literacy dimensions", () => {
  const weak = evaluateAskBetterQuestion("How do I get to Midtown?");
  assert.equal(weak.passed, false);
  assert.equal(weak.score, 1);
  assert.equal(weak.dimensions.goal, true);
  assert.equal(weak.dimensions.constraints, false);

  const strong = evaluateAskBetterQuestion(strongQuestion);
  assert.equal(strong.passed, true);
  assert.equal(strong.score, 4);
  assert.match(strong.npcResponse, /northbound Gold Line/i);
});

test("Five Points supports fail, retry, success, A-Card unlock, reward, and completion", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const challenge = enterChallenge(game, playerId);

  const feedback = act(game, playerId, challenge, {
    type: "submit",
    input: "How do I get to Midtown?",
  });
  assert.equal(feedback.currentStage.type, "feedback");
  assert.equal(feedback.scenario.attempts, 1);

  const retry = act(game, playerId, feedback, { type: "advance" });
  const success = act(game, playerId, retry, {
    type: "submit",
    input: strongQuestion,
  });
  assert.equal(success.currentStage.type, "reflection");
  assert.equal(success.scenario.attempts, 2);

  const reward = act(game, playerId, success, { type: "reflect" });
  const complete = act(game, playerId, reward, { type: "advance" });
  const completed = game.completeScenario(playerId);

  assert.equal(complete.currentStage.type, "complete");
  assert.equal(completed.rewards.xp, 100);
  assert.equal(completed.rewards.aPoints, 100);
  assert.ok(
    completed.progression.completedScenarioIds.includes(
      FIVE_POINTS_SCENARIO_ID,
    ),
  );
  assert.ok(
    completed.progression.unlockedScenarioIds.includes(
      PONCE_TEASER_SCENARIO_ID,
    ),
  );
  assert.ok(
    completed.progression.unlockedSkillIds.includes(ASK_BETTER_SKILL_ID),
  );
});

test("refresh restores the exact Five Points retry and continue state", async () => {
  const storage = new MemoryLocalStorage();
  const { game } = await setup(storage);
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const challenge = enterChallenge(game, playerId);
  act(game, playerId, challenge, {
    type: "submit",
    input: "How do I get to Midtown?",
  });
  game.pauseGame(playerId);

  const refreshed = await createGameManager({
    storage: new BrowserStorageService(storage),
  });
  const paused = refreshed.getGameSnapshot(playerId);
  assert.equal(paused.session.status, "paused");
  assert.equal(paused.currentStage.type, "feedback");
  assert.equal(paused.scenario.attempts, 1);

  const resumed = refreshed.resumeGame(playerId);
  assert.equal(resumed.currentStage.type, "feedback");
  assert.equal(resumed.session.status, "active");
});

test("raw player questions are never persisted", async () => {
  const storage = new MemoryLocalStorage();
  const { game } = await setup(storage);
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const challenge = enterChallenge(game, playerId);
  const privateQuestion = "My private test question should stay transient";
  act(game, playerId, challenge, {
    type: "submit",
    input: privateQuestion,
  });

  assert.doesNotMatch(
    JSON.stringify([...storage.values.values()]),
    /private test question/i,
  );
});

test("retired diagnostic fixture progress resets without deleting the profile", async () => {
  const storage = new MemoryLocalStorage();
  const { game } = await setup(storage);
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const save = game.loadPlayer(playerId);
  save.session.status = "active";
  save.session.currentScenarioId = "engine-test-scenario";
  save.session.currentStageId = "challenge";
  save.progress.currentScenarioId = "engine-test-scenario";
  save.progress.scenarioStates["engine-test-scenario"] = {
    playerId,
    scenarioId: "engine-test-scenario",
    status: "active",
    currentStageId: "challenge",
    completedStageIds: ["intro", "dialogue"],
    attempts: 1,
    attemptsByStageId: { challenge: 1 },
    latestEvaluation: null,
    availableHint: null,
    reflectionResponses: {},
  };
  game.savePlayer(save);

  const upgraded = await createGameManager({
    storage: new BrowserStorageService(storage),
  });
  const migrated = upgraded.loadPlayer(playerId);
  assert.equal(migrated.player.displayName, "Alex");
  assert.equal(migrated.session.status, "not_started");
  assert.equal(
    migrated.progress.scenarioStates["engine-test-scenario"],
    undefined,
  );
});

test("two players keep independent Five Points attempts and rewards", async () => {
  const { game } = await setup(new MemoryLocalStorage(), [
    "player-a",
    "player-b",
  ]);
  const playerA = game.createPlayer("Alex").activeSave.player.id;
  const playerB = game.createPlayer("Blair").activeSave.player.id;
  const challengeA = enterChallenge(game, playerA);
  act(game, playerA, challengeA, {
    type: "submit",
    input: "How do I get to Midtown?",
  });
  game.startGame(playerB);

  assert.equal(game.getGameSnapshot(playerA).scenario.attempts, 1);
  assert.equal(game.getGameSnapshot(playerB).scenario.attempts, 0);
  assert.equal(game.getGameSnapshot(playerB).rewards.xp, 0);
});

test("the player route and development diagnostic are separated", async () => {
  const [rootPage, devPage] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dev/engine/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(rootPage, /AroundTheAGame/);
  assert.doesNotMatch(rootPage, /EngineDiagnostic/);
  assert.match(devPage, /EngineDiagnosticApp/);
});
