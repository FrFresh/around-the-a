import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidGameTransitionError,
  PLACEHOLDER_NEXT_SCENARIO_ID,
  PLACEHOLDER_SCENARIO_ID,
  ProgressionEngine,
  ScenarioAlreadyCompletedError,
  ScenarioLockedError,
  ScenarioOwnershipError,
  createGameManager,
} from "../src/game-engine/index.ts";
import { BrowserStorageService } from "../src/storage/index.ts";

const strongQuestion =
  "I’m at Five Points. I need to reach my Midtown interview in 18 minutes with 9% phone battery. Give me two reliable routes and recommend one.";

class MemoryLocalStorage {
  values = new Map();
  writeCounts = new Map();
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
    this.writeCounts.set(key, (this.writeCounts.get(key) ?? 0) + 1);
  }
}

async function setup(storage = new MemoryLocalStorage(), ids = ["player-a"]) {
  let tick = 0;
  const game = await createGameManager({
    storage: new BrowserStorageService(storage),
    player: {
      createId: () => ids.shift(),
      createSessionId: () => `session-${ids.length}`,
      now: () => `2026-03-01T00:00:${String(tick++).padStart(2, "0")}.000Z`,
    },
  });
  return { game, storage };
}

function submit(game, playerId, snapshot, action) {
  return game.submitAction(playerId, {
    ...action,
    sessionId: snapshot.session.id,
    scenarioId: snapshot.session.currentScenarioId,
  });
}

function reachChallenge(game, playerId) {
  game.completeStage(playerId);
  return game.completeStage(playerId);
}

function reachCompletionStage(game, playerId) {
  const challenge = reachChallenge(game, playerId);
  const reflection = submit(game, playerId, challenge, {
    type: "submit",
    input: strongQuestion,
  });
  const reward = submit(game, playerId, reflection, { type: "reflect" });
  game.completeStage(playerId);
  return reward;
}

test("starting a new game creates an active player-scoped scenario session", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;

  const snapshot = game.startGame(playerId);

  assert.equal(snapshot.player.id, playerId);
  assert.equal(snapshot.session.playerId, playerId);
  assert.equal(snapshot.session.status, "active");
  assert.equal(snapshot.session.currentScenarioId, PLACEHOLDER_SCENARIO_ID);
  assert.equal(snapshot.session.currentStageId, "intro");
  assert.equal(snapshot.scenario.status, "active");
});

test("health check exposes readiness without player data", async () => {
  const { game } = await setup();

  assert.deepEqual(game.getHealthCheck(), {
    status: "ok",
    applicationBootSucceeded: true,
    gameManagerInitialized: true,
    storageAdapterAvailable: true,
    scenarioRegistryValid: true,
    registeredScenarioCount: 1,
    saveSchemaVersion: 4,
  });
});

test("a paused game resumes at the exact scenario stage", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);
  reachChallenge(game, playerId);
  const paused = game.pauseGame(playerId);

  const resumed = game.resumeGame(playerId);

  assert.equal(paused.session.status, "paused");
  assert.equal(resumed.session.status, "active");
  assert.equal(resumed.session.currentStageId, "challenge");
});

test("invalid lifecycle and stage transitions are rejected", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;

  assert.throws(() => game.pauseGame(playerId), InvalidGameTransitionError);
  game.startGame(playerId);
  assert.throws(() => game.startGame(playerId), InvalidGameTransitionError);
  assert.throws(
    () => game.completeScenario(playerId),
    InvalidGameTransitionError,
  );
});

test("progression rejects a known scenario whose prerequisites are unmet", () => {
  const lockedId = "locked-test";
  const progression = new ProgressionEngine([
    {
      id: lockedId,
      title: "Locked Engine Fixture",
      literacySkillId: "locked-skill",
      prerequisiteScenarioIds: ["required-test"],
      nextScenarioIds: [],
      stageIds: ["intro", "complete"],
      reward: { xp: 0, aPoints: 0, badgeIds: [] },
    },
  ]);
  const progress = {
    playerId: "player-a",
    currentScenarioId: null,
    completedScenarioIds: [],
    unlockedScenarioIds: [],
  };

  assert.throws(
    () => progression.createScenarioState(progress, lockedId),
    ScenarioLockedError,
  );
});

test("the authored scenario follows its configured forward stage sequence", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);

  assert.equal(game.completeStage(playerId).session.currentStageId, "dialogue");
  const challenge = game.completeStage(playerId);
  assert.equal(challenge.session.currentStageId, "challenge");
  const reflection = submit(game, playerId, challenge, {
    type: "submit",
    input: strongQuestion,
  });
  assert.equal(reflection.session.currentStageId, "reflection");
  const reward = submit(game, playerId, reflection, { type: "reflect" });
  assert.equal(reward.session.currentStageId, "reward");
  assert.equal(game.completeStage(playerId).session.currentStageId, "complete");
});

test("loading an unlocked active scenario restores its current stage", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);
  reachChallenge(game, playerId);

  const loaded = game.loadScenario(playerId, PLACEHOLDER_SCENARIO_ID);

  assert.equal(loaded.session.currentStageId, "challenge");
  assert.equal(loaded.scenario.currentStageId, "challenge");
});

