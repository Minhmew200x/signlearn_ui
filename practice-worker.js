const TASKS_VISION_CJS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.cjs';
const TASKS_VISION_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/';

const POSE_INDICES = [0, 11, 12, 13, 14, 15, 16, 23, 24];
const FACE_INDICES = [4, 33, 61, 133, 152, 263, 291, 13, 14];
const LEFT_HAND_OFFSET = 18;
const RIGHT_HAND_OFFSET = 39;
const HAND_LANDMARK_COUNT = 21;
const TOTAL_LANDMARK_COUNT = 60;
const ALL_INDICES = Array.from({ length: TOTAL_LANDMARK_COUNT }, (_, index) => index);
const POSE_FACE_INDICES = Array.from({ length: 18 }, (_, index) => index);
const HAND_INDICES = Array.from({ length: 42 }, (_, index) => index + 18);

const state = {
  tasksVision: null,
  filesetResolver: null,
  HolisticLandmarker: null,
  landmarker: null,
  reference: null,
  scoringConfig: null,
  captureStartedAt: null,
  capturedFrames: [],
  capturedMasks: [],
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function getVerdict(finalScore, scoringConfig = {}) {
  const excellentThreshold = Number(scoringConfig.excellentThreshold || 90);
  const goodThreshold = Number(scoringConfig.goodThreshold || 75);
  const passThreshold = Number(scoringConfig.passThreshold || 60);

  if (finalScore >= excellentThreshold) return 'excellent';
  if (finalScore >= goodThreshold) return 'good';
  if (finalScore >= passThreshold) return 'pass';
  return 'retry';
}

function buildScoreSummary({ componentScores = {}, trackingRatio = 0, handTrackingRatio = 0, scoringConfig = {} } = {}) {
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

async function loadTasksVisionClassic() {
  if (state.tasksVision) {
    return state.tasksVision;
  }

  const response = await fetch(TASKS_VISION_CJS_CDN);
  if (!response.ok) {
    throw new Error(`Không tải được MediaPipe bundle (${response.status}).`);
  }

  const source = await response.text();
  const previousExports = self.exports;
  const previousModule = self.module;

  try {
    self.exports = {};
    self.module = { exports: self.exports };
    self.eval(`${source}\n//# sourceURL=${TASKS_VISION_CJS_CDN}`);
    state.tasksVision = self.module.exports;
  } finally {
    if (previousExports === undefined) {
      delete self.exports;
    } else {
      self.exports = previousExports;
    }

    if (previousModule === undefined) {
      delete self.module;
    } else {
      self.module = previousModule;
    }
  }

  return state.tasksVision;
}

function safeCloseBitmap(bitmap) {
  try {
    bitmap?.close?.();
  } catch {
    // Ignore bitmap close failures.
  }
}

function isLandmarkVisible(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const visibility = Number.isFinite(point.visibility) ? point.visibility : 1;
  const presence = Number.isFinite(point.presence) ? point.presence : 1;
  return visibility >= 0.1 && presence >= 0.1;
}

function pickPoint(points, index) {
  const point = Array.isArray(points) ? points[index] : null;
  if (!isLandmarkVisible(point)) {
    return { x: 0, y: 0, z: 0, visible: false };
  }

  return {
    x: Number(point.x || 0),
    y: Number(point.y || 0),
    z: Number(point.z || 0),
    visible: true,
  };
}

function collectPoints(points, indices) {
  return indices.map((index) => pickPoint(points, index));
}

function extractFrame(result) {
  const posePoints = collectPoints(result?.poseLandmarks?.[0], POSE_INDICES);
  const facePoints = collectPoints(result?.faceLandmarks?.[0], FACE_INDICES);
  const leftHandPoints = collectPoints(result?.leftHandLandmarks?.[0], Array.from({ length: HAND_LANDMARK_COUNT }, (_, index) => index));
  const rightHandPoints = collectPoints(result?.rightHandLandmarks?.[0], Array.from({ length: HAND_LANDMARK_COUNT }, (_, index) => index));
  const points = [...posePoints, ...facePoints, ...leftHandPoints, ...rightHandPoints];

  const features = [];
  const mask = [];
  for (const point of points) {
    features.push(point.x, point.y, point.z);
    mask.push(Boolean(point.visible));
  }

  return { points, features, mask };
}

function getVisibleCenter(points) {
  const visible = points.filter((point) => point?.visible);
  if (!visible.length) return { x: 0, y: 0, z: 0 };

  const total = visible.reduce((accumulator, point) => ({
    x: accumulator.x + point.x,
    y: accumulator.y + point.y,
    z: accumulator.z + point.z,
  }), { x: 0, y: 0, z: 0 });

  return {
    x: total.x / visible.length,
    y: total.y / visible.length,
    z: total.z / visible.length,
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function distance(a, b) {
  return Math.sqrt(
    ((a.x || 0) - (b.x || 0)) ** 2
    + ((a.y || 0) - (b.y || 0)) ** 2
    + ((a.z || 0) - (b.z || 0)) ** 2,
  );
}

function getAnchor(points) {
  const leftShoulder = points[1];
  const rightShoulder = points[2];
  const leftHip = points[7];
  const rightHip = points[8];

  if (leftShoulder?.visible && rightShoulder?.visible) {
    return midpoint(leftShoulder, rightShoulder);
  }
  if (leftHip?.visible && rightHip?.visible) {
    return midpoint(leftHip, rightHip);
  }
  return getVisibleCenter(points);
}

function getScale(points) {
  const leftShoulder = points[1];
  const rightShoulder = points[2];
  const leftHip = points[7];
  const rightHip = points[8];

  if (leftShoulder?.visible && rightShoulder?.visible) {
    return Math.max(distance(leftShoulder, rightShoulder), 0.05);
  }
  if (leftHip?.visible && rightHip?.visible) {
    return Math.max(distance(leftHip, rightHip), 0.05);
  }
  return 1;
}

function normalizePoints(points) {
  const anchor = getAnchor(points);
  const scale = getScale(points);
  const features = [];
  const mask = [];

  for (const point of points) {
    if (!point?.visible) {
      features.push(0, 0, 0);
      mask.push(false);
      continue;
    }

    features.push(
      (point.x - anchor.x) / scale,
      (point.y - anchor.y) / scale,
      (point.z - anchor.z) / scale,
    );
    mask.push(true);
  }

  return { features, mask };
}

function buildPointsFromFeatures(features = [], mask = []) {
  const points = [];
  for (let index = 0; index < TOTAL_LANDMARK_COUNT; index += 1) {
    const baseIndex = index * 3;
    points.push({
      x: Number(features[baseIndex] || 0),
      y: Number(features[baseIndex + 1] || 0),
      z: Number(features[baseIndex + 2] || 0),
      visible: Array.isArray(mask) ? Boolean(mask[index]) : true,
    });
  }
  return points;
}

function normalizeFeatureFrame(features = [], mask = []) {
  return normalizePoints(buildPointsFromFeatures(features, mask));
}

function normalizeSequence(frames = [], masks = []) {
  return frames.map((features, index) => normalizeFeatureFrame(features, masks[index] || []));
}

function frameDistance(frameA, frameB, indices = ALL_INDICES) {
  let totalDistance = 0;
  let totalVisible = 0;

  for (const landmarkIndex of indices) {
    if (!frameA?.mask?.[landmarkIndex] || !frameB?.mask?.[landmarkIndex]) continue;

    const baseIndex = landmarkIndex * 3;
    const deltaX = Number(frameA.features[baseIndex] || 0) - Number(frameB.features[baseIndex] || 0);
    const deltaY = Number(frameA.features[baseIndex + 1] || 0) - Number(frameB.features[baseIndex + 1] || 0);
    const deltaZ = Number(frameA.features[baseIndex + 2] || 0) - Number(frameB.features[baseIndex + 2] || 0);

    totalDistance += Math.sqrt((deltaX * deltaX) + (deltaY * deltaY) + (deltaZ * deltaZ));
    totalVisible += 1;
  }

  if (!totalVisible) return 2.5;
  return totalDistance / totalVisible;
}

function diffFrame(currentFrame, previousFrame) {
  const features = [];
  const mask = [];

  for (let landmarkIndex = 0; landmarkIndex < TOTAL_LANDMARK_COUNT; landmarkIndex += 1) {
    const visible = Boolean(currentFrame?.mask?.[landmarkIndex] && previousFrame?.mask?.[landmarkIndex]);
    mask.push(visible);
    const baseIndex = landmarkIndex * 3;

    if (!visible) {
      features.push(0, 0, 0);
      continue;
    }

    features.push(
      Number(currentFrame.features[baseIndex] || 0) - Number(previousFrame.features[baseIndex] || 0),
      Number(currentFrame.features[baseIndex + 1] || 0) - Number(previousFrame.features[baseIndex + 1] || 0),
      Number(currentFrame.features[baseIndex + 2] || 0) - Number(previousFrame.features[baseIndex + 2] || 0),
    );
  }

  return { features, mask };
}

function computeDtw(sequenceA, sequenceB, indices = ALL_INDICES) {
  if (!sequenceA.length || !sequenceB.length) {
    return { averageCost: 2.5, path: [] };
  }

  const rows = sequenceA.length;
  const columns = sequenceB.length;
  const costMatrix = Array.from({ length: rows }, () => Array.from({ length: columns }, () => Number.POSITIVE_INFINITY));

  costMatrix[0][0] = frameDistance(sequenceA[0], sequenceB[0], indices);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const distanceValue = frameDistance(sequenceA[row], sequenceB[column], indices);
      if (row === 0 && column === 0) {
        costMatrix[row][column] = distanceValue;
        continue;
      }

      const candidates = [
        row > 0 ? costMatrix[row - 1][column] : Number.POSITIVE_INFINITY,
        column > 0 ? costMatrix[row][column - 1] : Number.POSITIVE_INFINITY,
        row > 0 && column > 0 ? costMatrix[row - 1][column - 1] : Number.POSITIVE_INFINITY,
      ];

      costMatrix[row][column] = distanceValue + Math.min(...candidates);
    }
  }

  const path = [];
  let row = rows - 1;
  let column = columns - 1;
  while (row >= 0 && column >= 0) {
    path.push([row, column]);
    if (row === 0 && column === 0) break;

    const candidates = [
      { row: row - 1, column, cost: row > 0 ? costMatrix[row - 1][column] : Number.POSITIVE_INFINITY },
      { row, column: column - 1, cost: column > 0 ? costMatrix[row][column - 1] : Number.POSITIVE_INFINITY },
      { row: row - 1, column: column - 1, cost: row > 0 && column > 0 ? costMatrix[row - 1][column - 1] : Number.POSITIVE_INFINITY },
    ];

    const next = candidates.reduce((best, candidate) => (candidate.cost < best.cost ? candidate : best), candidates[0]);
    row = next.row;
    column = next.column;
  }

  path.reverse();

  return {
    averageCost: costMatrix[rows - 1][columns - 1] / Math.max(path.length, 1),
    path,
  };
}

function distanceToScore(distanceValue, multiplier = 40) {
  return round(clamp(100 - (Number(distanceValue || 0) * multiplier)));
}

function computeTrackingRatio(masks = [], indices = ALL_INDICES) {
  if (!masks.length) return 0;

  let visible = 0;
  for (const mask of masks) {
    for (const index of indices) {
      if (mask?.[index]) visible += 1;
    }
  }

  return round(visible / (masks.length * indices.length), 4);
}

function computeMotionScore(userSequence, referenceSequence, path, indices = ALL_INDICES) {
  if (path.length < 2) return 0;

  let totalDistance = 0;
  let comparisons = 0;

  for (let index = 1; index < path.length; index += 1) {
    const [userFrameIndex, referenceFrameIndex] = path[index];
    const [previousUserFrameIndex, previousReferenceFrameIndex] = path[index - 1];
    const userDelta = diffFrame(userSequence[userFrameIndex], userSequence[previousUserFrameIndex]);
    const referenceDelta = diffFrame(referenceSequence[referenceFrameIndex], referenceSequence[previousReferenceFrameIndex]);
    totalDistance += frameDistance(userDelta, referenceDelta, indices);
    comparisons += 1;
  }

  if (!comparisons) return 0;
  return distanceToScore(totalDistance / comparisons, 65);
}

function computeTimingScore(userFrameCount, referenceFrameCount) {
  if (!userFrameCount || !referenceFrameCount) return 0;
  const ratio = Math.min(userFrameCount, referenceFrameCount) / Math.max(userFrameCount, referenceFrameCount);
  return round(clamp(ratio * 100));
}

async function ensureLandmarker(modelUrl, wasmBaseUrl) {
  if (!state.HolisticLandmarker || !state.filesetResolver) {
    const module = await loadTasksVisionClassic();
    const FilesetResolver = module.FilesetResolver;
    state.HolisticLandmarker = module.HolisticLandmarker;
    state.filesetResolver = await FilesetResolver.forVisionTasks(wasmBaseUrl || TASKS_VISION_WASM_CDN);
  }

  if (state.landmarker) {
    state.landmarker.close?.();
  }

  state.landmarker = await state.HolisticLandmarker.createFromOptions(state.filesetResolver, {
    baseOptions: {
      modelAssetPath: modelUrl,
      delegate: 'CPU',
    },
    runningMode: 'VIDEO',
    outputFaceBlendshapes: false,
  });
}

function startCapture() {
  state.captureStartedAt = new Date().toISOString();
  state.capturedFrames = [];
  state.capturedMasks = [];
}

async function processFrame(bitmap, timestamp) {
  try {
    const detection = await state.landmarker.detectForVideo(bitmap, Math.round(Number(timestamp || performance.now())));
    const frame = extractFrame(detection);
    state.capturedFrames.push(frame.features);
    state.capturedMasks.push(frame.mask);
    self.postMessage({
      type: 'frameResult',
      payload: {
        frameCount: state.capturedFrames.length,
        trackingRatio: computeTrackingRatio([frame.mask]),
      },
    });
  } finally {
    safeCloseBitmap(bitmap);
  }
}

function finalizeCapture() {
  const referenceFrames = Array.isArray(state.reference?.sequence) ? state.reference.sequence : [];
  const referenceMasks = Array.isArray(state.reference?.mask) ? state.reference.mask : [];
  const userFrames = state.capturedFrames;
  const userMasks = state.capturedMasks;

  if (!userFrames.length) {
    throw new Error('Không thu được frame nào từ webcam.');
  }
  if (!referenceFrames.length) {
    throw new Error('Reference keypoints không có sequence.');
  }

  const normalizedUser = normalizeSequence(userFrames, userMasks);
  const normalizedReference = normalizeSequence(referenceFrames, referenceMasks);

  const overallDtw = computeDtw(normalizedUser, normalizedReference, ALL_INDICES);
  const handDtw = computeDtw(normalizedUser, normalizedReference, HAND_INDICES);
  const poseDtw = computeDtw(normalizedUser, normalizedReference, POSE_FACE_INDICES);
  const timingScore = computeTimingScore(userFrames.length, referenceFrames.length);
  const motionScore = computeMotionScore(normalizedUser, normalizedReference, overallDtw.path, ALL_INDICES);
  const speedScore = round((timingScore + motionScore) / 2);
  const trackingRatio = computeTrackingRatio(userMasks, ALL_INDICES);
  const handTrackingRatio = computeTrackingRatio(userMasks, HAND_INDICES);

  const scoreSummary = buildScoreSummary({
    componentScores: {
      dtw_score: distanceToScore(overallDtw.averageCost, 38),
      hand_score: distanceToScore(handDtw.averageCost, 36),
      pose_score: distanceToScore(poseDtw.averageCost, 42),
      timing_score: timingScore,
      motion_score: motionScore,
      speed_score: speedScore,
    },
    trackingRatio,
    handTrackingRatio,
    scoringConfig: state.scoringConfig,
  });

  return {
    signSlug: state.reference?.sign_slug || '',
    label: state.reference?.label || '',
    referenceVideo: state.reference?.reference_video || null,
    referenceVersion: state.reference?.version || null,
    frameCount: userFrames.length,
    trackingRatio: scoreSummary.trackingRatio,
    handTrackingRatio: scoreSummary.handTrackingRatio,
    finalScore: scoreSummary.finalScore,
    verdict: scoreSummary.verdict,
    missingHandPenalty: scoreSummary.missingHandPenalty,
    startedAt: state.captureStartedAt,
    completedAt: new Date().toISOString(),
    componentScores: scoreSummary.componentScores,
    keypointsPayload: {
      sign_slug: state.reference?.sign_slug || '',
      label: state.reference?.label || '',
      reference_video: state.reference?.reference_video || '',
      reference_version: state.reference?.version || '',
      frame_count: userFrames.length,
      sequence: userFrames,
      mask: userMasks,
    },
  };
}

function postError(error) {
  self.postMessage({
    type: 'error',
    message: error instanceof Error ? error.message : String(error),
  });
}

self.onmessage = async (event) => {
  const { type, payload, bitmap, timestamp } = event.data || {};

  try {
    if (type === 'init') {
      state.reference = payload?.reference || null;
      state.scoringConfig = payload?.scoringConfig || {};
      await ensureLandmarker(payload?.modelUrl, payload?.wasmBaseUrl);
      self.postMessage({ type: 'ready' });
      return;
    }

    if (!state.landmarker) {
      throw new Error('Worker chưa khởi tạo landmarker.');
    }

    if (type === 'captureStart') {
      startCapture();
      return;
    }

    if (type === 'frame') {
      await processFrame(bitmap, timestamp);
      return;
    }

    if (type === 'captureFinalize') {
      const result = finalizeCapture();
      self.postMessage({ type: 'captureResult', payload: result });
    }
  } catch (error) {
    safeCloseBitmap(bitmap);
    postError(error);
  }
};
