# AI Practice UI Config Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the user AI webcam screen to webcam-only scoring feedback, add admin scoring-config editing by `signSlug`, and keep uploading recorded user video to `/api/v1/practice/uploads` without coupling attempt persistence to the upload response.

**Architecture:** Keep the existing MediaPipe worker/client flow and practice-attempt POST path intact, but move user-facing score messaging behind small pure helpers so UI behavior is testable. Extend the admin AI section with a focused config editor that uses the existing `apiRequest` helper against the OpenAPI-backed `GET/PATCH /api/v1/ai/signs/{sign_slug}/config` contract.

**Tech Stack:** React 19, Vite 8, Node built-in test runner, existing `apiRequest` helper, browser `fetch` + `FormData`, Tailwind utility classes.

---

### Task 1: Lock scoring advice and attempt payload behavior with tests

**Files:**
- Modify: `tests/practice-ai-contract.test.mjs`
- Modify: `src/app/lib/practice.js`
- Modify: `src/app/lib/practiceScoring.js`

- [ ] **Step 1: Write the failing tests for advice copy and upload-independent attempt persistence**

```js
test("getScoreAdvice returns threshold-based copy for excellent, good, pass, and retry", () => {
  const scoringConfig = {
    excellentThreshold: 90,
    goodThreshold: 75,
    passThreshold: 60,
  };

  assert.equal(
    getScoreAdvice({ finalScore: 95, scoringConfig }),
    "Rat tot. Ban co the chuyen sang bai tiep theo."
  );
  assert.equal(
    getScoreAdvice({ finalScore: 80, scoringConfig }),
    "Tot. Hay luyen them de tang do on dinh va len muc excellent."
  );
  assert.equal(
    getScoreAdvice({ finalScore: 63, scoringConfig }),
    "Ban da dat muc co ban. Nen luyen lai de tang do chinh xac."
  );
  assert.equal(
    getScoreAdvice({ finalScore: 40, scoringConfig }),
    "Chua dat. Hay xem lai dong tac va thu quay lai mot lan nua."
  );
});

test("buildPracticeAttemptPayload keeps asset ids null and can include upload trace in feedback only", () => {
  const payload = buildPracticeAttemptPayload({
    target: { signId: 55 },
    result: {
      finalScore: 84.25,
      verdict: "good",
      trackingRatio: 0.82,
      frameCount: 42,
      componentScores: {
        hand_score: 88,
        pose_score: 80,
        motion_score: 74,
      },
    },
    sessionId: null,
    referenceExampleId: null,
    submittedVideoAssetId: null,
    extractedKeypointAssetId: null,
    uploadTrace: {
      status: "uploaded",
      video_object: "uploads/user.webm",
      keypoint_object: "uploads/user.json",
    },
  });

  assert.equal(payload.submitted_video_asset_id, null);
  assert.equal(payload.extracted_keypoint_asset_id, null);
  assert.deepEqual(payload.feedback.upload_trace, {
    status: "uploaded",
    video_object: "uploads/user.webm",
    keypoint_object: "uploads/user.json",
  });
});
```

- [ ] **Step 2: Run the targeted contract test to verify it fails for the expected missing helpers/fields**

Run: `npm test -- tests/practice-ai-contract.test.mjs`

Expected: `FAIL` because `getScoreAdvice` does not exist yet and/or `feedback.upload_trace` is missing from the payload.

- [ ] **Step 3: Implement the minimal scoring helper and payload support**

```js
export function getScoreAdvice({ finalScore = 0, scoringConfig = {} } = {}) {
  const excellentThreshold = Number(scoringConfig.excellentThreshold || 90);
  const goodThreshold = Number(scoringConfig.goodThreshold || 75);
  const passThreshold = Number(scoringConfig.passThreshold || 60);

  if (finalScore >= excellentThreshold) {
    return "Rat tot. Ban co the chuyen sang bai tiep theo.";
  }
  if (finalScore >= goodThreshold) {
    return "Tot. Hay luyen them de tang do on dinh va len muc excellent.";
  }
  if (finalScore >= passThreshold) {
    return "Ban da dat muc co ban. Nen luyen lai de tang do chinh xac.";
  }
  return "Chua dat. Hay xem lai dong tac va thu quay lai mot lan nua.";
}
```

