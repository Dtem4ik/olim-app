"use client";

import type { Profile } from "@/lib/plan/profile";
import type { SyncState } from "./user-state";

/**
 * Client sync singleton (Phase 7a). Talks to /api/state with plain fetch so the
 * Supabase auth SDK never enters the global bundle — only the Profile route
 * lazy-loads it for sign-in/out. Holds a single `signedIn` flag that gates
 * write-through; the SyncProvider wires the reactive stores to it.
 */

let signedIn = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export interface LocalBootstrap {
  answers: Profile | null;
  doneStepIds: string[];
  createdSlugs: string[];
}

/** Sign-in bootstrap: merge local plan into the account, get the merged state. */
export async function bootstrapSync(local: LocalBootstrap): Promise<SyncState | null> {
  try {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(local),
    });
    if (!res.ok) return null;
    const data: { signedIn?: boolean; state?: SyncState } = await res.json();
    if (data.signedIn) {
      signedIn = true;
      return data.state ?? null;
    }
    signedIn = false;
    return null;
  } catch {
    return null;
  }
}

/** Debounced write-through of the current local plan (no-op when signed out). */
export function schedulePush(plan: { answers: Profile | null; doneStepIds: string[] }): void {
  if (!signedIn) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void fetch("/api/state", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(plan),
    }).catch(() => {});
  }, 800);
}

/** Stop write-through after sign-out (the local cache is deliberately kept). */
export function markSignedOut(): void {
  signedIn = false;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

export function isSyncSignedIn(): boolean {
  return signedIn;
}
