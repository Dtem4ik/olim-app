"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  clearProfile,
  loadProfile,
  PROFILE_STORAGE_KEY,
  type Profile,
  saveProfile,
} from "./profile";

/**
 * Shared reactive store over the profile module so every screen (Home, My plan,
 * guides, Profile) reflects the same answers instantly — and so the Phase 7 sync
 * layer can push a signed-in user's synced profile into the cache and have the
 * whole app update without a reload. Mirrors `use-progress.ts`.
 *
 * `loaded` stays false through SSR + hydration (screens show a skeleton), then
 * flips true after mount, matching the prior `useState(undefined)` pattern and
 * avoiding a hydration flash of the "no profile" empty state.
 */

let snapshot: Profile | null | undefined;
const listeners = new Set<() => void>();

function ensure(): Profile | null {
  if (snapshot === undefined) snapshot = loadProfile();
  return snapshot;
}

function emit(): void {
  for (const l of listeners) l();
}

/** Set the profile from outside React (the sync layer) and notify all screens. */
export function setProfileValue(profile: Profile | null): void {
  snapshot = profile;
  if (profile) saveProfile(profile);
  else clearProfile();
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROFILE_STORAGE_KEY) {
      snapshot = loadProfile();
      emit();
    }
  };
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = (): Profile | null => null;

export interface ProfileApi {
  /** The stored profile, or null; `undefined` until loaded (show a skeleton). */
  profile: Profile | null | undefined;
  loaded: boolean;
  save: (profile: Profile) => void;
  clear: () => void;
}

export function useProfile(): ProfileApi {
  const profile = useSyncExternalStore(subscribe, ensure, getServerSnapshot);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(true), []);
  return {
    profile: loaded ? profile : undefined,
    loaded,
    save: setProfileValue,
    clear: () => setProfileValue(null),
  };
}
