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
  assert.match(source, /Promise\.all\(\[/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/summary/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/timeseries/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/learning-performance/);
  assert.match(source, /\/api\/v1\/admin\/analytics\/content-performance/);
  assert.match(source, /buildAnalyticsQueries\(range\)/);
  assert.match(source, /setSnapshot\(\{ summary, timeseries, learning, content \}\)/);
  assert.match(source, /Dữ liệu gần nhất vẫn đang được hiển thị/);
  assert.match(source, /Thử lại/);
  assert.match(source, /useRef\(0\)/);
  assert.match(
    source,
    /async function loadDashboard\(range = appliedRange\) \{\s+const requestVersion = \+\+requestVersionRef\.current;/
  );
  assert.match(
    source,
    /\]\);\s+if \(requestVersion !== requestVersionRef\.current\) return;\s+setSnapshot\(\{ summary, timeseries, learning, content \}\);\s+setAppliedRange\(\{ \.\.\.range \}\);/
  );
  assert.match(
    source,
    /catch \(requestError\) \{\s+if \(requestVersion !== requestVersionRef\.current\) return;\s+setError\(requestError\?\.message \|\| "Không thể tải dữ liệu phân tích\."\);/
  );
  assert.match(source, /apiRequest\("\/api\/v1\/admin\/analytics\/summary", \{ method: "GET", accessToken, query: queries\.summary \}\)/);
  assert.match(source, /apiRequest\("\/api\/v1\/admin\/analytics\/timeseries", \{ method: "GET", accessToken, query: queries\.timeseries \}\)/);
  assert.match(source, /apiRequest\("\/api\/v1\/admin\/analytics\/learning-performance", \{ method: "GET", accessToken, query: queries\.learning \}\)/);
  assert.match(source, /apiRequest\("\/api\/v1\/admin\/analytics\/content-performance", \{ method: "GET", accessToken, query: queries\.content \}\)/);
  assert.match(
    source,
    /useEffect\(\(\) => \{\s+if \(!accessToken\) return;\s+loadDashboard\(\);\s+return \(\) => \{\s+requestVersionRef\.current \+= 1;\s+\};\s+\}, \[accessToken\]\);/
  );
});
