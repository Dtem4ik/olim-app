/**
 * content:validate — schema + integrity + editorial lint over a content dir.
 * CI-facing: exits non-zero when any error-level issue is found. Warnings do
 * not fail the build. Defaults to the committed fixtures.
 */

import { gatherContent, parseCommonArgs, reportIssues } from "./_content";

function main(): void {
  const { dir } = parseCommonArgs();
  const { bundle, issues } = gatherContent(dir);

  console.log(
    `Validating ${dir}: ${bundle.sections.length} sections, ${bundle.steps.length} steps, ` +
      `${bundle.benefits.length} benefits`,
  );

  const errorCount = reportIssues(issues);
  if (errorCount > 0) {
    console.error(`\n✖ ${errorCount} error(s). Content is invalid.`);
    process.exit(1);
  }
  console.log("\n✓ Content is valid.");
}

main();
