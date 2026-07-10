import { Banknote } from "lucide-react";
import { describe, expect, it } from "vitest";
import { SectionTile } from "@/components/section-tile";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("SectionTile", () => {
  it("renders a link with title, description and count", () => {
    renderWithProviders(
      <SectionTile
        title="Банки и деньги"
        description="Открыть счёт"
        icon={Banknote}
        href="/guide/banks"
        count={8}
      />,
    );

    const link = screen.getByRole("link", { name: /банки и деньги/i });
    expect(link).toHaveAttribute("href", "/guide/banks");
    expect(screen.getByText("Открыть счёт")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("omits the count badge when not provided", () => {
    renderWithProviders(<SectionTile title="Работа" icon={Banknote} href="/guide/work" />);
    expect(screen.queryByText("8")).not.toBeInTheDocument();
  });
});
