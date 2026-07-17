/**
 * JSON-LD structured data for the SEO step/section pages (Phase 6b).
 *
 * Honesty rule: emit only schema that reflects what the page actually shows.
 *  - BreadcrumbList — always (home › section › step is real navigation).
 *  - HowTo — only when the step body is an actual list of ≥2 actions; its
 *    `supply` is the step's "bring with you" documents (also really on the page).
 *  - ItemList — a section's list of steps (each a real link).
 * We never fabricate ratings, prices, FAQ pairs, or step counts that aren't there.
 */

import type { ContentSection, ContentStep } from "@/lib/content/repo";

const ORDERED = /^\d+\.\s+/;
const BULLET = /^[-*]\s+/;

/** Strip the inline Markdown our content uses down to plain text. */
export function toPlainText(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .trim();
}

/** Pull ordered/bullet list items from a Markdown body as plain-text step texts. */
export function extractHowToSteps(bodyMd: string): string[] {
  const out: string[] = [];
  for (const raw of bodyMd.split("\n")) {
    const line = raw.trim();
    if (ORDERED.test(line)) out.push(toPlainText(line.replace(ORDERED, "")));
    else if (BULLET.test(line)) out.push(toPlainText(line.replace(BULLET, "")));
  }
  return out.filter(Boolean);
}

type JsonLd = Record<string, unknown>;

function breadcrumb(siteUrl: string, section: ContentSection, step?: ContentStep): JsonLd {
  const items: JsonLd[] = [
    { "@type": "ListItem", position: 1, name: "Olim", item: `${siteUrl}/guides` },
    {
      "@type": "ListItem",
      position: 2,
      name: section.title,
      item: `${siteUrl}/guides/${section.slug}`,
    },
  ];
  if (step) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: step.title,
      item: `${siteUrl}/guides/${section.slug}/${step.slug}`,
    });
  }
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}

/**
 * JSON-LD graph for a single step page. Returns a BreadcrumbList always, plus a
 * HowTo when the body genuinely lists ≥2 actions.
 */
export function stepJsonLd(args: {
  siteUrl: string;
  section: ContentSection;
  step: ContentStep;
}): JsonLd[] {
  const { siteUrl, section, step } = args;
  const url = `${siteUrl}/guides/${section.slug}/${step.slug}`;
  const graph: JsonLd[] = [breadcrumb(siteUrl, section, step)];

  const steps = extractHowToSteps(step.body_md);
  if (steps.length >= 2) {
    const supply = step.docs.map((d) => ({ "@type": "HowToSupply", name: d.label }));
    const howTo: JsonLd = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: step.title,
      inLanguage: "ru",
      mainEntityOfPage: url,
      step: steps.map((text, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: text.length > 80 ? `${text.slice(0, 77)}…` : text,
        text,
      })),
    };
    if (step.summary) howTo.description = step.summary;
    if (supply.length > 0) howTo.supply = supply;
    graph.push(howTo);
  }
  return graph;
}

/** JSON-LD for a section page: breadcrumb + an ItemList of its steps. */
export function sectionJsonLd(args: {
  siteUrl: string;
  section: ContentSection;
  steps: ContentStep[];
}): JsonLd[] {
  const { siteUrl, section, steps } = args;
  const list: JsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: section.title,
    itemListElement: steps.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.title,
      url: `${siteUrl}/guides/${section.slug}/${s.slug}`,
    })),
  };
  return [breadcrumb(siteUrl, section), list];
}
