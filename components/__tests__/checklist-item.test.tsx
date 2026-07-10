import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChecklistItem } from "@/components/checklist-item";
import { renderWithProviders, screen, userEvent } from "@/test/test-utils";

function Controlled({ initial = false }: { initial?: boolean }) {
  const [checked, setChecked] = useState(initial);
  return (
    <ChecklistItem
      label="Открыть счёт"
      description="Теудат зеут"
      checked={checked}
      onCheckedChange={setChecked}
    />
  );
}

describe("ChecklistItem", () => {
  it("exposes an accessible checkbox described by its hint", () => {
    renderWithProviders(<Controlled />);
    const checkbox = screen.getByRole("checkbox", { name: /открыть счёт/i });
    expect(checkbox).toHaveAccessibleDescription("Теудат зеут");
  });

  it("toggles when the row is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Controlled />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(screen.getByText("Открыть счёт"));
    expect(checkbox).toBeChecked();
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ChecklistItem label="Открыть счёт" checked={false} onCheckedChange={() => {}} disabled />,
    );
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
