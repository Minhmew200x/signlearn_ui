import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const clientSource = await readFile(new URL("../practice-webcam-client.js", import.meta.url), "utf8");

test("practice webcam client imports the shared API base resolver", () => {
  assert.match(clientSource, /import\s+\{\s*getApiBaseUrl\s*\}\s+from\s+["']\.\/src\/app\/lib\/runtimeConfig\.js["'];/);
});

test("practice webcam client defaults apiBaseUrl from shared runtime config instead of empty string", () => {
  assert.match(clientSource, /apiBaseUrl:\s*getApiBaseUrl\(\)/);
  assert.doesNotMatch(clientSource, /apiBaseUrl:\s*""/);
});

test("practice webcam client defaults upload endpoint to absolute backend URL", () => {
  assert.match(clientSource, /uploadEndpoint:\s*"https:\/\/api\.signlearn\.id\.vn\/api\/v1\/practice\/uploads"/);
  assert.doesNotMatch(clientSource, /uploadEndpoint:\s*"\/api\/v1\/practice\/uploads"/);
});