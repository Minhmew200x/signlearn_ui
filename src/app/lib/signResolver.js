function slugifySignValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitSignInputs(input) {
  if (Array.isArray(input)) return input.map((item) => String(item || "").trim()).filter(Boolean);
  return String(input || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSignAliasMap(signs) {
  const aliases = new Map();

  for (const sign of Array.isArray(signs) ? signs : []) {
    const slug = String(sign?.slug || "").trim();
    if (!slug) continue;

    const aliasCandidates = [slug, sign?.label];
    for (const alias of aliasCandidates) {
      const normalized = slugifySignValue(alias);
      if (normalized && !aliases.has(normalized)) aliases.set(normalized, slug);
    }
  }

  return aliases;
}

export function resolveSignInputs(input, signs) {
  const aliases = buildSignAliasMap(signs);
  const seen = new Set();
  const signSlugs = [];
  const unknownInputs = [];

  for (const rawValue of splitSignInputs(input)) {
    const normalized = slugifySignValue(rawValue);
    const resolvedSlug = aliases.get(normalized);
    if (!resolvedSlug) {
      unknownInputs.push(rawValue);
      continue;
    }
    if (seen.has(resolvedSlug)) continue;
    seen.add(resolvedSlug);
    signSlugs.push(resolvedSlug);
  }

  return { signSlugs, unknownInputs };
}

export function buildLessonSignPayload(input, signs) {
  const { signSlugs } = resolveSignInputs(input, signs);
  if (!signSlugs.length) return null;
  return {
    item_type: "sign",
    sign_slugs: signSlugs,
  };
}