test("scenario completion grants rewards and unlocks declarative next progress", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);
  reachCompletionStage(game, playerId);

  const completed = game.completeScenario(playerId);

  assert.ok(
    completed.progression.completedScenarioIds.includes(
      PLACEHOLDER_SCENARIO_ID,
    ),
  );
  assert.ok(
    completed.progression.unlockedScenarioIds.includes(
      PLACEHOLDER_NEXT_SCENARIO_ID,
    ),
  );
  assert.equal(completed.rewards.xp, 100);
  assert.equal(completed.rewards.aPoints, 100);
  assert.deepEqual(completed.rewards.badgeIds, ["better-questions"]);
  assert.ok(completed.progression.unlockedSkillIds.includes("ask-better"));
});

test("completion rewards cannot be granted twice", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);
  reachCompletionStage(game, playerId);
  game.completeScenario(playerId);

  assert.throws(
    () => game.loadScenario(playerId, PLACEHOLDER_SCENARIO_ID),
    ScenarioAlreadyCompletedError,
  );
  const snapshot = game.getGameSnapshot(playerId);
  assert.equal(snapshot.rewards.xp, 100);
  assert.equal(snapshot.rewards.aPoints, 100);
});

test("game snapshots contain only the requested player's state", async () => {
  const { game } = await setup(new MemoryLocalStorage(), [
    "player-a",
    "player-b",
  ]);
  const playerA = game.createPlayer("Alex").activeSave.player.id;
  const playerB = game.createPlayer("Blair").activeSave.player.id;
  game.startGame(playerA);

  const snapshotA = game.getGameSnapshot(playerA);
  const snapshotB = game.getGameSnapshot(playerB);

  assert.equal(snapshotA.player.id, playerA);
  assert.equal(snapshotA.session.status, "active");
  assert.equal(snapshotB.player.id, playerB);
  assert.equal(snapshotB.session.status, "not_started");
  assert.ok(!("players" in snapshotA));
  assert.ok(!("activeSave" in snapshotA));
});

test("meaningful transitions autosave exactly one new primary checkpoint", async () => {
  const { game, storage } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  const key = `around-the-a:player:v1:${playerId}`;

  const beforeStart = storage.writeCounts.get(key);
  game.startGame(playerId);
  assert.equal(storage.writeCounts.get(key), beforeStart + 1);

  const beforeStage = storage.writeCounts.get(key);
  game.completeStage(playerId);
  assert.equal(storage.writeCounts.get(key), beforeStage + 1);

  const beforePause = storage.writeCounts.get(key);
  game.pauseGame(playerId);
  assert.equal(storage.writeCounts.get(key), beforePause + 1);
});

test("two players advance independently and switching restores exact state", async () => {
  const { game } = await setup(new MemoryLocalStorage(), [
    "player-a",
    "player-b",
  ]);
  const playerA = game.createPlayer("Alex").activeSave.player.id;
  const playerB = game.createPlayer("Blair").activeSave.player.id;

  game.startGame(playerA);
  reachChallenge(game, playerA);
  game.startGame(playerB);

  game.switchPlayer(playerA);
  const restoredA = game.getGameSnapshot(playerA);
  assert.equal(restoredA.session.currentStageId, "challenge");
  assert.equal(restoredA.rewards.xp, 0);

  game.switchPlayer(playerB);
  const restoredB = game.getGameSnapshot(playerB);
  assert.equal(restoredB.session.currentStageId, "intro");
  assert.equal(restoredB.rewards.xp, 0);
});

test("an action carrying another player's session cannot mutate either save", async () => {
  const { game } = await setup(new MemoryLocalStorage(), [
    "player-a",
    "player-b",
  ]);
  const playerA = game.createPlayer("Alex").activeSave.player.id;
  const playerB = game.createPlayer("Blair").activeSave.player.id;
  const beforeA = game.startGame(playerA);
  const beforeB = game.startGame(playerB);

  assert.throws(
    () =>
      game.submitAction(playerA, {
        type: "advance",
        sessionId: beforeB.session.id,
        scenarioId: beforeB.session.currentScenarioId,
      }),
    ScenarioOwnershipError,
  );

  assert.equal(
    game.getGameSnapshot(playerA).session.currentStageId,
    beforeA.session.currentStageId,
  );
  assert.equal(
    game.getGameSnapshot(playerB).session.currentStageId,
    beforeB.session.currentStageId,
  );
});

test("refresh restores the player-owned session and exact stage", async () => {
  const storage = new MemoryLocalStorage();
  const { game } = await setup(storage);
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);
  reachChallenge(game, playerId);
  game.pauseGame(playerId);

  const refreshed = await createGameManager({
    storage: new BrowserStorageService(storage),
  });
  const snapshot = refreshed.getGameSnapshot(playerId);

  assert.equal(snapshot.session.status, "paused");
  assert.equal(snapshot.session.currentStageId, "challenge");
  assert.equal(snapshot.scenario.currentStageId, "challenge");
});
