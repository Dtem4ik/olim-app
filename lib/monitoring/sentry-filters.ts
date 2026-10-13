/**
 * Client-side Sentry noise filters: errors that originate outside our code and
 * that we cannot act on.
 *
 * - `selectNode` on a detached node: thrown by browser extensions and in-page
 *   translators (Google Translate, Grammarly, dictionary pop-ups) that mutate
 *   the DOM React owns. Our code never calls `Range#selectNode`.
 * - Service-worker registration failures are handled in `lib/pwa/register.ts`;
 *   they are listed here too so a stale cached bundle (or any other caller)
 *   can't re-flood the issue list.
 */
export const SENTRY_IGNORE_ERRORS: (string | RegExp)[] = [
  /Failed to execute 'selectNode' on 'Range'/,
  /Failed to register a ServiceWorker/,
];

/** Stack frames from extension code are never ours. */
export const SENTRY_DENY_URLS: RegExp[] = [
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-(web-)?extension:\/\//,
];
