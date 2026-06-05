# Quiz Contract Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the lesson quiz and admin quiz workflows with the current backend quiz API without rewriting the surrounding app flow.

**Architecture:** Add small shared quiz helpers for normalization and payload building, then wire `LessonPage` and `AdminDashboard` to those helpers. Lock behavior with focused node tests that fail on the old payload shape and pass once the new contract is implemented.

**Tech Stack:** React 19, Vite 8, Node test runner, existing `apiRequest` helper.

---

### Task 1: Lock the user quiz contract in tests

**Files:**
- Create: `tests/quiz-contract.test.mjs`
- Test: `tests/quiz-contract.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('getQuizQuestions normalizes current backend quiz question shapes', () => {
  const questions = getQuizQuestions({
    quiz: {
      detail: {
        questions: [
          {
            id: 11,
            question_type: 'multiple_choice',
            video_slug: 'xin-chao',
            video_url: '/api/v1/signs/xin-chao/video',
            options: [{ option_key: 'option-1', option_text: 'Xin chao', is_correct: true }],
          },
        ],
      },
    },
  }, (slug) => `/signs/${slug}`);

  assert.equal(questions[0].resolvedVideoUrl, '/api/v1/signs/xin-chao/video');
  assert.equal(questions[0].options[0].submitValue, 'option-1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: FAIL because current quiz mapper still expects old fields like `media_url` and `option.id`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// in src/app/lib/quiz.js
export function getQuizQuestions(lessonMaterial, makeSignVideoEndpoint) {
  // map video_url/video_slug/options[].option_key into a render model
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/quiz-contract.test.mjs src/app/lib/quiz.js
git commit -m "Align user quiz mapping with backend contract"
```

### Task 2: Lock the submit payload and required-answer rules

