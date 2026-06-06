function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

const VERDICT_LABELS = {
  excellent: 'Rat tot',
  good: 'Tot',
  pass: 'Dat',
  retry: 'Can luyen them',
};

const COMPONENT_ADVICE = {
  hand_score: {
    label: 'hinh tay',
    advice: 'Hay giu dang ngon tay ro hon va khoa hinh tay som hon.',
  },
  pose_score: {
    label: 'tu the va vi tri tay',
    advice: 'Can giu dung vi tri tay, huong nguoi va do mo dong tac.',
  },
  motion_score: {
    label: 'huong chuyen dong',
    advice: 'Lam ro duong di chuyen, tranh rung va doi huong qua nhanh.',
  },
  timing_score: {
    label: 'nhip do',
    advice: 'Can vao nhip dung thoi diem va giu cac pha dong tac deu hon.',
  },
  speed_score: {
    label: 'toc do',
    advice: 'Hay giu toc do on dinh, khong qua nhanh o dau va cuoi dong tac.',
  },
  visibility_score: {
    label: 'do ro trong khung hinh',
    advice: 'Dua tay vao tron khung hinh va tranh che mat cac moc tay chinh.',
  },
  facial_expression_score: {
    label: 'net mat',
    advice: 'Thu hien net mat ro hon de dong tac day du nghia hon.',
  },
  hand_position_score: {
    label: 'diem dat tay',
    advice: 'Can dua tay den dung diem dat va giu khoang cach on dinh hon.',
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
    return 'Rat tot. Ban da nam chac dong tac va co the chuyen sang bai tiep theo.';
  }
  if (Number(finalScore || 0) >= goodThreshold) {
    return 'Tot. Ban da lam dung phan lon dong tac, chi can on dinh hon de len muc rat tot.';
  }
  if (Number(finalScore || 0) >= passThreshold) {
    return 'Ban da dat muc co ban. Nen luyen lai de dong tac ro va chinh xac hon.';
  }
  return 'Chua dat. Hay xem lai video mau va thu quay lai mot lan nua.';
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
    const focusLabels = weakestEntries.map((entry) => entry.label).join(' va ');
    const detailAdvice = weakestEntries.map((entry) => entry.advice).join(' ');
    return `Uu tien cai thien ${focusLabels}. ${detailAdvice}`;
  }

  const mediumEntries = [...componentEntries]
    .sort((left, right) => left.score - right.score)
    .filter((entry) => entry.score < 85)
    .slice(0, 2);

  if (mediumEntries.length) {
    const focusLabels = mediumEntries.map((entry) => entry.label).join(' va ');
    return `Cac thanh phan chinh da on. Hay lam deu hon o ${focusLabels}.`;
  }

  const strongestEntry = [...componentEntries].sort((left, right) => right.score - left.score)[0];
  return `Cac thanh phan dang dong deu. Diem manh hien tai la ${strongestEntry.label}.`;
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
