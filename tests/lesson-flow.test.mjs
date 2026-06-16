import test from "node:test";
import assert from "node:assert/strict";

import { buildLessonFlowItems, getLessonInitialActiveWordIndex, isAiPracticeUnlocked } from "../src/app/lib/lessonFlow.js";

test("completed mooc unlocks AI practice without requiring quiz completion", () => {
  assert.equal(
    isAiPracticeUnlocked({
      activeWordIndex: 0,
      vocabItems: [{ id: 1, word: "Xin chao" }, { id: 2, word: "Cam on" }],
      hasQuiz: true,
      quizResult: null,
      lessonCompleted: true,
    }),
    true,
  );
});

test("completed mooc marks vocab steps done and opens both quiz and AI in lesson flow", () => {
  const items = buildLessonFlowItems({
    activeWordIndex: 0,
    vocabItems: [{ id: 1, word: "Xin chao" }, { id: 2, word: "Cam on" }],
    hasQuiz: true,
    quizResult: null,
    quizTitle: "Quiz bai hoc",
    showAiPracticeStep: true,
    lessonCompleted: true,
  });

  assert.deepEqual(
    items.map((item) => ({ type: item.type, status: item.status })),
    [
      { type: "word", status: "completed" },
      { type: "word", status: "completed" },
      { type: "quiz", status: "active" },
      { type: "ai", status: "active" },
    ],
  );
});

test("completed mooc starts lesson at quiz step so sidebar vocab stays green", () => {
  assert.equal(
    getLessonInitialActiveWordIndex({
      vocabItems: [{ id: 1, word: "Xin chao" }, { id: 2, word: "Cam on" }],
      hasQuiz: true,
      lessonCompleted: true,
    }),
    2,
  );
});
