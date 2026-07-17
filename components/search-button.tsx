"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * iOS/Android only raise the virtual keyboard when focus happens synchronously
 * inside a user gesture. The search field lives on the `/search` route and mounts
 * only after navigation, so its autofocus runs outside the gesture and the keyboard
 * stays down. We focus a throwaway input NOW, within the tap, to open the keyboard;
 * the real field then inherits it on the next screen. No-op on non-touch devices.
 */
function primeMobileKeyboard() {
  if (typeof window === "undefined") return;
  if (!("ontouchstart" in window) && navigator.maxTouchPoints === 0) return;
  const tmp = document.createElement("input");
  tmp.type = "text";
  tmp.setAttribute("aria-hidden", "true");
  tmp.tabIndex = -1;
  // Off-screen but focusable; 16px font-size prevents iOS zoom-on-focus.
  tmp.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;z-index:-1;";
  document.body.appendChild(tmp);
  tmp.focus({ preventScroll: true });
  window.setTimeout(() => tmp.remove(), 900);
}

/** Round header button that opens the search screen. */
export function SearchButton({ className }: { className?: string }) {
  const t = useTranslations("search");
  return (
    <Link
      href="/search"
      aria-label={t("title")}
      onPointerDown={primeMobileKeyboard}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border bg-surface text-surface-foreground transition-transform hover:bg-muted active:scale-90 focus-visible:outline-none",
        className,
      )}
    >
      <Search className="size-5" aria-hidden />
    </Link>
  );
}
