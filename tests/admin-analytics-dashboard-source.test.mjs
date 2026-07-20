import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/components/auth/AdminAnalytics.jsx"
);

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
  assert.match(source, /function Button\(\{ children, secondary = false, className = "", \.\.\.props \}\)/);
  assert.match(source, /\[baseClassName, className\]\.filter\(Boolean\)\.join\(" "\)/);
  assert.match(source, /<Button className="mt-4" onClick=\{\(\) => loadDashboard\(\)\}>Thử lại<\/Button>/);
  assert.equal([...source.matchAll(/role="status" aria-live="polite"/g)].length, 2);
  assert.equal([...source.matchAll(/role="alert"/g)].length, 2);
});
