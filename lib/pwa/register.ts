/**
 * Service-worker registration that never throws.
 *
 * `SerwistProvider`'s built-in registration is fire-and-forget
 * (`void serwist.register()`), so a rejected registration surfaces as an
 * unhandled promise rejection and is reported to Sentry. Registration rejects
 * for environmental reasons we cannot fix: `SecurityError` (Firefox private
 * mode, cookies/storage blocked, some in-app WebViews) and `AbortError` (the
 * sw.js fetch or first SW start aborted — flaky network, tab closed mid-install).
 * The app works fine without a SW (it is a progressive enhancement), so a
 * failed registration is logged and swallowed.
 */
export interface RegistersServiceWorker {
  register: () => Promise<unknown>;
}

export async function registerServiceWorker(
  serwist: RegistersServiceWorker | null | undefined,
  warn: (...args: unknown[]) => void = console.warn,
): Promise<boolean> {
  if (!serwist) return false;
  try {
    await serwist.register();
    return true;
  } catch (error) {
    warn("[pwa] service worker registration failed; continuing without offline support", error);
    return false;
  }
}
