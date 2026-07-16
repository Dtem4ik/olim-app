/**
 * content:import — validate a content dir, then idempotently upsert it into
 * Supabase. Safe to run repeatedly. Defaults to the LOCAL stack and the
 * committed fixtures; see scripts/_supabase.ts for the remote guardrail.
 *
 *   pnpm content:import                       # fixtures → local stack
 *   pnpm content:import --dir ../olim-content/content
 */

import type { Database, Json } from "@/lib/supabase/database.types";
import { gatherContent, parseCommonArgs, reportIssues } from "./_content";
import { createServiceClient, resolveTarget } from "./_supabase";

type SectionRow = Database["public"]["Tables"]["sections"]["Insert"];
type StepRow = Database["public"]["Tables"]["steps"]["Insert"];
type BenefitRow = Database["public"]["Tables"]["benefits"]["Insert"];

async function main(): Promise<void> {
  const { dir, url, serviceKey, allowRemote } = parseCommonArgs();

  // 1. Validate first — never import invalid content.
  const { bundle, issues } = gatherContent(dir);
  const errorCount = reportIssues(issues);
  if (errorCount > 0) {
    console.error(`\n✖ ${errorCount} error(s). Aborting import.`);
    process.exit(1);
  }

  // 2. Resolve a safe target (local unless --allow-remote).
  const target = resolveTarget({ url, serviceKey, allowRemote });
  console.log(`Importing ${dir} → ${target.url}${target.isLocal ? " (local)" : " (REMOTE)"}`);
  const db = createServiceClient(target);

  // 3. Upsert. Sections before steps (FK), benefits are independent.
  const sections: SectionRow[] = bundle.sections.map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description ?? null,
    icon: s.icon ?? null,
    image_url: s.image_url ?? null,
    sort_order: s.sort_order,
  }));

  const steps: StepRow[] = bundle.steps.map((s) => ({
    slug: s.slug,
    section_slug: s.section_slug,
    title: s.title,
    summary: s.summary ?? null,
    body_md: s.body_md,
    docs: s.docs,
    warn_rule: s.warn_rule ?? null,
    tips: s.tips,
    cond: s.cond,
    stage: s.stage ?? null,
    source_url: s.source_url,
    last_verified_at: s.last_verified_at,
    needs_review: s.needs_review,
    sort_order: s.sort_order,
  }));

  const benefits: BenefitRow[] = bundle.benefits.map((b) => ({
    slug: b.slug,
    title: b.title,
    amount: b.amount ?? null,
    currency: b.currency,
    unit: b.unit ?? null,
    valid_from: b.valid_from,
    valid_to: b.valid_to ?? null,
    source_url: b.source_url,
    last_verified_at: b.last_verified_at,
    notes: b.notes ?? null,
    meta: b.meta as Json,
  }));

  if (sections.length) {
    const { error } = await db.from("sections").upsert(sections, { onConflict: "slug" });
    if (error) throw new Error(`sections upsert failed: ${error.message}`);
  }
  if (steps.length) {
    const { error } = await db.from("steps").upsert(steps, { onConflict: "slug" });
    if (error) throw new Error(`steps upsert failed: ${error.message}`);
  }
  if (benefits.length) {
    const { error } = await db.from("benefits").upsert(benefits, { onConflict: "slug,valid_from" });
    if (error) throw new Error(`benefits upsert failed: ${error.message}`);
  }

  console.log(
    `✓ Imported ${sections.length} sections, ${steps.length} steps, ${benefits.length} benefits.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
