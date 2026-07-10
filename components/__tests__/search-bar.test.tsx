import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/components/search-bar";
import { renderWithProviders, screen, userEvent } from "@/test/test-utils";

function Controlled({ onSubmit }: { onSubmit?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return <SearchBar value={value} onChange={setValue} onSubmit={onSubmit} />;
}

describe("SearchBar", () => {
  it("renders inside a search landmark with a labelled input", () => {
    const { container } = renderWithProviders(<Controlled />);
    expect(container.querySelector("search")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Поиск" })).toBeInTheDocument();
  });

  it("types, clears, and submits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Controlled onSubmit={onSubmit} />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "банк");
    expect(input).toHaveValue("банк");

    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("банк");

    await user.click(screen.getByRole("button", { name: "Очистить запрос" }));
    expect(input).toHaveValue("");
  });
});
