/**
 * Zod schemas that mirror the `public` content tables (Phase 2a) and define the
 * content-authoring format consumed by the import/validator pipeline (Phase 2b).
 *
 * Two schema families per table:
 *  - `*Row`    — mirrors a DB row exactly (what you read back from Supabase).
 *  - `*Input`  — the authoring shape (what lives in content JSON): no server-set
 *                columns (id / created_at / updated_at), server defaults optional.
 *
 * Constraints here intentionally mirror the SQL CHECK constraints in
 * `supabase/migrations/*_init_content_schema.sql`, so bad content is rejected by
 * the validator before it ever reaches the database.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** kebab-case identifier, matches the SQL `*_slug_format` checks. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case (a-z, 0-9, single hyphens)");

/** Trusted-source link. Must be https (mirrors `*_source_url_https`). */
export const httpsUrlSchema = z
  .url()
  .refine((u) => u.startsWith("https://"), "must be an https:// URL");

/** Calendar date `YYYY-MM-DD` (Postgres `date`). */
export const dateSchema = z.iso.date();

/** ISO timestamp (Postgres `timestamptz`). */
export const timestampSchema = z.iso.datetime({ offset: true });

const uuidSchema = z.uuid();
const nonNegativeInt = z.int().nonnegative();
const positiveInt = z.int().positive();

// ---------------------------------------------------------------------------
// Personalization vocabulary + condition language (`steps.cond`)
// ---------------------------------------------------------------------------
// These vocabularies are the shared source of truth for both content conditions
// and the Phase 3 quiz answers. They are centralized here so the quiz reuses
// them; extend here (not ad hoc) when new answer options are introduced.

/** Where the person is in the aliyah lifecycle. */
export const stageSchema = z.enum(["preparing", "just_landed", "first_months", "settled"]);
export type Stage = z.infer<typeof stageSchema>;

/** Eligibility basis under the Law of Return / status on arrival. */
export const basisSchema = z.enum([
  "jewish",
  "descendant",
  "spouse",
  "returning_resident",
  "returning_citizen",
  "other",
]);
export type Basis = z.infer<typeof basisSchema>;

/** Household composition. */
export const familySchema = z.enum(["single", "couple", "with_children", "single_parent"]);
export type Family = z.infer<typeof familySchema>;

/** Inclusive numeric range; at least one bound required. */
export const rangeSchema = z
  .object({ min: nonNegativeInt.optional(), max: nonNegativeInt.optional() })
  .refine((r) => r.min !== undefined || r.max !== undefined, "range needs a min or a max")
  .refine((r) => r.min === undefined || r.max === undefined || r.min <= r.max, "min must be ≤ max");
export type Range = z.infer<typeof rangeSchema>;

/** A value that may be given as a single option or a list of accepted options. */
const oneOrMany = <T extends z.ZodType>(inner: T) => z.union([inner, z.array(inner).nonempty()]);

/**
 * Condition language for `steps.cond`. A step is shown when EVERY present key
 * matches the person's answers. An absent key means "no constraint". `country`
 * is a free-form lowercased origin-country slug (many possible values).
 */
export const condSchema = z
  .object({
    stage: oneOrMany(stageSchema).optional(),
    basis: oneOrMany(basisSchema).optional(),
    country: oneOrMany(slugSchema).optional(),
    family: oneOrMany(familySchema).optional(),
    pet: z.boolean().optional(),
    children_ages: rangeSchema.optional(),
    months_in_country: rangeSchema.optional(),
  })
  .strict();
export type Cond = z.infer<typeof condSchema>;

// ---------------------------------------------------------------------------
// Deadline warnings (`steps.warn_rule`)
// ---------------------------------------------------------------------------
// Discriminated on `type`. `days` is the window length; the anchor date comes
// from the user's plan (flight date, arrival date) at render time (Phase 3/4).

export const warnRuleSchema = z.discriminatedUnion("type", [
  // Expires N days after an anchor event (e.g. a document's validity window).
  z.object({ type: z.literal("expires_days"), days: positiveInt, label: z.string().optional() }),
  // Must be done N days BEFORE the flight.
  z.object({
    type: z.literal("deadline_before_flight_days"),
    days: positiveInt,
    label: z.string().optional(),
  }),
  // Must be done within N days AFTER arrival.
  z.object({
    type: z.literal("deadline_after_arrival_days"),
    days: positiveInt,
    label: z.string().optional(),
  }),
]);
export type WarnRule = z.infer<typeof warnRuleSchema>;

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
  sort_order: nonNegativeInt.default(0),
});
export type SectionInput = z.infer<typeof sectionInputSchema>;

export const sectionRowSchema = sectionInputSchema.extend({
  id: uuidSchema,
  description: z.string().nullable(),
  icon: z.string().nullable(),
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
