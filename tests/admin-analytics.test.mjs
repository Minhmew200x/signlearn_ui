import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnalyticsQueries,
  createAnalyticsRequestGate,
  createDefaultAnalyticsRange,
  formatAnalyticsPercent,
  getCompletionRate,
  getMetricTrend,
  getRangeError,
  makeLinePoints,
} from "../src/app/lib/adminAnalytics.js";

test("request gate invalidates stale analytics loads", () => {
  const gate = createAnalyticsRequestGate();
  const first = gate.begin();
  const second = gate.begin();

  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);

  gate.invalidate();
  assert.equal(gate.isCurrent(second), false);

  const later = gate.begin();
  assert.equal(gate.isCurrent(later), true);
});

test("creates an inclusive 30-day UTC analytics range", () => {
  assert.deepEqual(createDefaultAnalyticsRange(new Date("2026-07-20T16:00:00+07:00")), {
    start_date: "2026-06-21",
    end_date: "2026-07-20",
  });
  assert.deepEqual(createDefaultAnalyticsRange(new Date("2026-07-20T00:30:00+07:00")), {
    start_date: "2026-06-20",
    end_date: "2026-07-19",
  });
});

test("builds identical date queries and limits ranking endpoints", () => {
  assert.deepEqual(buildAnalyticsQueries({ start_date: "2026-06-21", end_date: "2026-07-20" }), {
    summary: { start_date: "2026-06-21", end_date: "2026-07-20" },
    timeseries: { start_date: "2026-06-21", end_date: "2026-07-20" },
    learning: { start_date: "2026-06-21", end_date: "2026-07-20", limit: 10 },
    content: { start_date: "2026-06-21", end_date: "2026-07-20", limit: 10 },
  });
});

test("rejects invalid, inverted, and over-366-day ranges", () => {
  assert.equal(getRangeError({}), "Chọn ngày bắt đầu và ngày kết thúc hợp lệ.");
  assert.equal(getRangeError({ start_date: "2026-02-30", end_date: "2026-07-20" }), "Chọn ngày bắt đầu và ngày kết thúc hợp lệ.");
  assert.equal(getRangeError({ start_date: ["2026-07-20"], end_date: "2026-07-20" }), "Chọn ngày bắt đầu và ngày kết thúc hợp lệ.");
  assert.equal(getRangeError({ start_date: "2026-07-21", end_date: "2026-07-20" }), "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  assert.equal(getRangeError({ start_date: "2025-07-20", end_date: "2026-07-20" }), "");
  assert.equal(getRangeError({ start_date: "2025-07-19", end_date: "2026-07-20" }), "Khoảng ngày tối đa là 366 ngày.");
});

test("formats percentage, trends, and safe completion rates", () => {
  assert.equal(formatAnalyticsPercent(82.4), "82,4%");
  assert.deepEqual(getMetricTrend({ value: 84, change_percent: null }), { label: "Mới", tone: "new" });
  assert.deepEqual(getMetricTrend({ value: 84, change_percent: -10.5 }), { label: "↓ 10,5%", tone: "down" });
  assert.equal(getCompletionRate({ completed_attempts: 147, attempts: 153 }), 96.08);
  assert.equal(getCompletionRate({ completed_attempts: 0, attempts: 0 }), null);
  assert.equal(getCompletionRate({ completed_attempts: -1, attempts: 10 }), 0);
  assert.equal(getCompletionRate({ completed_attempts: 11, attempts: 10 }), 100);
});

test("scales chronological activity values into deterministic SVG points", () => {
  assert.equal(makeLinePoints([{ active_learners: 0 }, { active_learners: 10 }, { active_learners: 5 }], "active_learners", 100, 40), "0,40 50,0 100,20");
  assert.equal(makeLinePoints([{ active_learners: 0 }, { active_learners: Infinity }], "active_learners", 100, 40), "0,40 100,40");
});
