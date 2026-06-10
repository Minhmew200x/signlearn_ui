import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("blog cards open detail directly from the card surface", () => {
  const source = fs.readFileSync("src/pages/Blogs.jsx", "utf8");

  assert.match(source, /onClick=\{onOpen\}/);
  assert.match(source, /cursor-pointer/);
});
