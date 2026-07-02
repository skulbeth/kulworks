// =============================================================================
// Central site + business config. This is the single source of truth for SEO,
// structured data (JSON-LD), the sitemap, and contact details.
//
// FILL IN THE PLACEHOLDERS marked TODO before launch. Search engines (and the
// Google Business Profile you set up) should show the SAME name, address, and
// phone everywhere ("NAP consistency"), so keep these in sync with your profile.
// =============================================================================

export const site = {
  // ---- Launch switch ----
  // While true: visitors only see the "coming soon" landing, site navigation is
  // hidden, and the whole site is set to noindex.
  //
  // While true, only the "coming soon" landing shows (nav hidden, whole site
  // noindex). Set to false to launch the full site. To preview the full site
  // locally without launching, temporarily use: process.env.NODE_ENV !== "production".
  constructionMode: true,

  name: "Kulworks",
  legalName: "Kulworks",
  url: "https://kulworks.com",
  // One-line description reused in metadata + Organization schema.
  description:
    "Kulworks is a San Antonio multi-craft maker studio. Custom UV card printing, UV-printed board game tiles, FDM and resin 3D printing, and 3D modeling and design, all made in-house.",
  founder: "Sam Kulbeth",

  // ---- Contact ----
  // Forwarded via Squarespace Email Forwarding -> Sam's inbox.
  email: "contact@kulworks.com",
  // E.164 for schema; `telephoneDisplay` is the human-friendly version shown on the page.
  telephone: "+1-210-570-3328",
  telephoneDisplay: "(210) 570-3328",

  // ---- Location / service area (San Antonio first) ----
  // Home-based or no public storefront? Leave streetAddress empty and rely on
  // areaServed + geo. Google still uses a real address during GBP verification.
  address: {
    streetAddress: "", // TODO: add if you have a public storefront
    addressLocality: "San Antonio",
    addressRegion: "TX",
    postalCode: "", // TODO
    addressCountry: "US",
  },
  // Approximate center of San Antonio. Adjust to your actual location if listed.
  geo: { latitude: 29.4241878, longitude: -98.4936282 },
  areaServed: [
    "San Antonio, TX",
    "Bexar County, TX",
    "Greater San Antonio",
    "New Braunfels, TX",
    "Schertz, TX",
    "Boerne, TX",
  ],
  priceRange: "$$",

  // ---- Social profiles ----
  // TODO: replace the REPLACE_WITH_HANDLE bits with your real handles. Any link
  // still containing "REPLACE_WITH_HANDLE" is treated as a placeholder: it shows
  // in the footer (so you have the slot) but is left OUT of the sameAs schema so
  // we never tell Google about a profile that does not exist yet.
  social: [
    { name: "Instagram", url: "https://instagram.com/REPLACE_WITH_HANDLE" },
    { name: "YouTube", url: "https://youtube.com/@REPLACE_WITH_HANDLE" },
    { name: "TikTok", url: "https://tiktok.com/@REPLACE_WITH_HANDLE" },
  ],

  // ---- Other public profiles (used for schema sameAs, not footer icons) ----
  // Real, live profiles that help Google connect this site to the same entity.
  profiles: [
    "https://makerworld.com/en/@skulbeth",
  ] as string[],
} as const;

/** Social links that are real (handle filled in), used for schema sameAs. */
export const readySocialUrls = () =>
  site.social.filter((s) => !s.url.includes("REPLACE_WITH_HANDLE")).map((s) => s.url);

/** All real external profile URLs for schema sameAs (ready socials + other profiles). */
export const sameAsUrls = () => [...readySocialUrls(), ...site.profiles];

/** Absolute URL helper. Pass a path like "/services/" -> "https://kulworks.com/services/". */
export const absUrl = (path = "/") =>
  `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
