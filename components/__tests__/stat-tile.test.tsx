import { describe, expect, it } from "vitest";
import { StatTile } from "@/components/stat-tile";
import { renderWithProviders, screen } from "@/test/test-utils";

describe("StatTile", () => {
  it("renders a label and value", () => {
    renderWithProviders(<StatTile label="Готово" value={3} color="bg-sec-mint" />);
    expect(screen.getByText("Готово")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
