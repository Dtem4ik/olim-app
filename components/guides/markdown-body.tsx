/**
 * Renders trusted, server-pre-rendered step markdown (see `lib/markdown.ts`,
 * which escapes any HTML in the source). Isolated so the one necessary
 * dangerouslySetInnerHTML lives behind a single, reviewed boundary.
 */
export function MarkdownBody({ html, className }: { html: string; className?: string }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted server-rendered markdown; lib/markdown escapes HTML
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
