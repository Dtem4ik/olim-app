/**
 * Link-check classification for `content:check-links`.
 *
 * Our sources (gov.il, kolzchut.org.il, btl.gov.il) sit behind Cloudflare, which
 * answers scripted requests with 403/429 or a JS challenge while the page opens
 * fine in a browser. Lumping those in with genuinely dead links made the report
 * useless (72/90 "unreachable", 0 actually broken), so bot blocks get their own
 * bucket: "check by hand", not "broken".
 */

export type LinkStatus = "ok" | "blocked" | "broken";

/** Statuses a bot-protection layer returns for a page that exists. */
const BOT_BLOCK_STATUSES = new Set([401, 403, 429, 503]);

/** Browser-like headers: some hosts reject requests without them outright. */
export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ru,en;q=0.8,he;q=0.6",
};

/**
 * Classify an HTTP response. `cfMitigated` is the `cf-mitigated` response header
 * (Cloudflare sets it to "challenge" when it serves a bot challenge).
 */
export function classifyLink(status: number, cfMitigated: string | null = null): LinkStatus {
  if (cfMitigated === "challenge") return "blocked";
  if (status >= 200 && status < 400) return "ok";
  if (BOT_BLOCK_STATUSES.has(status)) return "blocked";
  return "broken";
}
