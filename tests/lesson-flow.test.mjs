import test from "node:test";
import assert from "node:assert/strict";

import { buildLessonFlowItems, isQuizUnlocked } from "../src/app/lib/lessonFlow.js";

const vocabItems = [
  { id: "w1", word: "Xin chao" },
  { id: "w2", word: "Cam on" },
  { id: "w3", word: "Tam biet" },
];

test("lesson flow tracks completed and active vocab steps before quiz unlock", () => {
  assert.equal(isQuizUnlocked({ activeWordIndex: 1, vocabItems, hasQuiz: true }), false);

  assert.deepEqual(
    buildLessonFlowItems({ activeWordIndex: 1, vocabItems, hasQuiz: true, quizResult: null }),
    [
      { id: "word-w1", type: "word", label: "Xin chao", status: "completed", explanation: null },
      { id: "word-w2", type: "word", label: "Cam on", status: "active", explanation: null },
      { id: "word-w3", type: "word", label: "Tam biet", status: "upcoming", explanation: null },
      { id: "quiz", type: "quiz", label: "Quiz cuoi bai", status: "upcoming", explanation: "Tra loi quiz sau khi hoc xong cac tu." },
    ],
  );
});

test("lesson flow keeps quiz separate while learner is still on the last word", () => {
  assert.equal(isQuizUnlocked({ activeWordIndex: 2, vocabItems, hasQuiz: true }), false);

  assert.deepEqual(
    buildLessonFlowItems({
      activeWordIndex: 2,
      vocabItems,
      hasQuiz: true,
      quizResult: null,
    }),
    [
      { id: "word-w1", type: "word", label: "Xin chao", status: "completed", explanation: null },
      { id: "word-w2", type: "word", label: "Cam on", status: "completed", explanation: null },
      { id: "word-w3", type: "word", label: "Tam biet", status: "active", explanation: null },
      { id: "quiz", type: "quiz", label: "Quiz cuoi bai", status: "upcoming", explanation: "Tra loi quiz sau khi hoc xong cac tu." },
    ],
  );
});

test("lesson flow activates quiz only after learner advances past the last word", () => {
  assert.equal(isQuizUnlocked({ activeWordIndex: 3, vocabItems, hasQuiz: true }), true);

  assert.deepEqual(
    buildLessonFlowItems({
      activeWordIndex: 3,
      vocabItems,
      hasQuiz: true,
      quizResult: { passed: true },
    }),
    [
      { id: "word-w1", type: "word", label: "Xin chao", status: "completed", explanation: null },
      { id: "word-w2", type: "word", label: "Cam on", status: "completed", explanation: null },
      { id: "word-w3", type: "word", label: "Tam biet", status: "completed", explanation: null },
      { id: "quiz", type: "quiz", label: "Quiz cuoi bai", status: "completed", explanation: "Tra loi quiz sau khi hoc xong cac tu." },
    ],
  );
});
