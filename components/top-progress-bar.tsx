"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A slim top-of-screen navigation progress bar in the accent colour (YouTube /
 * nprogress style) — the single, quiet signal that a page is loading, instead of
 * per-tile and per-tab spinners.
 *
 * Dependency-free. It starts on an internal link click and finishes when the route
 * (`usePathname`) changes. Uses ONLY `usePathname` (never `useSearchParams`), so it
 * does not opt the tree into dynamic rendering — SSR / ISR / SEO are untouched. A
 * short show-delay means instant (prefetched) navigations don't flash the bar.
 */
const SHOW_DELAY_MS = 120;
const DONE_HIDE_MS = 220;
const TRICKLE_MS = 250;
const MAX_BEFORE_DONE = 92;

export function TopProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = useRef(false);
  const shown = useRef(false);

  useEffect(() => {
    const clearTimers = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (trickle.current) clearInterval(trickle.current);
      showTimer.current = hideTimer.current = trickle.current = null;
    };

    const start = () => {
      if (running.current) return;
      running.current = true;
      clearTimers();
      // Delay first paint so fast/cached navigations never flash the bar.
      showTimer.current = setTimeout(() => {
        shown.current = true;
        setActive(true);
        setProgress(8);
        trickle.current = setInterval(() => {
          setProgress((p) =>
            p >= MAX_BEFORE_DONE ? p : p + Math.max(0.5, (MAX_BEFORE_DONE - p) * 0.12),
          );
        }, TRICKLE_MS);
      }, SHOW_DELAY_MS);
    };

    const finish = () => {
      if (!running.current) return;
      running.current = false;
      if (showTimer.current) clearTimeout(showTimer.current);
      if (trickle.current) clearInterval(trickle.current);
      showTimer.current = trickle.current = null;
      if (!shown.current) return; // never became visible → nothing to hide
      setProgress(100);
      hideTimer.current = setTimeout(() => {
        shown.current = false;
        setActive(false);
        setProgress(0);
      }, DONE_HIDE_MS);
    };

    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same page (e.g. ?q= only)
      start();
    };

    // Finish when the committed route changes (custom event fired by the effect below).
    const onFinish = () => finish();

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("olim:route-settled", onFinish);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("olim:route-settled", onFinish);
      clearTimers();
    };
  }, []);

  // Signal "route committed" on every pathname change so the listener above finishes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run on pathname change only
  useEffect(() => {
    document.dispatchEvent(new Event("olim:route-settled"));
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      style={{ opacity: progress >= 100 ? 0 : 1, transition: "opacity 200ms ease 150ms" }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--primary)]"
        style={{ width: `${progress}%`, transition: "width 200ms ease-out" }}
      />
    </div>
  );
}
