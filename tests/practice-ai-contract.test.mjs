import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPracticeAttemptPayload,
  getPracticeReferenceVideoUrl,
  getLessonPracticeTargets,
  getLessonQuizTitle,
} from "../src/app/lib/practice.js";
import { buildScoreSummary } from "../src/app/lib/practiceScoring.js";

test("getLessonPracticeTargets uses lesson vocab and enriches with sign catalog metadata", () => {
  const targets = getLessonPracticeTargets({
    mooc: {
      id: "family-mooc",
      vocabItems: [{ slug: "fallback-slug", word: "Fallback" }],
    },
    lessonMaterial: {
      vocabItems: [
        { id: 11, signId: 101, slug: "xin-chao", word: "Xin chào", videoUrl: "/api/v1/signs/xin-chao/video" },
        { id: 12, signId: 102, slug: "cam-on", word: "Cảm ơn" },
      ],
    },
    signs: [
      { slug: "xin-chao", label: "Xin chao", reference_video: "xin-chao.mp4", version: "v2" },
      { slug: "cam-on", label: "Cam on", reference_video: "cam-on.mp4", version: "v5" },
    ],
  });

  assert.deepEqual(targets, [
    {
      id: 11,
      signId: 101,
      signSlug: "xin-chao",
      word: "Xin chào",
      label: "Xin chao",
      referenceVideo: "xin-chao.mp4",
      referenceVersion: "v2",
      videoUrl: "/api/v1/signs/xin-chao/video",
    },
    {
      id: 12,
      signId: 102,
      signSlug: "cam-on",
      word: "Cảm ơn",
      label: "Cam on",
      referenceVideo: "cam-on.mp4",
      referenceVersion: "v5",
      videoUrl: null,
    },
  ]);
});

test("getLessonQuizTitle prefers backend quiz detail title over generic fallbacks", () => {
  assert.equal(getLessonQuizTitle({
    quiz: {
      title: "Quiz cuối bài",
      detail: { title: "Quiz Chào hỏi cơ bản" },
    },
  }), "Quiz Chào hỏi cơ bản");
});

test("getPracticeReferenceVideoUrl always uses the sign video endpoint for AI practice", () => {
  assert.equal(
    getPracticeReferenceVideoUrl({ signSlug: "xin-chao", videoUrl: "/static/videos/W02901.mp4" }),
    "/api/v1/signs/xin-chao/video",
  );
  assert.equal(getPracticeReferenceVideoUrl({ signSlug: "cam-on" }), "/api/v1/signs/cam-on/video");
  assert.equal(getPracticeReferenceVideoUrl({ signSlug: "" }), null);
});

test("buildPracticeAttemptPayload matches backend practice attempt contract", () => {
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
  });

  assert.deepEqual(payload, {
    session_id: null,
    sign_id: 55,
    reference_example_id: null,
    submitted_video_asset_id: null,
    extracted_keypoint_asset_id: null,
    score_total: 84.25,
    score_hand: 88,
    score_pose: 80,
    score_motion: 74,
    feedback: {
      verdict: "good",
      tracking_ratio: 0.82,
      frame_count: 42,
    },
    status: "completed",
  });
});

test("buildScoreSummary applies weights, penalty, clamp, and verdict thresholds", () => {
  const summary = buildScoreSummary({
    componentScores: {
      hand_score: 80,
      pose_score: 70,
      speed_score: 60,
      motion_score: 58,
      dtw_score: 76,
      timing_score: 63,
    },
    trackingRatio: 0.8,
    handTrackingRatio: 0.5,
    scoringConfig: {
      handWeight: 0.5,
      poseWeight: 0.3,
      speedWeight: 0.2,
      missingHandPenalty: 1.5,
      excellentThreshold: 90,
      goodThreshold: 75,
      passThreshold: 60,
    },
  });

  assert.equal(summary.missingHandPenalty, 7.5);
  assert.equal(summary.finalScore, 65.5);
  assert.equal(summary.verdict, "pass");
});
