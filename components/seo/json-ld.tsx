/**
 * Render a JSON-LD structured-data graph into a <script>. Server component; the
 * data is built server-side from trusted content (see lib/seo/structured-data).
 */
export function JsonLd({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script text; input is server-built from vetted content.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
