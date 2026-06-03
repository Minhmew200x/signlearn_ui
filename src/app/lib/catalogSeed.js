import { fallbackMoocsByTopic, fallbackTopics } from "../data/fallbackCatalog.js";

function toBackendLevel(levelLabel) {
  if (levelLabel === "Nâng cao") return "advanced";
  if (levelLabel === "Trung bình") return "intermediate";
  return "beginner";
}

function makeLessonDescription(mooc) {
  const vocabWords = (mooc?.vocabItems || []).map((item) => item?.word).filter(Boolean);
  const vocabSummary = vocabWords.length ? `Từ vựng: ${vocabWords.join(", ")}.` : "";
  return [mooc?.description, vocabSummary].filter(Boolean).join(" ").trim() || null;
}

export function buildFallbackCatalogSeed() {
  return fallbackTopics.map((topic) => {
    const lessons = (fallbackMoocsByTopic[topic.id] || []).map((mooc, index) => ({
      title: mooc.lessonTitle,
      description: makeLessonDescription(mooc),
      level: toBackendLevel(topic.level),
      isPublished: true,
      orderIndex: index + 1,
      isRequired: true,
      signSlugs: (mooc.vocabItems || []).map((item) => item?.slug).filter(Boolean),
    }));

    return {
      slug: topic.id,
      title: topic.title,
      description: topic.desc || null,
      level: toBackendLevel(topic.level),
      isPublished: true,
      lessons,
    };
  });
}
