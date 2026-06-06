import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("practice webcam upload path threads bearer token into fetch requests", async () => {
  const clientSource = await readFile(new URL("../practice-webcam-client.js", import.meta.url), "utf8");
  const pageSource = await readFile(new URL("../src/pages/AIPracticePage.jsx", import.meta.url), "utf8");

  assert.match(pageSource, /videoElement: videoRef\.current,\s*\n\s*accessToken,\s*\n\s*uploadArtifacts: true/);
  assert.match(clientSource, /headers\.set\("Authorization",\s*`Bearer \$\{this\.options\.accessToken\}`\)/);
});
