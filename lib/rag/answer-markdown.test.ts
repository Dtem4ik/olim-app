import { describe, expect, it } from "vitest";
import { parseAnswer, parseInline } from "./answer-markdown";

describe("parseInline", () => {
  it("parses bold, emphasis and code", () => {
    expect(parseInline("a **b** *c* `d`")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", text: "b" },
      { type: "text", text: " " },
      { type: "em", text: "c" },
      { type: "text", text: " " },
      { type: "code", text: "d" },
    ]);
  });

  it("hides an unclosed ** while the answer is still streaming", () => {
    expect(parseInline("**Документы для")).toEqual([{ type: "text", text: "Документы для" }]);
  });

  it("leaves plain asterisks and underscores inside words alone", () => {
    expect(parseInline("2 * 3 = 6, snake_case_name")).toEqual([
      { type: "text", text: "2 * 3 = 6, snake_case_name" },
    ]);
  });
});

describe("parseAnswer", () => {
  it("splits a bold heading line followed directly by bullets (the model's usual shape)", () => {
    const blocks = parseAnswer(
      "Нужно:\n\n**Документы:**\n*   **Справка:** от 14 лет.\n*   **Апостиль:** после 1997.",
    );
    expect(blocks).toEqual([
      { type: "paragraph", lines: [[{ type: "text", text: "Нужно:" }]] },
      { type: "paragraph", lines: [[{ type: "strong", text: "Документы:" }]] },
      {
        type: "list",
        ordered: false,
        items: [
          [
            { type: "strong", text: "Справка:" },
            { type: "text", text: " от 14 лет." },
          ],
          [
            { type: "strong", text: "Апостиль:" },
            { type: "text", text: " после 1997." },
          ],
        ],
      },
    ]);
  });

  it("parses numbered lists and headings, and starts a new list when the kind changes", () => {
    const blocks = parseAnswer("## Шаги\n1. Раз\n2) Два\n- Три");
    expect(blocks.map((b) => b.type)).toEqual(["heading", "list", "list"]);
    expect(blocks[1]).toMatchObject({
      ordered: true,
      items: [[{ text: "Раз" }], [{ text: "Два" }]],
    });
    expect(blocks[2]).toMatchObject({ ordered: false });
  });

  it("keeps consecutive text lines in one paragraph and ends a list on plain text", () => {
    expect(parseAnswer("- a\nтекст\nещё").map((b) => b.type)).toEqual(["list", "paragraph"]);
    expect(parseAnswer("раз\nдва")).toEqual([
      {
        type: "paragraph",
        lines: [[{ type: "text", text: "раз" }], [{ type: "text", text: "два" }]],
      },
    ]);
  });

  it("returns no blocks for empty input", () => {
    expect(parseAnswer("")).toEqual([]);
    expect(parseAnswer("\n\n")).toEqual([]);
  });
});
