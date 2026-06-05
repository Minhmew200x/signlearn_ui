import { toPlayableVideoUrl } from './material.js';

function sortByOrderIndex(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const orderDiff = Number(a?.order_index || 0) - Number(b?.order_index || 0);
    if (orderDiff !== 0) return orderDiff;
    return Number(a?.id || 0) - Number(b?.id || 0);
  });
}

function normalizeQuestionType(questionType) {
  if (questionType === 'video_to_text') return 'multiple_choice';
  if (questionType === 'text_to_video') return 'video_choice';
  return questionType || 'multiple_choice';
}

function getQuestionPrompt(question) {
  const prompt = String(question?.question_text || '').trim();
  if (prompt) return prompt;

  switch (normalizeQuestionType(question?.question_type)) {
    case 'multiple_choice':
      return 'Xem video va chon dap an dung.';
    case 'video_choice':
      return 'Doc cau hoi va chon video dung.';
    case 'sign_to_text':
      return 'Xem video va nhap dap an dung.';
    default:
      return 'Chon dap an dung.';
  }
}

function getLessonSignSlugMap(lessonMaterial) {
  return new Map(
    (Array.isArray(lessonMaterial?.vocabItems) ? lessonMaterial.vocabItems : [])
      .filter((item) => item?.signId && item?.slug)
      .map((item) => [Number(item.signId), item.slug]),
  );
}

function resolveQuestionSlug(question, lessonMaterial) {
  const explicitSlug = String(question?.video_slug || '').trim();
  if (explicitSlug) return explicitSlug;

  const signId = Number(question?.sign_id);
  if (!Number.isFinite(signId)) return null;
  return getLessonSignSlugMap(lessonMaterial).get(signId) || null;
}

function resolveQuestionVideoUrl(question, lessonMaterial, makeSignVideoEndpoint) {
  const mediaUrl = toPlayableVideoUrl(question?.video_url || question?.media_url);
  if (mediaUrl) return mediaUrl;

  const slug = resolveQuestionSlug(question, lessonMaterial);
  if (!slug) return null;
  return makeSignVideoEndpoint?.(slug) || null;
}

function resolveOptionVideoUrl(option, makeSignVideoEndpoint) {
  const mediaUrl = toPlayableVideoUrl(option?.video_url || option?.media_url);
  if (mediaUrl) return mediaUrl;

  const slug = String(option?.video_slug || '').trim();
  if (!slug) return null;
  return makeSignVideoEndpoint?.(slug) || null;
}

export function getQuizQuestions(lessonMaterial, makeSignVideoEndpoint) {
  const rawQuestions = lessonMaterial?.quiz?.detail?.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return [];

  return sortByOrderIndex(rawQuestions).map((question) => {
    const questionType = normalizeQuestionType(question.question_type);

    return {
      ...question,
      question_type: questionType,
      inputKind: questionType === 'sign_to_text' ? 'text' : 'choice',
      prompt: getQuestionPrompt(question),
      resolvedSlug: resolveQuestionSlug(question, lessonMaterial),
      resolvedVideoUrl: resolveQuestionVideoUrl(question, lessonMaterial, makeSignVideoEndpoint),
      options: sortByOrderIndex(question.options).map((option) => ({
        ...option,
        id: option.id ?? option.option_key ?? option.option_text ?? option.video_slug,
        submitValue: option.option_key ?? option.id ?? null,
        resolvedVideoUrl: resolveOptionVideoUrl(option, makeSignVideoEndpoint),
      })),
    };
  });
}
