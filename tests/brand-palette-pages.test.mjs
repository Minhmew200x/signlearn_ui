import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("no page shell keeps the old dark-first palette as its main surface", () => {
  const files = [
    "src/App.jsx",
    "src/AuthApp.jsx",
    "src/components/auth/AuthViews.jsx",
    "src/components/app/AppShell.jsx",
    "src/components/app/ho_so.jsx",
    "src/pages/Landing.jsx",
    "src/pages/Home.jsx",
    "src/pages/Blogs.jsx",
    "src/pages/LearningDashboard.jsx",
    "src/pages/TopicMoocPage.jsx",
    "src/pages/LessonPage.jsx",
    "src/pages/AIPracticePage.jsx",
  ];

  const banned = /bg-slate-950|text-slate-950|bg-slate-900|from-slate-950|to-blue-950/;
  const offenders = files.filter((file) => banned.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(offenders, []);
});
