"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Fires a real error into Sentry so the owner can prove ingestion works.
 * Sentry only initialises when NEXT_PUBLIC_SENTRY_DSN is set (prod/preview env),
 * so click this on a PREVIEW deploy: the event should appear in Sentry → Issues
 * within a minute. In local dev (no DSN) capture is a no-op — that is expected.
 */
export function SentryCheckButton() {
  const [state, setState] = useState<"idle" | "sent" | "no-dsn">("idle");

  async function fire() {
    const hasDsn = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(new Error("Sentry test error — Phase 10 B2 verification"));
    setState(hasDsn ? "sent" : "no-dsn");
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={fire}>Send a test error to Sentry</Button>
      {state === "sent" && (
        <p className="text-sm text-muted-foreground">
          Sent. Check Sentry → Issues for “Sentry test error — Phase 10 B2 verification”.
        </p>
      )}
      {state === "no-dsn" && (
        <p className="text-sm text-muted-foreground">
          No NEXT_PUBLIC_SENTRY_DSN in this environment — capture was a no-op. Run this on a preview
          deploy (or with the DSN set) to see the event land.
        </p>
      )}
    </div>
  );
}
