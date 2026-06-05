export const QUIZ_QUESTION_TYPE_OPTIONS = ['multiple_choice', 'video_choice', 'sign_to_text'];

export const QUIZ_QUESTION_TYPE_CONFIG = {
  multiple_choice: {
    questionTextLabel: 'Question text',
    questionTextPlaceholder: 'Optional prompt above the sign video',
    showVideoSlug: true,
    showAnswer: false,
    optionKeyLabel: 'Option key',
    optionValueLabel: 'Option text',
    optionValuePlaceholder: 'e.g. Xin chao',
    optionValueField: 'option_text',
    showOptions: true,
    helper: 'Sign video prompt + text options. Mark at least one correct answer.',
    requiresQuestionText: false,
  },
  video_choice: {
    questionTextLabel: 'Question text',
    questionTextPlaceholder: 'Prompt/question text',
    showVideoSlug: false,
    showAnswer: false,
    optionKeyLabel: 'Option key',
    optionValueLabel: 'Video slug',
    optionValuePlaceholder: 'e.g. xin-chao',
    optionValueField: 'video_slug',
    showOptions: true,
    helper: 'Text prompt + video slug options. Mark the correct video.',
    requiresQuestionText: true,
  },
  sign_to_text: {
    questionTextLabel: 'Question text',
    questionTextPlaceholder: 'Optional prompt above the sign video',
    showVideoSlug: true,
    showAnswer: true,
    answerLabel: 'Answer',
    answerPlaceholder: 'Expected answer text',
    showOptions: false,
    helper: 'Provide a sign video slug and the expected text answer.',
    requiresQuestionText: false,
  },
};

