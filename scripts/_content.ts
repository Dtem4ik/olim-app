/** Shared helpers for the content CLI scripts. */

import { parseArgs } from "node:util";
import { type ContentBundle, type ContentIssue, loadContentDir } from "@/lib/content/bundle";
import { lintBundle } from "@/lib/content/lint";

export const DEFAULT_CONTENT_DIR = "content/fixtures";

/** Parse `--dir`, `--url`, `--service-key`, `--allow-remote` from argv. */
export function parseCommonArgs(): {
  dir: string;
  url?: string;
  serviceKey?: string;
  allowRemote: boolean;
} {
  const { values } = parseArgs({
    options: {
      dir: { type: "string" },
      url: { type: "string" },
      "service-key": { type: "string" },
      "allow-remote": { type: "boolean", default: false },
    },
    allowPositionals: false,
  });
  return {
    dir: values.dir ?? DEFAULT_CONTENT_DIR,
    url: values.url,
    serviceKey: values["service-key"],
    allowRemote: values["allow-remote"] ?? false,
  };
}

/** Load a content directory and run schema + integrity + lint checks. */
export function gatherContent(dir: string): { bundle: ContentBundle; issues: ContentIssue[] } {
  const { bundle, issues } = loadContentDir(dir);
  const lintIssues = lintBundle(bundle);
  return { bundle, issues: [...issues, ...lintIssues] };
}

/** Print issues grouped by level; return the error count. */
export function reportIssues(issues: ContentIssue[]): number {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  for (const issue of warnings) {
    console.warn(`  ⚠ [${issue.code}] ${issue.where ?? ""} — ${issue.message}`);
  }
  for (const issue of errors) {
    console.error(`  ✖ [${issue.code}] ${issue.where ?? ""} — ${issue.message}`);
  }
  return errors.length;
}
