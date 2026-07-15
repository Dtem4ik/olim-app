/**
 * Share-slug generator (Phase 5). Unguessable, URL-safe, nanoid-style — the
 * project's security bar requires anonymous share slugs ≥12 chars (AGENTS.md).
 *
 * Dependency-free on purpose (no `nanoid`): a 64-char alphabet lets us map each
 * random byte's low 6 bits to a character with zero modulo bias (256 / 64 = 4,
 * so every symbol is equally likely). Uses the Web Crypto API (available in Node
 * ≥ the project floor and on Vercel).
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

/** Generate a random URL-safe slug. Default 16 chars (> the 12-char minimum). */
export function generateShareSlug(size = 16): string {
  if (size < 12) throw new Error("share slug must be at least 12 chars");
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < size; i++) {
    // biome-ignore lint/style/noNonNullAssertion: index is 0..63, always in range
    out += ALPHABET[bytes[i]! & 63]!;
  }
  return out;
}

/** True when a string looks like one of our share slugs (charset + length). */
export function isShareSlug(value: string): boolean {
  return value.length >= 12 && /^[A-Za-z0-9_-]+$/.test(value);
}