```js
export function buildPracticeAttemptPayload({
  target,
  result,
  sessionId = null,
  referenceExampleId = null,
  submittedVideoAssetId = null,
  extractedKeypointAssetId = null,
  uploadTrace = null,
} = {}) {
  // existing signId guard stays unchanged

  return {
    session_id: sessionId,
    sign_id: signId,
    reference_example_id: referenceExampleId,
    submitted_video_asset_id: submittedVideoAssetId,
    extracted_keypoint_asset_id: extractedKeypointAssetId,
    score_total: Number(result?.finalScore || 0),
    score_hand: Number(componentScores.hand_score || 0),
    score_pose: Number(componentScores.pose_score || 0),
    score_motion: Number(componentScores.motion_score || 0),
    feedback: {
      verdict: result?.verdict || "retry",
      tracking_ratio: Number(result?.trackingRatio || 0),
      frame_count: Number(result?.frameCount || 0),
      ...(uploadTrace ? { upload_trace: uploadTrace } : {}),
    },
    status: "completed",
  };
}
```

- [ ] **Step 4: Run the targeted contract test to verify it passes**

Run: `npm test -- tests/practice-ai-contract.test.mjs`

Expected: `PASS` for the new advice and payload assertions.

- [ ] **Step 5: Commit the helper contract step**

```bash
git add tests/practice-ai-contract.test.mjs src/app/lib/practice.js src/app/lib/practiceScoring.js
git commit -m "Preserve AI attempt saving while simplifying score feedback"
```

### Task 2: Remove reference-heavy user UI and render final score + advice only

**Files:**
- Modify: `tests/ai-practice-page-source.test.mjs`
- Modify: `src/pages/AIPracticePage.jsx`

- [ ] **Step 1: Write the failing source-level UI test for the simplified AI practice screen**

```js
test("AI practice page removes reference and detailed metrics, leaving webcam plus summary result", async () => {
  const source = await readFile(new URL("../src/pages/AIPracticePage.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /<h2[^>]*>Reference<\/h2>/);
  assert.doesNotMatch(source, /MetricRow label="dtw_score"/);
  assert.doesNotMatch(source, /MetricRow label="hand_score"/);
  assert.doesNotMatch(source, /ScoreBar label="Hand"/);
  assert.match(source, /getScoreAdvice/);
  assert.match(source, /Ket qua cuoi/);
  assert.match(source, /Loi khuyen/);
});
```

- [ ] **Step 2: Run the page source test to verify it fails on current reference/metrics UI**

Run: `npm test -- tests/ai-practice-page-source.test.mjs`

Expected: `FAIL` because the file still contains the `Reference` section and metric rows/score bars.

- [ ] **Step 3: Implement the minimal UI simplification in `AIPracticePage.jsx`**

```jsx
import { buildPracticeAttemptPayload, getLessonPracticeTargets } from "../app/lib/practice.js";
import { getScoreAdvice } from "../app/lib/practiceScoring.js";

// delete ScoreBar and MetricRow helpers entirely

const scoringConfig = resourceBundle?.scoringConfig || null;
const scoreAdvice = result ? getScoreAdvice({
  finalScore: Number(result.finalScore || 0),
  scoringConfig,
}) : "";

// when upload finishes, only keep an optional trace object
const uploadTrace = payload.uploadError
  ? { status: "failed" }
  : payload.uploadResponse
    ? {
        status: "uploaded",
        video_object: payload.uploadResponse.video_object,
        keypoint_object: payload.uploadResponse.keypoint_object,
      }
    : null;

const savedAttempt = await persistAttempt(payload.result, uploadTrace);
```

```jsx
<section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
  <h2 className="text-2xl font-black text-slate-900">Ket qua cuoi</h2>
  {!result ? (
    <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-base font-semibold text-slate-500">
      Chua co ket qua. Flow chuan: worker ready -> camera preview on -> countdown -> recording -> processing -> done.
    </div>
  ) : (
    <div className="mt-4 space-y-4">
      <div className={`rounded-2xl p-5 text-center ${verdictTone}`}>
        <div className="text-sm font-black uppercase tracking-[0.16em]">{result.verdict}</div>
        <div className="mt-2 text-5xl font-black">{result.finalScore}/100</div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Loi khuyen</div>
        <p className="mt-2 text-base font-semibold leading-7 text-slate-700">{scoreAdvice}</p>
      </div>
    </div>
  )}
</section>
```

- [ ] **Step 4: Run the page source test to verify it passes**

Run: `npm test -- tests/ai-practice-page-source.test.mjs`

Expected: `PASS` with the reference section and detailed metric UI removed from source.

- [ ] **Step 5: Commit the user AI page simplification step**

