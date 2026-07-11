/**
 * content:review-queue — list steps still flagged `needs_review = true` in the
 * database, so the human editor knows what is left to approve. Reads from the
 * LOCAL stack by default (same target guardrail as the import).
 *
 *   pnpm content:review-queue
 */

import { parseCommonArgs } from "./_content";
import { createServiceClient, resolveTarget } from "./_supabase";

async function main(): Promise<void> {
  const { url, serviceKey, allowRemote } = parseCommonArgs();
  const target = resolveTarget({ url, serviceKey, allowRemote });
  const db = createServiceClient(target);

  const { data, error } = await db
    .from("steps")
    .select("slug, section_slug, title, last_verified_at")
    .eq("needs_review", true)
    .order("section_slug", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`query failed: ${error.message}`);

  if (!data || data.length === 0) {
    console.log("✓ Review queue is empty — every step has been reviewed.");
    return;
  }

  console.log(`${data.length} step(s) awaiting review (${target.url}):\n`);
  let currentSection = "";
  for (const step of data) {
    if (step.section_slug !== currentSection) {
      currentSection = step.section_slug;
      console.log(`  ${currentSection}`);
    }
    console.log(`    · ${step.slug} — ${step.title}  (verified ${step.last_verified_at})`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
