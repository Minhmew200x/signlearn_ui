import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("AI practice page removes reference and detailed metrics, leaving webcam plus summary result", async () => {
  const source = await readFile(new URL("../src/pages/AIPracticePage.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /<h2[^>]*>Reference<\/h2>/);
  assert.doesNotMatch(source, /MetricRow label="dtw_score"/);
  assert.doesNotMatch(source, /MetricRow label="hand_score"/);
  assert.doesNotMatch(source, /ScoreBar label="Hand"/);
  assert.match(source, /getScoreAdvice/);
  assert.match(source, /getVerdictLabel/);
  assert.doesNotMatch(source, /\/100/);
  assert.match(source, /Ket qua cuoi|Kết quả cuối/);
  assert.match(source, /Loi khuyen|Lời khuyên/);
});
