"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldContent, FieldDescription, FieldTitle } from "@/components/ui/field";
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
 * A checkable step row built on the shadcn Checkbox and the Field content parts
 * (FieldContent/FieldTitle/FieldDescription). We wrap the row in a <label>
 * rather than using FieldLabel + htmlFor so the whole >=44px row is a single tap
 * target — the Radix checkbox renders a real, labelable <button>.
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
      <FieldContent>
        <FieldTitle className={cn(checked && "text-muted-foreground line-through")}>
          {label}
        </FieldTitle>
        {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      </FieldContent>
    </label>
  );
}
