"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ChecklistItemProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A checkable step row built on the shadcn Checkbox. The Radix checkbox renders
 * a real <button>, which is labelable — nesting it in the <label> makes the
 * whole >=44px row a single tap target.
 */
export function ChecklistItem({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: ChecklistItemProps) {
  const descriptionId = useId();

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is the nested Radix Checkbox.
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted has-disabled:cursor-not-allowed has-disabled:opacity-60",
        className,
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-describedby={description ? descriptionId : undefined}
        className="mt-0.5"
      />
      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            "font-medium leading-snug",
            checked && "text-muted-foreground line-through",
          )}
        >
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
