# Admin Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/dashboard` open an authenticated, responsive analytics dashboard backed by the four documented admin analytics endpoints.

**Architecture:** Keep the current admin route id `tong-quan` for compatibility, but render a focused `AdminAnalytics` component there instead of the legacy overview. Place pure range, formatting, and chart-data logic in `adminAnalytics.js`; the new component owns its read-only request lifecycle and preserves the last successful snapshot on refresh failure. Existing non-analytics admin sections remain in `AdminDashboard.jsx`.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 3, Node's built-in test runner, inline SVG/CSS only.

**Baseline caveat:** `npm test` currently has two unrelated failures in `tests/practice-mediapipe-cdn.test.mjs`: both expect a trailing slash after the MediaPipe `wasm/` URL, while `practice-webcam-client.js` and `practice-worker.js` currently use `wasm` without that slash. Do not change those files in this feature; targeted analytics tests and the production build are the feature gates.

---

## File structure

- Create: `src/app/lib/adminAnalytics.js` — date range validation, shared request query construction, metric formatting, derived completion rate, and scaled SVG points.
- Create: `src/components/auth/AdminAnalytics.jsx` — the authenticated analytics fetch lifecycle, filters, KPI cards, activity SVG, performance tabs, and content panels.
- Create: `tests/admin-analytics.test.mjs` — behavioral tests for pure analytics helpers.
- Create: `tests/admin-analytics-dashboard-source.test.mjs` — source contracts for the dashboard endpoints and the route integration.
- Modify: `src/components/auth/AdminDashboard.jsx` — label the default section Analytics and render `AdminAnalytics` for it; remove the unreachable legacy overview loader and renderer.

### Task 1: Lock the pure analytics contract

**Files:**

- Create: `tests/admin-analytics.test.mjs`
- Create: `src/app/lib/adminAnalytics.js`

- [x] **Step 1: Write the failing helper tests**

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnalyticsQueries,
  createDefaultAnalyticsRange,
  formatAnalyticsPercent,
  getCompletionRate,
  getMetricTrend,
  getRangeError,
  makeLinePoints,
} from "../src/app/lib/adminAnalytics.js";

