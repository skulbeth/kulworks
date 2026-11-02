// Per-page social cards. Next.js doesn't merge openGraph/twitter from the root layout
// into a page's metadata, so without this every shared link (Facebook, iMessage, X)
// showed the homepage's title and URL. Wrap a page's metadata in withSocial() and its
// title, description and canonical URL carry over to the card.
import type { Metadata } from "next";

const IMAGE = {
  url: "/images/og-default.png",
  width: 1200,
  height: 630,
  alt: "Kulworks: cards, tiles and 3D. Prototype manufacturer.",
};

export function withSocial(m: Metadata): Metadata {
  const raw = m.title;
  const title =
    typeof raw === "string"
      ? `${raw} | Kulworks` // same as the root title template
      : raw && typeof raw === "object" && "absolute" in raw
        ? raw.absolute
        : undefined;
  const description = m.description ?? undefined;
  const canonical = m.alternates?.canonical;
  const url = typeof canonical === "string" ? canonical : undefined;
  return {
    ...m,
    openGraph: {
      type: "website",
      siteName: "Kulworks",
      locale: "en_US",
      images: [IMAGE],
      ...(url ? { url } : {}),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...m.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      images: [IMAGE.url],
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...m.twitter,
    },
  };
}
