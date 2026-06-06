import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const VALID_STABLE_VERSION = "0.10.21";
const EXPECTED_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VALID_STABLE_VERSION}/wasm/`;
const EXPECTED_CJS_BUNDLE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VALID_STABLE_VERSION}/vision_bundle.cjs`;

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("practice webcam client uses a published MediaPipe wasm base URL", async () => {
  const source = await readSource("../practice-webcam-client.js");

  assert.match(source, new RegExp(escapeRegExp(EXPECTED_WASM_BASE_URL)));
});

test("practice worker uses the same published MediaPipe CDN version and wasm base URL", async () => {
  const source = await readSource("../practice-worker.js");

  assert.match(source, new RegExp(`@mediapipe/tasks-vision@${VALID_STABLE_VERSION}`));
  assert.match(source, new RegExp(escapeRegExp(EXPECTED_WASM_BASE_URL)));
});

test("practice worker fetches and evaluates the MediaPipe CommonJS bundle instead of importScripts-loading it", async () => {
  const source = await readSource("../practice-worker.js");

  assert.match(source, new RegExp(escapeRegExp(EXPECTED_CJS_BUNDLE_URL)));
  assert.match(source, /fetch\(TASKS_VISION_CJS_CDN\)/);
  assert.match(source, /eval\(/);
  assert.doesNotMatch(source, /importScripts\(TASKS_VISION_CJS_CDN\)/);
});

test("practice webcam client creates the MediaPipe worker as a classic worker", async () => {
  const source = await readSource("../practice-webcam-client.js");

  assert.match(source, /new Worker\(this\.options\.workerUrl\)/);
  assert.doesNotMatch(source, /type:\s*["']module["']/);
});
