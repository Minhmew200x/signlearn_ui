import test from "node:test";
import assert from "node:assert/strict";

import { buildApiUrlFromBase, normalizeApiBaseUrl } from "../src/app/lib/api.js";

test("normalizeApiBaseUrl trims trailing slash from configured VITE_API_BASE_URL", () => {
  assert.equal(normalizeApiBaseUrl("https://api.signlearn.id.vn/"), "https://api.signlearn.id.vn");
  assert.equal(normalizeApiBaseUrl("  https://api.signlearn.id.vn///  "), "https://api.signlearn.id.vn");
  assert.equal(normalizeApiBaseUrl(""), "");
});

test("buildApiUrlFromBase returns absolute backend URLs when API base is configured", () => {
  assert.equal(
    buildApiUrlFromBase("/api/v1/practice/uploads", {
      baseUrl: "https://api.signlearn.id.vn",
      query: { lesson_id: 42, blank: "", nil: null },
    }),
    "https://api.signlearn.id.vn/api/v1/practice/uploads?lesson_id=42",
  );
});

test("buildApiUrlFromBase keeps relative paths only when API base is empty", () => {
  assert.equal(buildApiUrlFromBase("/api/v1/signs/xin-chao/video"), "/api/v1/signs/xin-chao/video");
});

test("buildApiUrlFromBase leaves absolute URLs untouched", () => {
  assert.equal(
    buildApiUrlFromBase("https://cdn.example.com/models/holistic_landmarker.task", {
      baseUrl: "https://api.signlearn.id.vn",
    }),
    "https://cdn.example.com/models/holistic_landmarker.task",
  );
});
