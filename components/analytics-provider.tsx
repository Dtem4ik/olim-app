"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Env-gated analytics + error monitoring (Phase 4). PostHog and Sentry are loaded
 * (dynamically, so their chunks stay out of the initial bundle) ONLY when their
 * public env keys are present — silently disabled locally and in CI. Events are
 * emitted through `lib/analytics.ts#capture`, which reads `window.posthog`.
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
          posthog.init(key, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
            capture_pageview: false,
            person_profiles: "identified_only",
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
