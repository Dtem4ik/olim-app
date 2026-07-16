import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SectionTileProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  href: string;
  /** Number of steps in this section, shown as a badge. */
  count?: number;
  /** Pastel fill utility class (fallback when there's no photo). */
  color?: string;
  /** Section hero photo; when set the tile becomes a photo card. */
  imageUrl?: string;
  /**
   * De-emphasize the tile (e.g. a personalized section with 0 matched steps).
   * The section stays tappable/browsable — just visually secondary.
   */
  dimmed?: boolean;
  className?: string;
}

/** A tappable tile that opens a guide section — a photo card when a hero image
 *  exists, otherwise a pastel colour fill. */
export function SectionTile({
  title,
  description,
  icon: Icon,
  href,
  count,
  color = "bg-sec-blue",
  imageUrl,
  dimmed,
  className,
}: SectionTileProps) {
  const hasPhoto = Boolean(imageUrl) && !dimmed;
  return (
    <Link
      href={href}
      data-dimmed={dimmed ? "" : undefined}
      className={cn(
        "group relative flex min-h-40 flex-col justify-between gap-4 overflow-hidden rounded-3xl p-4 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
        dimmed
          ? "bg-muted text-muted-foreground"
          : hasPhoto
            ? "text-white"
            : cn(color, "text-foreground"),
        className,
      )}
    >
      {hasPhoto && (
        <div className="absolute inset-0">
          <Image
            src={imageUrl as string}
            alt=""
            fill
            sizes="(max-width: 448px) 50vw, 224px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        </div>
      )}

      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl",
            hasPhoto ? "bg-white/20 text-white backdrop-blur-sm" : "bg-surface/70 text-foreground",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        {typeof count === "number" && (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              hasPhoto ? "opacity-90" : "opacity-70",
            )}
          >
            {count}
          </span>
        )}
      </div>
      <div className="relative flex flex-col gap-0.5">
        <h3 className="font-semibold leading-tight text-balance">{title}</h3>
        {description && (
          <p className={cn("line-clamp-2 text-xs", hasPhoto ? "opacity-90" : "opacity-70")}>
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
