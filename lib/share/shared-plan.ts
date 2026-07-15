/**
 * Shared-plan snapshot (Phase 5) — the privacy-safe subset of a profile that a
 * shared `/plan/{slug}` page is built from.
 *
 * A shared plan must NOT expose city or any free-text field, nor the person's
 * exact flight/arrival dates (AGENTS.md privacy). So the snapshot keeps only the
 * `cond`-relevant answers needed to reproduce the matched step set — enough to
 * render stage-grouped step titles + a progress count, nothing identifying.
 */

import { z } from "zod";
import { basisSchema, familySchema, slugSchema, stageSchema } from "@/lib/content/schema";
import type { PlanAnswers } from "@/lib/plan/build-plan";
import type { Profile } from "@/lib/plan/profile";

const age = z.int().min(0).max(120);

/** The stored, privacy-safe answers snapshot. No city, no dates, no free text. */
export const sharedAnswersSchema = z
  .object({
    stage: stageSchema,
    basis: basisSchema,
    country: slugSchema.optional(),
    family: familySchema,
    pet: z.boolean(),
    childrenAges: z.array(age).max(20).optional(),
    monthsInCountry: z.int().min(0).max(1200).optional(),
  })
  .strict();

export type SharedAnswers = z.infer<typeof sharedAnswersSchema>;

/** Done steps are stored as slugs (the progress store is slug-keyed). Capped. */
export const sharedDoneSchema = z.array(slugSchema).max(500);

/**
 * Strip a profile down to the shareable snapshot: drop `city`, `flightDate`,
 * `arrivalDate` and the version tag. Because dates are gone, the shared plan
 * renders no deadline badges (they'd leak the arrival date) — by design.
 */
export function toSharedAnswers(profile: Profile): SharedAnswers {
  const shared: SharedAnswers = {
    stage: profile.stage,
    basis: profile.basis,
    family: profile.family,
    pet: profile.pet,
  };
  if (profile.country !== undefined) shared.country = profile.country;
  if (profile.childrenAges !== undefined) shared.childrenAges = profile.childrenAges;
  if (profile.monthsInCountry !== undefined) shared.monthsInCountry = profile.monthsInCountry;
  return shared;
}

/** The snapshot is assignable to the engine's PlanAnswers (dates simply absent). */
export function toPlanAnswers(shared: SharedAnswers): PlanAnswers {
  return shared;
}
