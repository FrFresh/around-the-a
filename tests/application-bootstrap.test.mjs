import assert from "node:assert/strict";
import test from "node:test";
import { initializeApplication } from "../src/game-engine/index.ts";

test("application bootstrap reports explicit stages and reaches READY", async () => {
  const phases = [];
  const snapshot = { players: [], activeSave: null, state: {} };
  const result = await initializeApplication(
    async (report) => {
      report("INITIALIZING_PLAYER");
      report("LOADING_SAVE");
      return { getSnapshot: () => snapshot };
    },
    (phase) => phases.push(phase),
  );

  assert.equal(result.phase, "READY");
  assert.equal(result.snapshot, snapshot);
  assert.deepEqual(phases, [
    "BOOTING",
    "INITIALIZING_PLAYER",
    "LOADING_SAVE",
    "READY",
  ]);
});

test("application bootstrap converts rejection into a recoverable ERROR state", async () => {
  const phases = [];
  const result = await initializeApplication(
    async () => {
      throw new Error("storage unavailable");
    },
    (phase) => phases.push(phase),
  );

  assert.equal(result.phase, "ERROR");
  assert.equal(result.publicMessage, "The game engine could not initialize.");
  assert.equal(result.diagnosticMessage, "storage unavailable");
  assert.deepEqual(phases, ["BOOTING", "ERROR"]);
});
