"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Search input with a leading icon and a clear affordance. */
export function SearchBar({ value, onChange, onSubmit, placeholder, className }: SearchBarProps) {
  const t = useTranslations("search");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.(value);
  }

  return (
    <search className={cn("block w-full", className)}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t("placeholder")}
          aria-label={t("label")}
          className="h-11 w-full rounded-lg border bg-surface pl-10 pr-11 text-base text-surface-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value.length > 0 && (
          <button
            type="button"
            aria-label={t("clear")}
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </form>
    </search>
  );
}
