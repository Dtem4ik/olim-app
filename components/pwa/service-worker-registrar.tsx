"use client";

import { useSerwist } from "@serwist/next/react";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register";

let requested = false;

/**
 * Registers the SW with error handling (see `lib/pwa/register.ts`). Mounted
 * inside `SerwistProvider`, which is configured with `register={false}` so its
 * own unhandled-rejection registration path never runs. Module-level guard keeps
 * StrictMode's double effect from registering twice.
 */
export function ServiceWorkerRegistrar() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (requested || !serwist) return;
    requested = true;
    void registerServiceWorker(serwist);
  }, [serwist]);

  return null;
}
