import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders paragraphs with line breaks", () => {
    expect(renderMarkdown("a\nb\n\nc")).toBe("<p>a<br>b</p>\n<p>c</p>");
  });

  it("renders ordered and bullet lists", () => {
    expect(renderMarkdown("1. one\n2. two")).toBe("<ol><li>one</li><li>two</li></ol>");
    expect(renderMarkdown("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  it("renders bold, inline code, and links", () => {
    expect(renderMarkdown("**b**")).toBe("<p><strong>b</strong></p>");
    expect(renderMarkdown("`x`")).toBe("<p><code>x</code></p>");
    expect(renderMarkdown("[gov](https://gov.il/x)")).toBe(
      '<p><a href="https://gov.il/x" target="_blank" rel="noopener noreferrer">gov</a></p>',
    );
  });

  it("escapes HTML in the source", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });
});
