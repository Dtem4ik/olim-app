"use client";

import { useEffect, useRef } from "react";
import { loadProfile } from "@/lib/plan/profile";
import { loadProgress } from "@/lib/plan/progress";
import { setProfileValue, useProfile } from "@/lib/plan/use-profile";
import { setProgressValue, useProgress } from "@/lib/plan/use-progress";
import { loadCreatedShares } from "@/lib/share/created-shares";
import { bootstrapSync, schedulePush } from "@/lib/sync/state-sync";

/**
 * Global account sync (Phase 7a). Mounted once in the root layout. On load it
 * bootstraps against /api/state: if the user is signed in, the account state is
 * merged in and adopted into the local stores (so every screen reflects the
 * synced plan); afterwards, local plan changes are written through (debounced).
 *
 * Uses only the reactive stores + plain fetch — no auth SDK — so it adds no
 * meaningful weight and never forces content/SEO routes to render dynamically.
 * Renders nothing.
 */
export function SyncProvider(): null {
  const { profile, loaded } = useProfile();
  const { done } = useProgress();
  const bootstrapped = useRef(false);
  const adopting = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void bootstrapSync({
      answers: loadProfile(),
      doneStepIds: loadProgress(),
      createdSlugs: loadCreatedShares(),
    }).then((state) => {
      if (!state) return;
      adopting.current = true;
      if (state.answers) setProfileValue(state.answers);
      setProgressValue(state.doneStepIds);
      // Release the guard after the adopt's store emits have flushed, so the
      // change effect below doesn't immediately echo the server's own data.
      queueMicrotask(() => {
        adopting.current = false;
      });
    });
  }, []);

  useEffect(() => {
    if (!bootstrapped.current || adopting.current || !loaded || profile === undefined) return;
    schedulePush({ answers: profile, doneStepIds: done });
  }, [profile, done, loaded]);

  return null;
}
