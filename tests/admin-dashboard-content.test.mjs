import test from "node:test";
import assert from "node:assert/strict";

import { resolveQuizCreateAvailability, resolveVisibleLessonSelection } from "../src/app/lib/adminDashboardContent.js";

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

test("locks quiz creation when the chosen lesson already has a quiz", () => {
  assert.deepEqual(
    resolveQuizCreateAvailability({
      contentLessonId: "101",
      draftLessonId: "101",
      contentDetailsByLessonId: {
        101: {
          quizzes: [{ id: 11, title: "Quiz bai 1" }],
          quizSummary: [{ id: 11 }],
        },
      },
    }),
    {
      lessonId: "101",
      quizCount: 1,
      hasQuiz: true,
      isLocked: true,
    },
  );
});

test("keeps quiz creation open when the chosen lesson has no quiz yet", () => {
  assert.deepEqual(
    resolveQuizCreateAvailability({
      contentLessonId: "101",
      draftLessonId: "202",
      contentDetailsByLessonId: {
        202: {
          quizzes: [],
          quizSummary: [],
        },
      },
    }),
    {
      lessonId: "202",
      quizCount: 0,
      hasQuiz: false,
      isLocked: false,
    },
  );
});
