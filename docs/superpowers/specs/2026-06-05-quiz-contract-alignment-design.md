# Quiz Contract Alignment Design

## Goal

Hoan thien quiz cho user UI va admin UI de khop backend quiz API hien tai. User flow phai render dung 3 loai cau hoi `multiple_choice`, `video_choice`, `sign_to_text`; bat buoc tra loi het truoc khi nop; submit dung payload `selected_option_key` / `answer_text`. Admin flow phai tao va sua duoc metadata quiz va question-bank payload theo dung shape API, khong theo schema quiz cu.

## Constraints

- Frontend repo dang con `openapi.json` cu; source of truth cho task nay la backend contract da duoc user cung cap.
- UI user phai giu flow `start attempt -> submit attempt -> show result`.
- UI admin phai ton trong backend thuc te: create quiz metadata, create typed bank question, link question vao quiz.
- Backend chua co endpoint update/delete/list quiz question link theo note hien tai; UI khong duoc gia vo co chuc nang nay.

## Current Gaps

- User UI dang render type cu `video_to_text` / `text_to_video`, map media theo `sign_id`/`media_url`, va submit `selected_option_id`.
- User UI chua ho tro `sign_to_text` input text, chua retake ro rang, chua doc ket qua theo payload moi.
- Admin UI dang coi `multiple_choice` khong can `video_slug`, trong khi backend moi can video prompt + text options.
- Admin UI dang cho sua `order`/`points` tren existing question du backend khong co endpoint update link.

## Approach

### Shared quiz helpers

Tach logic contract quiz thanh cac helper thuan trong `src/app/lib`:

- `quiz.js`: normalize public quiz detail thanh render model cho user UI.
- `quizSubmission.js`: build answer draft checks + payload submit tu state UI.
- `quizAdmin.js`: quiz question type config + builder cho create/update bank question, link payload, quiz metadata payload.

Muc tieu la co mot noi duy nhat giu mapping field names va validation rules.

### User UI

- Render `multiple_choice`: hien video prompt `video_url`, radio text options.
- Render `video_choice`: hien question text, radio cac option video `video_url`.
- Render `sign_to_text`: hien video prompt `video_url`, input text answer.
- Validate client-side: moi cau phai co dap an hop le truoc khi submit.
- Submit:
  - `POST /api/v1/quizzes/{quiz_id}/start`
  - `POST /api/v1/quiz-attempts/{attempt_id}/submit`
- Result panel hien score, correct count, pass/fail, status tung cau. Cho phep lam lai bang cach start attempt moi khi user bam nop lai.

### Admin UI

- `multiple_choice` builder: `question_text?`, `video_slug` bat buoc, `options[].option_text`, `options[].is_correct`.
- `video_choice` builder: `question_text` bat buoc, `options[].video_slug`, `options[].is_correct`.
- `sign_to_text` builder: `question_text?`, `video_slug`, `answer`.
- Create question xong phai link bang `question_type`, `question_id`, `order_index`, `points`.
- Existing question editor chi sua noi dung bank question. `order_index` / `points` existing link se hien read-only notice vi backend chua expose update link.

## Error Handling

- User UI surfacing API errors tu `apiRequest` nhu 400 invalid option key, 409 attempt da submit, 409 quiz rong.
- Neu quiz detail khong co `questions`, UI user giu hanh vi khong render form quiz.
- Admin builder fail fast voi message cu the khi thieu `video_slug`, `answer`, option dung, hay title quiz.

## Testing

- Unit tests cho `getQuizQuestions` voi 3 question types.
- Unit tests cho payload submit: choice/text, bat buoc tra loi het, map `question.id` -> `answers[].question_id`.
- Unit tests cho admin payload builders theo 3 type va quiz update/read-only link rules.
- Build Vite de bat import/regression JSX.

## Files

- Modify: `src/app/lib/quiz.js`
- Create: `src/app/lib/quizSubmission.js`
- Create: `src/app/lib/quizAdmin.js`
- Modify: `src/pages/LessonPage.jsx`
- Modify: `src/components/auth/AdminDashboard.jsx`
- Create: `tests/quiz-contract.test.mjs`

## Out of Scope

- Backend changes.
- Rewriting admin dashboard structure lon hon scope quiz.
- Them endpoint update existing quiz link khi backend chua co.
