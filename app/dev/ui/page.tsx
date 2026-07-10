"use client";

import { Banknote, Briefcase, HeartPulse, Inbox, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { ChecklistItem } from "@/components/checklist-item";
import { DeadlineBadge } from "@/components/deadline-badge";
import { EmptyState } from "@/components/empty-state";
import { SearchBar } from "@/components/search-bar";
import { SectionTile } from "@/components/section-tile";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { StepCard } from "@/components/step-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

// Deterministic "today" so deadline badges render the same on every load.
const NOW = new Date("2026-07-10T09:00:00");
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="rounded-2xl border bg-surface p-5">{children}</div>
    </section>
  );
}

function ChecklistDemo() {
  const [done, setDone] = useState<Record<string, boolean>>({ a: true, b: false });
  return (
    <div className="flex flex-col">
      <ChecklistItem
        label="Открыть банковский счёт"
        description="Теудат зеут + теудат оле"
        checked={done.a ?? false}
        onCheckedChange={(v) => setDone((s) => ({ ...s, a: v }))}
      />
      <ChecklistItem
        label="Записаться в купат холим"
        checked={done.b ?? false}
        onCheckedChange={(v) => setDone((s) => ({ ...s, b: v }))}
      />
    </div>
  );
}

function SearchDemo() {
  const [value, setValue] = useState("");
  return <SearchBar value={value} onChange={setValue} />;
}

export default function DevUiPage() {
  const t = useTranslations("devUi");
  const tSections = useTranslations("sections");
  const tSteps = useTranslations("steps");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-col gap-8">
        <Group title={t("sectionTiles")}>
          <div className="grid grid-cols-2 gap-3">
            <SectionTile
              title={tSections("banks.title")}
              description={tSections("banks.description")}
              icon={Banknote}
              href="/dev/ui"
              count={8}
            />
            <SectionTile
              title={tSections("rent.title")}
              description={tSections("rent.description")}
              icon={KeyRound}
              href="/dev/ui"
              count={5}
            />
            <SectionTile
              title={tSections("health.title")}
              description={tSections("health.description")}
              icon={HeartPulse}
              href="/dev/ui"
            />
            <SectionTile
              title={tSections("work.title")}
              description={tSections("work.description")}
              icon={Briefcase}
              href="/dev/ui"
              count={12}
            />
          </div>
        </Group>

        <Group title={t("stepCards")}>
          <div className="flex flex-col gap-3">
            <StepCard
              title={tSteps("openAccount.title")}
              summary={tSteps("openAccount.summary")}
              stage="Первая неделя"
              deadline={<DeadlineBadge due={daysFromNow(3)} now={NOW} />}
              href="/dev/ui"
            />
            <StepCard
              title={tSteps("kupatHolim.title")}
              summary={tSteps("kupatHolim.summary")}
              done
            />
          </div>
        </Group>

        <Group title={t("checklist")}>
          <ChecklistDemo />
        </Group>

        <Group title={t("deadlines")}>
          <div className="flex flex-wrap gap-2">
            <DeadlineBadge due={daysFromNow(-2)} now={NOW} />
            <DeadlineBadge due={NOW} now={NOW} />
            <DeadlineBadge due={daysFromNow(4)} now={NOW} />
            <DeadlineBadge due={daysFromNow(40)} now={NOW} />
          </div>
        </Group>

        <Group title={t("searchBar")}>
          <SearchDemo />
        </Group>

        <Group title={t("emptyState")}>
          <EmptyState
            icon={Inbox}
            title="Пока ничего нет"
            description="Здесь появятся ваши шаги после короткого опроса."
            action={<Button size="sm">Пройти опрос</Button>}
          />
        </Group>

        <Group title={t("bottomNav")}>
          <div className="overflow-hidden rounded-xl border">
            <SiteBottomNav activeHref="/" />
          </div>
        </Group>
      </div>
    </div>
  );
}
