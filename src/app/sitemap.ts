import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { cardPages } from "@/data/cardCluster";

// Generated to /sitemap.xml at build time (works with output: "export").
// trailingSlash is on, so paths end with "/".
export const dynamic = "force-static";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; changeFrequency: Freq }[] = [
    { path: "/", priority: 1.0, changeFrequency: "monthly" },
    { path: "/services/", priority: 0.9, changeFrequency: "monthly" },
    // Card printing is the lead service, so the hub + sub-pages rank high.
    { path: "/services/card-printing/", priority: 0.9, changeFrequency: "monthly" },
    ...cardPages.map((p) => ({
      path: `/services/card-printing/${p.slug}/`,
      priority: 0.8,
      changeFrequency: "monthly" as Freq,
    })),
    { path: "/portfolio/", priority: 0.8, changeFrequency: "monthly" },
    { path: "/who-its-for/", priority: 0.7, changeFrequency: "yearly" },
    { path: "/about/", priority: 0.6, changeFrequency: "yearly" },
    { path: "/contact/", priority: 0.8, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${site.url}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