test("creates an inclusive 30-day UTC analytics range", () => {
  assert.deepEqual(createDefaultAnalyticsRange(new Date("2026-07-20T16:00:00+07:00")), {
    start_date: "2026-06-21",
    end_date: "2026-07-20",
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

test("rejects inverted and over-366-day ranges", () => {
  assert.equal(getRangeError({ start_date: "2026-07-21", end_date: "2026-07-20" }), "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  assert.equal(getRangeError({ start_date: "2025-07-19", end_date: "2026-07-20" }), "Khoảng ngày tối đa là 366 ngày.");
});

test("formats percentage, trends, and safe completion rates", () => {
  assert.equal(formatAnalyticsPercent(82.4), "82,4%");
  assert.deepEqual(getMetricTrend({ value: 84, change_percent: null }), { label: "Mới", tone: "new" });
  assert.deepEqual(getMetricTrend({ value: 84, change_percent: -10.5 }), { label: "↓ 10,5%", tone: "down" });
  assert.equal(getCompletionRate({ completed_attempts: 147, attempts: 153 }), 96.08);
  assert.equal(getCompletionRate({ completed_attempts: 0, attempts: 0 }), null);
});

test("scales chronological activity values into deterministic SVG points", () => {
  assert.equal(makeLinePoints([{ active_learners: 0 }, { active_learners: 10 }, { active_learners: 5 }], "active_learners", 100, 40), "0,40 50,0 100,20");
});
```

- [x] **Step 2: Run the test and confirm the module is missing**

Run: `npm test -- tests/admin-analytics.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/app/lib/adminAnalytics.js`.

- [x] **Step 3: Implement the pure module**

Create `src/app/lib/adminAnalytics.js` with this exported implementation:

```js
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function createDefaultAnalyticsRange(referenceDate = new Date()) {
  const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  const start = new Date(end.getTime() - 29 * DAY_MS);
  return { start_date: toDateKey(start), end_date: toDateKey(end) };
}

export function getRangeError(range) {
  const start = parseDateKey(range?.start_date);
  const end = parseDateKey(range?.end_date);
  if (!start || !end) return "Chọn ngày bắt đầu và ngày kết thúc hợp lệ.";
  if (start > end) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  if (((end - start) / DAY_MS) + 1 > MAX_RANGE_DAYS) return "Khoảng ngày tối đa là 366 ngày.";
  return "";
}

export function buildAnalyticsQueries(range, limit = 10) {
  const error = getRangeError(range);
  if (error) throw new Error(error);
  const dates = { start_date: range.start_date, end_date: range.end_date };
  return { summary: dates, timeseries: dates, learning: { ...dates, limit }, content: { ...dates, limit } };
}

export function formatAnalyticsPercent(value, maximumFractionDigits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toLocaleString("vi-VN", { maximumFractionDigits })}%`;
}

export function getMetricTrend(metric) {
  const change = Number(metric?.change_percent);
  if (metric?.change_percent === null) return { label: "Mới", tone: "new" };
  if (!Number.isFinite(change) || change === 0) return { label: "Không đổi", tone: "neutral" };
  return { label: `${change > 0 ? "↑" : "↓"} ${formatAnalyticsPercent(Math.abs(change))}`, tone: change > 0 ? "up" : "down" };
}

export function getCompletionRate(item) {
  const attempts = Number(item?.attempts);
  const completed = Number(item?.completed_attempts);
  if (!Number.isFinite(attempts) || attempts <= 0 || !Number.isFinite(completed)) return null;
  return Math.round((completed / attempts) * 10000) / 100;
}

export function makeLinePoints(points, key, width, height) {
  if (!points?.length) return "";
  const values = points.map((point) => Math.max(0, Number(point?.[key]) || 0));
  const maximum = Math.max(...values, 1);
  const denominator = Math.max(points.length - 1, 1);
  return values.map((value, index) => `${Math.round((index / denominator) * width)},${Math.round(height - ((value / maximum) * height)}`).join(" ");
}
```

- [x] **Step 4: Run the focused helper tests**

Run: `npm test -- tests/admin-analytics.test.mjs`

Expected: PASS with 5 tests.

- [x] **Step 5: Commit the isolated helper contract**

```bash
git add tests/admin-analytics.test.mjs src/app/lib/adminAnalytics.js
git commit -m "Define safe analytics dashboard data helpers"
```

### Task 2: Load one complete dashboard snapshot and retain it on errors

**Files:**

- Create: `tests/admin-analytics-dashboard-source.test.mjs`
- Create: `src/components/auth/AdminAnalytics.jsx`

- [x] **Step 1: Write the failing request-lifecycle source contract**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("analytics dashboard loads the four documented endpoints as one snapshot", async () => {
  const source = await readSource("../src/components/auth/AdminAnalytics.jsx");
  assert.match(source, /Promise\.all\(\[/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/summary/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/timeseries/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/learning-performance/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/content-performance/);
  assert.match(source, /buildAnalyticsQueries\(range\)/);
  assert.match(source, /setSnapshot\(\{ summary, timeseries, learning, content \}\)/);
  assert.match(source, /Dữ liệu gần nhất vẫn đang được hiển thị/);
  assert.match(source, /Thử lại/);
});
```

- [x] **Step 2: Run the contract test and confirm the component is missing**

Run: `npm test -- tests/admin-analytics-dashboard-source.test.mjs`

Expected: FAIL with `ENOENT` for `src/components/auth/AdminAnalytics.jsx`.

- [x] **Step 3: Implement the request lifecycle and filter controls**

Create `AdminAnalytics.jsx`. Its request code must follow this shape exactly so all calls receive the same range and a failed refresh does not erase `snapshot`:

```jsx
const [draftRange, setDraftRange] = useState(() => createDefaultAnalyticsRange());
const [appliedRange, setAppliedRange] = useState(() => createDefaultAnalyticsRange());
const [snapshot, setSnapshot] = useState(null);
const [status, setStatus] = useState("idle");
const [error, setError] = useState("");

async function loadDashboard(range = appliedRange) {
  const rangeError = getRangeError(range);
  if (rangeError) {
    setError(rangeError);
    return;
  }
  const queries = buildAnalyticsQueries(range);
  setStatus("loading");
  setError("");
  try {
    const [summary, timeseries, learning, content] = await Promise.all([
      apiRequest("/api/v1/admin/analytics/summary", { accessToken, query: queries.summary }),
      apiRequest("/api/v1/admin/analytics/timeseries", { accessToken, query: queries.timeseries }),
      apiRequest("/api/v1/admin/analytics/learning-performance", { accessToken, query: queries.learning }),
      apiRequest("/api/v1/admin/analytics/content-performance", { accessToken, query: queries.content }),
    ]);
    setSnapshot({ summary, timeseries, learning, content });
    setAppliedRange(range);
    setStatus("ready");
  } catch (requestError) {
    setError(requestError?.message || "Không thể tải dữ liệu analytics.");
    setStatus("error");
  }
}

useEffect(() => {
  if (accessToken) void loadDashboard();
}, [accessToken]);
```

Render two controlled `type="date"` inputs bound to `draftRange`, a “30 ngày” button that resets `draftRange`, an “Áp dụng” button calling `loadDashboard(draftRange)`, and a “Tải lại” button calling `loadDashboard(appliedRange)`. While `status === "loading" && snapshot`, show the text `Dữ liệu gần nhất vẫn đang được hiển thị`; render the latest `error` with a `Thử lại` button. Before the first snapshot, render the existing card-style loading, error, and empty messages rather than a blank panel.

- [x] **Step 4: Run the request-lifecycle source contract**

Run: `npm test -- tests/admin-analytics-dashboard-source.test.mjs`

Expected: PASS with 1 test.

- [x] **Step 5: Commit the fetch lifecycle**

```bash
git add tests/admin-analytics-dashboard-source.test.mjs src/components/auth/AdminAnalytics.jsx
git commit -m "Load analytics dashboard data as a shared snapshot"
```

### Task 3: Render KPI, activity, learning, and content analytics

**Files:**

- Modify: `tests/admin-analytics-dashboard-source.test.mjs`
- Modify: `src/components/auth/AdminAnalytics.jsx`

- [x] **Step 1: Extend the source contract for the documented visual sections**

Append this test to `tests/admin-analytics-dashboard-source.test.mjs`:

```js
test("analytics dashboard exposes the required visual sections without a chart dependency", async () => {
  const source = await readSource("../src/components/auth/AdminAnalytics.jsx");
  assert.match(source, /Tổng học viên/);
  assert.match(source, /Hoạt động học tập/);
  assert.match(source, /active_learners/);
  assert.match(source, /practice_attempts/);
  assert.match(source, /quiz_submissions/);
  assert.match(source, /Khóa học/);
  assert.match(source, /Bài học/);
  assert.match(source, /Kiểm tra/);
  assert.match(source, /Ký hiệu được luyện nhiều/);
  assert.match(source, /practice_statuses/);
  assert.match(source, /sign_difficulties/);
  assert.match(source, /<svg/);
  assert.doesNotMatch(source, /recharts|chart\.js|victory/i);
});
```

- [x] **Step 2: Run the extended test and confirm it fails on the absent sections**

Run: `npm test -- tests/admin-analytics-dashboard-source.test.mjs`

Expected: FAIL in `analytics dashboard exposes the required visual sections` because the initial component has no KPI/chart/table markup.

- [x] **Step 3: Add the complete visual hierarchy**

Inside `AdminAnalytics.jsx`, add the following fixed KPI configuration and use it to render cards from `snapshot.summary`:

```jsx
const KPI_DEFINITIONS = [
  ["Tổng học viên", "total_students", "number"],
  ["Học viên mới", "new_students", "metric"],
  ["Đang học", "active_learners", "metric"],
  ["Lượt luyện", "practice_attempts", "metric"],
  ["Nộp quiz", "quiz_submissions", "metric"],
  ["Hoàn thành bài học", "lesson_completions", "metric"],
  ["Hoàn thành khóa", "course_completions", "metric"],
  ["Điểm luyện tập", "average_practice_score", "percent"],
  ["Điểm quiz", "average_quiz_score", "percent"],
  ["Tỷ lệ qua quiz", "quiz_pass_rate", "percent"],
];
```

Render scores/rates with `formatAnalyticsPercent`, object metrics with `getMetricTrend`, and `summary.content` as three inventory cards (`published_courses`, `published_lessons`, `active_signs`). Add an inline SVG `ActivityChart` that uses `makeLinePoints(points, key, 720, 220)` for exactly `active_learners`, `practice_attempts`, and `quiz_submissions`; a secondary selector switches to `registrations`, `lesson_completions`, and `course_completions`.

Render a controlled three-tab performance panel. The `courses` and `lessons` rows display active learners, completed learners, and an `average_progress_percent` progress bar. The `quizzes` rows display attempts, average score, and pass rate, applying amber text when either percentage is below 70. Below it, render `content.top_signs` in an overflow-safe table with `getCompletionRate(sign)` and `formatAnalyticsPercent`; render `content.practice_statuses` and `content.sign_difficulties` as labeled proportional bars. Translate difficulty labels only: `easy` → `Dễ`, `medium` → `Trung bình`, and `hard` → `Khó`; leave practice status enum labels untouched.

Use the existing rounded card, slate, emerald, rose, and amber Tailwind treatments. Each data collection must render a friendly empty row when its array is empty. Do not introduce imports beyond React and `adminAnalytics.js`.

- [x] **Step 4: Run the visual source contract and the helper tests**

Run: `npm test -- tests/admin-analytics.test.mjs tests/admin-analytics-dashboard-source.test.mjs`

Expected: PASS with 7 tests.

- [x] **Step 5: Commit the dashboard visual sections**

```bash
git add tests/admin-analytics-dashboard-source.test.mjs src/components/auth/AdminAnalytics.jsx
git commit -m "Render the admin analytics dashboard"
```

### Task 4: Make Analytics the default admin section without changing other administration flows

**Files:**

- Modify: `tests/admin-analytics-dashboard-source.test.mjs`
- Modify: `src/components/auth/AdminDashboard.jsx`

- [x] **Step 1: Add the failing route-integration source contract**

Append this test:

```js
test("default admin route delegates to the standalone analytics component", async () => {
  const source = await readSource("../src/components/auth/AdminDashboard.jsx");
  assert.match(source, /import \{ AdminAnalytics \} from "\.\/AdminAnalytics\.jsx"/);
  assert.match(source, /\{ id: "tong-quan", label: "Analytics" \}/);
  assert.match(source, /if \(activeSection === "tong-quan"\) return <AdminAnalytics apiRequest=\{apiRequest\} accessToken=\{accessToken\} \/>;/);
  assert.doesNotMatch(source, /apiRequest\("\/api\/v1\/admin\/overview"/);
});
```

- [x] **Step 2: Run the source contract and confirm the existing dashboard fails it**

Run: `npm test -- tests/admin-analytics-dashboard-source.test.mjs`

Expected: FAIL in `default admin route delegates to the standalone analytics component` because the existing section is labelled `Admin` and loads `/api/v1/admin/overview`.

- [x] **Step 3: Wire the new component and remove only dead overview behavior**

Make these exact integration changes in `AdminDashboard.jsx`:

```jsx
import { AdminAnalytics } from "./AdminAnalytics.jsx";

const SECTION_DEFS = [
  { id: "tong-quan", label: "Analytics" },
  { id: "nguoi-dung", label: "Users" },
  { id: "khoa-hoc", label: "Courses" },
  { id: "bai-hoc", label: "Lessons" },
  { id: "noi-dung-mooc", label: "Signs & Quiz" },
  { id: "blog", label: "Blog" },
  { id: "ai", label: "AI" },
  { id: "practice", label: "Practice" },
];

useEffect(() => {
  if (!accessToken || activeSection === "tong-quan") return;
  loadSection(activeSection);
}, [activeSection, accessToken]);

function renderSectionBody() {
  if (activeSection === "tong-quan") return <AdminAnalytics apiRequest={apiRequest} accessToken={accessToken} />;
  if (activeSectionState.status === "loading" && !activeSectionState.data) {
    return <EmptyState title="Loading..." description="Data will load only when this section is opened." />;
  }
  if (activeSectionState.status === "error") return <EmptyState title="Load failed" description={activeSectionState.error} />;
  if (activeSection === "nguoi-dung") return renderUsersSection();
  if (activeSection === "khoa-hoc") return renderCoursesSection();
  if (activeSection === "bai-hoc") return renderLessonsSection();
  if (activeSection === "noi-dung-mooc") return renderContentSection();
  if (activeSection === "blog") return renderBlogSection();
  if (activeSection === "ai") return renderAiSection();
  if (activeSection === "practice") return renderPracticeSection();
  return null;
}
```

Delete the `sectionId === "tong-quan"` branch in `loadSection` and delete `renderOverviewSection`; neither is reachable after the integration. Keep every non-analytics request and renderer unchanged.

- [x] **Step 4: Run integration, focused legacy, and route tests**

Run: `npm test -- tests/admin-analytics.test.mjs tests/admin-analytics-dashboard-source.test.mjs tests/admin-dashboard-content.test.mjs tests/route-contract.test.mjs`

Expected: PASS with all tests in the four files.

- [x] **Step 5: Commit the default-route integration**

```bash
git add tests/admin-analytics-dashboard-source.test.mjs src/components/auth/AdminDashboard.jsx
git commit -m "Open the admin dashboard on analytics"
```

### Task 5: Verify the feature and record the known baseline gap

**Files:**

- Modify: `docs/superpowers/plans/2026-07-20-admin-analytics-dashboard.md` — mark all completed checkboxes only after the matching command has passed.

- [x] **Step 1: Run the complete focused analytics regression set**

Run: `npm test -- tests/admin-analytics.test.mjs tests/admin-analytics-dashboard-source.test.mjs tests/admin-dashboard-content.test.mjs tests/route-contract.test.mjs`

Expected: PASS with zero failures.

- [x] **Step 2: Run the production build**

Run: `npm run build`

Expected: exit code 0 and Vite reports the generated production bundle.

- [x] **Step 3: Run the repository suite and classify only the pre-existing failures**

Run: `npm test`

Expected: 64 passing tests and exactly these two known failures, both in `tests/practice-mediapipe-cdn.test.mjs`: `practice webcam client uses a published MediaPipe wasm base URL` and `practice worker uses the same published MediaPipe CDN version and wasm base URL`. No analytics, admin-dashboard, route, or build failure is acceptable.

- [x] **Step 4: Check the diff for whitespace and scope**

Run: `git diff --check master...HEAD && git diff --name-only master...HEAD`

Expected: no whitespace errors; only the files listed in this plan plus this plan document.

- [ ] **Step 5: Commit the completed checklist if its checkboxes changed**

```bash
git add docs/superpowers/plans/2026-07-20-admin-analytics-dashboard.md
git commit -m "Record analytics dashboard verification evidence"
```
