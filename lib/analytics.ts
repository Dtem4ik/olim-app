/**
 * Thin analytics facade (Phase 4). Events go to PostHog when it is initialized
 * (prod, key present); a silent no-op otherwise (local/CI or key absent), so
 * call sites never need to guard. See `components/analytics-provider.tsx`.
 */

type Props = Record<string, string | number | boolean | null | undefined>;

interface PostHogLike {
  capture: (event: string, props?: Props) => void;
}

function client(): PostHogLike | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { posthog?: PostHogLike }).posthog ?? null;
}

export function capture(event: string, props?: Props): void {
  client()?.capture(event, props);
}
