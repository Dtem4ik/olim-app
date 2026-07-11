"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Search input with a leading icon and a clear affordance. Composes the shadcn
 * `InputGroup` primitive; the group is bumped to h-11 to stay a >=44px target.
 */
export function SearchBar({ value, onChange, onSubmit, placeholder, className }: SearchBarProps) {
  const t = useTranslations("search");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.(value);
  }

  return (
    <search className={cn("block w-full", className)}>
      <form onSubmit={handleSubmit}>
        <InputGroup className="h-11 rounded-lg bg-surface">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? t("placeholder")}
            aria-label={t("label")}
            className="text-base [&::-webkit-search-cancel-button]:appearance-none"
          />
          {value.length > 0 && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-sm"
                aria-label={t("clear")}
                onClick={() => onChange("")}
              >
                <X aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </form>
    </search>
  );
}
