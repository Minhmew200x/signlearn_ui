import test from "node:test";
import assert from "node:assert/strict";

import { resolveVisibleLessonSelection } from "../src/app/lib/adminDashboardContent.js";

test("keeps current lesson when it still matches the search results", () => {
  const lessons = [
    { id: 101, title: "Xin chao" },
    { id: 202, title: "Cam on" },
  ];
  const filteredLessons = [{ id: 202, title: "Cam on" }];

  assert.equal(resolveVisibleLessonSelection({ lessons, filteredLessons, currentLessonId: "202" }), "202");
});

test("switches to the first visible lesson when the current lesson is filtered out", () => {
  const lessons = [
    { id: 101, title: "Xin chao" },
    { id: 202, title: "Cam on" },
    { id: 303, title: "Tam biet" },
  ];
  const filteredLessons = [{ id: 202, title: "Cam on" }];

  assert.equal(resolveVisibleLessonSelection({ lessons, filteredLessons, currentLessonId: "303" }), "202");
});

test("falls back to the first lesson when there is no current selection and no search filter", () => {
  const lessons = [
    { id: 101, title: "Xin chao" },
    { id: 202, title: "Cam on" },
  ];

  assert.equal(resolveVisibleLessonSelection({ lessons, filteredLessons: lessons, currentLessonId: "" }), "101");
});

test("clears the selection when the search has no matching lessons", () => {
  const lessons = [{ id: 101, title: "Xin chao" }];

  assert.equal(resolveVisibleLessonSelection({ lessons, filteredLessons: [], currentLessonId: "101", hasSearchQuery: true }), "");
});
