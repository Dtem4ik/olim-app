/**
 * Local record of share-plan slugs THIS device created while anonymous (Phase 7).
 * On first sign-in the sync layer sends these to `claim_plans` so the person's
 * own share links become owned by their account. Versioned localStorage key.
 *
 * Best-effort and forward-looking: shares created before Phase 7 aren't recorded,
 * so they stay anonymous (documented in docs/PRIVACY.md). Slugs are not secret to
 * their creator; they hold no personal data even if never claimed.
 */

export const CREATED_SHARES_VERSION = 1;
export const CREATED_SHARES_KEY = `olim.shares.v${CREATED_SHARES_VERSION}`;

/** Read the created-share slugs. Safe on the server. Never throws. */
export function loadCreatedShares(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CREATED_SHARES_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((s) => typeof s === "string") ? parsed : [];
  } catch {
    return [];
  }
}

/** Append a newly created slug (deduped). No-op on the server. */
export function recordCreatedShare(slug: string): void {
  if (typeof window === "undefined") return;
  const current = loadCreatedShares();
  if (current.includes(slug)) return;
  window.localStorage.setItem(CREATED_SHARES_KEY, JSON.stringify([...current, slug]));
}
