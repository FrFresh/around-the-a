import assert from "node:assert/strict";
import test from "node:test";
import { createGameManager } from "../src/game-engine/index.ts";
import { PlayerManager, PlayerSaveRepository } from "../src/player/index.ts";
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

function createTestManager(storage) {
  const ids = ["alice-id", "bob-id"];
  let clock = 0;
  return new PlayerManager(
    new PlayerSaveRepository(new BrowserStorageService(storage)),
    {
      createId: () => ids.shift(),
      now: () => `2026-01-01T00:00:0${clock++}.000Z`,
    },
  );
}

test("two players keep completely independent gameplay progress", async () => {
  const localStorage = new MemoryLocalStorage();
  const ids = ["alice-id", "bob-id"];
  let clock = 0;
  const game = await createGameManager({
    storage: new BrowserStorageService(localStorage),
    player: {
      createId: () => ids.shift(),
      now: () => `2026-01-01T00:00:0${clock++}.000Z`,
    },
  });

  const alice = game.createPlayer("Alice").activeSave;
  await game.submitPlayerResponse(
    "five-points-prompting",
    "I'm at Five Points. I need to reach an interview by 9:20. Give me two reliable options.",
  );

  const bob = game.createPlayer("Bob").activeSave;
  assert.equal(game.getSnapshot().state.xp, 0);
  assert.deepEqual(game.getSnapshot().state.completedScenarios, []);

  game.switchPlayer(alice.player.id);
  assert.equal(game.getSnapshot().state.xp, 100);
  assert.ok(
    game
      .getSnapshot()
      .state.completedScenarios.includes("five-points-prompting"),
  );

  game.switchPlayer(bob.player.id);
  assert.equal(game.getSnapshot().state.xp, 0);
});

test("a new manager instance restores the active player after refresh", () => {
  const localStorage = new MemoryLocalStorage();
  const firstManager = createTestManager(localStorage);
  const alice = firstManager.createPlayer("Alice");
  const saved = firstManager.loadActivePlayer();
  saved.progress.xp = 275;
  firstManager.savePlayer(saved);

  const refreshedManager = new PlayerManager(
    new PlayerSaveRepository(new BrowserStorageService(localStorage)),
  );
  const restored = refreshedManager.loadActivePlayer();
  assert.equal(restored.player.id, alice.player.id);
  assert.equal(restored.progress.xp, 275);
});

test("switching and deleting profiles updates only the player directory", () => {
  const localStorage = new MemoryLocalStorage();
  const manager = createTestManager(localStorage);
  const alice = manager.createPlayer("Alice");
  const bob = manager.createPlayer("Bob");

  manager.switchPlayer(alice.player.id);
  assert.equal(manager.loadActivePlayer().player.displayName, "Alice");
  manager.deletePlayer(alice.player.id);
  assert.equal(manager.loadPlayer(alice.player.id), null);
  assert.equal(manager.loadActivePlayer().player.id, bob.player.id);
});

test("mismatched IDs can never overwrite another player's save", () => {
  const localStorage = new MemoryLocalStorage();
  const manager = createTestManager(localStorage);
  const alice = manager.createPlayer("Alice");
  const bob = manager.createPlayer("Bob");
  const invalid = structuredClone(alice);
  invalid.progress.playerId = bob.player.id;

  assert.throws(() => manager.savePlayer(invalid), /mismatched player IDs/);
  assert.equal(manager.loadPlayer(bob.player.id).player.displayName, "Bob");
});

test("resetting progress preserves the selected profile and isolates other players", () => {
  const localStorage = new MemoryLocalStorage();
  const manager = createTestManager(localStorage);
  const alice = manager.createPlayer("Alice");
  const bob = manager.createPlayer("Bob");
  alice.progress.xp = 40;
  manager.savePlayer(alice);
  bob.progress.xp = 80;
  manager.savePlayer(bob);

  const reset = manager.resetPlayerProgress(alice.player.id);

  assert.equal(reset.player.displayName, "Alice");
  assert.equal(reset.progress.xp, 0);
  assert.equal(reset.session.status, "not_started");
  assert.equal(manager.loadPlayer(bob.player.id).progress.xp, 80);
  assert.equal(manager.loadActivePlayer().player.id, alice.player.id);
});
