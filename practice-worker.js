const TASKS_VISION_CJS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.cjs';
const TASKS_VISION_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const POSE_VISIBILITY_THRESHOLD = 0.15;

const POSE_INDICES = [0, 11, 12, 13, 14, 15, 16, 23, 24];
const FACE_INDICES = [33, 263, 70, 300, 61, 291, 13, 14, 152];
const LEFT_HAND_OFFSET = 18;
const RIGHT_HAND_OFFSET = 39;
const HAND_LANDMARK_COUNT = 21;
const TOTAL_LANDMARK_COUNT = 60;
const TOTAL_FEATURE_COUNT = TOTAL_LANDMARK_COUNT * 3;
const ALL_INDICES = Array.from({ length: TOTAL_LANDMARK_COUNT }, (_, index) => index);
const POSE_FACE_INDICES = Array.from({ length: 18 }, (_, index) => index);
const HAND_INDICES = Array.from({ length: 42 }, (_, index) => index + 18);
const FACE_SLICE = { start: POSE_INDICES.length, stop: POSE_INDICES.length + FACE_INDICES.length };
const LEFT_HAND_SLICE = { start: LEFT_HAND_OFFSET, stop: LEFT_HAND_OFFSET + HAND_LANDMARK_COUNT };
const RIGHT_HAND_SLICE = { start: RIGHT_HAND_OFFSET, stop: RIGHT_HAND_OFFSET + HAND_LANDMARK_COUNT };
const HAND_SLICE = { start: LEFT_HAND_SLICE.start, stop: RIGHT_HAND_SLICE.stop };
const FACIAL_INDICES = Array.from({ length: FACE_SLICE.stop - FACE_SLICE.start }, (_, index) => index + FACE_SLICE.start);
const HAND_SHAPE_INDICES = [
  ...Array.from({ length: LEFT_HAND_SLICE.stop - LEFT_HAND_SLICE.start - 1 }, (_, index) => LEFT_HAND_SLICE.start + index + 1),
  ...Array.from({ length: RIGHT_HAND_SLICE.stop - RIGHT_HAND_SLICE.start - 1 }, (_, index) => RIGHT_HAND_SLICE.start + index + 1),
];
const LEFT_HAND_TIPS = [4, 8, 12, 16, 20].map((index) => LEFT_HAND_SLICE.start + index);
const RIGHT_HAND_TIPS = [4, 8, 12, 16, 20].map((index) => RIGHT_HAND_SLICE.start + index);
const HAND_POSITION_INDICES = [1, 2, 3, 4, 5, 6, 0, ...LEFT_HAND_TIPS, ...RIGHT_HAND_TIPS];
const SCORE_WEIGHTS = {
  facial_expression: 0.12,
  hand_shape: 0.28,
  hand_position: 0.22,
  motion: 0.2,
  timing: 0.1,
  visibility: 0.08,
};

function createLandmarkWeights() {
  const weights = Array(TOTAL_LANDMARK_COUNT).fill(1);

  for (let index = 0; index < POSE_INDICES.length; index += 1) weights[index] = 1.2;
  for (const index of FACIAL_INDICES) weights[index] = 0.8;
  for (const index of HAND_INDICES) weights[index] = 2.1;

  for (const start of [LEFT_HAND_SLICE.start, RIGHT_HAND_SLICE.start]) {
    weights[start] = 2.6;
    for (const index of [5, 9, 13, 17]) weights[start + index] = 2.3;
    for (const index of [6, 10, 14, 18]) weights[start + index] = 2.4;
    for (const index of [7, 11, 15, 19]) weights[start + index] = 2.5;
    for (const index of [4, 8, 12, 16, 20]) weights[start + index] = 2.9;
  }

  weights[5] = 2.0;
  weights[6] = 2.0;
  return weights.map((value) => Math.fround(value));
}

const LANDMARK_WEIGHTS = createLandmarkWeights();

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

function f32(value) {
  return Math.fround(Number(value || 0));
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

function unwrapLandmarks(source) {
  if (!Array.isArray(source) || !source.length) {
    return [];
  }
  return Array.isArray(source[0]) ? source[0] : source;
}

function isLandmarkVisible(point, { respectVisibility = true } = {}) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  if (!respectVisibility) return true;

  const visibility = Number.isFinite(point.visibility) ? point.visibility : 1;
  const presence = Number.isFinite(point.presence) ? point.presence : 1;
  return visibility >= POSE_VISIBILITY_THRESHOLD && presence >= POSE_VISIBILITY_THRESHOLD;
}

function pickPoint(points, index, options) {
  const point = Array.isArray(points) ? points[index] : null;
  if (!isLandmarkVisible(point, options)) {
    return { x: 0, y: 0, z: 0, visible: false };
  }

  return {
    x: Number(point.x || 0),
    y: Number(point.y || 0),
    z: Number(point.z || 0),
    visible: true,
  };
}

