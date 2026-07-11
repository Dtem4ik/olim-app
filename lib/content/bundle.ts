/**
 * Content bundle format + loading/validation (Phase 2b).
 *
 * A content "bundle" is a JSON file with any of `sections`, `steps`, `benefits`.
 * Real content lives in the private `olim-content` repo; a small committed set
 * under `content/fixtures/` powers tests and local dev. The loader reads every
 * `*.json` under a directory, validates each against the zod input schemas
 * (lib/content/schema.ts), merges them, and runs cross-file integrity checks
 * (referential + uniqueness) that a single-file schema cannot express.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  type BenefitInput,
  benefitInputSchema,
  type SectionInput,
  type StepInput,
  sectionInputSchema,
  stepInputSchema,
} from "./schema";

export const contentBundleSchema = z
  .object({
    sections: z.array(sectionInputSchema).default([]),
    steps: z.array(stepInputSchema).default([]),
    benefits: z.array(benefitInputSchema).default([]),
  })
  .strict();

export type ContentBundle = {
  sections: SectionInput[];
  steps: StepInput[];
  benefits: BenefitInput[];
};

export type IssueLevel = "error" | "warning";

export interface ContentIssue {
  level: IssueLevel;
  code: string;
  message: string;
  /** File or entity the issue points at, for a readable report. */
  where?: string;
}

/** Merge parsed bundles into one. */
export function mergeBundles(bundles: ContentBundle[]): ContentBundle {
  return {
    sections: bundles.flatMap((b) => b.sections),
    steps: bundles.flatMap((b) => b.steps),
    benefits: bundles.flatMap((b) => b.benefits),
  };
}

/** Parse one file's raw JSON into a bundle, collecting schema errors. */
export function parseBundle(
  raw: unknown,
  where: string,
): { bundle: ContentBundle | null; issues: ContentIssue[] } {
  const result = contentBundleSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      level: "error" as const,
      code: "schema",
      message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      where,
    }));
    return { bundle: null, issues };
  }
  return { bundle: result.data, issues: [] };
}

/**
 * Cross-file checks a per-file schema cannot do: every step points at a known
 * section, and slugs are unique across the whole content set (benefits are
 * unique per `(slug, valid_from)` so dated versions may coexist).
 */
export function checkIntegrity(bundle: ContentBundle): ContentIssue[] {
  const issues: ContentIssue[] = [];

  const sectionSlugs = new Set<string>();
  for (const section of bundle.sections) {
    if (sectionSlugs.has(section.slug)) {
      issues.push({
        level: "error",
        code: "duplicate-section",
        message: `duplicate section slug "${section.slug}"`,
        where: section.slug,
      });
    }
    sectionSlugs.add(section.slug);
  }

  const stepSlugs = new Set<string>();
  for (const step of bundle.steps) {
    if (stepSlugs.has(step.slug)) {
      issues.push({
        level: "error",
        code: "duplicate-step",
        message: `duplicate step slug "${step.slug}"`,
        where: step.slug,
      });
    }
    stepSlugs.add(step.slug);

    if (!sectionSlugs.has(step.section_slug)) {
      issues.push({
        level: "error",
        code: "missing-section",
        message: `step "${step.slug}" references unknown section "${step.section_slug}"`,
        where: step.slug,
      });
    }
  }

  const benefitKeys = new Set<string>();
  for (const benefit of bundle.benefits) {
    const key = `${benefit.slug}@${benefit.valid_from}`;
    if (benefitKeys.has(key)) {
      issues.push({
        level: "error",
        code: "duplicate-benefit",
        message: `duplicate benefit "${benefit.slug}" for valid_from ${benefit.valid_from}`,
        where: benefit.slug,
      });
    }
    benefitKeys.add(key);
  }

  return issues;
}

function listJsonFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listJsonFiles(full));
    } else if (entry.endsWith(".json")) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * Load and validate every `*.json` bundle under `dir`. Returns the merged
 * bundle plus all schema + integrity issues found. Never throws on content
 * problems (they come back as issues); only throws on unreadable directories.
 */
export function loadContentDir(dir: string): { bundle: ContentBundle; issues: ContentIssue[] } {
  const files = listJsonFiles(dir);
  const parsed: ContentBundle[] = [];
  const issues: ContentIssue[] = [];

  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      issues.push({
        level: "error",
        code: "invalid-json",
        message: err instanceof Error ? err.message : String(err),
        where: file,
      });
      continue;
    }
    const { bundle, issues: fileIssues } = parseBundle(raw, file);
    issues.push(...fileIssues);
    if (bundle) parsed.push(bundle);
  }

  const merged = mergeBundles(parsed);
  issues.push(...checkIntegrity(merged));
  return { bundle: merged, issues };
}
