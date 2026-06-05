function normalizeSlug(value) {
  const slug = String(value || '').trim();
  return slug || null;
}

function getPreferredLabel(item, fallbackSlug) {
  const candidates = [item?.title_vi, item?.label, item?.title_en, item?.slug, fallbackSlug];
  for (const candidate of candidates) {
    const label = String(candidate || '').trim();
    if (label) return label;
  }
  return fallbackSlug;
}

function shouldReplaceLabel(currentLabel, nextLabel, slug) {
  if (!currentLabel) return true;
  if (!nextLabel) return false;
  if (currentLabel === slug && nextLabel !== slug) return true;
  return false;
}

export function collectSignSlugOptions(signs = [], vocabCatalogItems = []) {
  const optionsBySlug = new Map();

  for (const item of [...(Array.isArray(signs) ? signs : []), ...(Array.isArray(vocabCatalogItems) ? vocabCatalogItems : [])]) {
    const slug = normalizeSlug(item?.slug);
    if (!slug) continue;

    const nextLabel = getPreferredLabel(item, slug);
    const current = optionsBySlug.get(slug);
    if (!current || shouldReplaceLabel(current.label, nextLabel, slug)) {
      optionsBySlug.set(slug, { slug, label: nextLabel });
    }
  }

  return Array.from(optionsBySlug.values()).sort((a, b) => a.slug.localeCompare(b.slug));
}
