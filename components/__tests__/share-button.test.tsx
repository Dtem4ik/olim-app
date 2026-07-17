import { describe, expect, it } from "vitest";
import { ShareButton } from "@/components/share-button";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("ShareButton", () => {
  it("renders an accessible share button", () => {
    renderWithProviders(<ShareButton path="/guides/banks-and-money" title="Банки и деньги" />);
    expect(screen.getByRole("button", { name: "Поделиться" })).toBeInTheDocument();
  });
});
