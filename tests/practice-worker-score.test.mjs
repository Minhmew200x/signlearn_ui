import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const TOTAL_LANDMARK_COUNT = 60;
const FEATURES_PER_LANDMARK = 3;
const RIGHT_HAND_START = 39;
const HAND_LANDMARK_COUNT = 21;

async function loadWorkerContext() {
  const source = await readFile(new URL("../practice-worker.js", import.meta.url), "utf8");
  const context = {
    console,
    Date,
    Math,
    Number,
    Array,
    Object,
    Boolean,
    String,
    Error,
    performance: { now: () => 0 },
    fetch: async () => {
      throw new Error("Unexpected fetch in worker unit test");
    },
    self: {
      postMessage() {},
      eval,
    },
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__practiceWorkerTestHooks = { state, finalizeCapture };`, context, { filename: "practice-worker.js" });
  return context;
}

function setPoint(frame, index, { x, y, z = 0, visible = true }) {
  const baseIndex = index * FEATURES_PER_LANDMARK;
  frame.features[baseIndex] = x;
  frame.features[baseIndex + 1] = y;
  frame.features[baseIndex + 2] = z;
  frame.mask[index] = visible;
}

function createFrame({ handCenterX, handCenterY }) {
  const frame = {
    features: new Array(TOTAL_LANDMARK_COUNT * FEATURES_PER_LANDMARK).fill(0),
    mask: new Array(TOTAL_LANDMARK_COUNT).fill(false),
  };

  setPoint(frame, 0, { x: 0.5, y: 0.2 });
  setPoint(frame, 1, { x: 0.35, y: 0.35 });
  setPoint(frame, 2, { x: 0.65, y: 0.35 });
  setPoint(frame, 7, { x: 0.4, y: 0.7 });
  setPoint(frame, 8, { x: 0.6, y: 0.7 });

  for (let offset = 0; offset < HAND_LANDMARK_COUNT; offset += 1) {
    const spread = (offset % 5) * 0.01;
    setPoint(frame, RIGHT_HAND_START + offset, {
      x: handCenterX + spread,
      y: handCenterY + (offset * 0.004),
      z: offset * 0.002,
    });
  }

  return frame;
}

function mirrorFrame(frame) {
  const mirrored = {
    features: [...frame.features],
    mask: [...frame.mask],
  };

  for (let index = 0; index < TOTAL_LANDMARK_COUNT; index += 1) {
    if (!mirrored.mask[index]) continue;
    const baseIndex = index * FEATURES_PER_LANDMARK;
    mirrored.features[baseIndex] = 1 - mirrored.features[baseIndex];
  }

  return mirrored;
}

function buildSequence(frames) {
  return {
    sequence: frames.map((frame) => frame.features),
    mask: frames.map((frame) => frame.mask),
  };
}

test("practice worker scoring can recover from mirrored webcam orientation instead of pinning the hand score near 10", async () => {
  const context = await loadWorkerContext();
  const { state, finalizeCapture } = context.__practiceWorkerTestHooks;

  const referenceFrames = [
    createFrame({ handCenterX: 0.18, handCenterY: 0.3 }),
    createFrame({ handCenterX: 0.2, handCenterY: 0.34 }),
    createFrame({ handCenterX: 0.23, handCenterY: 0.38 }),
  ];
  const userFrames = referenceFrames.map((frame) => mirrorFrame(frame));

  state.reference = {
    sign_slug: "xin-chao",
    label: "Xin chao",
    reference_video: "xin-chao.mp4",
    version: "v-test",
    ...buildSequence(referenceFrames),
  };
  state.scoringConfig = {
    handWeight: 0.45,
    poseWeight: 0.35,
    speedWeight: 0.2,
    missingHandPenalty: 1.5,
    excellentThreshold: 90,
    goodThreshold: 75,
    passThreshold: 60,
  };
  state.capturedFrames = userFrames.map((frame) => frame.features);
  state.capturedMasks = userFrames.map((frame) => frame.mask);
  state.captureStartedAt = "2026-06-06T00:00:00.000Z";

  const result = finalizeCapture();

  assert.ok(result.componentScores.hand_score >= 70, `expected mirrored match to recover hand score, got ${result.componentScores.hand_score}`);
  assert.ok(result.finalScore >= 60, `expected mirrored match to produce a passing final score, got ${result.finalScore}`);
});
