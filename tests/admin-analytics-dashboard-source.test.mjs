import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/components/auth/AdminAnalytics.jsx"
);
const dashboardPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/components/auth/AdminDashboard.jsx"
);

test("AdminDashboard delegates the default section to AdminAnalytics without legacy overview loading", () => {
  const source = fs.readFileSync(dashboardPath, "utf8");

  assert.match(source, /import \{ AdminAnalytics \} from "\.\/AdminAnalytics";/);
  assert.match(source, /\{ id: "tong-quan", label: "Analytics" \}/);
  assert.match(
    source,
    /function renderSectionBody\(\) \{\s+if \(activeSection === "tong-quan"\) return <AdminAnalytics apiRequest=\{apiRequest\} accessToken=\{accessToken\} \/>;/
  );
  assert.match(
    source,
    /useEffect\(\(\) => \{\s+if \(!accessToken \|\| activeSection === "tong-quan"\) return;\s+loadSection\(activeSection\);/
  );
  assert.doesNotMatch(source, /\/api\/v1\/admin\/overview/);
  assert.doesNotMatch(source, /function renderOverviewSection\(/);

  const sectionDefinitions = source.match(/const SECTION_DEFS = \[([\s\S]*?)\];/)?.[1];
  assert.ok(sectionDefinitions, "the dashboard section definitions must remain explicit");

  const renderSectionBody = source.match(/function renderSectionBody\(\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(renderSectionBody, "the dashboard section renderer must remain explicit");

  [
    ["nguoi-dung", "renderUsersSection"],
    ["khoa-hoc", "renderCoursesSection"],
    ["bai-hoc", "renderLessonsSection"],
    ["noi-dung-mooc", "renderContentSection"],
    ["blog", "renderBlogSection"],
    ["ai", "renderAiSection"],
    ["practice", "renderPracticeSection"],
  ].forEach(([sectionId, renderSection]) => {
    assert.match(sectionDefinitions, new RegExp(`\\{ id: "${sectionId}", label: "[^"]+" \\}`));
    assert.match(renderSectionBody, new RegExp(`if \\(activeSection === "${sectionId}"\\) return ${renderSection}\\(\\);`));
  });
});

test("AdminAnalytics keeps the dashboard lifecycle and request contract in source", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /export function AdminAnalytics\(\{ apiRequest, accessToken \}\)/);
  assert.match(source, /const \[draftRange, setDraftRange\] = useState\(\(\) => createDefaultAnalyticsRange\(\)\);/);
  assert.match(source, /const \[appliedRange, setAppliedRange\] = useState\(\(\) => createDefaultAnalyticsRange\(\)\);/);
  assert.match(source, /const \[snapshotAccessToken, setSnapshotAccessToken\] = useState\(null\);/);
  assert.match(source, /Promise\.all\(\[/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/summary/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/timeseries/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/learning-performance/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/content-performance/);
  assert.match(source, /buildAnalyticsQueries\(range\)/);
  assert.match(source, /setSnapshot\(\{ summary, timeseries, learning, content \}\)/);
  assert.match(source, /Dữ liệu gần nhất vẫn đang được hiển thị/);
  assert.match(source, /Thử lại/);
  assert.match(source, /useRef\(createAnalyticsRequestGate\(\)\)/);
  assert.match(
    source,
    /async function loadDashboard\(range = appliedRange\) \{\s+const requestToken = requestGateRef\.current\.begin\(\);/
  );
  assert.match(
    source,
    /\]\);\s+if \(!requestGateRef\.current\.isCurrent\(requestToken\)\) return;\s+setSnapshot\(\{ summary, timeseries, learning, content \}\);\s+setSnapshotAccessToken\(accessToken\);\s+setAppliedRange\(\{ \.\.\.range \}\);/
  );
  assert.match(
    source,
    /catch \(requestError\) \{\s+if \(!requestGateRef\.current\.isCurrent\(requestToken\)\) return;\s+setError\(requestError\?\.message \|\| "Không thể tải dữ liệu phân tích\."\);/
  );
  assert.match(source, /apiRequest\("\/api\/v1\/admin\/analytics\/summary", \{ method: "GET", accessToken, query: queries\.summary \}\)/);
  assert.match(source, /apiRequest\("\/api\/v1\/admin\/analytics\/timeseries", \{ method: "GET", accessToken, query: queries\.timeseries \}\)/);
  assert.match(source, /apiRequest\("\/api\/v1\/admin\/analytics\/learning-performance", \{ method: "GET", accessToken, query: queries\.learning \}\)/);
  assert.match(source, /apiRequest\("\/api\/v1\/admin\/analytics\/content-performance", \{ method: "GET", accessToken, query: queries\.content \}\)/);
  assert.match(
    source,
    /useEffect\(\(\) => \{\s+requestGateRef\.current\.invalidate\(\);\s+if \(!accessToken\) \{\s+setSnapshot\(null\);\s+setSnapshotAccessToken\(null\);\s+setError\(""\);\s+setStatus\("idle"\);\s+\} else \{\s+setSnapshot\(null\);\s+setSnapshotAccessToken\(null\);\s+setError\(""\);\s+loadDashboard\(\);\s+\}\s+return \(\) => \{\s+requestGateRef\.current\.invalidate\(\);\s+\};\s+\}, \[accessToken\]\);/
  );
  assert.match(
    source,
    /const visibleSnapshot = getVisibleAnalyticsSnapshot\(snapshot, snapshotAccessToken, accessToken\);/
  );
  assert.match(
    source,
    /const isTokenTransition = Boolean\(accessToken && snapshotAccessToken !== null && accessToken !== snapshotAccessToken\);/
  );
  assert.match(source, /const isLoading = status === "loading" \|\| isTokenTransition;/);
  assert.match(source, /\{isLoading && visibleSnapshot \? \(/);
  assert.match(source, /\{!visibleSnapshot \? \(/);
  assert.match(
    source,
    /const rangeError = getRangeError\(range\);\s+if \(rangeError\) \{[\s\S]*?return;\s+\}\s+const queries = buildAnalyticsQueries\(range\);\s+[\s\S]*?apiRequest\("\/api\/v1\/admin\/analytics\/summary"/
  );

  const catchBlock = source.match(/catch \(requestError\) \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(catchBlock, "the request error path must remain explicit");
  assert.doesNotMatch(catchBlock, /setSnapshot|setAppliedRange/);

  assert.match(
    source,
    /\{!visibleSnapshot \? \([\s\S]*?\{isLoading \|\| status === "idle" \? \([\s\S]*?Đang tải bảng điều khiển phân tích\.\.\.[\s\S]*?\) : \([\s\S]*?\{error \|\| "Không thể tải dữ liệu phân tích\."\}/
  );
  assert.match(source, /<DateField label="Từ ngày" value=\{draftRange\.start_date\} onChange=/);
  assert.match(source, /<DateField label="Đến ngày" value=\{draftRange\.end_date\} onChange=/);
  assert.match(source, /<Button secondary onClick=\{resetToThirtyDays\} disabled=\{isLoading\}>30 ngày gần nhất<\/Button>/);
  assert.match(source, /<Button onClick=\{\(\) => loadDashboard\(draftRange\)\} disabled=\{isLoading\}>Áp dụng<\/Button>/);
  assert.match(source, /<Button secondary onClick=\{\(\) => loadDashboard\(\)\} disabled=\{isLoading\}>Tải lại<\/Button>/);
  assert.match(source, /if \(!accessToken\) return null;/);
  assert.match(source, /function Button\(\{ children, secondary = false, className = "", \.\.\.props \}\)/);
  assert.match(source, /\[baseClassName, className\]\.filter\(Boolean\)\.join\(" "\)/);
  assert.match(source, /<Button className="mt-4" onClick=\{\(\) => loadDashboard\(\)\}>Thử lại<\/Button>/);
  assert.equal([...source.matchAll(/role="status" aria-live="polite"/g)].length, 2);
  assert.equal([...source.matchAll(/role="alert"/g)].length, 2);
});

test("AdminAnalytics renders dependency-free Vietnamese analytics visuals from the visible snapshot", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  [
    "Tổng học viên",
    "Hoạt động học tập",
    "Khóa học",
    "Bài học",
    "Kiểm tra",
    "Ký hiệu được luyện nhiều",
  ].forEach((label) => assert.match(source, new RegExp(label)));

  [
    "active_learners",
    "practice_attempts",
    "quiz_submissions",
    "practice_statuses",
    "sign_difficulties",
  ].forEach((field) => assert.match(source, new RegExp(field)));

  assert.match(source, /formatAnalyticsPercent/);
  assert.match(source, /getMetricTrend/);
  assert.match(source, /getCompletionRate/);
  assert.match(source, /makeLinePoints/);
  assert.match(source, /<svg[\s>]/);
  assert.doesNotMatch(source, /(?:from\s+["']|import\s+)[^\n]*\b(?:recharts|chart\.js|victory)\b/i);
});

test("AdminAnalytics hardens dashboard visuals for malformed records, shared chart scales, and accessible controls", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /function normalizeAnalyticsRecords\(value\)/);
  assert.match(source, /normalizeAnalyticsRecords\(visibleSnapshot\?\.timeseries\?\.points\)/);
  assert.match(source, /normalizeAnalyticsRecords\(visibleSnapshot\?\.learning\?\.courses\)/);
  assert.match(source, /normalizeAnalyticsRecords\(visibleSnapshot\?\.learning\?\.lessons\)/);
  assert.match(source, /normalizeAnalyticsRecords\(visibleSnapshot\?\.learning\?\.quizzes\)/);
  assert.match(source, /normalizeAnalyticsRecords\(visibleSnapshot\?\.content\?\.top_signs\)/);
  assert.match(source, /normalizeAnalyticsRecords\(visibleSnapshot\?\.content\?\.practice_statuses\)/);
  assert.match(source, /normalizeAnalyticsRecords\(visibleSnapshot\?\.content\?\.sign_difficulties\)/);
  assert.match(source, /function getRecordKey\(prefix, value, index\)/);
  assert.match(source, /function normalizeAnalyticsPercent\(value\)/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuemin=\{0\}/);
  assert.match(source, /aria-valuemax=/);
  assert.match(source, /aria-valuenow=/);
  assert.match(source, /aria-valuetext=/);
  assert.match(source, /sharedMaximum/);
  assert.match(source, /makeLinePoints\(points, item\.key, plotWidth, chartHeight, sharedMaximum\)/);
  assert.match(source, /activity-chart-summary/);
  assert.match(source, /aria-pressed=\{performanceTab === tab\}/);
  assert.doesNotMatch(source, /role="tab(?:list)?"/);
});

test("AdminAnalytics exposes every selected chart point to screen readers", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /<table id="activity-chart-data" className="sr-only">/);
  assert.match(source, /<caption id="activity-chart-data-caption">/);
  assert.match(source, /aria-describedby="activity-chart-data-caption"/);
  assert.match(source, /points\.map\(\(point, index\) =>/);
  assert.match(source, /getRecordKey\("activity-point", point\.date, index\)/);
  assert.match(source, /getRecordText\(point\.date, "Không xác định"\)/);
});