```bash
git add tests/ai-practice-page-source.test.mjs src/pages/AIPracticePage.jsx src/app/lib/practice.js src/app/lib/practiceScoring.js
git commit -m "Focus AI practice UI on webcam and final advice"
```

### Task 3: Add admin AI scoring-config editor by sign slug

**Files:**
- Create: `src/app/lib/aiConfig.js`
- Create: `tests/admin-ai-config.test.mjs`
- Modify: `src/components/auth/AdminDashboard.jsx`

- [ ] **Step 1: Write the failing tests for config endpoint helpers and payload normalization**

```js
import {
  createAiConfigDraft,
  normalizeAiConfigPatchPayload,
  getAiConfigEndpoint,
} from "../src/app/lib/aiConfig.js";

test("getAiConfigEndpoint builds the sign-slug config path", () => {
  assert.equal(getAiConfigEndpoint("sach-giao-khoa"), "/api/v1/ai/signs/sach-giao-khoa/config");
});

test("normalizeAiConfigPatchPayload converts numeric strings and omits blank values", () => {
  assert.deepEqual(
    normalizeAiConfigPatchPayload({
      algorithm: "dtw-cosine",
      handWeight: "0.45",
      poseWeight: "0.35",
      speedWeight: "0.2",
      missingHandPenalty: "1.5",
      excellentThreshold: "90",
      goodThreshold: "75",
      passThreshold: "60",
    }),
    {
      algorithm: "dtw-cosine",
      handWeight: 0.45,
      poseWeight: 0.35,
      speedWeight: 0.2,
      missingHandPenalty: 1.5,
      excellentThreshold: 90,
      goodThreshold: 75,
      passThreshold: 60,
    }
  );
});
```

- [ ] **Step 2: Run the new admin config test to verify it fails because the helper file does not exist yet**

Run: `npm test -- tests/admin-ai-config.test.mjs`

Expected: `FAIL` with a module resolution or missing export error.

- [ ] **Step 3: Implement the minimal helper module and wire the admin dashboard UI**

```js
export function getAiConfigEndpoint(signSlug) {
  return `/api/v1/ai/signs/${encodeURIComponent(String(signSlug || "").trim())}/config`;
}

export function createAiConfigDraft(config = {}) {
  return {
    signSlug: config.signSlug || "",
    algorithm: config.algorithm || "dtw-cosine",
    handWeight: String(config.handWeight ?? ""),
    poseWeight: String(config.poseWeight ?? ""),
    speedWeight: String(config.speedWeight ?? ""),
    missingHandPenalty: String(config.missingHandPenalty ?? ""),
    excellentThreshold: String(config.excellentThreshold ?? ""),
    goodThreshold: String(config.goodThreshold ?? ""),
    passThreshold: String(config.passThreshold ?? ""),
  };
}

export function normalizeAiConfigPatchPayload(draft) {
  return {
    algorithm: String(draft.algorithm || "").trim() || null,
    handWeight: draft.handWeight === "" ? null : Number(draft.handWeight),
    poseWeight: draft.poseWeight === "" ? null : Number(draft.poseWeight),
    speedWeight: draft.speedWeight === "" ? null : Number(draft.speedWeight),
    missingHandPenalty: draft.missingHandPenalty === "" ? null : Number(draft.missingHandPenalty),
    excellentThreshold: draft.excellentThreshold === "" ? null : Number(draft.excellentThreshold),
    goodThreshold: draft.goodThreshold === "" ? null : Number(draft.goodThreshold),
    passThreshold: draft.passThreshold === "" ? null : Number(draft.passThreshold),
  };
}
```

```jsx
const [aiConfigSlug, setAiConfigSlug] = useState("");
const [aiConfigDraft, setAiConfigDraft] = useState(createAiConfigDraft());
const [aiConfigLoading, setAiConfigLoading] = useState(false);

async function loadAiConfig() {
  if (!aiConfigSlug.trim()) throw new Error("Sign slug is required.");
  const payload = await apiRequest(getAiConfigEndpoint(aiConfigSlug), { accessToken });
  setAiConfigDraft(createAiConfigDraft(payload));
}

async function saveAiConfig() {
  if (!aiConfigSlug.trim()) throw new Error("Sign slug is required.");
  const payload = normalizeAiConfigPatchPayload(aiConfigDraft);
  const saved = await apiRequest(getAiConfigEndpoint(aiConfigSlug), {
    method: "PATCH",
    accessToken,
    body: payload,
  });
  setAiConfigDraft(createAiConfigDraft(saved));
}
```

