/**
 * PWA install helpers (Phase 9a). Pure, browser-injectable pieces of the
 * "add to home screen" flow so the frequency/platform logic is unit-testable
 * without a real browser. The stateful React glue lives in
 * `components/pwa/install-prompt-provider.tsx`.
 */

/** Versioned so a future prompt revision can re-ask users who dismissed the old one. */
export const INSTALL_DISMISSED_KEY = "olim.install-prompt.v1";

export type InstallPlatform = "android" | "ios" | "other";

/** The non-standard Chrome event we intercept to drive our own sheet. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Already installed / running as an installed app — never prompt. Covers both
 * the standard `display-mode: standalone` and legacy iOS `navigator.standalone`.
 */
export function isStandalone(win: Window = window): boolean {
  const mql = win.matchMedia?.("(display-mode: standalone)");
  const iosStandalone = (win.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(mql?.matches) || iosStandalone === true;
}

/**
 * Which install UX applies. iOS Safari has no `beforeinstallprompt`, so it needs
 * illustrated "Share → Add to Home Screen" instructions; Android/Chrome gets the
 * native prompt via the captured event. iPadOS 13+ reports a Mac UA, so we also
 * treat a touch-capable "Macintosh" as iOS.
 */
export function detectPlatform(
  ua: string = navigator.userAgent,
  maxTouchPoints: number = navigator.maxTouchPoints ?? 0,
): InstallPlatform {
  const isIpadOs = /Macintosh/i.test(ua) && maxTouchPoints > 1;
  const isIos = /iPhone|iPad|iPod/i.test(ua) || isIpadOs;
  // Chrome/Firefox/Edge on iOS still run WebKit but can't install → not "ios".
  const isIosSafari = isIos && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  if (isIosSafari) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function wasDismissed(storage: MinimalStorage): boolean {
  try {
    return storage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDismissed(storage: MinimalStorage): void {
  try {
    storage.setItem(INSTALL_DISMISSED_KEY, "1");
  } catch {
    // Private mode / storage disabled — worst case we prompt again next visit.
  }
}
