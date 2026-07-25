/**
 * Resolve the post-auth redirect target for the OAuth / magic-link callback.
 *
 * Only a same-origin absolute path is honored: it must start with a single "/".
 * Everything else — an external URL, a protocol-relative "//evil.com", a
 * "/\evil" backslash trick, or a missing value — falls back to /profile. This
 * closes the open-redirect vector on the `?next` param.
 */
export function safeNextPath(nextParam: string | null | undefined, fallback = "/profile"): string {
  if (!nextParam) return fallback;
  if (nextParam[0] !== "/") return fallback; // must be an absolute same-origin path
  if (nextParam[1] === "/" || nextParam[1] === "\\") return fallback; // //host or /\host
  return nextParam;
}
