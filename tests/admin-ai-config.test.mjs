import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createAiConfigDraft,
  getAiConfigEndpoint,
  normalizeAiConfigPatchPayload,
} from "../src/app/lib/aiConfig.js";

test("getAiConfigEndpoint builds the sign-slug config path", () => {
  assert.equal(getAiConfigEndpoint("sach-giao-khoa"), "/api/v1/ai/signs/sach-giao-khoa/config");
});

test("createAiConfigDraft maps backend config into editable string fields", () => {
  assert.deepEqual(
    createAiConfigDraft({
      signSlug: "sach-giao-khoa",
      algorithm: "dtw-cosine",
      handWeight: 0.45,
      poseWeight: 0.35,
      speedWeight: 0.2,
      missingHandPenalty: 1.5,
      excellentThreshold: 90,
      goodThreshold: 75,
      passThreshold: 60,
    }),
    {
      signSlug: "sach-giao-khoa",
      algorithm: "dtw-cosine",
      handWeight: "0.45",
      poseWeight: "0.35",
      speedWeight: "0.2",
      missingHandPenalty: "1.5",
      excellentThreshold: "90",
      goodThreshold: "75",
      passThreshold: "60",
    },
  );
});

test("normalizeAiConfigPatchPayload converts numeric strings and omits blank values", () => {
  assert.deepEqual(
    normalizeAiConfigPatchPayload({
      algorithm: "dtw-cosine",
      handWeight: "0.45",
      poseWeight: "0.35",
      speedWeight: "0.2",
      missingHandPenalty: "1.5",
      excellentThreshold: "90",
      goodThreshold: "75",
      passThreshold: "60",
    }),
    {
      algorithm: "dtw-cosine",
      handWeight: 0.45,
      poseWeight: 0.35,
      speedWeight: 0.2,
      missingHandPenalty: 1.5,
      excellentThreshold: 90,
      goodThreshold: 75,
      passThreshold: 60,
    },
  );
});

test("admin dashboard source exposes AI scoring config editor controls", async () => {
  const source = await readFile(new URL("../src/components/auth/AdminDashboard.jsx", import.meta.url), "utf8");

  assert.match(source, /AI scoring config by sign slug/);
  assert.match(source, /Load config/);
  assert.match(source, /Save config/);
  assert.match(source, /<Select value=\{aiConfigSlug\}/);
  assert.match(source, /signSlugOptions\.map\(\(item\) => <option key=\{item\.slug\} value=\{item\.slug\}>/);
});
