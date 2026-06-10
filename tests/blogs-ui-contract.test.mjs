import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("blogs page keeps list-focused UI contracts", () => {
  const source = fs.readFileSync("src/pages/Blogs.jsx", "utf8");

  assert.doesNotMatch(source, /Tải lại/);
  assert.doesNotMatch(source, /Đọc bài/);
  assert.match(source, /!isDetailRoute\s*&&\s*\(/);
  assert.match(source, /text-blue-700/);
  assert.match(source, /text-amber-500/);
});
