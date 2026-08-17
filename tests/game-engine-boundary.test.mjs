import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the application UI communicates with the Game Engine boundary only", async () => {
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /createBrowserGameManager/);
  assert.doesNotMatch(
    page,
    /PlayerManager|PlayerGameStorage|PlayerSaveRepository/,
  );
  assert.doesNotMatch(page, /localStorage/);
  assert.doesNotMatch(page, /setPlayer|setActiveSave|setProfiles/);
});
