import test from "node:test";
import assert from "node:assert/strict";

import { fallbackTopics } from "../src/app/data/fallbackCatalog.js";
import { composeTopicCatalog } from "../src/app/lib/catalog.js";
import { buildFallbackCatalogSeed } from "../src/app/lib/catalogSeed.js";

test("composeTopicCatalog keeps API catalog unchanged without fallback padding", () => {
  const apiTopics = [
    { id: "course-7", courseId: 7, title: "API Course", level: "Cơ bản", desc: "Only from API" },
  ];
  const apiMoocsByTopic = {
    "course-7": [{ id: "course-7-lesson-1", lessonId: 101, lessonTitle: "Lesson 1" }],
  };

  assert.deepEqual(composeTopicCatalog(apiTopics, apiMoocsByTopic, 10), {
    topics: apiTopics,
    moocsByTopic: apiMoocsByTopic,
    source: "api",
  });
});

test("composeTopicCatalog returns an empty API catalog when backend has no courses", () => {
  assert.deepEqual(composeTopicCatalog([], {}, 10), {
    topics: [],
    moocsByTopic: {},
    source: "api",
  });
});

test("composeTopicCatalog keeps all backend courses when no explicit max is provided", () => {
  const apiTopics = Array.from({ length: 12 }, (_, index) => ({
    id: `course-${index + 1}`,
    courseId: index + 1,
    title: `Course ${index + 1}`,
  }));
  const apiMoocsByTopic = Object.fromEntries(apiTopics.map((topic) => [topic.id, []]));

  const catalog = composeTopicCatalog(apiTopics, apiMoocsByTopic);

  assert.equal(catalog.topics.length, 12);
  assert.deepEqual(catalog.topics, apiTopics);
});

test("buildFallbackCatalogSeed converts legacy fallback catalog into seedable course specs", () => {
  const seed = buildFallbackCatalogSeed();

  assert.equal(seed.length, fallbackTopics.length);
  assert.equal(seed[0].slug, fallbackTopics[0].id);
  assert.equal(seed[0].title, fallbackTopics[0].title);
  assert.ok(seed[0].lessons.length > 0);
  assert.ok(seed[0].lessons.every((lesson, index) => lesson.orderIndex === index + 1));
  assert.ok(seed[0].lessons.every((lesson) => Array.isArray(lesson.signSlugs)));
});
