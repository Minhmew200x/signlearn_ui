function toEditableString(value) {
  return value === null || value === undefined ? "" : String(value);
}

function toOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("AI config number fields must be valid numbers.");
  }
  return parsed;
}

export function getAiConfigEndpoint(signSlug) {
  const normalizedSlug = String(signSlug || "").trim();
  if (!normalizedSlug) {
    throw new Error("Sign slug is required.");
  }
  return `/api/v1/ai/signs/${encodeURIComponent(normalizedSlug)}/config`;
}

export function createAiConfigDraft(config = {}) {
  return {
    signSlug: String(config.signSlug || "").trim(),
    algorithm: String(config.algorithm || "dtw-cosine"),
    handWeight: toEditableString(config.handWeight),
    poseWeight: toEditableString(config.poseWeight),
    speedWeight: toEditableString(config.speedWeight),
    missingHandPenalty: toEditableString(config.missingHandPenalty),
    excellentThreshold: toEditableString(config.excellentThreshold),
    goodThreshold: toEditableString(config.goodThreshold),
    passThreshold: toEditableString(config.passThreshold),
  };
}

export function normalizeAiConfigPatchPayload(draft = {}) {
  return {
    algorithm: String(draft.algorithm || "").trim() || null,
    handWeight: toOptionalNumber(draft.handWeight),
    poseWeight: toOptionalNumber(draft.poseWeight),
    speedWeight: toOptionalNumber(draft.speedWeight),
    missingHandPenalty: toOptionalNumber(draft.missingHandPenalty),
    excellentThreshold: toOptionalNumber(draft.excellentThreshold),
    goodThreshold: toOptionalNumber(draft.goodThreshold),
    passThreshold: toOptionalNumber(draft.passThreshold),
  };
}
