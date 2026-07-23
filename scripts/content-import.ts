/**
 * content:import — validate a content dir, then idempotently upsert it into
 * Supabase. Safe to run repeatedly. Defaults to the LOCAL stack and the
 * committed fixtures; see scripts/_supabase.ts for the remote guardrail.
 *
 *   pnpm content:import                       # fixtures → local stack
 *   pnpm content:import --dir ../olim-content/content
 */

import { isAiConfigured } from "@/lib/rag/config";
import { embedDocuments, toVectorLiteral } from "@/lib/rag/embeddings";
import { buildStepEmbeddingText } from "@/lib/rag/step-text";
import type { Database, Json } from "@/lib/supabase/database.types";
import { gatherContent, parseCommonArgs, reportIssues } from "./_content";
import { createServiceClient, resolveTarget } from "./_supabase";

/** Gemini's batchEmbedContents is generous; 46 steps fit trivially. Chunk anyway. */
const EMBED_BATCH = 100;

type SectionRow = Database["public"]["Tables"]["sections"]["Insert"];
type StepRow = Database["public"]["Tables"]["steps"]["Insert"];
type BenefitRow = Database["public"]["Tables"]["benefits"]["Insert"];

async function main(): Promise<void> {
  const { dir, url, serviceKey, allowRemote, skipEmbeddings } = parseCommonArgs();

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

  // Embeddings for hybrid AI retrieval (Phase 8a). Computed at import time only —
  // never per query. Gated on GEMINI_API_KEY: absent (or --skip-embeddings) → the
  // column is left untouched (upsert omits it), so existing vectors are preserved
  // and a keyless import (CI/local without a key) still succeeds. A transient
  // embedding failure is a warning, not a failed import.
  await attachEmbeddings(steps, bundle.steps, skipEmbeddings);

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

  await triggerRevalidate();
}

/**
 * Compute and attach embeddings to the step rows in place. Batches to keep a
 * single import call cheap and resilient. No-op (with a printed reason) when the
 * key is missing or `--skip-embeddings` is passed.
 */
async function attachEmbeddings(
  rows: StepRow[],
  inputs: { title: string; summary?: string | null; body_md: string }[],
  skip: boolean,
): Promise<void> {
  if (skip) {
    console.log("• Skipping embeddings (--skip-embeddings).");
    return;
  }
  if (!isAiConfigured()) {
    console.log("• GEMINI_API_KEY not set — skipping embeddings (existing vectors preserved).");
    return;
  }
  try {
    const texts = inputs.map(buildStepEmbeddingText);
    let done = 0;
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const batch = texts.slice(i, i + EMBED_BATCH);
      const vectors = await embedDocuments(batch);
      vectors.forEach((v, j) => {
        const row = rows[i + j];
        if (row) row.embedding = toVectorLiteral(v);
      });
      done += batch.length;
    }
    console.log(`✓ Embedded ${done} steps (gemini-embedding-001, 768d).`);
  } catch (err) {
    console.warn(
      `! Embedding failed (${err instanceof Error ? err.message : err}) — importing without ` +
        "updated vectors. Re-run once the key/quota is available.",
    );
  }
}

/**
 * Ping the deployed site's on-demand revalidation endpoint so the freshly imported
 * content goes live without a redeploy (Phase 6b). No-op unless both
 * SITE_REVALIDATE_URL and REVALIDATE_SECRET are set — so local imports skip it.
 * Never fails the import: a revalidation hiccup shouldn't undo a successful upsert.
 */
async function triggerRevalidate(): Promise<void> {
  const url = process.env.SITE_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
    });
    if (res.ok) console.log(`✓ Revalidated ${url}`);
    else console.warn(`! Revalidate returned ${res.status} (content imported, site may be stale)`);
  } catch (err) {
    console.warn(`! Revalidate failed: ${err instanceof Error ? err.message : err}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
