import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import PortfolioGrid from "@/components/PortfolioGrid";
import Button from "@/components/Button";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "A gallery of Kulworks work: custom cards, UV-printed tiles, filament and resin 3D prints, and design. Filter by craft.",
  alternates: { canonical: "/portfolio/" },
};

export default function PortfolioPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Portfolio", path: "/portfolio/" },
        ])}
      />
      <section className="border-b border-border">
        <Container className="py-16">
          <SectionHeading
            eyebrow="Portfolio"
            title="The work"
            intro="Filter by craft to see what Kulworks makes. These are labeled placeholders for now, replaced with real photos as projects ship."
          />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-12">
          <PortfolioGrid />
        </Container>
      </section>

      <section>
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Like what you see?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Let&apos;s talk about your project, whether it&apos;s prototypes, short runs, or one-of-a-kind pieces.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/contact/" variant="gold" size="lg">Start a Project</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
