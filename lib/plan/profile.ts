/**
 * Onboarding profile (Phase 3) — the person's quiz answers.
 *
 * The vocabularies (stage / basis / family / country slug) are imported from
 * `lib/content/schema.ts` so the quiz and the content `cond` language share ONE
 * source of truth — no parallel enums. Persisted in localStorage under a
 * versioned key so a future schema change can migrate or discard cleanly.
 */

import { z } from "zod";
import {
  basisSchema,
  dateSchema,
  familySchema,
  slugSchema,
  stageSchema,
} from "@/lib/content/schema";

export const PROFILE_VERSION = 1;
export const PROFILE_STORAGE_KEY = `olim.profile.v${PROFILE_VERSION}`;

const age = z.int().min(0).max(120);
const monthsInCountry = z.int().min(0).max(1200);

/**
 * A completed profile. Single-valued answers (unlike `cond`, which lists accepted
 * options). Conditional fields are optional and only collected when relevant:
 * `childrenAges` for households with children, `monthsInCountry` once in country,
 * `flightDate` while preparing, `arrivalDate` once arrived.
 */
export const profileSchema = z
  .object({
    version: z.literal(PROFILE_VERSION),
    stage: stageSchema,
    basis: basisSchema,
    country: slugSchema.optional(),
    family: familySchema,
    pet: z.boolean(),
    childrenAges: z.array(age).optional(),
    monthsInCountry: monthsInCountry.optional(),
    city: z.string().trim().min(1).max(80).optional(),
    flightDate: dateSchema.optional(),
    arrivalDate: dateSchema.optional(),
  })
  .strict();

export type Profile = z.infer<typeof profileSchema>;

/** Answers being assembled during the quiz — every field optional until done. */
export type PartialProfile = Partial<Omit<Profile, "version">>;

/** True when the household includes children (so ages are relevant). */
export function hasChildren(family: Profile["family"] | undefined): boolean {
  return family === "with_children" || family === "single_parent";
}

/** True when the person is already in Israel (so months/arrival are relevant). */
export function isInCountry(stage: Profile["stage"] | undefined): boolean {
  return stage === "just_landed" || stage === "first_months" || stage === "settled";
}

/**
 * Parse an unknown value (e.g. from localStorage) into a Profile, or null if it
 * is missing/corrupt/outdated. Never throws.
 */
export function parseProfile(raw: unknown): Profile | null {
  const result = profileSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Read the stored profile from localStorage, or null. Safe on the server. */
export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!stored) return null;
  try {
    return parseProfile(JSON.parse(stored));
  } catch {
    return null;
  }
}

/** Persist a profile to localStorage. */
export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

/** Remove the stored profile (used by "start over"). */
export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
}
