# SignLearn Full-App Brand Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved SignLearn brand palette across every user-facing surface so white cards, blue primary actions, and amber accents replace the current dark/slate-heavy look.

**Architecture:** Add a small shared brand theme module for repeated surface/button/ring classes, then restyle each page to consume those shared classes instead of ad hoc color choices. Keep routes, API calls, data flow, and component hierarchy unchanged. The visual pass should be isolated enough that future pages inherit the same palette by default.

**Tech Stack:** React, Vite, Tailwind CSS, Node test runner, existing page components in `src/pages`, shared shell components in `src/components/app` and `src/components/auth`.

---

### Task 1: Add shared brand tokens and regression tests

**Files:**
- Create: `src/app/lib/brandTheme.js`
- Create: `tests/brand-theme.test.mjs`
- Modify: `src/index.css`
- Modify: `src/components/app/AppShell.jsx`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { brandTheme, brandRing, brandButton } from "../src/app/lib/brandTheme.js";

test("brand theme exposes the approved blue amber white palette", () => {
  assert.equal(brandTheme.primary, "blue-600");
  assert.equal(brandTheme.accent, "amber-500");
  assert.match(brandButton.primary, /bg-blue-600/);
  assert.match(brandRing.focus, /ring-blue-200/);
});
```

- [ ] **Step 2: Run the failing test**

Run: `node --test tests/brand-theme.test.mjs`
Expected: FAIL because `src/app/lib/brandTheme.js` does not exist yet.

- [ ] **Step 3: Implement the minimal shared token module**

```js
export const brandTheme = {
  primary: "blue-600",
  primaryHover: "blue-700",
  accent: "amber-500",
  surface: "white",
  text: "slate-900",
};

export const brandRing = {
  focus: "focus:outline-none focus:ring-4 focus:ring-blue-200",
};

export const brandButton = {
  primary: "min-h-12 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700",
  soft: "min-h-12 rounded-2xl bg-blue-50 px-5 py-3 text-sm font-black text-blue-800 transition hover:bg-blue-100",
  ghost: "min-h-12 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50",
};
```

```css
body {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 34rem),
    radial-gradient(circle at bottom right, rgba(251, 191, 36, 0.10), transparent 30rem),
    linear-gradient(145deg, #ffffff 0%, #f8fbff 52%, #fffdf7 100%);
}
```

- [ ] **Step 4: Verify the shared tokens pass**

Run: `node --test tests/brand-theme.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/brandTheme.js src/index.css src/components/app/AppShell.jsx tests/brand-theme.test.mjs
git commit -m "feat: add shared SignLearn brand tokens"
```

### Task 2: Restyle all user-facing surfaces

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/AuthApp.jsx`
- Modify: `src/components/auth/AuthViews.jsx`
- Modify: `src/components/app/AppShell.jsx`
- Modify: `src/components/app/ho_so.jsx`
- Modify: `src/pages/Landing.jsx`
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/Blogs.jsx`
- Modify: `src/pages/LearningDashboard.jsx`
- Modify: `src/pages/TopicMoocPage.jsx`
- Modify: `src/pages/LessonPage.jsx`
- Modify: `src/pages/AIPracticePage.jsx`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run the failing test**

Run: `node --test tests/brand-palette-pages.test.mjs`
Expected: FAIL because the current implementation still contains dark-first surfaces.

- [ ] **Step 3: Apply shared theme classes to each page**

```jsx
<main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12)_0%,_#ffffff_42%,_rgba(251,191,36,0.06)_100%)] text-slate-900">
```

```jsx
<section className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm">
```

```jsx
<button className="min-h-12 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700">
```

```jsx
<div className="inline-flex rounded-full bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700 ring-1 ring-amber-100">
```

- [ ] **Step 4: Verify the page rewrite passes the palette scan**

Run: `node --test tests/brand-palette-pages.test.mjs`
Expected: PASS after all surfaces have been restyled.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/AuthApp.jsx src/components/auth/AuthViews.jsx src/components/app/AppShell.jsx src/components/app/ho_so.jsx src/pages/Landing.jsx src/pages/Home.jsx src/pages/Blogs.jsx src/pages/LearningDashboard.jsx src/pages/TopicMoocPage.jsx src/pages/LessonPage.jsx src/pages/AIPracticePage.jsx tests/brand-palette-pages.test.mjs
git commit -m "feat: unify SignLearn UI under the brand palette"
```

### Task 3: Final verification and cleanup

**Files:**
- Modify: any file still flagged by the palette scan

- [ ] **Step 1: Write the failing test**

```bash
rg -n "bg-slate-950|text-slate-950|bg-slate-900|from-slate-950|to-blue-950|bg-cyan-600|bg-violet-" src
```

- [ ] **Step 2: Run the failing scan**

Run: `rg -n "bg-slate-950|text-slate-950|bg-slate-900|from-slate-950|to-blue-950|bg-cyan-600|bg-violet-" src`
Expected: output exists before cleanup.

- [ ] **Step 3: Remove remaining outliers and re-run build**

Run: `npm run build`
Expected: build succeeds after the final cleanup.

- [ ] **Step 4: Verify the final state**

Run: `npm test && npm run build`
Expected: all tests pass and the production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "chore: finish SignLearn brand palette cleanup"
```
