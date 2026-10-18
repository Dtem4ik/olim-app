/**
 * AI-answer Markdown → blocks (pure, unit-tested; rendered by
 * `components/search/answer-text.tsx`).
 *
 * The model answers in light Markdown (bold, bullet/numbered lists, the odd
 * heading). Unlike `lib/markdown.ts` (trusted step bodies → HTML on the server),
 * this parses UNTRUSTED model text into plain data that React renders as
 * elements — no HTML string, nothing to escape or inject. It is line-based so a
 * bold "heading:" followed directly by bullets (no blank line — the model's
 * usual shape) still becomes a heading + list, and it tolerates a half-streamed
 * answer: an unclosed `**` is hidden instead of flashing as literal asterisks.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "code"; text: string };

export type Block =
  | { type: "heading"; content: Inline[] }
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "list"; ordered: boolean; items: Inline[][] };

const BULLET = /^\s*[-*•]\s+/;
const ORDERED = /^\s*\d+[.)]\s+/;
const HEADING = /^\s*#{1,6}\s+/;
// `**bold**`, `` `code` ``, `*em*` / `_em_` (not across spaces at the edges).
const INLINE = /\*\*(.+?)\*\*|`([^`]+)`|(?<![\w*])[*_](?![\s*_])(.+?)(?<![\s*_])[*_](?![\w*])/g;

/** Parse one line's inline Markdown. Unmatched markers are dropped, not shown. */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  const pushText = (text: string) => {
    // A stray `**` (unclosed while streaming, or a model slip) never shows.
    const clean = text.replace(/\*\*/g, "");
    if (clean) out.push({ type: "text", text: clean });
  };
  let last = 0;
  for (const m of line.matchAll(INLINE)) {
    pushText(line.slice(last, m.index));
    if (m[1] !== undefined) out.push({ type: "strong", text: m[1] });
    else if (m[2] !== undefined) out.push({ type: "code", text: m[2] });
    else if (m[3] !== undefined) out.push({ type: "em", text: m[3] });
    last = m.index + m[0].length;
  }
  pushText(line.slice(last));
  return out;
}

/** Parse a (possibly partial) answer into renderable blocks. */
export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: Inline[][] | null = null;
  let list: { ordered: boolean; items: Inline[][] } | null = null;

  const close = () => {
    if (paragraph) blocks.push({ type: "paragraph", lines: paragraph });
    if (list) blocks.push({ type: "list", ...list });
    paragraph = null;
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      close();
      continue;
    }
    const ordered = ORDERED.test(line);
    if (ordered || BULLET.test(line)) {
      if (paragraph || (list && list.ordered !== ordered)) close();
      list ??= { ordered, items: [] };
      list.items.push(parseInline(line.replace(ordered ? ORDERED : BULLET, "")));
      continue;
    }
    if (HEADING.test(line)) {
      close();
      blocks.push({ type: "heading", content: parseInline(line.replace(HEADING, "")) });
      continue;
    }
    if (list) close();
    paragraph ??= [];
    paragraph.push(parseInline(line.trim()));
  }
  close();
  return blocks;
}
