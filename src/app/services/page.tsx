import type { Metadata } from "next";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import Placeholder from "@/components/Placeholder";
import RevealOnScroll from "@/components/RevealOnScroll";
import JsonLd from "@/components/JsonLd";
import { servicesGraph, breadcrumbSchema } from "@/lib/structured-data";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Services: Card Printing, UV Tiles & 3D Printing",
  description:
    "Custom UV card printing (poker to tarot), UV-printed board game tiles, FDM and resin 3D printing, and 3D modeling and design, all in-house at Kulworks in San Antonio.",
  alternates: { canonical: "/services/" },
};

export default function ServicesPage() {
  const ordered = [...services].sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0));

  return (
    <>
      <JsonLd data={servicesGraph()} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services/" },
        ])}
      />
      <section className="border-b border-border">
        <Container className="py-16">
          <SectionHeading
            as="h1"
            eyebrow="Services"
            title="What we make"
            intro="Five crafts under one roof. UV card printing is our lead service, and we design and produce across materials, so most projects can start and finish here."
          />
        </Container>
      </section>

      {ordered.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`border-b border-border ${i % 2 === 1 ? "bg-surface/30" : ""}`}
        >
          <Container className="py-16">
            <RevealOnScroll>
              <div
                className={`grid items-center gap-10 md:grid-cols-2 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  {s.lead && (
                    <span className="mb-3 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">
                      Lead Service
                    </span>
                  )}
                  <div className="text-4xl">{s.icon}</div>
                  <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{s.name}</h2>
                  <p className="mt-2 font-semibold text-gold">{s.tagline}</p>
                  <p className="mt-4 text-lg text-muted">{s.details}</p>
                  {s.highlights && (
                    <ul className="mt-4 space-y-2 text-muted">
                      {s.highlights.map((h) => (
                        <li key={h} className="flex gap-2">
                          <span aria-hidden className="mt-0.5 text-gold">✓</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button href={`/contact/?type=${s.id}`} variant="primary">
                      Request {s.name}
                    </Button>
                    {s.id === "card-printing" && (
                      <Button href="/services/card-printing/" variant="ghost">
                        Explore card printing
                      </Button>
                    )}
                  </div>
                  {s.link && (
                    <a
                      href={s.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue hover:underline"
                    >
                      {s.link.label}
                      <span aria-hidden>↗</span>
                    </a>
                  )}
                </div>
                <Placeholder label={`${s.name} sample`} src={s.image} alt={`${s.name} — Kulworks`} ratio="aspect-[4/3]" />
              </div>
            </RevealOnScroll>
          </Container>
        </section>
      ))}

      <section>
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Not sure which you need?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Describe your project and I&apos;ll point you to the right craft (or combination) and quote it.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/contact/" variant="gold" size="lg">Get a Quote</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
