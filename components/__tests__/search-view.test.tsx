import { describe, expect, it } from "vitest";
import { SearchView } from "@/components/search/search-view";
import { renderWithProviders, screen, userEvent } from "@/test/test-utils";

const sections = [
  { slug: "banks-and-money", title: "Банки и деньги", icon: "landmark" },
  { slug: "rent", title: "Аренда и жильё", icon: "key-round" },
];
const steps = [
  {
    slug: "open-bank-account",
    section_slug: "banks-and-money",
    title: "Открыть счёт в банке",
    summary: "Нужен теудат оле",
  },
  { slug: "rent-contract", section_slug: "rent", title: "Снять квартиру", summary: null },
];

describe("SearchView", () => {
  it("shows a hint before any query", () => {
    renderWithProviders(<SearchView sections={sections} steps={steps} />);
    expect(screen.getByText(/Введи запрос/i)).toBeInTheDocument();
  });

  it("filters sections and steps by title", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchView sections={sections} steps={steps} />);

    await user.type(screen.getByRole("searchbox"), "банк");

    // Exact names: the section link is "Банки и деньги"; the step link's name is
    // "Открыть счёт в банке Банки и деньги" (title + section subtitle).
    expect(screen.getByRole("link", { name: "Банки и деньги" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Открыть счёт в банке/ })).toBeInTheDocument();
    // A non-matching section is filtered out.
    expect(screen.queryByRole("link", { name: "Аренда и жильё" })).not.toBeInTheDocument();
  });

  it("reports when nothing matches", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchView sections={sections} steps={steps} />);
    await user.type(screen.getByRole("searchbox"), "zzzнетничего");
    expect(screen.getByText(/Ничего не найдено/i)).toBeInTheDocument();
  });
});
