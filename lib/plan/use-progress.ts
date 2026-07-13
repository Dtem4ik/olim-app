"use client";

import { useCallback, useSyncExternalStore } from "react";
import { loadProgress, PROGRESS_STORAGE_KEY, saveProgress, toggleInList } from "./progress";

/**
 * Shared client store over the progress module so every screen (Home, My plan,
 * section, step card) reflects the same checked state instantly. Built on
 * useSyncExternalStore: one localStorage-backed source, cross-tab via the
 * `storage` event and same-tab via local listeners.
 */

let snapshot: string[] | null = null;
const listeners = new Set<() => void>();

function ensure(): string[] {
  if (snapshot === null) snapshot = loadProgress();
  return snapshot;
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROGRESS_STORAGE_KEY) {
      snapshot = loadProgress();
      emit();
    }
  };
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: string[] = [];
const getServerSnapshot = () => EMPTY;

function setDone(next: string[]) {
  snapshot = next;
  saveProgress(next);
  emit();
}

export interface ProgressApi {
  done: string[];
  isDone: (slug: string) => boolean;
  toggle: (slug: string) => void;
  count: number;
}

export function useProgress(): ProgressApi {
  const done = useSyncExternalStore(subscribe, ensure, getServerSnapshot);
  const toggle = useCallback((slug: string) => setDone(toggleInList(ensure(), slug)), []);
  const isDone = useCallback((slug: string) => done.includes(slug), [done]);
  return { done, isDone, toggle, count: done.length };
}
