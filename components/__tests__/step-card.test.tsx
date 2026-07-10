import { describe, expect, it } from "vitest";
import { StepCard } from "@/components/step-card";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("StepCard", () => {
  it("renders title, stage and summary", () => {
    renderWithProviders(
      <StepCard title="Открыть счёт" summary="Нужен теудат зеут" stage="Первая неделя" />,
    );
    expect(screen.getByRole("heading", { name: "Открыть счёт" })).toBeInTheDocument();
    expect(screen.getByText("Первая неделя")).toBeInTheDocument();
    expect(screen.getByText("Нужен теудат зеут")).toBeInTheDocument();
  });

  it("wraps the card in a link when href is set", () => {
    renderWithProviders(<StepCard title="Открыть счёт" href="/guide/banks/open" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/guide/banks/open");
  });

  it("renders as a non-link when href is absent", () => {
    renderWithProviders(<StepCard title="Открыть счёт" done />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
