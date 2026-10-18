import { describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "@/components/language-switcher";
import { renderWithProviders, screen } from "@/test/test-utils";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/plan",
}));

describe("LanguageSwitcher", () => {
  it("links the current page in every locale and marks the active one", () => {
    renderWithProviders(<LanguageSwitcher />);

    const ru = screen.getByTestId("language-ru");
    const en = screen.getByTestId("language-en");
    // Switching TO the default locale uses the explicit `/ru` prefix on purpose:
    // the proxy redirects it to `/plan` and overwrites an `en` locale cookie.
    expect(ru).toHaveAttribute("href", "/ru/plan");
    expect(en).toHaveAttribute("href", "/en/plan");
    expect(ru).toHaveAttribute("aria-current", "true");
    expect(en).not.toHaveAttribute("aria-current");
    // Language names are autonyms, tagged with their own language.
    expect(en).toHaveTextContent("English");
    expect(en).toHaveAttribute("lang", "en");
  });
});
