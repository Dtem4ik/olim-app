import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchView } from "@/components/search/search-view";
import type { ContentSection } from "@/lib/content/repo";
import { matchContent } from "@/lib/search/match";
import { renderWithProviders, screen, userEvent } from "@/test/test-utils";

const sections: ContentSection[] = [
  {
    slug: "banks-and-money",
    title: "Банки и деньги",
    description: "Открыть счёт, карта",
    icon: "landmark",
    image_url: null,
    sort_order: 0,
  },
  {
    slug: "rent",
    title: "Аренда и жильё",
    description: "Договор, залог",
    icon: "key-round",
    image_url: null,
    sort_order: 1,
  },
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

// The component fetches /api/search; the mock answers with the real matcher so the
// wiring (debounce, grouping, empty state) is exercised end-to-end without a server.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const q = url.searchParams.get("q") ?? "";
      const r = matchContent(q, sections, steps);
      return { ok: true, json: async () => ({ ...r, source: "fixtures" }) } as Response;
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("SearchView", () => {
  it("suggests sections before any query", () => {
    renderWithProviders(<SearchView sections={sections} />);
    expect(screen.getByText(/Разделы для старта/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Банки и деньги/ })).toBeInTheDocument();
  });

  it("shows grouped step + section results for a query", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchView sections={sections} />);

    await user.type(screen.getByRole("searchbox"), "банк");

    // The step result (title + section badge).
    expect(await screen.findByRole("link", { name: /Открыть счёт в банке/ })).toBeInTheDocument();
    // The section tile — anchored so it doesn't also match the step's badge text.
    expect(await screen.findByRole("link", { name: /^Банки и деньги/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Аренда и жильё/ })).not.toBeInTheDocument();
  });

  it("reports when nothing matches", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchView sections={sections} />);
    await user.type(screen.getByRole("searchbox"), "zzzнетничего");
    expect(await screen.findByText(/Ничего не найдено/i)).toBeInTheDocument();
  });
});
