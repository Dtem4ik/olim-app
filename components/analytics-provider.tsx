"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { decideReplaySampling, SESSION_RECORDING_CONFIG } from "@/lib/session-replay";

/**
 * Env-gated analytics + error monitoring (Phase 4). PostHog and Sentry are loaded
 * (dynamically, so their chunks stay out of the initial bundle, and from an
 * effect so it runs afterInteractive — never render-blocking) ONLY when their
 * public env keys are present — silently disabled locally and in CI. Events are
 * emitted through `lib/analytics.ts#capture`, which reads `window.posthog`.
 *
 * Session replay (Phase 9a-bis) is sampled per session (~15%), masks all inputs
 * so PII is never recorded, and its recorder chunk downloads lazily only when a
 * session is sampled in — see `lib/session-replay.ts`.
 */

interface PostHogWindow {
  posthog?: { capture: (event: string, props?: Record<string, unknown>) => void };
}

export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) {
      void import("posthog-js").then(({ default: posthog }) => {
        const w = window as unknown as PostHogWindow;
        if (!w.posthog) {
          const recordSession = decideReplaySampling(window.localStorage);
          posthog.init(key, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
            capture_pageview: false,
            person_profiles: "identified_only",
            // Sampled per session; when sampled out we start disabled and the
            // recorder chunk never loads (no perf/bandwidth cost for that visit).
            disable_session_recording: !recordSession,
            session_recording: SESSION_RECORDING_CONFIG,
          });
          w.posthog = posthog;
        }
      });
    }

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn) {
      void import("@sentry/nextjs").then((Sentry) => {
        Sentry.init({ dsn, tracesSampleRate: 0.1 });
      });
    }
  }, []);

  useEffect(() => {
    (window as unknown as PostHogWindow).posthog?.capture("$pageview", { path: pathname });
  }, [pathname]);

  return null;
}
