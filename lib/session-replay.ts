/**
 * Session-replay sampling policy (Phase 9a-bis).
 *
 * PostHog session replay is opt-in per session at a modest rate so it never
 * costs every visitor performance/bandwidth, and it is loaded lazily (the
 * recorder chunk only downloads when recording actually starts — see
 * `components/analytics-provider.tsx`, where posthog-js is dynamically imported
 * in an effect, i.e. after first paint / afterInteractive).
 *
 * PII is never recorded: `maskAllInputs` masks every input/textarea (the city,
 * arrival/flight dates, children ages and any free-text quiz answer are all
 * inputs), and `maskTextSelector` gives an opt-in hook (`data-ph-mask`) for any
 * future sensitive *display* text. See `SESSION_RECORDING_CONFIG`.
 */

/** Modest sample: ~15% of sessions (owner asked for 10–20%, not 100%). */
export const SESSION_REPLAY_SAMPLE_RATE = 0.15;

/** localStorage/sessionStorage key; versioned so the policy can change cleanly. */
export const SESSION_REPLAY_DECISION_KEY = "olim.replay.v1";

/** PostHog `session_recording` config — privacy-first masking. */
export const SESSION_RECORDING_CONFIG = {
  maskAllInputs: true,
  maskTextSelector: "[data-ph-mask]",
} as const;

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Sticky per-session decision: once a session is sampled in or out it stays that
 * way (a half-recorded session is useless), persisted in the given storage.
 * Pure and injectable so it is unit-testable without a browser.
 */
export function decideReplaySampling(
  storage: MinimalStorage,
  random: () => number = Math.random,
  rate: number = SESSION_REPLAY_SAMPLE_RATE,
): boolean {
  const stored = storage.getItem(SESSION_REPLAY_DECISION_KEY);
  if (stored !== null) return stored === "1";
  const sampledIn = random() < rate;
  storage.setItem(SESSION_REPLAY_DECISION_KEY, sampledIn ? "1" : "0");
  return sampledIn;
}
