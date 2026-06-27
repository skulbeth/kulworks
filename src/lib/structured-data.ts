// =============================================================================
// schema.org structured-data builders (JSON-LD). These produce plain objects
// that get rendered by <JsonLd>. They tell search engines exactly what Kulworks
// is, where it operates, and what it offers, without keyword-stuffing the copy.
// =============================================================================

import { site, absUrl, sameAsUrls } from "@/data/site";
import { services } from "@/data/services";
import { faqs } from "@/data/faq";
import { cardHub, cardPages, CardPage } from "@/data/cardCluster";

// Stable @id anchors so the graph nodes can reference each other.
const ORG_ID = `${site.url}/#organization`;
const WEBSITE_ID = `${site.url}/#website`;
const BUSINESS_ID = `${site.url}/#localbusiness`;

/** Organization: the company entity. */
export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    description: site.description,
    email: site.email,
    founder: { "@type": "Person", name: site.founder },
    logo: { "@type": "ImageObject", url: absUrl("/images/og-default.png") },
    ...(sameAsUrls().length ? { sameAs: sameAsUrls() } : {}),
  };
}

/** WebSite: enables sitelinks/site-name handling. */
export function webSiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: site.url,
    name: site.name,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

/**
 * LocalBusiness (ProfessionalService): the local-SEO workhorse. Carries NAP,
 * geo, service area, and the catalog of services for San Antonio targeting.
 */
export function localBusinessSchema() {
  const hasStreet = Boolean(site.address.streetAddress && site.address.postalCode);
  return {
    "@type": "ProfessionalService",
    "@id": BUSINESS_ID,
    name: site.name,
    url: site.url,
    image: absUrl("/images/og-default.png"),
    description: site.description,
    email: site.email,
    ...(site.telephone ? { telephone: site.telephone } : {}),
    priceRange: site.priceRange,
    parentOrganization: { "@id": ORG_ID },
    // Always include locality/region; include full PostalAddress only once filled.
    address: {
      "@type": "PostalAddress",
      ...(hasStreet ? { streetAddress: site.address.streetAddress } : {}),
      addressLocality: site.address.addressLocality,
      addressRegion: site.address.addressRegion,
      ...(site.address.postalCode ? { postalCode: site.address.postalCode } : {}),
      addressCountry: site.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    areaServed: site.areaServed.map((name) => ({ "@type": "Place", name })),
    knowsAbout: [
      "custom card printing",
      "playing card printing",
      "tarot card printing",
      "board game prototype printing",
      "UV printing",
      "3D printing",
      "resin printing",
      "Shapr3D modeling",
    ],
    makesOffer: services.map((s) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: s.name,
        description: s.description,
        url: absUrl(`/services/#${s.id}`),
      },
    })),
    ...(sameAsUrls().length ? { sameAs: sameAsUrls() } : {}),
  };
}

/** Combined sitewide graph rendered in the root layout. */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), webSiteSchema(), localBusinessSchema()],
  };
}

/** A single Service node (used on the Services page, one per offering). */
export function serviceSchema(serviceId: string) {
  const s = services.find((x) => x.id === serviceId);
  if (!s) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    serviceType: s.name,
    description: s.details,
    url: absUrl(`/services/#${s.id}`),
    provider: { "@id": BUSINESS_ID },
    areaServed: site.areaServed.map((name) => ({ "@type": "Place", name })),
  };
}

/** All services as a graph, for the Services page. */
export function servicesGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": services.map((s) => serviceSchema(s.id)).filter(Boolean),
  };
}

/** Service schema for the card-printing hub, with its sub-pages as an offer catalog. */
export function cardHubServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Custom Card Printing",
    serviceType: "Custom card printing",
    description: cardHub.intro,
    url: absUrl("/services/card-printing/"),
    provider: { "@id": BUSINESS_ID },
    areaServed: site.areaServed.map((name) => ({ "@type": "Place", name })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Card printing options",
      itemListElement: cardPages.map((p) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: p.h1,
          url: absUrl(`/services/card-printing/${p.slug}/`),
        },
      })),
    },
  };
}

/** Service schema for a single card-printing sub-page. */
export function cardServiceSchema(page: CardPage) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.h1,
    serviceType: "Custom card printing",
    description: page.intro,
    url: absUrl(`/services/card-printing/${page.slug}/`),
    provider: { "@id": BUSINESS_ID },
    areaServed: site.areaServed.map((name) => ({ "@type": "Place", name })),
  };
}

/** Breadcrumbs for a page. Pass ordered [{name, path}] from Home to current. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absUrl(t.path),
    })),
  };
}

/**
 * FAQPage from the shared FAQ data. Valid schema.org and harmless to keep, but
 * note Google deprecated FAQ rich results in 2026, so this is for semantic
 * clarity, not a SERP rich-result payoff.
 */
export function faqSchema(items: { q: string; a: string }[] = faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
