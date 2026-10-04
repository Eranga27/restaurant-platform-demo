/**
 * Structured data for search engines. The only place the app writes raw HTML:
 * the payload is built by our own code from catalogue data, and `<` is escaped
 * so no value can close the script tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- escaped JSON, see above
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
