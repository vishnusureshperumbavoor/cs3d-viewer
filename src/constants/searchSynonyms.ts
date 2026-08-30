/**
 * Medical synonym map for TotalSegmentator search.
 * When a user searches for one term, results containing any synonym will also appear.
 * All keys and values must be lowercase.
 */
const MEDICAL_SYNONYMS: [string, string][] = [
  ["lung", "pulmonary"],
  ["liver", "hepatic"],
  ["intestine", "bowel"],
  ["kidney", "renal"],
  ["heart", "cardiac"],
  ["brain", "cerebral"],
  ["bone", "skeletal"],
  ["spine", "spinal"],
  ["vertebra", "vertebrae"],
  ["stomach", "gastric"],
  ["vessel", "vascular"],
  ["artery", "arterial"],
  ["muscle", "muscular"],
];

/**
 * Builds a bidirectional lookup: each term maps to all its synonyms.
 */
function buildSynonymMap(pairs: [string, string][]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const [a, b] of pairs) {
    if (!map[a]) map[a] = [];
    if (!map[b]) map[b] = [];
    if (!map[a].includes(b)) map[a].push(b);
    if (!map[b].includes(a)) map[b].push(a);
  }
  return map;
}

export const SYNONYMS = buildSynonymMap(MEDICAL_SYNONYMS);

/**
 * Given a search query, returns an array of all terms to match against
 * (the original query + any synonym expansions found within it).
 */
export function expandSearchTerms(query: string): string[] {
  if (!query) return [];
  const terms = [query];
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (query.includes(key)) {
      for (const syn of synonyms) {
        terms.push(query.replace(key, syn));
      }
    }
  }
  return Array.from(new Set(terms));
}
