"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { basisSchema, familySchema, stageSchema } from "@/lib/content/schema";
import { buildPlan, type EngineStep, type PlanAnswers } from "@/lib/plan/build-plan";
import {
  clearProfile,
  hasChildren,
  isInCountry,
  loadProfile,
  type Profile,
  profileSchema,
  saveProfile,
} from "@/lib/plan/profile";
import { cn } from "@/lib/utils";

/** Origin countries offered in the quiz (slugs match the content `cond.country`). */
const COUNTRY_OPTIONS = [
  "russia",
  "ukraine",
  "belarus",
  "kazakhstan",
  "usa",
  "france",
  "germany",
  "other",
] as const;

type Draft = {
  stage?: Profile["stage"];
  basis?: Profile["basis"];
  country?: string;
  family?: Profile["family"];
  childrenAges?: number[];
  pet?: boolean;
  arrivalDate?: string;
  flightDate?: string;
  city?: string;
};

type Question =
  | {
      id: "stage" | "basis" | "country" | "family";
      kind: "select";
      options: readonly string[];
      when?: (d: Draft) => boolean;
    }
  | { id: "pet"; kind: "boolean"; when?: (d: Draft) => boolean }
  | { id: "childrenAges"; kind: "ages"; when: (d: Draft) => boolean }
  | { id: "arrivalDate" | "flightDate"; kind: "date"; when: (d: Draft) => boolean }
  | { id: "city"; kind: "text"; when?: (d: Draft) => boolean };

const QUESTIONS: Question[] = [
  { id: "stage", kind: "select", options: stageSchema.options },
  { id: "basis", kind: "select", options: basisSchema.options },
  { id: "country", kind: "select", options: COUNTRY_OPTIONS },
  { id: "family", kind: "select", options: familySchema.options },
  { id: "childrenAges", kind: "ages", when: (d) => hasChildren(d.family) },
  { id: "pet", kind: "boolean" },
  { id: "arrivalDate", kind: "date", when: (d) => isInCountry(d.stage) },
  { id: "flightDate", kind: "date", when: (d) => d.stage === "preparing" },
  { id: "city", kind: "text" },
];

/** Whole months between an ISO date and now (for `cond.months_in_country`). */
function monthsSince(iso: string, now: Date): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() - m + 1);
  const dayAdjusted = now.getDate() < d ? months - 1 : months;
  return Math.max(0, dayAdjusted);
}

function draftToProfile(draft: Draft, now: Date): Profile | null {
  const inCountry = isInCountry(draft.stage);
  const candidate = {
    version: 1 as const,
    stage: draft.stage,
    basis: draft.basis,
    country: draft.country,
    family: draft.family,
    pet: draft.pet,
    childrenAges: hasChildren(draft.family) ? draft.childrenAges : undefined,
    monthsInCountry:
      inCountry && draft.arrivalDate ? monthsSince(draft.arrivalDate, now) : undefined,
    city: draft.city?.trim() || undefined,
    arrivalDate: inCountry ? draft.arrivalDate : undefined,
    flightDate: draft.stage === "preparing" ? draft.flightDate : undefined,
  };
  const result = profileSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

type Phase = "intro" | "quiz" | "preview";

export function OnboardingFlow({ steps }: { steps: EngineStep[] }) {
  const t = useTranslations("onboarding");
  const [phase, setPhase] = useState<Phase>("intro");
  const [draft, setDraft] = useState<Draft>({});
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Hydrate a saved profile after mount (localStorage is client-only). SSR and
  // the first client render both show the intro, so there is no mismatch.
  useEffect(() => {
    const saved = loadProfile();
    if (saved) {
      setProfile(saved);
      setDraft(saved);
      setPhase("preview");
    }
  }, []);

  const visible = useMemo(() => QUESTIONS.filter((q) => !q.when || q.when(draft)), [draft]);
  const current = visible[Math.min(index, visible.length - 1)];

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const isAnswered = (q: Question): boolean => {
    if (q.kind === "select") return draft[q.id] !== undefined;
    if (q.kind === "boolean") return draft.pet !== undefined;
    return true; // date / text / ages are optional
  };

  function goNext() {
    if (!current) return;
    if (index >= visible.length - 1) {
      const built = draftToProfile(draft, new Date());
      if (built) {
        saveProfile(built);
        setProfile(built);
        setPhase("preview");
      }
      return;
    }
    setIndex((i) => i + 1);
  }

  function goBack() {
    if (index === 0) {
      setPhase("intro");
      return;
    }
    setIndex((i) => i - 1);
  }

  if (phase === "intro") {
    return (
      <section
        className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6"
        data-testid="onboarding-intro"
      >
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-balance">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          size="lg"
          className="w-full"
          data-testid="onboarding-start"
          onClick={() => {
            setIndex(0);
            setPhase("quiz");
          }}
        >
          {t("start")}
        </Button>
      </section>
    );
  }

  if (phase === "preview" && profile) {
    return (
      <PlanPreview
        steps={steps}
        profile={profile}
        onEdit={() => {
          setDraft(profile);
          setIndex(0);
          setPhase("quiz");
        }}
        onStartOver={() => {
          clearProfile();
          setDraft({});
          setIndex(0);
          setProfile(null);
          setPhase("intro");
        }}
      />
    );
  }

  if (!current) return null;

  const headingId = `q-${current.id}`;
  const stepNumber = index + 1;

  return (
    <section
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6"
      data-testid="onboarding-quiz"
    >
      <div className="space-y-2">
        <Progress
          value={(stepNumber / visible.length) * 100}
          aria-label={t("progress", { current: stepNumber, total: visible.length })}
        />
        <p className="text-sm text-muted-foreground">
          {t("progress", { current: stepNumber, total: visible.length })}
        </p>
      </div>

      <div className="flex-1 space-y-4">
        <h1 id={headingId} className="text-xl font-semibold text-balance">
          {t(`questions.${current.id}.label`)}
        </h1>

        {current.kind === "select" && (
          <RadioGroup
            aria-labelledby={headingId}
            value={String(draft[current.id] ?? "")}
            onValueChange={(v) => set(current.id, v as never)}
            className="gap-2"
          >
            {current.options.map((opt) => (
              <OptionRow
                key={opt}
                value={opt}
                selected={draft[current.id] === opt}
                label={optionLabel(t, current.id, opt)}
              />
            ))}
          </RadioGroup>
        )}

        {current.kind === "boolean" && (
          <RadioGroup
            aria-labelledby={headingId}
            value={draft.pet === undefined ? "" : draft.pet ? "yes" : "no"}
            onValueChange={(v) => set("pet", v === "yes")}
            className="gap-2"
          >
            <OptionRow
              value="pet-yes"
              selected={draft.pet === true}
              label={t("questions.pet.options.yes")}
            />
            <OptionRow
              value="pet-no"
              selected={draft.pet === false}
              label={t("questions.pet.options.no")}
            />
          </RadioGroup>
        )}

        {current.kind === "ages" && (
          <ChildrenAges
            ages={draft.childrenAges ?? []}
            onChange={(ages) => set("childrenAges", ages)}
          />
        )}

        {current.kind === "date" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t(`questions.${current.id}.help`)}</p>
            <Input
              type="date"
              aria-labelledby={headingId}
              value={draft[current.id] ?? ""}
              onChange={(e) => set(current.id, e.target.value || undefined)}
              data-testid="onboarding-date"
            />
            <p className="text-xs text-muted-foreground">{t("optional")}</p>
          </div>
        )}

        {current.kind === "text" && (
          <div className="space-y-2">
            <Input
              aria-labelledby={headingId}
              value={draft.city ?? ""}
              placeholder={t("questions.city.placeholder")}
              onChange={(e) => set("city", e.target.value || undefined)}
              data-testid="onboarding-city"
            />
            <p className="text-xs text-muted-foreground">{t("optional")}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={goBack}
          data-testid="onboarding-back"
        >
          {t("back")}
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={goNext}
          disabled={!isAnswered(current)}
          data-testid="onboarding-next"
        >
          {index >= visible.length - 1 ? t("finish") : t("next")}
        </Button>
      </div>
    </section>
  );
}

function optionLabel(
  t: ReturnType<typeof useTranslations>,
  id: Question["id"],
  value: string,
): string {
  return id === "stage" ? t(`stages.${value}`) : t(`questions.${id}.options.${value}`);
}

/** Full-width, ≥44px tappable option wrapping the (small) radio dot. */
function OptionRow({
  value,
  selected,
  label,
}: {
  value: string;
  selected: boolean;
  label: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the label wraps the RadioGroupItem so the whole ≥44px row is the tap target
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
      )}
      data-testid="onboarding-option"
    >
      <RadioGroupItem value={value} aria-label={label} />
      <span>{label}</span>
    </label>
  );
}

