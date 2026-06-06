function toTrimmedString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getPracticeReferenceVideoUrl(target) {
  const signSlug = toTrimmedString(target?.signSlug);
  if (!signSlug) return null;
  return `/api/v1/signs/${encodeURIComponent(signSlug)}/video`;
}

function buildSignCatalogMap(signs = []) {
  const entries = Array.isArray(signs) ? signs : [];
  return new Map(
    entries
      .map((item) => [toTrimmedString(item?.slug), item])
      .filter(([slug]) => Boolean(slug)),
  );
}

function getSourceVocabItems(mooc, lessonMaterial) {
  if (Array.isArray(lessonMaterial?.vocabItems) && lessonMaterial.vocabItems.length > 0) {
    return lessonMaterial.vocabItems;
  }
  if (Array.isArray(mooc?.vocabItems) && mooc.vocabItems.length > 0) {
    return mooc.vocabItems;
  }

  const fallbackSlug = lessonMaterial?.signSlug || mooc?.signSlug || null;
  return [{
    id: fallbackSlug || mooc?.id || 'practice-target',
    signId: lessonMaterial?.signId || mooc?.signId || null,
    slug: fallbackSlug,
    word: lessonMaterial?.word || mooc?.word || 'Tu vung',
    videoUrl: lessonMaterial?.videoUrl || mooc?.videoUrl || null,
  }];
}

export function getLessonPracticeTargets({ mooc, lessonMaterial, signs = [] } = {}) {
  const signCatalog = buildSignCatalogMap(signs);

  return getSourceVocabItems(mooc, lessonMaterial)
    .map((item, index) => {
      const signSlug = toTrimmedString(item?.slug);
      if (!signSlug) return null;

      const catalogItem = signCatalog.get(signSlug);
      return {
        id: item?.id || `${mooc?.id || 'lesson'}-practice-${index}`,
        signId: Number(item?.signId || item?.sign_id || catalogItem?.id || 0) || null,
        signSlug,
        word: toTrimmedString(item?.word) || toTrimmedString(item?.label) || toTrimmedString(catalogItem?.label) || `Tu vung ${index + 1}`,
        label: toTrimmedString(catalogItem?.label) || toTrimmedString(item?.label) || toTrimmedString(item?.word) || signSlug,
        referenceVideo: toTrimmedString(catalogItem?.reference_video),
        referenceVersion: toTrimmedString(catalogItem?.version),
        videoUrl: toTrimmedString(item?.videoUrl),
      };
    })
    .filter(Boolean);
}

export function getLessonQuizTitle(lessonMaterial, fallbackTitle = 'Quiz cuối bài') {
  return (
    toTrimmedString(lessonMaterial?.quiz?.detail?.title)
    || toTrimmedString(lessonMaterial?.quiz?.title)
    || fallbackTitle
  );
}

export function buildPracticeAttemptPayload({
  target,
  result,
  sessionId = null,
  referenceExampleId = null,
  submittedVideoAssetId = null,
  extractedKeypointAssetId = null,
} = {}) {
  const signId = Number(target?.signId || 0);
  if (!signId) {
    throw new Error('Practice attempt needs sign_id.');
  }

  const componentScores = result?.componentScores || {};

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
      verdict: result?.verdict || 'retry',
      tracking_ratio: Number(result?.trackingRatio || 0),
      frame_count: Number(result?.frameCount || 0),
    },
    status: 'completed',
  };
}
