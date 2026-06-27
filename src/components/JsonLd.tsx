/**
 * Renders a JSON-LD structured-data block (invisible to visitors, read by search
 * engines). This is the main way to give Google strong, explicit SEO signal
 * WITHOUT stuffing keywords into the visible copy.
 *
 * Pass any schema.org object (or array of objects). Safe for static export.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here; we escape "<" to avoid breaking out of the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
