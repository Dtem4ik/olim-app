import { cn } from "@/lib/utils";

/** Pulsing placeholder shown while client-only state (e.g. the saved profile)
 *  resolves, so screens don't flash the wrong (no-profile) state. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
