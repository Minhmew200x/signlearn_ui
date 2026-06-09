function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

const VERDICT_LABELS = {
  excellent: 'Rất tốt',
  good: 'Tốt',
  pass: 'Đạt',
  retry: 'Cần luyện thêm',
};

const COMPONENT_ADVICE = {
  hand_score: {
    label: 'hình tay',
    advice: 'Hãy giữ dáng ngón tay rõ hơn và khóa hình tay sớm hơn.',
  },
  pose_score: {
    label: 'tư thế và vị trí tay',
    advice: 'Cần giữ đúng vị trí tay, hướng người và độ mở động tác.',
  },
  motion_score: {
    label: 'hướng chuyển động',
    advice: 'Làm rõ đường di chuyển, tránh rung và đổi hướng quá nhanh.',
  },
  timing_score: {
    label: 'nhịp độ',
    advice: 'Cần vào nhịp đúng thời điểm và giữ các pha động tác đều hơn.',
  },
  speed_score: {
    label: 'tốc độ',
    advice: 'Hãy giữ tốc độ ổn định, không quá nhanh ở đầu và cuối động tác.',
  },
  visibility_score: {
    label: 'độ rõ trong khung hình',
    advice: 'Đưa tay vào trọn khung hình và tránh che mất các mốc tay chính.',
  },
  facial_expression_score: {
    label: 'nét mặt',
    advice: 'Thể hiện nét mặt rõ hơn để động tác đầy đủ nghĩa hơn.',
  },
  hand_position_score: {
    label: 'điểm đặt tay',
    advice: 'Cần đưa tay đến đúng điểm đặt và giữ khoảng cách ổn định hơn.',
  },
};

export function getVerdict(finalScore, scoringConfig = {}) {
  const excellentThreshold = Number(scoringConfig.excellentThreshold || 90);
  const goodThreshold = Number(scoringConfig.goodThreshold || 75);
  const passThreshold = Number(scoringConfig.passThreshold || 60);

  if (finalScore >= excellentThreshold) return 'excellent';
  if (finalScore >= goodThreshold) return 'good';
  if (finalScore >= passThreshold) return 'pass';
  return 'retry';
}

export function getVerdictLabel(verdict = 'retry') {
  return VERDICT_LABELS[verdict] || VERDICT_LABELS.retry;
}

function getThresholdAdvice(finalScore, scoringConfig = {}) {
  const excellentThreshold = Number(scoringConfig.excellentThreshold || 90);
  const goodThreshold = Number(scoringConfig.goodThreshold || 75);
  const passThreshold = Number(scoringConfig.passThreshold || 60);

  if (Number(finalScore || 0) >= excellentThreshold) {
    return 'Rất tốt. Bạn đã nắm chắc động tác và có thể chuyển sang bài tiếp theo.';
  }
  if (Number(finalScore || 0) >= goodThreshold) {
    return 'Tốt. Bạn đã làm đúng phần lớn động tác, chỉ cần ổn định hơn để lên mức rất tốt.';
  }
  if (Number(finalScore || 0) >= passThreshold) {
    return 'Bạn đã đạt mức cơ bản. Nên luyện lại để động tác rõ và chính xác hơn.';
  }
  return 'Chưa đạt. Hãy xem lại video mẫu và thử quay lại một lần nữa.';
}

function getComponentAdvice(componentScores = {}) {
  const componentEntries = Object.entries(COMPONENT_ADVICE)
    .map(([key, meta]) => ({
      key,
      label: meta.label,
      advice: meta.advice,
      score: Number(componentScores?.[key]),
    }))
    .filter((entry) => Number.isFinite(entry.score));

  if (!componentEntries.length) return '';

  const weakestEntries = [...componentEntries]
    .sort((left, right) => left.score - right.score)
    .filter((entry) => entry.score < 70)
    .slice(0, 2);

  if (weakestEntries.length) {
    const focusLabels = weakestEntries.map((entry) => entry.label).join(' và ');
    const detailAdvice = weakestEntries.map((entry) => entry.advice).join(' ');
    return `Ưu tiên cải thiện ${focusLabels}. ${detailAdvice}`;
  }

  const mediumEntries = [...componentEntries]
    .sort((left, right) => left.score - right.score)
    .filter((entry) => entry.score < 85)
    .slice(0, 2);

  if (mediumEntries.length) {
    const focusLabels = mediumEntries.map((entry) => entry.label).join(' và ');
    return `Các thành phần chính đã ổn. Hãy làm đều hơn ở ${focusLabels}.`;
  }

  const strongestEntry = [...componentEntries].sort((left, right) => right.score - left.score)[0];
  return `Các thành phần đang đồng đều. Điểm mạnh hiện tại là ${strongestEntry.label}.`;
}

export function getScoreAdvice({ finalScore = 0, componentScores = {}, scoringConfig = {} } = {}) {
  return [getThresholdAdvice(finalScore, scoringConfig), getComponentAdvice(componentScores)]
    .filter(Boolean)
    .join(' ');
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

