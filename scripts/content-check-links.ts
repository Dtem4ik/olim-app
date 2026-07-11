/**
 * content:check-links — fetch every source_url (and any https link in step
 * bodies) and report unreachable ones. NON-BLOCKING: always exits 0; it is a
 * report, not a gate (sites rate-limit and flap). Defaults to the fixtures.
 */

import type { ContentBundle } from "@/lib/content/bundle";
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

async function check(url: string): Promise<{ url: string; ok: boolean; status: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // HEAD first; some servers reject it, so fall back to GET.
    let res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", signal: controller.signal, redirect: "follow" });
    }
    return { url, ok: res.ok, status: String(res.status) };
  } catch (err) {
    return { url, ok: false, status: err instanceof Error ? err.name : "error" };
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
  const broken = results.filter((r) => !r.ok);

  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✖"} ${r.status.padEnd(7)} ${r.url}`);
  }
  console.log(
    broken.length === 0
      ? `\n✓ All ${urls.length} links reachable.`
      : `\n⚠ ${broken.length}/${urls.length} link(s) unreachable (report only, not a failure).`,
  );
  // Non-blocking by design.
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(0);
});
