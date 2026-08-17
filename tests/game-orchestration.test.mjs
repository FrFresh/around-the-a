import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidGameTransitionError,
  PLACEHOLDER_NEXT_SCENARIO_ID,
  PLACEHOLDER_SCENARIO_ID,
  ProgressionEngine,
  ScenarioAlreadyCompletedError,
  ScenarioLockedError,
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

test("a paused game resumes at the exact scenario stage", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);
  game.completeStage(playerId);
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

test("the placeholder scenario follows its configured stage sequence", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);

  assert.equal(
    game.completeStage(playerId).session.currentStageId,
    "challenge",
  );
  assert.equal(game.completeStage(playerId).session.currentStageId, "feedback");
  assert.equal(game.completeStage(playerId).session.currentStageId, "complete");
});

test("scenario completion grants rewards and unlocks declarative next progress", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);
  game.completeStage(playerId);
  game.completeStage(playerId);
  game.completeStage(playerId);

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
  assert.equal(completed.rewards.xp, 10);
  assert.equal(completed.rewards.aPoints, 5);
  assert.deepEqual(completed.rewards.badgeIds, ["engine-test-complete"]);
});

test("completion rewards cannot be granted twice", async () => {
  const { game } = await setup();
  const playerId = game.createPlayer("Alex").activeSave.player.id;
  game.startGame(playerId);
  game.completeStage(playerId);
  game.completeStage(playerId);
  game.completeStage(playerId);
  game.completeScenario(playerId);

  assert.throws(
    () => game.loadScenario(playerId, PLACEHOLDER_SCENARIO_ID),
    ScenarioAlreadyCompletedError,
  );
  const snapshot = game.getGameSnapshot(playerId);
  assert.equal(snapshot.rewards.xp, 10);
  assert.equal(snapshot.rewards.aPoints, 5);
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
