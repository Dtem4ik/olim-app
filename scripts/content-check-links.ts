/**
 * content:check-links — fetch every source_url (and any https link in step
 * bodies) and report unreachable ones. NON-BLOCKING: always exits 0; it is a
 * report, not a gate (sites rate-limit and flap). Defaults to the fixtures.
 * Bot-protection answers (403/429/Cloudflare challenge) are reported separately
 * as "blocked — check by hand", since those pages usually open in a browser.
 */

import type { ContentBundle } from "@/lib/content/bundle";
import { BROWSER_HEADERS, classifyLink, type LinkStatus } from "@/lib/content/link-status";
import { gatherContent, parseCommonArgs } from "./_content";

const URL_RE = /https?:\/\/[^\s)"'<>]+/g;
const TIMEOUT_MS = 10_000;

function collectUrls(bundle: ContentBundle): string[] {
  const urls = new Set<string>();
  for (const step of bundle.steps) {
    urls.add(step.source_url);
    for (const match of step.body_md.matchAll(URL_RE)) urls.add(match[0]);
  }
  for (const benefit of bundle.benefits) urls.add(benefit.source_url);
  return [...urls].sort();
}

const MARK: Record<LinkStatus, string> = { ok: "✓", blocked: "?", broken: "✖" };

async function check(url: string): Promise<{ url: string; result: LinkStatus; status: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // HEAD first; some servers reject it, so fall back to GET.
    const init = {
      signal: controller.signal,
      redirect: "follow",
      headers: BROWSER_HEADERS,
    } as const;
    let res = await fetch(url, { ...init, method: "HEAD" });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { ...init, method: "GET" });
    }
    const result = classifyLink(res.status, res.headers.get("cf-mitigated"));
    return { url, result, status: String(res.status) };
  } catch (err) {
    return { url, result: "broken", status: err instanceof Error ? err.name : "error" };
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const { dir } = parseCommonArgs();
  const { bundle } = gatherContent(dir);
  const urls = collectUrls(bundle);
  console.log(`Checking ${urls.length} link(s) from ${dir}…\n`);

  const results = await Promise.all(urls.map(check));
  const broken = results.filter((r) => r.result === "broken");
  const blocked = results.filter((r) => r.result === "blocked");

  for (const r of results) {
    console.log(`  ${MARK[r.result]} ${r.status.padEnd(7)} ${r.url}`);
  }
  if (blocked.length > 0) {
    console.log(
      `\n? ${blocked.length} link(s) blocked by bot protection — open them in a browser to confirm.`,
    );
  }
  console.log(
    broken.length === 0
      ? `\n✓ No broken links (${urls.length - blocked.length}/${urls.length} verified reachable).`
      : `\n⚠ ${broken.length}/${urls.length} link(s) broken (report only, not a failure).`,
  );
  // Non-blocking by design.
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(0);
});
