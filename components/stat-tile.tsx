import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: string | number;
  /** Pastel fill utility class (see lib/section-colors tokens). */
  color?: string;
  className?: string;
}

/** A colour-filled stat card: small label over a big number. */
export function StatTile({ label, value, color = "bg-sec-blue", className }: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl p-4 text-foreground", color, className)}>
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="text-2xl font-bold tabular-nums leading-none">{value}</span>
    </div>
  );
}
