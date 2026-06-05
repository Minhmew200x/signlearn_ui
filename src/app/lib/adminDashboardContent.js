function hasLessonId(items, lessonId) {
  return items.some((item) => String(item?.id ?? "") === lessonId);
}

function getQuizCount(entry) {
  if (Array.isArray(entry?.quizzes)) return entry.quizzes.length;
  if (Array.isArray(entry?.quizSummary)) return entry.quizSummary.length;
  return 0;
}

export function resolveVisibleLessonSelection({ lessons = [], filteredLessons = [], currentLessonId = "", hasSearchQuery = false }) {
  const normalizedCurrentLessonId = String(currentLessonId || "");

  if (normalizedCurrentLessonId && hasLessonId(filteredLessons, normalizedCurrentLessonId)) {
    return normalizedCurrentLessonId;
  }

  if (hasSearchQuery && filteredLessons.length === 0) {
    return "";
  }

  if (filteredLessons.length > 0) {
    return String(filteredLessons[0]?.id ?? "");
  }

  if (normalizedCurrentLessonId && hasLessonId(lessons, normalizedCurrentLessonId)) {
    return normalizedCurrentLessonId;
  }

  return lessons.length > 0 ? String(lessons[0]?.id ?? "") : "";
}

export function resolveQuizCreateAvailability({ contentLessonId = "", draftLessonId = "", contentDetailsByLessonId = {} }) {
  const lessonId = String(draftLessonId || contentLessonId || "");
  const lessonDetail = lessonId ? contentDetailsByLessonId?.[lessonId] || contentDetailsByLessonId?.[Number(lessonId)] || null : null;
  const quizCount = getQuizCount(lessonDetail);

  return {
    lessonId,
    quizCount,
    hasQuiz: quizCount > 0,
    isLocked: quizCount > 0,
  };
}
