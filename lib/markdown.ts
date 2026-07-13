/**
 * Minimal, server-side Markdown → HTML for the authored step bodies (Phase 4).
 *
 * Deliberately tiny (no dependency, runs on the server so nothing ships to the
 * client) and scoped to the subset our content uses: paragraphs, ordered/bullet
 * lists, bold, inline code, and links. HTML in the source is escaped first, so
 * even though content is trusted, no raw markup can slip through.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

const ORDERED = /^\d+\.\s+/;
const BULLET = /^[-*]\s+/;

/** Render a trusted Markdown string to a safe HTML string. */
export function renderMarkdown(md: string): string {
  const blocks = escapeHtml(md.trim()).split(/\n{2,}/);
  const html: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.every((l) => ORDERED.test(l))) {
      const items = lines.map((l) => `<li>${inline(l.replace(ORDERED, ""))}</li>`).join("");
      html.push(`<ol>${items}</ol>`);
    } else if (lines.every((l) => BULLET.test(l))) {
      const items = lines.map((l) => `<li>${inline(l.replace(BULLET, ""))}</li>`).join("");
      html.push(`<ul>${items}</ul>`);
    } else {
      html.push(`<p>${inline(lines.join("<br>"))}</p>`);
    }
  }
  return html.join("\n");
}