```jsx
<Card className="p-5 md:p-6">
  <div className="flex items-center justify-between gap-3">
    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">AI scoring config by sign slug</div>
    {aiConfigLoading ? <StatusBadge tone="amber">loading</StatusBadge> : null}
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-2">
    <Field label="Sign slug">
      <Input value={aiConfigSlug} onChange={(e) => setAiConfigSlug(e.target.value)} placeholder="sach-giao-khoa" />
    </Field>
    <div className="flex items-end gap-2">
      <GhostButton type="button" onClick={() => runAction(loadAiConfig, { success: "Loaded AI config." })}>Load config</GhostButton>
      <ActionButton type="button" onClick={() => runAction(saveAiConfig, { success: "Saved AI config.", reload: ["ai"] })}>Save config</ActionButton>
    </div>
    <Field label="Algorithm">
      <Input value={aiConfigDraft.algorithm} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, algorithm: e.target.value }))} />
    </Field>
    <Field label="Hand weight">
      <Input value={aiConfigDraft.handWeight} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, handWeight: e.target.value }))} />
    </Field>
    <Field label="Pose weight">
      <Input value={aiConfigDraft.poseWeight} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, poseWeight: e.target.value }))} />
    </Field>
    <Field label="Speed weight">
      <Input value={aiConfigDraft.speedWeight} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, speedWeight: e.target.value }))} />
    </Field>
    <Field label="Missing hand penalty">
      <Input value={aiConfigDraft.missingHandPenalty} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, missingHandPenalty: e.target.value }))} />
    </Field>
    <Field label="Excellent threshold">
      <Input value={aiConfigDraft.excellentThreshold} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, excellentThreshold: e.target.value }))} />
    </Field>
    <Field label="Good threshold">
      <Input value={aiConfigDraft.goodThreshold} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, goodThreshold: e.target.value }))} />
    </Field>
    <Field label="Pass threshold">
      <Input value={aiConfigDraft.passThreshold} onChange={(e) => setAiConfigDraft((prev) => ({ ...prev, passThreshold: e.target.value }))} />
    </Field>
  </div>
</Card>
```

- [ ] **Step 4: Run the admin config test to verify it passes**

Run: `npm test -- tests/admin-ai-config.test.mjs`

Expected: `PASS` for endpoint and payload normalization.

- [ ] **Step 5: Commit the admin AI config editor step**

```bash
git add tests/admin-ai-config.test.mjs src/app/lib/aiConfig.js src/components/auth/AdminDashboard.jsx
git commit -m "Add admin AI scoring config editor by sign slug"
```

### Task 4: Run full verification and branch cleanup

**Files:**
- Modify: `tests/practice-ai-contract.test.mjs`
- Modify: `tests/ai-practice-page-source.test.mjs`
- Create: `tests/admin-ai-config.test.mjs`
- Modify: `src/app/lib/practice.js`
- Modify: `src/app/lib/practiceScoring.js`
- Modify: `src/pages/AIPracticePage.jsx`
- Create: `src/app/lib/aiConfig.js`
- Modify: `src/components/auth/AdminDashboard.jsx`

- [ ] **Step 1: Run the focused practice/admin test set**

Run: `npm test -- tests/practice-ai-contract.test.mjs tests/ai-practice-page-source.test.mjs tests/admin-ai-config.test.mjs`

Expected: `PASS` for all targeted tests.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: `PASS` with no regressions in existing route, quiz, practice-worker, and dashboard contract tests.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: `vite build` completes successfully and emits the production bundle without JSX/import errors.

- [ ] **Step 4: Review final diff for accidental reference UI leftovers or unused imports**

Run: `git diff -- src/pages/AIPracticePage.jsx src/components/auth/AdminDashboard.jsx src/app/lib/practice.js src/app/lib/practiceScoring.js src/app/lib/aiConfig.js tests/practice-ai-contract.test.mjs tests/ai-practice-page-source.test.mjs tests/admin-ai-config.test.mjs`

Expected: diff shows only the approved simplification, config editor, helper additions, and tests.

- [ ] **Step 5: Commit the verified final state**

```bash
git add src/pages/AIPracticePage.jsx src/components/auth/AdminDashboard.jsx src/app/lib/practice.js src/app/lib/practiceScoring.js src/app/lib/aiConfig.js tests/practice-ai-contract.test.mjs tests/ai-practice-page-source.test.mjs tests/admin-ai-config.test.mjs
git commit -m "Simplify AI practice feedback and expose scoring-config editing"
```
