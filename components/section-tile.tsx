import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SectionTileProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  href: string;
  /** Number of steps in this section, shown as a badge. */
  count?: number;
  /**
   * De-emphasize the tile (e.g. a personalized section with 0 matched steps).
   * The section stays tappable/browsable — just visually secondary.
   */
  dimmed?: boolean;
  className?: string;
}

/** A tappable tile that opens a guide section from the home grid. */
export function SectionTile({
  title,
  description,
  icon: Icon,
  href,
  count,
  dimmed,
  className,
}: SectionTileProps) {
  return (
    <Link
      href={href}
      data-dimmed={dimmed ? "" : undefined}
      className={cn(
        "group flex min-h-11 flex-col gap-3 rounded-xl border bg-surface p-4 text-surface-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // De-emphasize without lowering text contrast (AA): a dashed border and a
        // muted icon signal "no matched steps", text colors stay full-strength.
        dimmed && "border-dashed shadow-none",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-lg",
            dimmed ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        {typeof count === "number" && <Badge variant="secondary">{count}</Badge>}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold leading-snug">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </Link>
  );
}