**Files:**
- Create: `src/app/lib/quizSubmission.js`
- Modify: `tests/quiz-contract.test.mjs`
- Test: `tests/quiz-contract.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('buildQuizSubmitPayload requires every question to be answered and uses selected_option_key / answer_text', () => {
  assert.throws(() => buildQuizSubmitPayload([{ id: 1, question_type: 'multiple_choice' }], {}), /Con 1 cau/);

  assert.deepEqual(
    buildQuizSubmitPayload([
      { id: 1, question_type: 'multiple_choice' },
      { id: 2, question_type: 'sign_to_text' },
    ], {
      1: { selectedOptionKey: 'option-2' },
      2: { answerText: 'xin chao' },
    }),
    {
      answers: [
        { question_id: 1, selected_option_key: 'option-2' },
        { question_id: 2, answer_text: 'xin chao' },
      ],
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: FAIL because no shared submit builder exists and current UI still builds `selected_option_id`.

- [ ] **Step 3: Write minimal implementation**

```javascript
export function buildQuizSubmitPayload(questions, answersByQuestionId) {
  // validate all answers, then return { answers: [...] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/quiz-contract.test.mjs src/app/lib/quizSubmission.js
git commit -m "Add quiz submit payload builder"
```

### Task 3: Lock admin payload builders for all three question types

**Files:**
- Create: `src/app/lib/quizAdmin.js`
- Modify: `tests/quiz-contract.test.mjs`
- Test: `tests/quiz-contract.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('buildQuizQuestionPayload matches backend requirements for each question type', () => {
  assert.deepEqual(
    buildQuizQuestionPayload({
      question_type: 'multiple_choice',
      video_slug: 'xin-chao',
      options: [
        { option_text: 'Xin chao', is_correct: true },
        { option_text: 'Cam on', is_correct: false },
      ],
    }),
    {
      question_text: null,
      video_slug: 'xin-chao',
      options: [
        { option_key: null, option_text: 'Xin chao', video_slug: null, is_correct: true },
        { option_key: null, option_text: 'Cam on', video_slug: null, is_correct: false },
      ],
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: FAIL because current admin payload builder does not require `video_slug` for `multiple_choice` and mixes old assumptions.

- [ ] **Step 3: Write minimal implementation**

```javascript
export function buildQuizQuestionPayload(draft, fallbackQuestion = null) {
  // branch on multiple_choice, video_choice, sign_to_text
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/quiz-contract.test.mjs src/app/lib/quizAdmin.js
git commit -m "Align admin quiz payload builders"
```

### Task 4: Wire the user lesson quiz UI to the shared helpers

**Files:**
- Modify: `src/pages/LessonPage.jsx`
- Modify: `src/app/lib/quiz.js`
- Create: `src/app/lib/quizSubmission.js`
- Test: `tests/quiz-contract.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('user submit payload uses quiz link ids and supports text answers', () => {
  const payload = buildQuizSubmitPayload([
    { id: 7, question_type: 'video_choice' },
    { id: 8, question_type: 'sign_to_text' },
  ], {
    7: { selectedOptionKey: 'option-1' },
    8: { answerText: 'toi la hoc vien' },
  });

  assert.equal(payload.answers[0].question_id, 7);
  assert.equal(payload.answers[1].answer_text, 'toi la hoc vien');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: FAIL before `LessonPage` is switched to the new helper/state shape.

- [ ] **Step 3: Write minimal implementation**

```javascript
const payload = buildQuizSubmitPayload(quizQuestions, selectedAnswers);
const startAttempt = await apiRequest(`/api/v1/quizzes/${lessonMaterial.quiz.quizId}/start`, { method: 'POST', accessToken });
const result = await apiRequest(`/api/v1/quiz-attempts/${startAttempt.attempt_id}/submit`, {
  method: 'POST',
  accessToken,
  body: payload,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LessonPage.jsx src/app/lib/quiz.js src/app/lib/quizSubmission.js tests/quiz-contract.test.mjs
git commit -m "Wire lesson quiz UI to backend payloads"
```

### Task 5: Wire the admin dashboard to the shared quiz admin helper

**Files:**
- Modify: `src/components/auth/AdminDashboard.jsx`
- Create: `src/app/lib/quizAdmin.js`
- Test: `tests/quiz-contract.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('buildQuizLinkPayload preserves order and points while using typed question ids', () => {
  assert.deepEqual(
    buildQuizLinkPayload({ question_type: 'video_choice', order_index: 3, points: 2 }, { id: 101, question_type: 'video_choice' }),
    { question_type: 'video_choice', question_id: 101, order_index: 3, points: 2 },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: FAIL until shared admin helper exists and dashboard imports it.

- [ ] **Step 3: Write minimal implementation**

```javascript
import {
  QUIZ_QUESTION_TYPE_CONFIG,
  QUIZ_QUESTION_TYPE_OPTIONS,
  buildQuizCreatePayload,
  buildQuizLinkPayload,
  buildQuizQuestionPayload,
  buildQuizUpdatePayload,
  createEmptyQuizDraft,
  createEmptyQuizOptionDraft,
  createEmptyQuizQuestionDraft,
  getQuestionAdminEndpoint,
  getQuestionCreateEndpoint,
} from '../../app/lib/quizAdmin.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/quiz-contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/AdminDashboard.jsx src/app/lib/quizAdmin.js tests/quiz-contract.test.mjs
git commit -m "Share admin quiz payload logic"
```

### Task 6: Verify the integrated change

**Files:**
- Test: `tests/quiz-contract.test.mjs`
- Test: `package.json`

- [ ] **Step 1: Run focused test suite**

```bash
npm test -- tests/quiz-contract.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run broader existing contract checks**

```bash
npm test -- tests/route-contract.test.mjs tests/home-catalog.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: Vite build completes successfully.

- [ ] **Step 4: Document any verification gap**

```markdown
If live backend-only behavior such as auth-gated 409/400 quiz responses cannot be exercised locally, note that the contract is validated by unit tests and existing API helper wiring only.
```

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/quiz.js src/app/lib/quizSubmission.js src/app/lib/quizAdmin.js src/pages/LessonPage.jsx src/components/auth/AdminDashboard.jsx tests/quiz-contract.test.mjs docs/superpowers/specs/2026-06-05-quiz-contract-alignment-design.md docs/superpowers/plans/2026-06-05-quiz-contract-alignment.md
git commit -m "Complete quiz contract alignment"
```