function collectPoints(points, indices, options) {
  return indices.map((index) => pickPoint(points, index, options));
}

function extractFrame(result) {
  const posePoints = collectPoints(unwrapLandmarks(result?.poseLandmarks), POSE_INDICES, { respectVisibility: true });
  const facePoints = collectPoints(unwrapLandmarks(result?.faceLandmarks), FACE_INDICES, { respectVisibility: false });
  const leftHandPoints = collectPoints(unwrapLandmarks(result?.leftHandLandmarks), Array.from({ length: HAND_LANDMARK_COUNT }, (_, index) => index), { respectVisibility: false });
  const rightHandPoints = collectPoints(unwrapLandmarks(result?.rightHandLandmarks), Array.from({ length: HAND_LANDMARK_COUNT }, (_, index) => index), { respectVisibility: false });
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

function meanPoint(points) {
  if (!points.length) return { x: 0, y: 0, z: 0 };

  const total = points.reduce((accumulator, point) => ({
    x: accumulator.x + point.x,
    y: accumulator.y + point.y,
    z: accumulator.z + point.z,
  }), { x: 0, y: 0, z: 0 });

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function distance2D(a, b) {
  return Math.sqrt(
    ((a.x || 0) - (b.x || 0)) ** 2
    + ((a.y || 0) - (b.y || 0)) ** 2,
  );
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

  if (leftShoulder?.visible && rightShoulder?.visible) {
    return midpoint(leftShoulder, rightShoulder);
  }

  const torsoCandidates = [points[1], points[2], points[7], points[8]].filter((point) => point?.visible);
  if (torsoCandidates.length) {
    return meanPoint(torsoCandidates);
  }

  return getVisibleCenter(points);
}

function getScale(points) {
  const leftShoulder = points[1];
  const rightShoulder = points[2];

  if (leftShoulder?.visible && rightShoulder?.visible) {
    return Math.max(distance2D(leftShoulder, rightShoulder), 1e-4);
  }

  const torsoCandidates = [points[1], points[2], points[7], points[8]].filter((point) => point?.visible);
  if (torsoCandidates.length >= 2) {
    const xs = torsoCandidates.map((point) => point.x);
    const ys = torsoCandidates.map((point) => point.y);
    const torsoScale = Math.sqrt(
      (Math.max(...xs) - Math.min(...xs)) ** 2
      + (Math.max(...ys) - Math.min(...ys)) ** 2,
    );
    if (torsoScale >= 1e-4) {
      return torsoScale;
    }
  }

  const visiblePoints = points.filter((point) => point?.visible);
  if (!visiblePoints.length) {
    return 1;
  }

  const center = meanPoint(visiblePoints);
  const averageDistance = visiblePoints.reduce((sum, point) => sum + distance2D(point, center), 0) / visiblePoints.length;
  return Math.max(averageDistance, 1e-4);
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

function sequenceToMatrices(sequence = []) {
  return sequence.map((frame) => {
    const matrix = Array.from({ length: TOTAL_LANDMARK_COUNT }, () => [0, 0, 0]);
    for (let landmarkIndex = 0; landmarkIndex < TOTAL_LANDMARK_COUNT; landmarkIndex += 1) {
      const baseIndex = landmarkIndex * 3;
      matrix[landmarkIndex][0] = f32(frame?.[baseIndex]);
      matrix[landmarkIndex][1] = f32(frame?.[baseIndex + 1]);
      matrix[landmarkIndex][2] = f32(frame?.[baseIndex + 2]);
    }
    return matrix;
  });
}

function matricesToSequence(matrices = []) {
  return matrices.map((matrix) => {
    const frame = Array(TOTAL_FEATURE_COUNT).fill(0);
    for (let landmarkIndex = 0; landmarkIndex < TOTAL_LANDMARK_COUNT; landmarkIndex += 1) {
      const baseIndex = landmarkIndex * 3;
      frame[baseIndex] = f32(matrix?.[landmarkIndex]?.[0]);
      frame[baseIndex + 1] = f32(matrix?.[landmarkIndex]?.[1]);
      frame[baseIndex + 2] = f32(matrix?.[landmarkIndex]?.[2]);
    }
    return frame;
  });
}

function cloneMaskSequence(maskSequence = [], frameCount = 0) {
  if (!Array.isArray(maskSequence) || !maskSequence.length) {
    return Array.from({ length: frameCount }, () => Array(TOTAL_LANDMARK_COUNT).fill(true));
  }
  return maskSequence.map((frameMask) => Array.from({ length: TOTAL_LANDMARK_COUNT }, (_value, index) => Boolean(frameMask?.[index])));
}

function estimateAnchorFromMatrix(points, valid) {
  if (valid[1] && valid[2]) {
    return [
      (points[1][0] + points[2][0]) / 2,
      (points[1][1] + points[2][1]) / 2,
      (points[1][2] + points[2][2]) / 2,
    ];
  }

  const torsoCandidates = [1, 2, 7, 8].filter((index) => valid[index]);
  if (torsoCandidates.length) {
    const total = [0, 0, 0];
    for (const index of torsoCandidates) {
      total[0] += points[index][0];
      total[1] += points[index][1];
      total[2] += points[index][2];
    }
    return total.map((value) => f32(value / torsoCandidates.length));
  }

  const total = [0, 0, 0];
  let count = 0;
  for (let index = 0; index < TOTAL_LANDMARK_COUNT; index += 1) {
    if (!valid[index]) continue;
    total[0] += points[index][0];
    total[1] += points[index][1];
    total[2] += points[index][2];
    count += 1;
  }
  return count ? total.map((value) => f32(value / count)) : [0, 0, 0];
}

function estimateScaleFromMatrix(points, valid, minScale = 1e-4) {
  if (valid[1] && valid[2]) {
    const scale = Math.hypot(points[2][0] - points[1][0], points[2][1] - points[1][1]);
    if (scale >= minScale) return f32(scale);
  }

  const torsoCandidates = [1, 2, 7, 8].filter((index) => valid[index]);
  if (torsoCandidates.length >= 2) {
    const xs = torsoCandidates.map((index) => points[index][0]);
    const ys = torsoCandidates.map((index) => points[index][1]);
    const scale = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (scale >= minScale) return f32(scale);
  }

  const visiblePoints = [];
  for (let index = 0; index < TOTAL_LANDMARK_COUNT; index += 1) {
    if (valid[index]) visiblePoints.push(points[index]);
  }
  if (!visiblePoints.length) return 1;

  const center = visiblePoints.reduce((accumulator, point) => [
    accumulator[0] + point[0],
    accumulator[1] + point[1],
    accumulator[2] + point[2],
  ], [0, 0, 0]).map((value) => value / visiblePoints.length);

  const averageDistance = visiblePoints.reduce(
    (sum, point) => sum + Math.hypot(point[0] - center[0], point[1] - center[1]),
    0,
  ) / visiblePoints.length;
  return f32(Math.max(averageDistance, minScale));
}

function normalizeMatrixFrame(points, valid, minScale = 1e-4) {
  if (!valid.some(Boolean)) {
    return {
      matrix: Array.from({ length: TOTAL_LANDMARK_COUNT }, () => [0, 0, 0]),
      scale: 1,
    };
  }

  const anchor = estimateAnchorFromMatrix(points, valid);
  const scale = estimateScaleFromMatrix(points, valid, minScale);
  const matrix = points.map((point, index) => {
    if (!valid[index]) return [0, 0, 0];
    return [
      f32((point[0] - anchor[0]) / scale),
      f32((point[1] - anchor[1]) / scale),
      f32((point[2] - anchor[2]) / scale),
    ];
  });

  return { matrix, scale };
}

function interpolateTrack(track, visible) {
  const knownIndices = [];
  for (let index = 0; index < visible.length; index += 1) {
    if (visible[index]) knownIndices.push(index);
  }
  if (!knownIndices.length) return track.slice();

  const out = track.slice();
  const firstKnown = knownIndices[0];
  const lastKnown = knownIndices[knownIndices.length - 1];

  for (let index = 0; index < out.length; index += 1) {
    if (visible[index]) continue;
    if (index <= firstKnown) {
      out[index] = out[firstKnown];
      continue;
    }
    if (index >= lastKnown) {
      out[index] = out[lastKnown];
      continue;
    }

    let left = firstKnown;
    let right = lastKnown;
    for (let knownIndex = 0; knownIndex < knownIndices.length - 1; knownIndex += 1) {
      const start = knownIndices[knownIndex];
      const stop = knownIndices[knownIndex + 1];
      if (index > start && index < stop) {
        left = start;
        right = stop;
        break;
      }
    }

    const ratio = (index - left) / Math.max(right - left, 1);
    out[index] = f32(out[left] + ((out[right] - out[left]) * ratio));
  }

  return out;
}

function fillMissingLandmarks(matrices, maskSequence, strategy = 'interpolate') {
  if (matrices.length < 2) return matrices.map((frame) => frame.map((point) => point.slice()));

  const filled = matrices.map((frame) => frame.map((point) => point.slice()));

  for (let landmarkIndex = 0; landmarkIndex < TOTAL_LANDMARK_COUNT; landmarkIndex += 1) {
    const visible = maskSequence.map((frameMask) => Boolean(frameMask?.[landmarkIndex]));
    if (!visible.some(Boolean)) continue;

    for (let axis = 0; axis < 3; axis += 1) {
      const track = filled.map((frame) => frame[landmarkIndex][axis]);
      let nextTrack;
      if (strategy === 'interpolate') {
        nextTrack = interpolateTrack(track, visible);
      } else if (strategy === 'ffill') {
        nextTrack = track.slice();
        let last = nextTrack[visible.indexOf(true)];
        for (let frameIndex = 0; frameIndex < nextTrack.length; frameIndex += 1) {
          if (visible[frameIndex]) {
            last = nextTrack[frameIndex];
          } else {
            nextTrack[frameIndex] = last;
          }
        }
      } else {
        throw new Error(`Unsupported fill strategy: ${strategy}`);
      }

      for (let frameIndex = 0; frameIndex < filled.length; frameIndex += 1) {
        filled[frameIndex][landmarkIndex][axis] = nextTrack[frameIndex];
      }
    }
  }

  return filled;
}

function normalizeSequence(frames = [], masks = [], options = {}) {
  const fillStrategy = options.fillStrategy || 'interpolate';
  const minScale = Number(options.minScale || 1e-4);

  if (!Array.isArray(frames) || !frames.length) {
    return {
      sequence: [],
      mask: [],
      scales: [],
      trackingRatio: [],
    };
  }

  const frameMask = cloneMaskSequence(masks, frames.length);
  const matrices = sequenceToMatrices(frames);
  let normalizedMatrices = [];
  const scales = [];

  for (let frameIndex = 0; frameIndex < matrices.length; frameIndex += 1) {
    const { matrix, scale } = normalizeMatrixFrame(matrices[frameIndex], frameMask[frameIndex], minScale);
    normalizedMatrices.push(matrix);
    scales.push(f32(scale));
  }

  if (fillStrategy && fillStrategy !== 'none') {
    normalizedMatrices = fillMissingLandmarks(normalizedMatrices, frameMask, fillStrategy);
  }

  return {
    sequence: matricesToSequence(normalizedMatrices),
    mask: frameMask,
    scales,
    trackingRatio: frameMask.map((frameMaskRow) => f32(frameMaskRow.filter(Boolean).length / TOTAL_LANDMARK_COUNT)),
  };
}

function frameToMatrix(frame, landmarkCount) {
  if (Array.isArray(frame?.[0])) return frame;
  const count = landmarkCount || Math.max(0, Math.floor((frame?.length || 0) / 3));
  return Array.from({ length: count }, (_value, index) => {
    const baseIndex = index * 3;
    return [
      f32(frame?.[baseIndex]),
      f32(frame?.[baseIndex + 1]),
      f32(frame?.[baseIndex + 2]),
    ];
  });
}

function frameDistance(
  refFrame,
  userFrame,
  refMask,
  userMask,
  { weights = LANDMARK_WEIGHTS, metric = 'euclidean', missingPenalty = 1.5 } = {},
) {
  const refVisible = Array.isArray(refMask) ? refMask.map(Boolean) : [];
  const userVisible = Array.isArray(userMask) ? userMask.map(Boolean) : [];
  const landmarkCount = Math.min(refVisible.length, userVisible.length, weights.length || 0);
  if (!landmarkCount) return missingPenalty;

  const refPoints = frameToMatrix(refFrame, landmarkCount);
  const userPoints = frameToMatrix(userFrame, landmarkCount);
  let weightedDistance = 0;
  let weightTotal = 0;
  let validCount = 0;

  for (let index = 0; index < landmarkCount; index += 1) {
    if (!refVisible[index] || !userVisible[index]) continue;
    const refPoint = refPoints[index] || [0, 0, 0];
    const userPoint = userPoints[index] || [0, 0, 0];

    let distanceValue;
    if (metric === 'euclidean') {
      distanceValue = Math.hypot(
        refPoint[0] - userPoint[0],
        refPoint[1] - userPoint[1],
        refPoint[2] - userPoint[2],
      );
    } else if (metric === 'cosine') {
      const dot = (refPoint[0] * userPoint[0]) + (refPoint[1] * userPoint[1]) + (refPoint[2] * userPoint[2]);
      const refNorm = Math.hypot(refPoint[0], refPoint[1], refPoint[2]);
      const userNorm = Math.hypot(userPoint[0], userPoint[1], userPoint[2]);
      const cosine = dot / Math.max(refNorm * userNorm, 1e-6);
      distanceValue = 0.5 * (1 - clamp(cosine, -1, 1));
    } else {
      throw new Error(`Unsupported metric: ${metric}`);
    }

    const weight = Number(weights[index] || 0);
    weightedDistance = f32(weightedDistance + f32(distanceValue * weight));
    weightTotal = f32(weightTotal + weight);
    validCount += 1;
  }

  if (!validCount) return missingPenalty;
  const weighted = f32(weightedDistance / Math.max(weightTotal, 1e-6));
  const missingRatio = f32(1 - (validCount / landmarkCount));
  return f32(weighted + f32(missingRatio * 0.35));
}

function distanceToScore(distanceValue, sharpness = 1.5) {
  const distance = Math.max(Number(distanceValue || 0), 0);
  return f32(clamp(100 * Math.exp(-sharpness * distance)));
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

function computeCostAndBackpointers(
  referenceSequence,
  userSequence,
  referenceMask,
  userMask,
  weights,
  { metric = 'euclidean', windowRatio = 0.2, missingPenalty = 1.5 } = {},
) {
  const referenceCount = referenceSequence.length;
  const userCount = userSequence.length;
  const window = Math.max(
    Math.abs(referenceCount - userCount),
    Math.floor(Math.max(referenceCount, userCount) * Math.max(windowRatio, 0)),
  );
  const cost = Array.from({ length: referenceCount + 1 }, () => Array(userCount + 1).fill(Number.POSITIVE_INFINITY));
  const back = Array.from({ length: referenceCount + 1 }, () => Array(userCount + 1).fill(-1));
  cost[0][0] = 0;

  for (let referenceIndex = 1; referenceIndex <= referenceCount; referenceIndex += 1) {
    const userStart = Math.max(1, referenceIndex - window);
    const userEnd = Math.min(userCount, referenceIndex + window);

    for (let userIndex = userStart; userIndex <= userEnd; userIndex += 1) {
      const dist = frameDistance(
        referenceSequence[referenceIndex - 1],
        userSequence[userIndex - 1],
        referenceMask[referenceIndex - 1],
        userMask[userIndex - 1],
        { weights, metric, missingPenalty },
      );
      const candidates = [
        cost[referenceIndex - 1][userIndex - 1],
        cost[referenceIndex - 1][userIndex],
        cost[referenceIndex][userIndex - 1],
      ];
      let bestStep = 0;
      for (let candidateIndex = 1; candidateIndex < candidates.length; candidateIndex += 1) {
        if (candidates[candidateIndex] < candidates[bestStep]) bestStep = candidateIndex;
      }
      cost[referenceIndex][userIndex] = f32(dist + candidates[bestStep]);
      back[referenceIndex][userIndex] = bestStep;
    }
  }

  return { cost, back };
}

function backtrackPath(back, referenceCount, userCount) {
  const path = [];
  let referenceIndex = referenceCount;
  let userIndex = userCount;

  while (referenceIndex > 0 && userIndex > 0) {
    path.push([referenceIndex - 1, userIndex - 1]);
    const step = back[referenceIndex]?.[userIndex];
    if (step === 0) {
      referenceIndex -= 1;
      userIndex -= 1;
    } else if (step === 1) {
      referenceIndex -= 1;
    } else if (step === 2) {
      userIndex -= 1;
    } else {
      break;
    }
  }

  path.reverse();
  return path;
}

function dtwMatch(
  referenceSequence,
  userSequence,
  referenceMask,
  userMask,
  { metric = 'euclidean', weights = LANDMARK_WEIGHTS, windowRatio = 0.2, missingPenalty = 1.5 } = {},
) {
  if (!referenceSequence.length || !userSequence.length) {
    return {
      dtwDistance: Number.POSITIVE_INFINITY,
      normalizedDistance: Number.POSITIVE_INFINITY,
      score: 0,
      alignmentPath: [],
    };
  }

  let { cost, back } = computeCostAndBackpointers(
    referenceSequence,
    userSequence,
    referenceMask,
    userMask,
    weights,
    { metric, windowRatio, missingPenalty },
  );

  if (!Number.isFinite(cost[referenceSequence.length][userSequence.length])) {
    ({ cost, back } = computeCostAndBackpointers(
      referenceSequence,
      userSequence,
      referenceMask,
      userMask,
      weights,
      { metric, windowRatio: 1, missingPenalty },
    ));
  }

  const alignmentPath = backtrackPath(back, referenceSequence.length, userSequence.length);
  const dtwDistance = f32(cost[referenceSequence.length][userSequence.length] || 0);
  const normalizedDistance = f32(dtwDistance / Math.max(alignmentPath.length, 1));

  return {
    dtwDistance,
    normalizedDistance,
    score: distanceToScore(normalizedDistance, 1.1),
    alignmentPath,
  };
}

function alignByPath(referenceSequence, userSequence, referenceMask, userMask, path) {
  if (!path.length) {
    return {
      refSeq: [],
      userSeq: [],
      refMask: [],
      userMask: [],
    };
  }

  return {
    refSeq: path.map(([referenceIndex]) => referenceSequence[referenceIndex]),
    userSeq: path.map(([_referenceIndex, userIndex]) => userSequence[userIndex]),
    refMask: path.map(([referenceIndex]) => referenceMask[referenceIndex]),
    userMask: path.map(([_referenceIndex, userIndex]) => userMask[userIndex]),
  };
}

function handLocalNormalize(sequence, mask) {
  const matrices = sequenceToMatrices(sequence);

  for (let frameIndex = 0; frameIndex < matrices.length; frameIndex += 1) {
    for (const handSlice of [LEFT_HAND_SLICE, RIGHT_HAND_SLICE]) {
      const handMask = mask[frameIndex].slice(handSlice.start, handSlice.stop);
      if (!handMask.some(Boolean)) continue;

      const wrist = matrices[frameIndex][handSlice.start].slice();
      const spans = [];
      for (let landmarkIndex = handSlice.start; landmarkIndex < handSlice.stop; landmarkIndex += 1) {
        if (!mask[frameIndex][landmarkIndex]) continue;
        const point = matrices[frameIndex][landmarkIndex];
        const span = f32(Math.hypot(point[0] - wrist[0], point[1] - wrist[1], point[2] - wrist[2]));
        if (span > 1e-6) spans.push(span);
      }

      let scale = spans.length ? f32(spans.reduce((sum, value) => sum + value, 0) / spans.length) : 1;
      if (scale < 1e-6) scale = 1;

      for (let landmarkIndex = handSlice.start; landmarkIndex < handSlice.stop; landmarkIndex += 1) {
        if (!mask[frameIndex][landmarkIndex]) {
          matrices[frameIndex][landmarkIndex] = [0, 0, 0];
          continue;
        }

        const point = matrices[frameIndex][landmarkIndex];
        matrices[frameIndex][landmarkIndex] = [
          f32((point[0] - wrist[0]) / scale),
          f32((point[1] - wrist[1]) / scale),
          f32((point[2] - wrist[2]) / scale),
        ];
      }
    }
  }

  return matricesToSequence(matrices);
}

function componentScore(referenceSequence, userSequence, referenceMask, userMask, landmarkIndices, { metric, sharpness }) {
  if (!referenceSequence.length) return 0;

  const subsetWeights = landmarkIndices.map((index) => LANDMARK_WEIGHTS[index]);
  const distances = [];

  for (let frameIndex = 0; frameIndex < referenceSequence.length; frameIndex += 1) {
    const refMatrix = frameToMatrix(referenceSequence[frameIndex], TOTAL_LANDMARK_COUNT);
    const userMatrix = frameToMatrix(userSequence[frameIndex], TOTAL_LANDMARK_COUNT);
    const refFlat = [];
    const userFlat = [];
    const refMaskSubset = [];
    const userMaskSubset = [];

    for (const landmarkIndex of landmarkIndices) {
      refFlat.push(...refMatrix[landmarkIndex]);
      userFlat.push(...userMatrix[landmarkIndex]);
      refMaskSubset.push(Boolean(referenceMask[frameIndex]?.[landmarkIndex]));
      userMaskSubset.push(Boolean(userMask[frameIndex]?.[landmarkIndex]));
    }

    distances.push(frameDistance(refFlat, userFlat, refMaskSubset, userMaskSubset, {
      metric,
      weights: subsetWeights,
      missingPenalty: 1.2,
    }));
  }

  const meanDistance = distances.length ? f32(distances.reduce((sum, value) => sum + value, 0) / distances.length) : 1;
  return distanceToScore(meanDistance, sharpness);
}

function centroidTrack(handPoints, handMask) {
  const out = Array.from({ length: handPoints.length }, () => [0, 0, 0]);

  for (let frameIndex = 0; frameIndex < handPoints.length; frameIndex += 1) {
    const validIndices = [];
    for (let landmarkIndex = 0; landmarkIndex < handMask[frameIndex].length; landmarkIndex += 1) {
      if (handMask[frameIndex][landmarkIndex]) validIndices.push(landmarkIndex);
    }

    if (validIndices.length) {
      const total = [0, 0, 0];
      for (const landmarkIndex of validIndices) {
        total[0] += handPoints[frameIndex][landmarkIndex][0];
        total[1] += handPoints[frameIndex][landmarkIndex][1];
        total[2] += handPoints[frameIndex][landmarkIndex][2];
      }
      out[frameIndex] = total.map((value) => f32(value / validIndices.length));
    } else if (frameIndex > 0) {
      out[frameIndex] = out[frameIndex - 1].slice();
    }
  }

  return out;
}

function motionScore(referenceSequence, userSequence, referenceMask, userMask) {
  const refMatrices = sequenceToMatrices(referenceSequence);
  const userMatrices = sequenceToMatrices(userSequence);
  if (refMatrices.length < 2 || userMatrices.length < 2) return 0;

  const refHand = refMatrices.map((frame) => frame.slice(HAND_SLICE.start, HAND_SLICE.stop));
  const userHand = userMatrices.map((frame) => frame.slice(HAND_SLICE.start, HAND_SLICE.stop));
  const refHandMask = referenceMask.map((frameMask) => frameMask.slice(HAND_SLICE.start, HAND_SLICE.stop));
  const userHandMask = userMask.map((frameMask) => frameMask.slice(HAND_SLICE.start, HAND_SLICE.stop));
  const refCentroid = centroidTrack(refHand, refHandMask);
  const userCentroid = centroidTrack(userHand, userHandMask);
  const length = Math.min(refCentroid.length - 1, userCentroid.length - 1);
  if (length <= 0) return 0;

  let deltaSum = 0;
  for (let index = 0; index < length; index += 1) {
    const refVelocity = [
      refCentroid[index + 1][0] - refCentroid[index][0],
      refCentroid[index + 1][1] - refCentroid[index][1],
      refCentroid[index + 1][2] - refCentroid[index][2],
    ];
    const userVelocity = [
      userCentroid[index + 1][0] - userCentroid[index][0],
      userCentroid[index + 1][1] - userCentroid[index][1],
      userCentroid[index + 1][2] - userCentroid[index][2],
    ];
    deltaSum = f32(deltaSum + Math.hypot(
      refVelocity[0] - userVelocity[0],
      refVelocity[1] - userVelocity[1],
      refVelocity[2] - userVelocity[2],
    ));
  }

  return distanceToScore(deltaSum / length, 1.4);
}

function alignmentSpeedRatio(path, referenceCount, userCount) {
  if (!path.length || referenceCount <= 0) return 1;
  const rawRatio = userCount / referenceCount;
  const pathRatio = path.length / Math.max(referenceCount, userCount);
  return f32(Math.max(rawRatio * pathRatio, 1e-6));
}

function timingScore({ dtwScore, path, referenceCount, userCount }) {
  if (!path.length) return 0;
  const speedRatio = alignmentSpeedRatio(path, referenceCount, userCount);
  const speedPenalty = Math.abs(Math.log(speedRatio));
  const adjustedPenalty = Math.max(speedPenalty - 0.35, 0);
  return f32(clamp(dtwScore - (adjustedPenalty * 40)));
}

function meanMask(maskSequence, rangeOrIndices) {
  if (!maskSequence.length) return 0;
  const indices = Array.isArray(rangeOrIndices)
    ? rangeOrIndices
    : Array.from({ length: Math.max(rangeOrIndices.stop - rangeOrIndices.start, 0) }, (_value, index) => rangeOrIndices.start + index);

  if (!indices.length) return 0;

  let visible = 0;
  let total = 0;
  for (const frameMask of maskSequence) {
    for (const index of indices) {
      visible += frameMask[index] ? 1 : 0;
      total += 1;
    }
  }
  return total ? f32(visible / total) : 0;
}

function mirrorSequenceHorizontally(frames = [], masks = []) {
  return frames.map((frame = [], frameIndex) => {
    const nextFrame = [...frame];
    const frameMask = masks[frameIndex] || [];

    for (let landmarkIndex = 0; landmarkIndex < TOTAL_LANDMARK_COUNT; landmarkIndex += 1) {
      if (!frameMask[landmarkIndex]) continue;
      const baseIndex = landmarkIndex * 3;
      nextFrame[baseIndex] = f32(1 - Number(frame[baseIndex] || 0));
    }

    return nextFrame;
  });
}

function scoreCaptureOrientation(reference, userFrames, userMasks, scoringConfig = {}) {
  const referenceFrames = Array.isArray(reference?.sequence) ? reference.sequence : [];
  const referenceMasks = Array.isArray(reference?.mask) ? reference.mask : [];

  const referenceNormalized = normalizeSequence(referenceFrames, referenceMasks);
  const userNormalized = normalizeSequence(userFrames, userMasks);
  const dtw = dtwMatch(
    referenceNormalized.sequence,
    userNormalized.sequence,
    referenceNormalized.mask,
    userNormalized.mask,
    { metric: 'euclidean', weights: LANDMARK_WEIGHTS, windowRatio: 0.2, missingPenalty: 1.5 },
  );
  const aligned = alignByPath(
    referenceNormalized.sequence,
    userNormalized.sequence,
    referenceNormalized.mask,
    userNormalized.mask,
    dtw.alignmentPath,
  );

  if (!aligned.refSeq.length) {
    return {
      signSlug: reference?.sign_slug || '',
      label: reference?.label || '',
      referenceVideo: reference?.reference_video || null,
      referenceVersion: reference?.version || null,
      frameCount: userFrames.length,
      trackingRatio: 0,
      handTrackingRatio: 0,
      finalScore: 0,
      verdict: getVerdict(0, scoringConfig),
      missingHandPenalty: 0,
      componentScores: {
        dtw_score: 0,
        face_score: 0,
        facial_expression_score: 0,
        hand_score: 0,
        hand_shape_score: 0,
        pose_score: 0,
        hand_position_score: 0,
        motion_score: 0,
        timing_score: 0,
        visibility_score: 0,
      },
      dtwDistance: dtw.dtwDistance,
      dtwNormalizedDistance: dtw.normalizedDistance,
      leftHandVisibility: 0,
      rightHandVisibility: 0,
      alignmentPath: [],
    };
  }

  const facialExpressionScore = componentScore(
    aligned.refSeq,
    aligned.userSeq,
    aligned.refMask,
    aligned.userMask,
    FACIAL_INDICES,
    { metric: 'cosine', sharpness: 1.8 },
  );
  const referenceLocal = handLocalNormalize(aligned.refSeq, aligned.refMask);
  const userLocal = handLocalNormalize(aligned.userSeq, aligned.userMask);
  const handShapeScore = componentScore(
    referenceLocal,
    userLocal,
    aligned.refMask,
    aligned.userMask,
    HAND_SHAPE_INDICES,
    { metric: 'euclidean', sharpness: 1.5 },
  );
  const handPositionScore = componentScore(
    aligned.refSeq,
    aligned.userSeq,
    aligned.refMask,
    aligned.userMask,
    HAND_POSITION_INDICES,
    { metric: 'euclidean', sharpness: 1.3 },
  );
  const motion = motionScore(aligned.refSeq, aligned.userSeq, aligned.refMask, aligned.userMask);
  const timing = timingScore({
    dtwScore: dtw.score,
    path: dtw.alignmentPath,
    referenceCount: referenceNormalized.sequence.length,
    userCount: userNormalized.sequence.length,
  });
  const leftHandVisibility = meanMask(userNormalized.mask, LEFT_HAND_SLICE);
  const rightHandVisibility = meanMask(userNormalized.mask, RIGHT_HAND_SLICE);
  const overallVisibility = meanMask(userNormalized.mask, ALL_INDICES);
  const visibilityScore = f32(clamp(100 * ((0.5 * overallVisibility) + (0.25 * leftHandVisibility) + (0.25 * rightHandVisibility))));
  const finalScore = f32(clamp(
    (SCORE_WEIGHTS.facial_expression * facialExpressionScore)
    + (SCORE_WEIGHTS.hand_shape * handShapeScore)
    + (SCORE_WEIGHTS.hand_position * handPositionScore)
    + (SCORE_WEIGHTS.motion * motion)
    + (SCORE_WEIGHTS.timing * timing)
    + (SCORE_WEIGHTS.visibility * visibilityScore),
  ));
  const trackingRatio = userNormalized.trackingRatio.length
    ? f32(userNormalized.trackingRatio.reduce((sum, value) => sum + value, 0) / userNormalized.trackingRatio.length)
    : 0;
  const handTrackingRatio = meanMask(userNormalized.mask, HAND_INDICES);

  return {
    signSlug: reference?.sign_slug || '',
    label: reference?.label || '',
    referenceVideo: reference?.reference_video || null,
    referenceVersion: reference?.version || null,
    frameCount: userFrames.length,
    trackingRatio,
    handTrackingRatio,
    finalScore,
    verdict: getVerdict(finalScore, scoringConfig),
    missingHandPenalty: 0,
    componentScores: {
      dtw_score: dtw.score,
      face_score: facialExpressionScore,
      facial_expression_score: facialExpressionScore,
      hand_score: handShapeScore,
      hand_shape_score: handShapeScore,
      pose_score: handPositionScore,
      hand_position_score: handPositionScore,
      motion_score: motion,
      timing_score: timing,
      visibility_score: visibilityScore,
    },
    dtwDistance: dtw.dtwDistance,
    dtwNormalizedDistance: dtw.normalizedDistance,
    leftHandVisibility,
    rightHandVisibility,
    alignmentPath: dtw.alignmentPath,
  };
}

function scoreCapture(reference, userFrames, userMasks, scoringConfig = {}) {
  const referenceFrames = Array.isArray(reference?.sequence) ? reference.sequence : [];

  if (!userFrames.length) {
    throw new Error('Không thu được frame nào từ webcam.');
  }
  if (!referenceFrames.length) {
    throw new Error('Reference keypoints không có sequence.');
  }

  const directResult = scoreCaptureOrientation(reference, userFrames, userMasks, scoringConfig);
  const mirroredResult = scoreCaptureOrientation(
    reference,
    mirrorSequenceHorizontally(userFrames, userMasks),
    userMasks,
    scoringConfig,
  );

  if (mirroredResult.finalScore > directResult.finalScore) {
    return mirroredResult;
  }

  if (
    mirroredResult.finalScore === directResult.finalScore
    && mirroredResult.componentScores.dtw_score > directResult.componentScores.dtw_score
  ) {
    return mirroredResult;
  }

  return directResult;
}
function finalizeCapture() {
  const userFrames = state.capturedFrames;
  const userMasks = state.capturedMasks;
  const result = scoreCapture(state.reference, userFrames, userMasks, state.scoringConfig || {});

  return {
    ...result,
    startedAt: state.captureStartedAt,
    completedAt: new Date().toISOString(),
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
