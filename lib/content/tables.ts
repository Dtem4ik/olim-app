/**
 * Zod schemas that mirror the `public` content tables (Phase 2a) and define the
 * content-authoring format consumed by the import/validator pipeline (Phase 2b).
 *
 * Two schema families per table:
 *  - `*Row`    — mirrors a DB row exactly (what you read back from Supabase).
 *  - `*Input`  — the authoring shape (what lives in content JSON): no server-set
 *                columns (id / created_at / updated_at), server defaults optional.
 *
 * Kept OUT of `lib/content/schema.ts` (the client-safe vocabulary) so these
 * heavier schemas never reach the browser bundle. Constraints mirror the SQL
 * CHECK constraints in `supabase/migrations/*_init_content_schema.sql`.
 */

import { z } from "zod";
import {
  condSchema,
  dateSchema,
  httpsUrlSchema,
  nonNegativeInt,
  slugSchema,
  stageSchema,
  timestampSchema,
  uuidSchema,
  warnRuleSchema,
} from "./schema";

// ---------------------------------------------------------------------------
// Nested content value objects (`steps.docs`, `steps.tips`)
// ---------------------------------------------------------------------------

/** A "bring with you" document. */
export const docSchema = z.object({
  label: z.string().min(1).max(200),
  note: z.string().max(400).optional(),
  required: z.boolean().optional(),
});
export type Doc = z.infer<typeof docSchema>;

/** A community tip. */
export const tipSchema = z.object({
  text: z.string().min(1).max(600),
  author: z.string().max(80).optional(),
});
export type Tip = z.infer<typeof tipSchema>;

// ---------------------------------------------------------------------------
// sections
// ---------------------------------------------------------------------------

export const sectionInputSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(120),
  description: z.string().max(400).nullish(),
  icon: z.string().max(64).nullish(),
  /** Optional hero photo (absolute URL). Falls back to a colour placeholder. */
  image_url: z.string().url().max(600).nullish(),
  sort_order: nonNegativeInt.default(0),
});
export type SectionInput = z.infer<typeof sectionInputSchema>;

export const sectionRowSchema = sectionInputSchema.extend({
  id: uuidSchema,
  description: z.string().nullable(),
  icon: z.string().nullable(),
  image_url: z.string().nullable(),
  sort_order: nonNegativeInt,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type SectionRow = z.infer<typeof sectionRowSchema>;

// ---------------------------------------------------------------------------
// steps
// ---------------------------------------------------------------------------

export const stepInputSchema = z.object({
  slug: slugSchema,
  section_slug: slugSchema,
  title: z.string().min(1).max(160),
  summary: z.string().max(400).nullish(),
  body_md: z.string().min(1).max(8000),
  docs: z.array(docSchema).default([]),
  warn_rule: warnRuleSchema.nullish(),
  tips: z.array(tipSchema).default([]),
  cond: condSchema.default({}),
  stage: stageSchema.nullish(),
  source_url: httpsUrlSchema,
  last_verified_at: dateSchema,
  needs_review: z.boolean().default(true),
  sort_order: nonNegativeInt.default(0),
});
export type StepInput = z.infer<typeof stepInputSchema>;

export const stepRowSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  section_slug: slugSchema,
  title: z.string().min(1).max(160),
  summary: z.string().nullable(),
  body_md: z.string().min(1).max(8000),
  docs: z.array(docSchema),
  warn_rule: warnRuleSchema.nullable(),
  tips: z.array(tipSchema),
  cond: condSchema,
  stage: stageSchema.nullable(),
  source_url: httpsUrlSchema,
  last_verified_at: dateSchema,
  needs_review: z.boolean(),
  sort_order: nonNegativeInt,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type StepRow = z.infer<typeof stepRowSchema>;

// ---------------------------------------------------------------------------
// benefits
// ---------------------------------------------------------------------------

export const benefitInputSchema = z
  .object({
    slug: slugSchema,
    title: z.string().min(1).max(200),
    amount: z.number().nonnegative().nullish(),
    currency: z.string().length(3).default("ILS"),
    unit: z.string().max(40).nullish(),
    valid_from: dateSchema,
    valid_to: dateSchema.nullish(),
    source_url: httpsUrlSchema,
    last_verified_at: dateSchema,
    notes: z.string().max(2000).nullish(),
    meta: z.record(z.string(), z.unknown()).default({}),
  })
  .refine((b) => b.valid_to == null || b.valid_to >= b.valid_from, {
    message: "valid_to must be on or after valid_from",
    path: ["valid_to"],
  });
export type BenefitInput = z.infer<typeof benefitInputSchema>;

export const benefitRowSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  title: z.string().min(1).max(200),
  amount: z.number().nullable(),
  currency: z.string().length(3),
  unit: z.string().nullable(),
  valid_from: dateSchema,
  valid_to: dateSchema.nullable(),
  source_url: httpsUrlSchema,
  last_verified_at: dateSchema,
  notes: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type BenefitRow = z.infer<typeof benefitRowSchema>;

// ---------------------------------------------------------------------------
// plans (user data — not authored content, but mirrored for type-safety)
// ---------------------------------------------------------------------------

export const planRowSchema = z.object({
  id: uuidSchema,
  share_slug: z.string().min(12),
  answers: z.record(z.string(), z.unknown()),
  done_step_ids: z.array(z.string()),
  user_id: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type PlanRow = z.infer<typeof planRowSchema>;

// ---------------------------------------------------------------------------
// step_reports
// ---------------------------------------------------------------------------

export const stepReportReasonSchema = z.enum(["outdated", "wrong-info", "broken-link", "other"]);
export type StepReportReason = z.infer<typeof stepReportReasonSchema>;

export const stepReportInputSchema = z.object({
  step_id: uuidSchema,
  reason: stepReportReasonSchema,
  comment: z.string().max(2000).nullish(),
});
export type StepReportInput = z.infer<typeof stepReportInputSchema>;

export const stepReportRowSchema = z.object({
  id: uuidSchema,
  step_id: uuidSchema,
  reason: stepReportReasonSchema,
  comment: z.string().nullable(),
  created_at: timestampSchema,
});
export type StepReportRow = z.infer<typeof stepReportRowSchema>;
