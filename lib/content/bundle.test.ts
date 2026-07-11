import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type ContentBundle,
  checkIntegrity,
  loadContentDir,
  mergeBundles,
  parseBundle,
} from "./bundle";

const section = (slug: string) => ({ slug, title: `T ${slug}` });
const step = (slug: string, section_slug: string) => ({
  slug,
  section_slug,
  title: `Step ${slug}`,
  body_md: "body",
  source_url: "https://www.gov.il/x",
  last_verified_at: "2026-07-11",
});
const benefit = (slug: string, valid_from: string) => ({
  slug,
  title: `B ${slug}`,
  valid_from,
  source_url: "https://www.gov.il/x",
  last_verified_at: "2026-07-11",
});

describe("parseBundle", () => {
  it("parses a valid bundle and applies array defaults", () => {
    const { bundle, issues } = parseBundle({ sections: [section("banks")] }, "f.json");
    expect(issues).toHaveLength(0);
    expect(bundle?.sections).toHaveLength(1);
    expect(bundle?.steps).toEqual([]);
    expect(bundle?.benefits).toEqual([]);
  });

  it("reports schema errors with the file location", () => {
    const { bundle, issues } = parseBundle({ steps: [{ slug: "X" }] }, "bad.json");
    expect(bundle).toBeNull();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatchObject({ level: "error", code: "schema", where: "bad.json" });
  });

  it("rejects unknown top-level keys", () => {
    const { bundle } = parseBundle({ widgets: [] }, "f.json");
    expect(bundle).toBeNull();
  });
});

describe("mergeBundles", () => {
  it("concatenates all entity arrays", () => {
    const bundleOf = (slug: string): ContentBundle => {
      const { bundle } = parseBundle({ sections: [section(slug)] }, "x");
      if (!bundle) throw new Error("expected valid bundle");
      return bundle;
    };
    expect(mergeBundles([bundleOf("a"), bundleOf("b")]).sections).toHaveLength(2);
  });
});

describe("checkIntegrity", () => {
  const parse = (raw: unknown) => {
    const { bundle } = parseBundle(raw, "x");
    if (!bundle) throw new Error("expected valid bundle");
    return bundle;
  };

  it("passes a coherent bundle", () => {
    const bundle = parse({
      sections: [section("banks")],
      steps: [step("open-account", "banks")],
      benefits: [benefit("sal-klita", "2026-01-01")],
    });
    expect(checkIntegrity(bundle)).toHaveLength(0);
  });

  it("flags a step referencing an unknown section", () => {
    const bundle = parse({ sections: [section("banks")], steps: [step("s", "rent")] });
    expect(checkIntegrity(bundle)).toContainEqual(
      expect.objectContaining({ code: "missing-section" }),
    );
  });

  it("flags duplicate section and step slugs", () => {
    const bundle = parse({
      sections: [section("banks"), section("banks")],
      steps: [step("s", "banks"), step("s", "banks")],
    });
    const codes = checkIntegrity(bundle).map((i) => i.code);
    expect(codes).toContain("duplicate-section");
    expect(codes).toContain("duplicate-step");
  });

  it("allows dated benefit versions but flags exact duplicates", () => {
    const ok = parse({
      benefits: [benefit("sal-klita", "2025-01-01"), benefit("sal-klita", "2026-01-01")],
    });
    expect(checkIntegrity(ok)).toHaveLength(0);

    const dup = parse({
      benefits: [benefit("sal-klita", "2026-01-01"), benefit("sal-klita", "2026-01-01")],
    });
    expect(checkIntegrity(dup)).toContainEqual(
      expect.objectContaining({ code: "duplicate-benefit" }),
    );
  });
});

describe("loadContentDir", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "olim-content-"));
    writeFileSync(
      join(dir, "banks.json"),
      JSON.stringify({ sections: [section("banks")], steps: [step("open-account", "banks")] }),
    );
    writeFileSync(join(dir, "broken.json"), "{ not valid json");
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("loads valid files, merges them, and reports invalid JSON", () => {
    const { bundle, issues } = loadContentDir(dir);
    expect(bundle.sections).toHaveLength(1);
    expect(bundle.steps).toHaveLength(1);
    expect(issues).toContainEqual(expect.objectContaining({ code: "invalid-json" }));
  });
});
