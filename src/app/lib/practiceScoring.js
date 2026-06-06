function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

export function getVerdict(finalScore, scoringConfig = {}) {
  const excellentThreshold = Number(scoringConfig.excellentThreshold || 90);
  const goodThreshold = Number(scoringConfig.goodThreshold || 75);
  const passThreshold = Number(scoringConfig.passThreshold || 60);

  if (finalScore >= excellentThreshold) return 'excellent';
  if (finalScore >= goodThreshold) return 'good';
  if (finalScore >= passThreshold) return 'pass';
  return 'retry';
}

export function getScoreAdvice({ finalScore = 0, scoringConfig = {} } = {}) {
  const excellentThreshold = Number(scoringConfig.excellentThreshold || 90);
  const goodThreshold = Number(scoringConfig.goodThreshold || 75);
  const passThreshold = Number(scoringConfig.passThreshold || 60);

  if (Number(finalScore || 0) >= excellentThreshold) {
    return 'Rat tot. Ban co the chuyen sang bai tiep theo.';
  }
  if (Number(finalScore || 0) >= goodThreshold) {
    return 'Tot. Hay luyen them de tang do on dinh va len muc excellent.';
  }
  if (Number(finalScore || 0) >= passThreshold) {
    return 'Ban da dat muc co ban. Nen luyen lai de tang do chinh xac.';
  }
  return 'Chua dat. Hay xem lai dong tac va thu quay lai mot lan nua.';
}

export function buildScoreSummary({ componentScores = {}, trackingRatio = 0, handTrackingRatio = 0, scoringConfig = {} } = {}) {
  const handWeight = Number(scoringConfig.handWeight || 0.45);
  const poseWeight = Number(scoringConfig.poseWeight || 0.35);
  const speedWeight = Number(scoringConfig.speedWeight || 0.2);
  const penaltyWeight = Number(scoringConfig.missingHandPenalty || 0);

  const missingHandPenalty = round(penaltyWeight * Math.max(0, 1 - Number(handTrackingRatio || 0)) * 10, 2);
  const weightedScore = (
    clamp(componentScores.hand_score) * handWeight
    + clamp(componentScores.pose_score) * poseWeight
    + clamp(componentScores.speed_score) * speedWeight
    - missingHandPenalty
  );
  const finalScore = round(clamp(weightedScore), 2);

  return {
    finalScore,
    verdict: getVerdict(finalScore, scoringConfig),
    trackingRatio: round(trackingRatio, 4),
    handTrackingRatio: round(handTrackingRatio, 4),
    missingHandPenalty,
    componentScores: {
      dtw_score: clamp(componentScores.dtw_score),
      hand_score: clamp(componentScores.hand_score),
      pose_score: clamp(componentScores.pose_score),
      timing_score: clamp(componentScores.timing_score),
      motion_score: clamp(componentScores.motion_score),
      speed_score: clamp(componentScores.speed_score),
    },
  };
}

export function normalizeReferenceFrame(frame = [], mask = []) {
  return {
    features: Array.isArray(frame) ? frame.map((value) => Number(value || 0)) : [],
    mask: Array.isArray(mask) ? mask.map(Boolean) : [],
  };
}