function parseNullableInteger(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

function parseNullablePositiveInteger(value) {
  const parsed = parseNullableInteger(value);
  if (parsed === null) return null;
  return parsed > 0 ? parsed : null;
}

function normalizeOptionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function createEmptyQuizOptionDraft(overrides = {}) {
  return {
    option_key: '',
    option_text: '',
    video_slug: '',
    is_correct: false,
    ...overrides,
  };
}

export function createEmptyQuizQuestionDraft(overrides = {}) {
  return {
    question_type: 'multiple_choice',
    question_text: '',
    video_slug: '',
    answer: '',
    order_index: 0,
    points: 1,
    options: [createEmptyQuizOptionDraft(), createEmptyQuizOptionDraft()],
    ...overrides,
  };
}

export function createEmptyQuizDraft(overrides = {}) {
  return {
    title: '',
    description: '',
    passing_score: 70,
    time_limit_seconds: '',
    lesson_id: '',
    ...overrides,
  };
}

export function getQuizQuestionTypeConfig(questionType) {
  return QUIZ_QUESTION_TYPE_CONFIG[questionType] || QUIZ_QUESTION_TYPE_CONFIG.multiple_choice;
}

function buildQuizOptionsPayload(optionsDraft, questionType) {
  const config = getQuizQuestionTypeConfig(questionType);
  const options = (optionsDraft || [])
    .map((option) => ({
      option_key: normalizeOptionalString(option.option_key),
      option_text: config.optionValueField === 'option_text' ? normalizeOptionalString(option.option_text) : null,
      video_slug: config.optionValueField === 'video_slug' ? normalizeOptionalString(option.video_slug) : null,
      is_correct: !!option.is_correct,
    }))
    .filter((option) => option.option_key || option.option_text || option.video_slug)
    .map((option, index) => ({
      ...option,
      option_key: option.option_key || `option-${index + 1}`,
    }));

  if (!options.length) throw new Error('Question needs at least one option.');
  if (!options.some((option) => option.is_correct)) throw new Error('Question needs at least one correct option.');

  options.forEach((option, index) => {
    if (config.optionValueField === 'option_text' && !option.option_text) throw new Error(`Option ${index + 1} needs text for ${questionType}.`);
    if (config.optionValueField === 'video_slug' && !option.video_slug) throw new Error(`Option ${index + 1} needs video slug for ${questionType}.`);
  });

  return options;
}

export function buildQuizQuestionPayload(draft, fallbackQuestion = null) {
  const questionType = draft.question_type ?? fallbackQuestion?.question_type ?? 'multiple_choice';
  const config = getQuizQuestionTypeConfig(questionType);
  const questionText = draft.question_text === undefined
    ? normalizeOptionalString(fallbackQuestion?.question_text)
    : normalizeOptionalString(draft.question_text);
  const videoSlug = config.showVideoSlug
    ? (draft.video_slug === undefined ? normalizeOptionalString(fallbackQuestion?.video_slug) : normalizeOptionalString(draft.video_slug))
    : null;
  const answer = config.showAnswer
    ? (draft.answer === undefined ? normalizeOptionalString(fallbackQuestion?.answer) : normalizeOptionalString(draft.answer))
    : null;
  const optionsSource = draft.options === undefined ? fallbackQuestion?.options : draft.options;
  const options = config.showOptions ? buildQuizOptionsPayload(optionsSource, questionType) : undefined;

  if (config.showVideoSlug && !videoSlug) throw new Error(`${questionType} needs video slug.`);
  if (config.showAnswer && !answer) throw new Error(`${questionType} needs answer.`);
  if (config.requiresQuestionText && !questionText) throw new Error(`${questionType} needs question text.`);

  if (questionType === 'multiple_choice') return { question_text: questionText, video_slug: videoSlug, options };
  if (questionType === 'video_choice') return { question_text: questionText, options };
  if (questionType === 'sign_to_text') return { question_text: questionText, video_slug: videoSlug, answer };

  throw new Error(`Unsupported question type: ${questionType}`);
}

export function buildQuizLinkPayload(draft, createdQuestion) {
  const questionType = draft.question_type ?? createdQuestion?.question_type;
  const questionId = Number(createdQuestion?.question_id ?? createdQuestion?.id);
  if (!questionType || !questionId) throw new Error('Backend did not return question id for linking.');

  return {
    question_type: questionType,
    question_id: questionId,
    order_index: Math.max(0, Number(draft.order_index) || 0),
    points: Math.max(1, Number(draft.points) || 1),
  };
}

export function buildQuizCreatePayload(draft, fallbackLessonId = null) {
  const lessonId = parseNullablePositiveInteger(draft.lesson_id) ?? parseNullablePositiveInteger(fallbackLessonId);
  const title = String(draft.title || '').trim();
  if (!title) throw new Error('Quiz needs title.');

  return {
    lesson_id: lessonId,
    title,
    description: normalizeOptionalString(draft.description),
    passing_score: Math.min(100, Math.max(0, Number(draft.passing_score) || 0)),
    time_limit_seconds: parseNullablePositiveInteger(draft.time_limit_seconds),
  };
}

export function buildQuizUpdatePayload(draft, quiz) {
  return {
    title: normalizeOptionalString(draft.title ?? quiz.title),
    description: normalizeOptionalString(draft.description ?? quiz.description),
    passing_score: draft.passing_score === undefined ? Number(quiz.passing_score) : Math.min(100, Math.max(0, Number(draft.passing_score) || 0)),
    time_limit_seconds: draft.time_limit_seconds === undefined ? (quiz.time_limit_seconds ?? null) : parseNullablePositiveInteger(draft.time_limit_seconds),
  };
}

export function getQuestionAdminEndpoint(questionType, questionId) {
  const normalizedId = Number(questionId);
  if (!normalizedId) throw new Error('Missing question id.');

  if (questionType === 'multiple_choice') return `/api/v1/admin/multiple-choice-questions/${normalizedId}`;
  if (questionType === 'video_choice') return `/api/v1/admin/video-choice-questions/${normalizedId}`;
  if (questionType === 'sign_to_text') return `/api/v1/admin/sign-to-text-questions/${normalizedId}`;

  throw new Error(`Unsupported question type: ${questionType}`);
}

export function getQuestionCreateEndpoint(questionType) {
  if (questionType === 'multiple_choice') return '/api/v1/admin/multiple-choice-questions';
  if (questionType === 'video_choice') return '/api/v1/admin/video-choice-questions';
  if (questionType === 'sign_to_text') return '/api/v1/admin/sign-to-text-questions';

  throw new Error(`Unsupported question type: ${questionType}`);
}
