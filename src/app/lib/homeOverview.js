import { makeLessonPath } from "./routing.js";

function toDayKey(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function collectActiveDays(quizHistory = [], practiceSessions = []) {
  const days = new Set();
  for (const item of quizHistory || []) {
    const day = toDayKey(item?.submitted_at || item?.started_at);
    if (day) days.add(day);
  }
  for (const item of practiceSessions || []) {
    const day = toDayKey(item?.ended_at || item?.started_at);
    if (day) days.add(day);
  }
  return days;
}

function countStreakDays(activeDays, now) {
  if (!activeDays.size) return 0;

  const cursor = new Date(now || new Date());
  if (Number.isNaN(cursor.getTime())) return 0;

  let streak = 0;
  while (true) {
    const dayKey = cursor.toISOString().slice(0, 10);
    if (!activeDays.has(dayKey)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function findContinueItem(topics, moocsByTopic, courseProgressByCourseId) {
  for (const topic of topics || []) {
    const lessons = courseProgressByCourseId?.[topic.courseId]?.lessons;
    const topicMoocs = moocsByTopic?.[topic.id] || [];
    if (!Array.isArray(lessons) || !lessons.length) continue;

    for (const lesson of lessons) {
      if (lesson?.status === "completed" || Number(lesson?.progress_percent || 0) >= 100) continue;

      const lessonId = Number(lesson?.lesson_id);
      const moocIndex = topicMoocs.findIndex((mooc) => Number(mooc?.lessonId) === lessonId);
      if (moocIndex < 0) continue;

      return {
        topicId: topic.id,
        topicTitle: topic.title,
        lessonId,
        lessonTitle: lesson?.title || topicMoocs[moocIndex]?.title || `MOOC ${moocIndex + 1}`,
        progressPercent: Number(lesson?.progress_percent || 0),
        href: makeLessonPath(topic.id, moocIndex),
      };
    }
  }

  return null;
}

export function computeHomeOverview({
  topics = [],
  moocsByTopic = {},
  courseProgressByCourseId = {},
  quizHistory = [],
  practiceSessions = [],
  now = new Date(),
}) {
  const totalLessons = topics.reduce((sum, topic) => sum + (moocsByTopic?.[topic.id]?.length || 0), 0);
  const lessonProgressRows = Object.values(courseProgressByCourseId || {}).flatMap((detail) => Array.isArray(detail?.lessons) ? detail.lessons : []);
  const completedLessons = lessonProgressRows.filter((lesson) => lesson?.status === "completed" || Number(lesson?.progress_percent || 0) >= 100).length;

  const courseProgressValues = Object.values(courseProgressByCourseId || {})
    .map((detail) => Number(detail?.progress?.progress_percent || 0))
    .filter((value) => Number.isFinite(value));

  const completionPercent = courseProgressValues.length
    ? Math.round(courseProgressValues.reduce((sum, value) => sum + value, 0) / courseProgressValues.length)
    : totalLessons
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

  const activeDays = collectActiveDays(quizHistory, practiceSessions);
  const streakDays = countStreakDays(activeDays, now);

  const quizScores = (quizHistory || []).map((item) => Number(item?.score || 0)).filter((value) => Number.isFinite(value));
  const avgQuizScore = quizScores.length ? Math.round(quizScores.reduce((sum, value) => sum + value, 0) / quizScores.length) : 0;

  const continueItem = findContinueItem(topics, moocsByTopic, courseProgressByCourseId);

  return {
    totalLessons,
    completedLessons,
    completionPercent,
    streakDays,
    avgQuizScore,
    continueItem,
    activeDays: Array.from(activeDays).sort().reverse(),
  };
}
