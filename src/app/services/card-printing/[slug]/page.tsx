import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import Placeholder from "@/components/Placeholder";
import RevealOnScroll from "@/components/RevealOnScroll";
import JsonLd from "@/components/JsonLd";
import { cardPages, getCardPage } from "@/data/cardCluster";
import { cardServiceSchema, breadcrumbSchema } from "@/lib/structured-data";

// Pre-render one static page per card sub-page (required for output: "export").
export function generateStaticParams() {
  return cardPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getCardPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.metaDescription,
    keywords: page.keywords ? [...page.keywords] : undefined,
    alternates: { canonical: `/services/card-printing/${page.slug}/` },
  };
}

export default async function CardSubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getCardPage(slug);
  if (!page) notFound();

  return (
    <>
      <JsonLd data={cardServiceSchema(page)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services/" },
          { name: "Card Printing", path: "/services/card-printing/" },
          { name: page.navLabel, path: `/services/card-printing/${page.slug}/` },
        ])}
      />

      <section className="border-b border-border">
        <Container className="py-16">
          <SectionHeading eyebrow={page.eyebrow} title={page.h1} intro={page.intro} />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-16">
          <RevealOnScroll>
            <div className="grid items-start gap-10 md:grid-cols-2">
              <div className="space-y-8">
                {page.sections.map((s) => (
                  <div key={s.h}>
                    <h2 className="text-xl font-bold text-gold">{s.h}</h2>
                    <p className="mt-2 text-lg text-muted">{s.body}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-6">
                <Placeholder label={`${page.navLabel} sample`} ratio="aspect-[4/3]" />
                {page.specs && (
                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
                      At a glance
                    </h2>
                    <ul className="mt-3 space-y-2 text-muted">
                      {page.specs.map((spec) => (
                        <li key={spec} className="flex gap-2">
                          <span aria-hidden className="text-gold">•</span>
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </RevealOnScroll>
        </Container>
      </section>

      <section>
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Let&apos;s print it.</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Share your details and I&apos;ll come back with options and a quote.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button href="/contact/?type=card-printing" variant="gold" size="lg">
              Get a Quote
            </Button>
            <Button href="/services/card-printing/" variant="ghost" size="lg">
              All card options
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
