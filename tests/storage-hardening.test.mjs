import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createGameManager } from "../src/game-engine/index.ts";
import { PlayerManager, PlayerSaveRepository } from "../src/player/index.ts";
import {
  BrowserStorageService,
  CURRENT_PLAYER_SAVE_SCHEMA_VERSION,
  StorageError,
  StorageImportConflictError,
  StorageRecoveryError,
} from "../src/storage/index.ts";

const playerKey = (id) => `around-the-a:player:v1:${id}`;

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

function createPlayerManager(localStorage, ids = ["player-id"]) {
  let clock = 0;
  return new PlayerManager(
    new PlayerSaveRepository(new BrowserStorageService(localStorage), {
      now: () => `2026-02-01T00:00:${String(clock++).padStart(2, "0")}.000Z`,
    }),
    {
      createId: () => ids.shift(),
      now: () => `2026-02-01T01:00:${String(clock++).padStart(2, "0")}.000Z`,
    },
  );
}

test("every new player save is persisted in the current versioned envelope", () => {
  const localStorage = new MemoryLocalStorage();
  const manager = createPlayerManager(localStorage);
  const save = manager.createPlayer("Alex");
  const persisted = JSON.parse(localStorage.getItem(playerKey(save.player.id)));

  assert.equal(persisted.schemaVersion, CURRENT_PLAYER_SAVE_SCHEMA_VERSION);
  assert.equal(persisted.playerId, save.player.id);
  assert.equal(persisted.data.player.displayName, "Alex");
  assert.ok(!("schemaVersion" in persisted.data));
  assert.doesNotThrow(() => new Date(persisted.savedAt).toISOString());
});

test("schema version 1 saves migrate forward and are rewritten centrally", () => {
  const localStorage = new MemoryLocalStorage();
  const manager = createPlayerManager(localStorage);
  const save = manager.createPlayer("Alex");
  const legacy = { schemaVersion: 1, ...save };
  localStorage.setItem(playerKey(save.player.id), JSON.stringify(legacy));

  const migrated = manager.loadPlayer(save.player.id);
  const persisted = JSON.parse(localStorage.getItem(playerKey(save.player.id)));

  assert.equal(migrated.player.displayName, "Alex");
  assert.equal(persisted.schemaVersion, CURRENT_PLAYER_SAVE_SCHEMA_VERSION);
  assert.equal(persisted.data.player.id, save.player.id);
});

test("schema version 2 saves gain player-scoped game session state", () => {
  const localStorage = new MemoryLocalStorage();
  const manager = createPlayerManager(localStorage);
  const save = manager.createPlayer("Alex");
  const legacyProgress = structuredClone(save.progress);
  delete legacyProgress.scenarioStates;
  const legacy = {
    schemaVersion: 2,
    playerId: save.player.id,
    savedAt: save.progress.updatedAt,
    data: {
      player: save.player,
      progress: legacyProgress,
      session: {
        playerId: save.player.id,
        startedAt: save.player.createdAt,
        lastActiveAt: save.progress.updatedAt,
      },
    },
  };
  localStorage.setItem(playerKey(save.player.id), JSON.stringify(legacy));

  const migrated = manager.loadPlayer(save.player.id);
  const persisted = JSON.parse(localStorage.getItem(playerKey(save.player.id)));

  assert.equal(migrated.session.status, "not_started");
  assert.equal(migrated.session.playerId, save.player.id);
  assert.deepEqual(migrated.progress.scenarioStates, {});
  assert.equal(persisted.schemaVersion, CURRENT_PLAYER_SAVE_SCHEMA_VERSION);
});

test("a corrupt primary player save recovers from its last-known-good backup", () => {
  const localStorage = new MemoryLocalStorage();
  const manager = createPlayerManager(localStorage);
  const created = manager.createPlayer("Alex");
  const firstUpdate = manager.loadPlayer(created.player.id);
  firstUpdate.progress.xp = 25;
  manager.savePlayer(firstUpdate);
  const secondUpdate = manager.loadPlayer(created.player.id);
  secondUpdate.progress.xp = 50;
  manager.savePlayer(secondUpdate);

  localStorage.setItem(playerKey(created.player.id), "{broken json");
  const recovered = manager.loadPlayer(created.player.id);
  const repairedPrimary = JSON.parse(
    localStorage.getItem(playerKey(created.player.id)),
  );

  assert.equal(recovered.progress.xp, 25);
  assert.equal(repairedPrimary.data.progress.xp, 25);
});

