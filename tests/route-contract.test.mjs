import test from "node:test";
import assert from "node:assert/strict";

import { makeBlogPath, makeDashboardPath, makeHomePath, parseAppPath } from "../src/app/lib/routing.js";
import { getPostLoginPath, resolveAuthRedirect } from "../src/app/lib/sessionRouting.js";
import { computeHomeOverview } from "../src/app/lib/homeOverview.js";

test("app home lives at /home while root remains the public landing route", () => {
  assert.equal(makeHomePath(), "/home");
  assert.equal(makeBlogPath(), "/blog");
  assert.equal(makeBlogPath("hoc-ngon-ngu-ky-hieu"), "/blog/hoc-ngon-ngu-ky-hieu");
  assert.equal(makeDashboardPath(), "/dashboard");
  assert.deepEqual(parseAppPath("/home"), { page: "home", pathname: "/home" });
  assert.deepEqual(parseAppPath("/"), { page: "landing", pathname: "/" });
  assert.deepEqual(parseAppPath("/blog"), { page: "blogs", pathname: "/blog", blogSlug: "" });
  assert.deepEqual(parseAppPath("/blog/hoc-ngon-ngu-ky-hieu"), {
    page: "blogs",
    pathname: "/blog/hoc-ngon-ngu-ky-hieu",
    blogSlug: "hoc-ngon-ngu-ky-hieu",
  });
});

test("post login target depends on role", () => {
  assert.equal(getPostLoginPath({ role: "student" }), "/home");
  assert.equal(getPostLoginPath({ role: "admin" }), "/dashboard");
});

test("auth redirect keeps public landing, protects app routes, and routes admin dashboard", () => {
  assert.equal(resolveAuthRedirect({ pathname: "/", status: "signed_out", user: null }), null);
  assert.equal(resolveAuthRedirect({ pathname: "/login", status: "signed_out", user: null }), null);
  assert.equal(resolveAuthRedirect({ pathname: "/home", status: "signed_out", user: null }), "/login");
  assert.equal(resolveAuthRedirect({ pathname: "/hoc-tap", status: "signed_out", user: null }), "/login");
  assert.equal(resolveAuthRedirect({ pathname: "/hoc-tap/basic/mooc-1", status: "signed_out", user: null }), "/login");
  assert.equal(resolveAuthRedirect({ pathname: "/dashboard", status: "signed_out", user: null }), "/login");
  assert.equal(resolveAuthRedirect({ pathname: "/", status: "signed_in", user: { role: "student" } }), "/home");
  assert.equal(resolveAuthRedirect({ pathname: "/login", status: "signed_in", user: { role: "student" } }), "/home");
  assert.equal(resolveAuthRedirect({ pathname: "/", status: "signed_in", user: { role: "admin" } }), "/dashboard");
  assert.equal(resolveAuthRedirect({ pathname: "/dashboard", status: "signed_in", user: { role: "student" } }), "/home");
  assert.equal(resolveAuthRedirect({ pathname: "/admin", status: "signed_in", user: { role: "admin" } }), "/dashboard");
});

test("home overview derives progress, continue target, and streak from API payloads", () => {
  const overview = computeHomeOverview({
    topics: [
      { id: "basic", courseId: 10, title: "Basic" },
      { id: "daily", courseId: 20, title: "Daily" },
    ],
    moocsByTopic: {
      basic: [
        { title: "Hello", lessonId: 1 },
        { title: "Thanks", lessonId: 2 },
      ],
      daily: [{ title: "Family", lessonId: 3 }],
    },
    courseProgressByCourseId: {
      10: {
        progress: { progress_percent: 50, status: "in_progress" },
        lessons: [
          { lesson_id: 1, title: "Hello", order_index: 1, status: "completed", progress_percent: 100 },
          { lesson_id: 2, title: "Thanks", order_index: 2, status: "in_progress", progress_percent: 30 },
        ],
      },
      20: {
        progress: { progress_percent: 0, status: "not_started" },
        lessons: [{ lesson_id: 3, title: "Family", order_index: 1, status: "not_started", progress_percent: 0 }],
      },
    },
    quizHistory: [
      { started_at: "2026-06-03T04:00:00.000Z", score: 80, status: "completed" },
      { started_at: "2026-06-02T04:00:00.000Z", score: 60, status: "completed" },
    ],
    practiceSessions: [{ started_at: "2026-06-01T04:00:00.000Z" }],
    now: "2026-06-03T12:00:00.000Z",
  });

  assert.equal(overview.totalLessons, 3);
  assert.equal(overview.completedLessons, 1);
  assert.equal(overview.completionPercent, 25);
  assert.equal(overview.streakDays, 3);
  assert.deepEqual(overview.continueItem, {
    topicId: "basic",
    topicTitle: "Basic",
    lessonId: 2,
    lessonTitle: "Thanks",
    progressPercent: 30,
    href: "/hoc-tap/basic/mooc-2",
  });
});
