import { TOPIC_THEME_POOL } from "../data/fallbackCatalog.js";

export function getCourseLevelLabel(level) {
  if (level === "beginner") return "Cơ bản";
  if (level === "intermediate") return "Trung bình";
  if (level === "advanced") return "Nâng cao";
  return "Cơ bản";
}

export function mapCoursesToTopics(courses) {
  return courses.map((course, index) => {
    const theme = TOPIC_THEME_POOL[index % TOPIC_THEME_POOL.length];
    return {
      id: `course-${course.id}`,
      courseId: course.id,
      title: course.title || `Course ${course.id}`,
      level: getCourseLevelLabel(course.level),
      desc: course.description || "Chưa có mô tả khóa học.",
      color: theme.color,
      icon: theme.icon,
      source: "api",
    };
  });
}

export function mapCourseDetailsToMoocs(topics, detailsByCourseId) {
  const result = {};
  for (const topic of topics) {
    const detail = detailsByCourseId[topic.courseId];
    const lessons = Array.isArray(detail?.lessons) ? [...detail.lessons] : [];
    lessons.sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
    result[topic.id] = lessons.map((lesson, index) => ({
      id: `${topic.id}-lesson-${lesson.lesson_id}`,
      lessonId: lesson.lesson_id,
      courseId: topic.courseId,
      moocIndex: index,
      moocNumber: index + 1,
      lessonTitle: lesson.title || `MOOC ${index + 1}`,
      description: lesson.description || "",
      videoTitle: `Video: ${lesson.title || `MOOC ${index + 1}`}`,
      word: "Đang tải từ vựng...",
      explanation: lesson.description || "Chưa có giải thích.",
      signSlug: null,
      isPublished: lesson.is_published,
      orderIndex: Number(lesson.order_index || index + 1),
      isRequired: Boolean(lesson.is_required),
    }));
  }
  return result;
}

export function composeTopicCatalog(apiTopics, apiMoocsByTopic, maxTopics = Number.POSITIVE_INFINITY) {
  const requestedMax = Number(maxTopics);
  const normalizedMax = Number.isFinite(requestedMax) ? Math.max(1, requestedMax) : Number.POSITIVE_INFINITY;
  const topics = [];
  const moocsByTopic = {};

  for (const topic of apiTopics) {
    if (topics.length >= normalizedMax) break;
    topics.push(topic);
    moocsByTopic[topic.id] = apiMoocsByTopic[topic.id] || [];
  }

  return { topics, moocsByTopic, source: "api" };
}