test("an unrecoverable save throws a typed error instead of entering state", () => {
  const localStorage = new MemoryLocalStorage();
  const manager = createPlayerManager(localStorage);
  const created = manager.createPlayer("Alex");
  localStorage.setItem(
    playerKey(created.player.id),
    JSON.stringify({ nope: 1 }),
  );

  assert.throws(
    () => manager.loadPlayer(created.player.id),
    (error) =>
      error instanceof StorageRecoveryError &&
      error.code === "STORAGE_RECOVERY_FAILED",
  );
});

test("export and import round-trip through GameManager without silent overwrite", async () => {
  const sourceStorage = new MemoryLocalStorage();
  const source = await createGameManager({
    storage: new BrowserStorageService(sourceStorage),
    player: {
      createId: () => "alex-id",
      now: () => "2026-02-02T00:00:00.000Z",
    },
  });
  const created = source.createPlayer("Alex").activeSave;
  created.progress.xp = 225;
  source.savePlayer(created);
  const exported = source.exportPlayer(created.player.id);

  const targetStorage = new MemoryLocalStorage();
  const target = await createGameManager({
    storage: new BrowserStorageService(targetStorage),
  });
  const imported = target.importPlayer(exported);
  assert.equal(imported.activeSave.player.id, "alex-id");
  assert.equal(imported.activeSave.progress.xp, 225);

  assert.throws(
    () => target.importPlayer(exported),
    (error) => error instanceof StorageImportConflictError,
  );
  assert.equal(target.loadPlayer(created.player.id).progress.xp, 225);
});

test("explicit overwrite is required before import can replace an existing ID", async () => {
  const sourceStorage = new MemoryLocalStorage();
  const source = createPlayerManager(sourceStorage, ["shared-id"]);
  const sourceSave = source.createPlayer("Source Alex");
  sourceSave.progress.aPoints = 100;
  source.savePlayer(sourceSave);
  const exported = source.exportPlayer(sourceSave.player.id);

  const targetStorage = new MemoryLocalStorage();
  const target = createPlayerManager(targetStorage, ["shared-id"]);
  target.createPlayer("Existing Alex");
  assert.throws(
    () => target.importPlayer(exported),
    StorageImportConflictError,
  );
  assert.equal(
    target.loadPlayer("shared-id").player.displayName,
    "Existing Alex",
  );

  target.importPlayer(exported, { overwrite: true });
  assert.equal(
    target.loadPlayer("shared-id").player.displayName,
    "Source Alex",
  );
  assert.equal(target.loadPlayer("shared-id").progress.aPoints, 100);
});

test("browser adapter reports corrupt JSON and browser failures as typed errors", () => {
  const corrupt = new MemoryLocalStorage();
  corrupt.setItem("save", "not-json");
  const adapter = new BrowserStorageService(corrupt);
  assert.throws(
    () => adapter.read("save"),
    (error) =>
      error instanceof StorageError &&
      error.code === "STORAGE_SERIALIZATION_FAILED",
  );

  const failing = new MemoryLocalStorage();
  failing.setItem = () => {
    throw new Error("quota exceeded");
  };
  assert.throws(
    () => new BrowserStorageService(failing).write("save", {}),
    (error) =>
      error instanceof StorageError && error.code === "STORAGE_WRITE_FAILED",
  );
});

test("localStorage remains confined to the browser storage adapter", async () => {
  const files = [
    "../app/page.tsx",
    "../src/game-engine/create-browser-game-manager.ts",
    "../src/player/player-save-repository.ts",
    "../src/storage/browser-storage-service.ts",
    "../src/storage/storage-manager.ts",
  ];
  const contents = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );

  assert.match(contents[3], /window\.localStorage/);
  for (const [index, content] of contents.entries()) {
    if (index !== 3) assert.doesNotMatch(content, /localStorage/);
  }
});
