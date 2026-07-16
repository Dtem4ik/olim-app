/** Pastel fill utility class per guide section (see tokens in app/globals.css). */
const PALETTE = [
  "bg-sec-blue",
  "bg-sec-mint",
  "bg-sec-amber",
  "bg-sec-lavender",
  "bg-sec-rose",
  "bg-sec-sky",
  "bg-sec-teal",
  "bg-sec-peach",
] as const;

/** Stable per-slug assignment; known sections are pinned, others hash into the palette. */
const BY_SLUG: Record<string, (typeof PALETTE)[number]> = {
  "banks-and-money": "bg-sec-sky",
  healthcare: "bg-sec-mint",
  "olim-benefits": "bg-sec-amber",
  rent: "bg-sec-lavender",
  work: "bg-sec-rose",
  transport: "bg-sec-blue",
  "mobile-internet": "bg-sec-teal",
  "hebrew-ulpan": "bg-sec-peach",
};

export function sectionColor(slug: string): (typeof PALETTE)[number] {
  const pinned = BY_SLUG[slug];
  if (pinned) return pinned;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length] as (typeof PALETTE)[number];
}
