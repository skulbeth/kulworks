import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import Button from "@/components/Button";
import JsonLd from "@/components/JsonLd";
import CardDesignPromo from "@/components/CardDesignPromo";
import { guides, getGuide } from "@/data/guides";
import { guideArticleSchema, breadcrumbSchema } from "@/lib/structured-data";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords ? [...guide.keywords] : undefined,
    alternates: { canonical: `/guides/${guide.slug}/` },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <>
      <JsonLd data={guideArticleSchema(guide)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides/" },
          { name: guide.title, path: `/guides/${guide.slug}/` },
        ])}
      />

      <article>
        <section className="border-b border-border">
          <Container className="py-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              Guide · {guide.readMinutes} min read
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
              {guide.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">{guide.intro}</p>
          </Container>
        </section>

        <section className="border-b border-border">
          <Container className="py-16">
            <div className="mx-auto max-w-3xl space-y-10">
              {guide.sections.map((s) => (
                <div key={s.h}>
                  <h2 className="text-2xl font-bold text-gold">{s.h}</h2>
                  <div className="mt-3 space-y-4 text-lg text-muted">
                    {s.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <CardDesignPromo />

        <section>
          <Container className="py-8 text-center">
            <Button href="/guides/" variant="ghost">More guides →</Button>
          </Container>
        </section>
      </article>
    </>
  );
}
