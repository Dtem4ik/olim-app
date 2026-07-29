import { describe, expect, it } from "vitest";
import { GuidesView } from "@/components/guides/guides-view";
import { loadContentDir } from "@/lib/content/bundle";
import type { ContentSection, ContentStep } from "@/lib/content/repo";
import { renderWithProviders, screen } from "@/test/test-utils";

// Regression guard for the "half the sections missing from /guides" bug: the
// index must render a tile for EVERY section the content repo returns, never a
// filtered subset. Count-derived from the fixtures (the repo's fallback source),
// so it stays honest as the corpus grows — no hardcoded section count.
const { bundle } = loadContentDir("content/fixtures");

const sections: ContentSection[] = bundle.sections.map((s) => ({
  slug: s.slug,
  title: s.title,
  description: s.description ?? null,
  icon: s.icon ?? null,
  image_url: s.image_url ?? null,
  sort_order: s.sort_order,
}));

const steps: ContentStep[] = bundle.steps.map((s) => ({
  id: null,
  slug: s.slug,
  section_slug: s.section_slug,
  title: s.title,
  summary: s.summary ?? null,
  body_md: s.body_md,
  docs: s.docs,
  tips: s.tips,
  cond: s.cond,
  warn_rule: s.warn_rule ?? null,
  stage: s.stage ?? null,
  source_url: s.source_url,
  last_verified_at: s.last_verified_at,
  sort_order: s.sort_order,
}));

describe("GuidesView", () => {
  it("has fixtures to assert against", () => {
    expect(sections.length).toBeGreaterThan(0);
  });

  it("renders a link for every section the content repo returns", () => {
    renderWithProviders(<GuidesView sections={sections} steps={steps} />);

    const sectionLinks = screen
      .getAllByRole("link")
      .filter((el) => /^\/guides\/[^/]+$/.test(el.getAttribute("href") ?? ""));

    // One tile per section — no more (no dupes), no fewer (nothing dropped).
    expect(sectionLinks).toHaveLength(sections.length);

    const hrefs = new Set(sectionLinks.map((el) => el.getAttribute("href")));
    for (const s of sections) {
      expect(hrefs).toContain(`/guides/${s.slug}`);
    }
  });
});
