import assert from "node:assert/strict";
import test from "node:test";
import { createFoundation } from "../src/foundation/create-foundation.ts";
import { FuturePhaseError } from "../src/foundation/phase-error.ts";

test("the composition root initializes every Phase 0 manager", async () => {
  const foundation = await createFoundation();

  assert.equal(foundation.game.isInitialized, true);
  assert.equal(foundation.scenarios.isInitialized, true);
  assert.equal(foundation.storage.isInitialized, true);
  assert.equal(foundation.rewards.isInitialized, true);
  assert.equal(foundation.game.dependencies.storage, foundation.storage);
  assert.equal(foundation.game.dependencies.scenarios, foundation.scenarios);
});

test("future-phase behavior is explicit rather than partially implemented", async () => {
  const foundation = await createFoundation();

  assert.throws(() => foundation.rewards.apply({}, {}, {}), FuturePhaseError);
});
