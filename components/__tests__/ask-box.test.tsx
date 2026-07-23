import { afterEach, describe, expect, it, vi } from "vitest";
import { AskBox } from "@/components/search/ask-box";
import type { ContentSection } from "@/lib/content/repo";
import { renderWithProviders, screen, userEvent } from "@/test/test-utils";

const sections: ContentSection[] = [
  {
    slug: "banks-and-money",
    title: "Банки и деньги",
    description: "Счёт в банке",
    icon: "landmark",
    image_url: null,
    sort_order: 0,
  },
  {
    slug: "transport",
    title: "Транспорт",
    description: "Рав-Кав",
    icon: "bus",
    image_url: null,
    sort_order: 1,
  },
];

/** Build a Response whose body streams the given SSE frames (as /api/ask returns). */
function sseResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const f of frames) controller.enqueue(encoder.encode(f));
      controller.close();
    },
  });
  return { ok: true, status: 200, body } as unknown as Response;
}

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

afterEach(() => vi.unstubAllGlobals());

describe("AskBox", () => {
  it("streams a grounded answer and renders a tappable source card", async () => {
    const source = {
      slug: "open-bank-account",
      section_slug: "banks-and-money",
      title: "Открыть счёт в банке",
      section_title: "Банки и деньги",
      section_icon: "landmark",
      source_url: "https://gov.il/x",
      last_verified_at: "2026-01-01",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          frame("sources", { sources: [source] }),
          frame("text", { text: "Открой счёт в отделении банка." }),
          frame("done", { refused: false, citedSlugs: ["open-bank-account"], model: "gemini" }),
        ]),
      ),
    );

    renderWithProviders(<AskBox sections={sections} />);
    await userEvent.type(screen.getByPlaceholderText(/Задай вопрос/i), "как открыть счёт");
    await userEvent.click(screen.getByRole("button", { name: /Спросить/i }));

    expect(await screen.findByText(/Открой счёт в отделении банка/)).toBeInTheDocument();
    const card = await screen.findByTestId("ask-source");
    expect(card).toHaveAttribute("href", "/guides/banks-and-money/open-bank-account");
  });

  it("shows the honest refusal + closest sections when the model can't answer", async () => {
    const source = {
      slug: "get-and-load-rav-kav",
      section_slug: "transport",
      title: "Завести карту Рав-Кав",
      section_title: "Транспорт",
      section_icon: "bus",
      source_url: "https://gov.il/y",
      last_verified_at: "2026-01-01",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          frame("sources", { sources: [source] }),
          frame("done", { refused: true, citedSlugs: [], model: "gemini" }),
        ]),
      ),
    );

    renderWithProviders(<AskBox sections={sections} />);
    await userEvent.type(screen.getByPlaceholderText(/Задай вопрос/i), "погода завтра");
    await userEvent.click(screen.getByRole("button", { name: /Спросить/i }));

    expect(await screen.findByText(/Не нашёл точного ответа/i)).toBeInTheDocument();
    // The closest section (behind the retrieved step) is offered as a tile.
    expect(await screen.findByRole("link", { name: /Транспорт/ })).toBeInTheDocument();
  });

  it("surfaces the rate-limit message on HTTP 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429, body: null }) as unknown as Response),
    );
    renderWithProviders(<AskBox sections={sections} />);
    await userEvent.type(screen.getByPlaceholderText(/Задай вопрос/i), "вопрос");
    await userEvent.click(screen.getByRole("button", { name: /Спросить/i }));
    expect(await screen.findByText(/Слишком много запросов/i)).toBeInTheDocument();
  });
});
