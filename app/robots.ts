import type { MetadataRoute } from "next";
import { defaultLocale, locales } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";

/**
 * robots.txt.
 *
 * Indexation policy:
 *  - Public content is crawlable & indexable: home, /guides, sections, steps,
 *    /about, plus /plan and /onboarding (the two conversion landings — each has
 *    server-rendered content and its own metadata).
 *  - Personal / low-value routes stay out of the index via a per-page `noindex`
 *    meta. We deliberately DON'T disallow them here, so crawlers can fetch the
 *    page and READ the noindex signal: /profile, /search, /offline, and
 *    /plan/[slug] (anonymous shared plans).
 *  - Only never-crawl surfaces are disallowed outright: /api/* (data endpoints)
 *    and /dev/* (internal showcase) — in every UI locale (`/en/dev/*` too).
 *
 * AI policy (owner choice — reversible any time by editing the list below):
 *  - AI *search / answer* bots are ALLOWED — they surface us WITH a link back
 *    (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User,
 *    …) — covered by the "*" rule.
 *  - AI *training* crawlers are BLOCKED — they absorb content into model weights
 *    with no link back and no traffic. Blocking Google-Extended does NOT affect
 *    Google Search ranking; it only opts out of Gemini training/grounding.
 */
/** Never-crawl paths, repeated under each prefixed UI locale (`/en/dev/`). */
export const DISALLOWED_PATHS = [
  "/api/",
  "/dev/",
  ...locales.filter((l) => l !== defaultLocale).map((l) => `/${l}/dev/`),
];

const AI_TRAINING_BOTS = [
  "GPTBot",
  "Google-Extended",
  "ClaudeBot",
  "CCBot",
  "Applebot-Extended",
  "meta-externalagent",
  "Bytespider",
];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS },
      ...AI_TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
