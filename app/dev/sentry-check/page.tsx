import { notFound } from "next/navigation";
import { SentryCheckButton } from "./sentry-check-button";

// Dev/preview ONLY — never a public production endpoint (no prod error surface).
// VERCEL_ENV is "production" only on the prod deployment; dev + preview render it.
export const dynamic = "force-dynamic";

export default function SentryCheckPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-10 pb-28">
      <h1 className="text-2xl font-bold tracking-tight">Sentry check</h1>
      <p className="text-sm text-muted-foreground">
        Dev/preview-only tool to prove Sentry actually receives events. Click below on a preview
        deploy (where the DSN is set), then open Sentry → Issues.
      </p>
      <SentryCheckButton />
    </main>
  );
}
