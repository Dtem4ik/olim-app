import type { VariantProps } from "class-variance-authority";
import { AlertTriangle, CalendarClock, CalendarDays } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { type DeadlineKind, getDeadlineStatus } from "@/lib/deadline";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface DeadlineBadgeProps {
  /** The date the step is due. */
  due: Date;
  /** Override "today" for deterministic rendering (tests, SSR snapshots). */
  now?: Date;
  className?: string;
}

const kindToVariant: Record<DeadlineKind, BadgeVariant> = {
  overdue: "destructive",
  today: "warning",
  soon: "warning",
  later: "secondary",
};

const kindToIcon: Record<DeadlineKind, typeof AlertTriangle> = {
  overdue: AlertTriangle,
  today: CalendarClock,
  soon: CalendarClock,
  later: CalendarDays,
};

/** Shows how urgent a step's deadline is, colour-coded by urgency. */
export function DeadlineBadge({ due, now, className }: DeadlineBadgeProps) {
  const t = useTranslations("deadline");
  const format = useFormatter();
  const { kind, days } = getDeadlineStatus(due, now);
  const Icon = kindToIcon[kind];

  const label =
    kind === "overdue"
      ? t("overdueDays", { days: Math.abs(days) })
      : kind === "today"
        ? t("today")
        : kind === "soon"
          ? t("soon", { days })
          : t("later", { date: format.dateTime(due, { day: "numeric", month: "short" }) });

  // Colour signals urgency only. A far-off deadline is just information, so it
  // renders as a quiet muted caption instead of a filled badge.
  if (kind === "later") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <Badge variant={kindToVariant[kind]} className={className}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </Badge>
  );
}
