export function normalizeProgress(rawProgress, topicList, moocsMap) {
  const base = {};
  for (const topic of topicList) {
    const topicId = topic.id;
    const maxMooc = Math.max(1, (moocsMap[topicId] || []).length || 1);
    const source = rawProgress?.[topicId] || {};
    const unlockedMooc = Math.min(maxMooc, Math.max(1, Number(source.unlockedMooc || 1)));

    const bestScores = {};
    if (source.bestScores && typeof source.bestScores === "object") {
      for (const [key, value] of Object.entries(source.bestScores)) {
        const index = Number(key);
        if (!Number.isInteger(index) || index < 0 || index >= maxMooc) continue;
        bestScores[index] = Math.max(0, Math.min(100, Number(value || 0)));
      }
    }

    const completedMoocs = {};
    if (source.completedMoocs && typeof source.completedMoocs === "object") {
      for (const [key, value] of Object.entries(source.completedMoocs)) {
        const index = Number(key);
        if (!Number.isInteger(index) || index < 0 || index >= maxMooc) continue;
        completedMoocs[index] = Boolean(value);
      }
    }

    base[topicId] = { unlockedMooc, bestScores, completedMoocs };
  }
  return base;
}

export function updateProgressAfterScore(prev, { topicId, currentMoocs, selectedMoocIndex, score }) {
  const existing = prev[topicId] || { unlockedMooc: 1, bestScores: {}, completedMoocs: {} };
  const nextUnlocked = Math.min(currentMoocs.length, Math.max(Number(existing.unlockedMooc || 1), selectedMoocIndex + 2));

  return {
    ...prev,
    [topicId]: {
      ...existing,
      unlockedMooc: nextUnlocked,
      completedMoocs: {
        ...(existing.completedMoocs || {}),
        [selectedMoocIndex]: true,
      },
      bestScores: {
        ...existing.bestScores,
        [selectedMoocIndex]: Math.max(Number(existing.bestScores?.[selectedMoocIndex] || 0), score),
      },
    },
  };
}

export function updateProgressAfterConfirm(prev, { topicId, currentMoocs, selectedMoocIndex }) {
  const existing = prev[topicId] || { unlockedMooc: 1, bestScores: {}, completedMoocs: {} };
  const nextUnlocked = Math.min(currentMoocs.length, Math.max(Number(existing.unlockedMooc || 1), selectedMoocIndex + 2));

  return {
    ...prev,
    [topicId]: {
      ...existing,
      unlockedMooc: nextUnlocked,
      completedMoocs: {
        ...(existing.completedMoocs || {}),
        [selectedMoocIndex]: true,
      },
    },
  };
}
