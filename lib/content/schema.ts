/**
 * Shared content vocabulary + condition language (Phase 2a/3).
 *
 * This module holds ONLY the lightweight primitives and personalization
 * vocabulary (stage / basis / family / country slug, the `cond` condition
 * language and `warn_rule` types). They are the single source of truth reused by
 * BOTH the content pipeline and the Phase 3 quiz, so this file must stay
 * client-safe and cheap to bundle.
 *
 * The heavier table schemas (`sections` / `steps` / `benefits` / `plans` /
 * `step_reports`, mirroring the SQL in `supabase/migrations/*`) live in
 * `lib/content/tables.ts` so they never reach the browser bundle.
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

export const uuidSchema = z.uuid();
export const nonNegativeInt = z.int().nonnegative();
export const positiveInt = z.int().positive();

// ---------------------------------------------------------------------------
// Personalization vocabulary + condition language (`steps.cond`)
// ---------------------------------------------------------------------------
// These vocabularies are the shared source of truth for both content conditions
// and the Phase 3 quiz answers. They are centralized here so the quiz reuses
// them; extend here (not ad hoc) when new answer options are introduced.

/** Where the person is in the aliyah lifecycle. */
export const stageSchema = z.enum(["preparing", "just_landed", "first_months", "settled"]);
export type Stage = z.infer<typeof stageSchema>;

/**
 * Eligibility basis under the Law of Return / status on arrival.
 * `child_of_jew` and `grandchild_of_jew` are split deliberately: a grandchild
 * needs a two-generation archival paper trail (the longest part of preparation)
 * and their spouse's rights and refusal risks differ from a child's — this fork
 * drives a large share of the personalization value.
 */
export const basisSchema = z.enum([
  "jewish",
  "child_of_jew",
  "grandchild_of_jew",
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
