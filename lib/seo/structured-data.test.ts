import { describe, expect, it } from "vitest";
import type { ContentSection, ContentStep } from "@/lib/content/repo";
import { extractHowToSteps, sectionJsonLd, stepJsonLd, toPlainText } from "./structured-data";

const SITE = "https://olim.example";

const section: ContentSection = {
  slug: "banks-and-money",
  title: "Банки и деньги",
  description: "Открыть счёт, получить карту",
  icon: "landmark",
  image_url: null,
  sort_order: 0,
};

const baseStep: ContentStep = {
  id: "1",
  slug: "open-account",
  section_slug: "banks-and-money",
  title: "Открыть банковский счёт",
  summary: "Нужен теудат зеут и теудат оле.",
  body_md: "1. Выбери банк\n2. Приди с **паспортом**\n3. Подпиши договор",
  docs: [{ label: "Теудат зеут" }, { label: "Теудат оле" }],
  tips: [],
  cond: {},
  warn_rule: null,
  stage: null,
  source_url: "https://gov.il",
  last_verified_at: "2026-01-01",
  sort_order: 0,
};

describe("toPlainText", () => {
  it("strips bold, code and links", () => {
    expect(toPlainText("Приди с **паспортом** и [сюда](https://x.co)")).toBe(
      "Приди с паспортом и сюда",
    );
  });
});

describe("extractHowToSteps", () => {
  it("pulls ordered list items as plain text", () => {
    expect(extractHowToSteps(baseStep.body_md)).toEqual([
      "Выбери банк",
      "Приди с паспортом",
      "Подпиши договор",
    ]);
  });

  it("returns nothing when the body has no list", () => {
    expect(extractHowToSteps("Просто абзац текста без списка.")).toEqual([]);
  });
});

describe("stepJsonLd", () => {
  it("emits a breadcrumb and a HowTo with supply for a list body", () => {
    const graph = stepJsonLd({ siteUrl: SITE, section, step: baseStep });
    const types = graph.map((g) => g["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("HowTo");

    const howTo = graph.find((g) => g["@type"] === "HowTo");
    if (!howTo) throw new Error("expected a HowTo node");
    expect((howTo.step as unknown[]).length).toBe(3);
    expect((howTo.supply as unknown[]).length).toBe(2); // the two docs
    expect(howTo.description).toBe(baseStep.summary);
  });

  it("omits HowTo when the body is not a list of ≥2 actions", () => {
    const step = { ...baseStep, body_md: "Один абзац, без шагов." };
    const graph = stepJsonLd({ siteUrl: SITE, section, step });
    expect(graph.map((g) => g["@type"])).not.toContain("HowTo");
    expect(graph.map((g) => g["@type"])).toContain("BreadcrumbList");
  });

  it("points the breadcrumb at absolute canonical URLs", () => {
    const graph = stepJsonLd({ siteUrl: SITE, section, step: baseStep });
    const crumb = graph.find((g) => g["@type"] === "BreadcrumbList");
    if (!crumb) throw new Error("expected a BreadcrumbList node");
    const items = crumb.itemListElement as { item: string }[];
    expect(items.at(-1)?.item).toBe(`${SITE}/guides/banks-and-money/open-account`);
  });
});

describe("sectionJsonLd", () => {
  it("emits a breadcrumb and an ItemList of steps", () => {
    const graph = sectionJsonLd({ siteUrl: SITE, section, steps: [baseStep] });
    const list = graph.find((g) => g["@type"] === "ItemList");
    if (!list) throw new Error("expected an ItemList node");
    const items = list.itemListElement as { url: string }[];
    expect(items[0]?.url).toBe(`${SITE}/guides/banks-and-money/open-account`);
  });
});
