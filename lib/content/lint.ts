/**
 * Content lint (Phase 2b): editorial + trust rules layered on top of the zod
 * schema. The schema guarantees shape; the lint guards tone and sourcing:
 *  - every `source_url` must be on the trusted-domain allowlist,
 *  - no banned phrases (guarantees / legal-advice wording),
 *  - `last_verified_at` must be a real, non-future, not-too-stale date.
 *
 * Documented for authors in `docs/CONTENT_SCHEMA.md`.
 */

import type { ContentBundle, ContentIssue } from "./bundle";

/**
 * Trusted source domains. A `source_url` host must equal one of these or be a
 * subdomain of it. Kept deliberately small; extend here (and in CONTENT_SCHEMA)
 * when a new official source is vetted.
 */
export const ALLOWED_SOURCE_DOMAINS = [
  "gov.il", // Ministry of Aliyah and Integration, health.gov.il, etc.
  "btl.gov.il", // Bituach Leumi (subdomain of gov.il, listed for clarity)
  "nativ.gov.il", // Nativ
  "kolzchut.org.il", // Kol Zchut rights encyclopedia
  "jewishagency.org", // The Jewish Agency (Sochnut)
] as const;

/**
 * Banned phrases — the product never promises outcomes and never poses as legal
 * advice (AGENTS.md domain note). Matched case-insensitively; Russian stems
 * catch inflections (гарантируем / гарантированно / гарантия).
 */
export const BANNED_PHRASES: { pattern: RegExp; label: string }[] = [
  { pattern: /guarantee/i, label: "guarantee" },
  { pattern: /\b100\s*%\s*(approval|success|одобрени)/i, label: "100% approval" },
  { pattern: /гарант(и|і)/i, label: "гарантия/гарантируем" },
  { pattern: /\bмы обещаем\b/i, label: "мы обещаем" },
  { pattern: /юридическ(ая|ую) консультаци/i, label: "юридическая консультация" },
  { pattern: /это юридический совет/i, label: "юридический совет" },
];

/** How old a verification date may get before we warn (days). */
export const STALE_AFTER_DAYS = 365;

function hostAllowed(host: string): boolean {
  return ALLOWED_SOURCE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function checkSourceUrl(url: string, where: string): ContentIssue[] {
  let host: string;
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    // Shape is already enforced by the schema; a parse failure here is defensive.
    return [{ level: "error", code: "bad-source-url", message: `invalid source_url`, where }];
  }
  if (!hostAllowed(host)) {
    return [
      {
        level: "error",
        code: "untrusted-source",
        message: `source_url host "${host}" is not on the trusted allowlist`,
        where,
      },
    ];
  }
  return [];
}

function checkBannedPhrases(text: string, where: string): ContentIssue[] {
  const issues: ContentIssue[] = [];
  for (const { pattern, label } of BANNED_PHRASES) {
    if (pattern.test(text)) {
      issues.push({
        level: "error",
        code: "banned-phrase",
        message: `banned phrase "${label}"`,
        where,
      });
    }
  }
  return issues;
}

function checkVerifiedAt(dateStr: string, where: string, now: Date): ContentIssue[] {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return [{ level: "error", code: "bad-date", message: "invalid last_verified_at", where }];
  }
  const issues: ContentIssue[] = [];
  if (date.getTime() > now.getTime()) {
    issues.push({
      level: "error",
      code: "future-date",
      message: `last_verified_at ${dateStr} is in the future`,
      where,
    });
  }
  const ageDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (ageDays > STALE_AFTER_DAYS) {
    issues.push({
      level: "warning",
      code: "stale-source",
      message: `last_verified_at ${dateStr} is older than ${STALE_AFTER_DAYS} days`,
      where,
    });
  }
  return issues;
}

/** Text fields of a step that editorial rules apply to. */
function stepText(step: ContentBundle["steps"][number]): string {
  return [
    step.title,
    step.summary ?? "",
    step.body_md,
    ...step.tips.map((t) => t.text),
    ...step.docs.map((d) => `${d.label} ${d.note ?? ""}`),
  ].join("\n");
}

/**
 * Run every editorial/trust rule over a bundle. `now` is injectable for tests.
 */
export function lintBundle(bundle: ContentBundle, now: Date = new Date()): ContentIssue[] {
  const issues: ContentIssue[] = [];

  for (const step of bundle.steps) {
    const where = `step:${step.slug}`;
    issues.push(...checkSourceUrl(step.source_url, where));
    issues.push(...checkBannedPhrases(stepText(step), where));
    issues.push(...checkVerifiedAt(step.last_verified_at, where, now));
  }

  for (const benefit of bundle.benefits) {
    const where = `benefit:${benefit.slug}`;
    issues.push(...checkSourceUrl(benefit.source_url, where));
    issues.push(...checkBannedPhrases(`${benefit.title}\n${benefit.notes ?? ""}`, where));
    issues.push(...checkVerifiedAt(benefit.last_verified_at, where, now));
  }

  return issues;
}
