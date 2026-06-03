import { toPlayableVideoUrl } from './material.js';


function sortByOrderIndex(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
}

function getQuestionPrompt(question) {
  const prompt = String(question?.question_text || '').trim();
  if (prompt) return prompt;

  switch (question?.question_type) {
    case 'video_to_text':
      return 'Xem video va chon dap an dung.';
    case 'text_to_video':
      return 'Doc cau hoi va chon video dung.';
    case 'image_to_text':
      return 'Xem hinh va chon dap an dung.';
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
  const signId = Number(question?.sign_id);
  if (!Number.isFinite(signId)) return null;
  return getLessonSignSlugMap(lessonMaterial).get(signId) || null;
}

function resolveQuestionVideoUrl(question, lessonMaterial, makeSignVideoEndpoint) {
  const mediaUrl = toPlayableVideoUrl(question?.media_url);
  if (mediaUrl) return mediaUrl;

  const slug = resolveQuestionSlug(question, lessonMaterial);
  if (!slug) return null;
  return makeSignVideoEndpoint?.(slug) || null;
}

function resolveOptionVideoUrl(option) {
  return toPlayableVideoUrl(option?.media_url);
}

export function getQuizQuestions(lessonMaterial, makeSignVideoEndpoint) {
  const rawQuestions = lessonMaterial?.quiz?.detail?.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return [];

  return sortByOrderIndex(rawQuestions).map((question) => ({
    ...question,
    prompt: getQuestionPrompt(question),
    resolvedSlug: resolveQuestionSlug(question, lessonMaterial),
    resolvedVideoUrl: resolveQuestionVideoUrl(question, lessonMaterial, makeSignVideoEndpoint),
    options: sortByOrderIndex(question.options).map((option) => ({
      ...option,
      resolvedVideoUrl: resolveOptionVideoUrl(option),
    })),
  }));
}
