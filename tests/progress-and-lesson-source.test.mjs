import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { isMoocQuizPassed } from "../src/app/lib/progress.js";

test("local best score marks a mooc quiz as passed even before backend lesson reaches completed", () => {
  assert.equal(
    isMoocQuizPassed({
      topicProgress: { bestScores: { 2: 85 }, completedMoocs: { 2: true } },
      selectedMoocIndex: 2,
      backendLessonProgress: { status: "Đang tiến hành", progress_percent: 70 },
    }),
    true,
  );
});

test("lesson flow sidebar keeps each item full width on its own row", async () => {
  const source = await readFile(new URL("../src/pages/LessonPage.jsx", import.meta.url), "utf8");

  assert.match(source, /className=\{`w-full rounded-2xl border px-4 py-4 text-left transition/);
});

test("completed lesson review does not recreate vocab item list on every render", async () => {
  const source = await readFile(new URL("../src/pages/LessonPage.jsx", import.meta.url), "utf8");

  assert.match(source, /const vocabItems = useMemo\(/);
});
