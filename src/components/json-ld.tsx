/** Server-rendered JSON-LD. `application/ld+json` is data, not executed script, so the nonce CSP does not apply; `<` is escaped so content cannot close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
