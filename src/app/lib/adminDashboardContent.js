function hasLessonId(items, lessonId) {
  return items.some((item) => String(item?.id ?? "") === lessonId);
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
