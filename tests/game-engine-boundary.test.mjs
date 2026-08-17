import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the application UI communicates with the Game Engine boundary only", async () => {
  const files = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/use-game-runtime.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/AroundTheAGame.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  const page = files.join("\n");

  assert.match(page, /createBrowserGameManager/);
  assert.match(page, /initializeApplication/);
  assert.match(page, /getHealthCheck/);
  assert.match(page, /resetPlayerProgress/);
  assert.doesNotMatch(
    page,
    /PlayerManager|PlayerGameStorage|PlayerSaveRepository/,
  );
  assert.doesNotMatch(page, /localStorage/);
  assert.doesNotMatch(page, /\bset(Player|ActiveSave|Profiles)\b/);
});
