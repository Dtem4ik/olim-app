/**
 * Reciprocal Rank Fusion (Phase 8a) — pure, dependency-free, unit-tested.
 *
 * Combines several ranked slug lists (here: FTS from `search_steps` and vector
 * similarity from `match_steps`) into one ranking without needing their scores
 * to be on the same scale. Each list contributes `1 / (k + rank)` to an item's
 * score; items appearing high in multiple lists rise to the top. `k` (default
 * 60, the value from the original RRF paper) damps the influence of top ranks so
 * a single list can't dominate.
 */

const DEFAULT_K = 60;

/** Fuse ranked lists of slugs into a descending-score ranking. Ties keep first-seen order. */
export function fuseRankings(
  lists: string[][],
  k: number = DEFAULT_K,
): { slug: string; score: number }[] {
  const scores = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  let order = 0;
  for (const list of lists) {
    for (let rank = 0; rank < list.length; rank++) {
      const slug = list[rank];
      if (slug === undefined) continue;
      scores.set(slug, (scores.get(slug) ?? 0) + 1 / (k + rank + 1));
      if (!firstSeen.has(slug)) firstSeen.set(slug, order++);
    }
  }
  return [...scores.entries()]
    .map(([slug, score]) => ({ slug, score }))
    .sort(
      (a, b) => b.score - a.score || (firstSeen.get(a.slug) ?? 0) - (firstSeen.get(b.slug) ?? 0),
    );
}
