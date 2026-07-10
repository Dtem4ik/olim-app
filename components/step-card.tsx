import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StepCardProps {
  title: string;
  summary?: string;
  /** Optional stage label, e.g. "First week". */
  stage?: string;
  /** Optional deadline badge (usually <DeadlineBadge />). */
  deadline?: ReactNode;
  /** When set, the whole card links to the step. */
  href?: string;
  done?: boolean;
  className?: string;
}

/** A single step of the personal plan, shown on the home screen and plan list. */
export function StepCard({
  title,
  summary,
  stage,
  deadline,
  href,
  done,
  className,
}: StepCardProps) {
  const body = (
    <Card
      className={cn(
        "flex-row items-start gap-3 p-4 transition-colors",
        href &&
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        done && "bg-muted",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {stage && <Badge variant="secondary">{stage}</Badge>}
          {deadline}
        </div>
        <h3
          className={cn("font-semibold leading-snug", done && "text-muted-foreground line-through")}
        >
          {title}
        </h3>
        {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
      </div>
      {href && (
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </Card>
  );

  if (!href) return body;

  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none">
      {body}
    </Link>
  );
}
