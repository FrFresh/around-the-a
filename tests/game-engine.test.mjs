import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/game/engine.ts";
import { defaultPlayer } from "../src/game/player-state.ts";

class MemoryStorage {
  state = structuredClone(defaultPlayer);
  loadPlayer() {
    return structuredClone(this.state);
  }
  savePlayer(state) {
    this.state = structuredClone(state);
  }
}

test("a weak question gives vague feedback without rewards", async () => {
  const result = await new GameEngine(new MemoryStorage()).submitPlayerResponse(
    "five-points-prompting",
    "How do I get to Midtown?",
  );
  assert.equal(result.completed, false);
  assert.equal(result.player.xp, 0);
  assert.match(result.evaluation.npcResponse, /head north/);
});

test("three required fundamentals complete the scenario and unlock Ponce", async () => {
  const storage = new MemoryStorage();
  const engine = new GameEngine(storage);
  const result = await engine.submitPlayerResponse(
    "five-points-prompting",
    "I'm at Five Points and the Gold Line is delayed. I need to reach my Midtown interview by 9:20. Give me two reliable options.",
  );
  assert.equal(result.completed, true);
  assert.equal(result.player.xp, 100);
  assert.equal(result.player.aPoints, 100);
  assert.ok(result.player.unlockedScenarios.includes("ponce-verification"));
  assert.ok(result.player.badges.includes("Better Questions"));
});

test("replaying a completed scenario never duplicates rewards", async () => {
  const storage = new MemoryStorage();
  const engine = new GameEngine(storage);
  const prompt =
    "I'm at Five Points. I need to reach my interview by 9:20. Give me two options.";
  await engine.submitPlayerResponse("five-points-prompting", prompt);
  const replay = await engine.submitPlayerResponse(
    "five-points-prompting",
    prompt,
  );
  assert.equal(replay.player.xp, 100);
  assert.equal(replay.player.aPoints, 100);
});
