/**
 * Condition engine (Phase 3) — the product core.
 *
 * `buildPlan(answers, steps)` filters steps by the `cond` language, sorts them by
 * lifecycle stage then `sort_order`, and attaches deadline warnings computed from
 * each step's `warn_rule` and the person's dates. Pure and fully unit-tested.
 */

import type { Basis, Cond, Family, Range, Stage, WarnRule } from "@/lib/content/schema";
import { type DeadlineStatus, getDeadlineStatus } from "@/lib/deadline";

/** Minimal step shape the engine needs (satisfied by StepInput / StepRow). */
export interface EngineStep {
  slug: string;
  section_slug: string;
  title: string;
  stage?: Stage | null;
  sort_order: number;
  cond: Cond;
  warn_rule?: WarnRule | null;
}

/** The person's single-valued answers (Profile is assignable to this). */
export interface PlanAnswers {
  stage: Stage;
  basis: Basis;
  country?: string;
  family: Family;
  pet: boolean;
  childrenAges?: number[];
  monthsInCountry?: number;
  flightDate?: string;
  arrivalDate?: string;
}

export interface PlanWarning {
  rule: WarnRule;
  /** ISO date (YYYY-MM-DD) of the deadline, or null when the anchor date is unknown. */
  due: string | null;
  /** Urgency vs. today, or null when there is no computable due date. */
  status: DeadlineStatus | null;
}

export interface PlanEntry {
  step: EngineStep;
  warning: PlanWarning | null;
}

export interface PlanStageGroup {
  stage: Stage | null;
  entries: PlanEntry[];
}

export interface PersonalPlan {
  /** Matched steps, sorted by stage then sort_order. */
  entries: PlanEntry[];
  /** The same entries grouped by stage, in lifecycle order (for the preview UI). */
  stages: PlanStageGroup[];
  /** Convenience: slugs of the matched steps, in order. */
  stepSlugs: string[];
}

/** Lifecycle order; steps without a stage sort last. */
const STAGE_ORDER: Stage[] = ["preparing", "just_landed", "first_months", "settled"];

function stageIndex(stage: Stage | null | undefined): number {
  const i = stage ? STAGE_ORDER.indexOf(stage) : -1;
  return i === -1 ? STAGE_ORDER.length : i;
}

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function inRange(value: number, range: Range): boolean {
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

/**
 * Does a step's condition match the answers? Every present key must match; an
 * absent key is no constraint. When a condition needs an answer the person did
 * not provide (country, children ages, months in country), it does not match.
 */
export function matchesCond(cond: Cond, answers: PlanAnswers): boolean {
  if (cond.stage !== undefined && !toArray(cond.stage).includes(answers.stage)) return false;
  if (cond.basis !== undefined && !toArray(cond.basis).includes(answers.basis)) return false;

  if (cond.country !== undefined) {
    if (answers.country === undefined || !toArray(cond.country).includes(answers.country)) {
      return false;
    }
  }

  if (cond.family !== undefined && !toArray(cond.family).includes(answers.family)) return false;

  if (cond.pet !== undefined && cond.pet !== answers.pet) return false;

  if (cond.children_ages !== undefined) {
    const range = cond.children_ages;
    const ages = answers.childrenAges;
    if (ages === undefined || !ages.some((a) => inRange(a, range))) return false;
  }

  if (cond.months_in_country !== undefined) {
    if (
      answers.monthsInCountry === undefined ||
      !inRange(answers.monthsInCountry, cond.months_in_country)
    ) {
      return false;
    }
  }

  return true;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Resolve a step's warn_rule against the person's dates into a concrete deadline.
 * Returns a warning with a null `due`/`status` when the required anchor date
 * (flight date / arrival date) is not in the profile — the rule still surfaces.
 */
export function computeWarning(rule: WarnRule, answers: PlanAnswers, now: Date): PlanWarning {
  let anchor: string | undefined;
  let dueDate: Date | null = null;

  if (rule.type === "deadline_before_flight_days") {
    anchor = answers.flightDate;
    if (anchor) dueDate = addDays(parseISODate(anchor), -rule.days);
  } else {
    // deadline_after_arrival_days and expires_days both anchor on arrival.
    anchor = answers.arrivalDate;
    if (anchor) dueDate = addDays(parseISODate(anchor), rule.days);
  }

  if (!dueDate) return { rule, due: null, status: null };
  return { rule, due: toISODate(dueDate), status: getDeadlineStatus(dueDate, now) };
}

/**
 * Build a personalized plan from answers and the full step set.
 * `now` is injectable for deterministic tests.
 */
export function buildPlan(
  answers: PlanAnswers,
  steps: readonly EngineStep[],
  now: Date = new Date(),
): PersonalPlan {
  const matched = steps.filter((step) => matchesCond(step.cond, answers));

  matched.sort((a, b) => {
    const byStage = stageIndex(a.stage) - stageIndex(b.stage);
    if (byStage !== 0) return byStage;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.slug.localeCompare(b.slug);
  });

  const entries: PlanEntry[] = matched.map((step) => ({
    step,
    warning: step.warn_rule ? computeWarning(step.warn_rule, answers, now) : null,
  }));

  const stages: PlanStageGroup[] = [];
  for (const entry of entries) {
    const stage = entry.step.stage ?? null;
    const last = stages.at(-1);
    if (last && last.stage === stage) {
      last.entries.push(entry);
    } else {
      stages.push({ stage, entries: [entry] });
    }
  }

  return { entries, stages, stepSlugs: entries.map((e) => e.step.slug) };
}