function ChildrenAges({ ages, onChange }: { ages: number[]; onChange: (ages: number[]) => void }) {
  const t = useTranslations("onboarding");
  const [value, setValue] = useState("");

  function add() {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n) || n < 0 || n > 120) return;
    onChange([...ages, n]);
    setValue("");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("questions.childrenAges.help")}</p>
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          max={120}
          inputMode="numeric"
          value={value}
          placeholder={t("questions.childrenAges.placeholder")}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          data-testid="onboarding-age-input"
        />
        <Button type="button" variant="outline" onClick={add} data-testid="onboarding-age-add">
          {t("questions.childrenAges.add")}
        </Button>
      </div>
      {ages.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("questions.childrenAges.empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid="onboarding-age-chips">
          {ages.map((age, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: ages may repeat, so list position is the stable identity
            <li key={`${age}-${i}`}>
              <Badge variant="secondary" className="gap-2">
                {age}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t("questions.childrenAges.remove")}
                  onClick={() => onChange(ages.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanPreview({
  steps,
  profile,
  onEdit,
  onStartOver,
}: {
  steps: EngineStep[];
  profile: Profile;
  onEdit: () => void;
  onStartOver: () => void;
}) {
  const t = useTranslations("onboarding");
  const plan = useMemo(() => buildPlan(profile as PlanAnswers, steps), [profile, steps]);

  return (
    <section
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6"
      data-testid="onboarding-preview"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("preview.title")}</h1>
        <p className="text-muted-foreground">
          {t("preview.subtitle", { count: plan.entries.length })}
        </p>
      </div>

      {plan.entries.length === 0 ? (
        <p className="text-muted-foreground">{t("preview.empty")}</p>
      ) : (
        <div className="flex-1 space-y-6" data-testid="plan-groups">
          {plan.stages.map((group) => (
            <div key={group.stage ?? "none"} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {group.stage ? t(`stages.${group.stage}`) : t("preview.noStage")}
              </h2>
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <li
                    key={entry.step.slug}
                    className="rounded-lg border border-border px-4 py-3 text-sm"
                    data-testid="plan-step"
                    data-slug={entry.step.slug}
                  >
                    <span>{entry.step.title}</span>
                    {entry.warning?.due && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {t("preview.deadline")}: {entry.warning.due}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={onEdit}
          data-testid="onboarding-edit"
        >
          {t("editAnswers")}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="flex-1"
          onClick={onStartOver}
          data-testid="onboarding-startover"
        >
          {t("startOver")}
        </Button>
      </div>
    </section>
  );
}
