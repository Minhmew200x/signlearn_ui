import test from "node:test";
import assert from "node:assert/strict";

import { getVisibleHomeTopics } from "../src/app/lib/homeCatalog.js";

test("home shows all backend topics instead of truncating the list", () => {
  const topics = Array.from({ length: 9 }, (_, index) => ({
    id: `course-${index + 1}`,
    title: `Course ${index + 1}`,
  }));

  assert.deepEqual(getVisibleHomeTopics(topics), topics);
});
