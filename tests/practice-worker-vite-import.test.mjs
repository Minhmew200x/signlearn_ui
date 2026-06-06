import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("practice webcam client creates a classic worker for MediaPipe compatibility", async () => {
  const source = await readSource("../practice-webcam-client.js");

  assert.doesNotMatch(source, /new Worker\([^\n]+type:\s*["']module["']/);
});

test("practice worker source stays classic-script-safe", async () => {
  const source = await readSource("../practice-worker.js");

  assert.doesNotMatch(source, /^import\s/m);
});
