import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("AI practice page mirrors webcam preview and uses looping reference video without controls", async () => {
  const source = await readFile(new URL("../src/pages/AIPracticePage.jsx", import.meta.url), "utf8");

  assert.match(source, /ref=\{videoRef\}[\s\S]*style=\{\{ transform: "scaleX\(-1\)" \}\}/);
  assert.match(source, /src=\{referenceVideoUrl\}[\s\S]*autoPlay[\s\S]*loop[\s\S]*muted[\s\S]*playsInline/);
  assert.doesNotMatch(source, /src=\{referenceVideoUrl\}[\s\S]{0,160}controls/);
});
