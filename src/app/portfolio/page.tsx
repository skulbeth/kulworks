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
            as="h1"
            eyebrow="Portfolio"
            title="The work"
            intro="Filter by craft to see what Kulworks makes. Real projects across custom cards, UV-printed tiles, filament and resin 3D printing, and design."
          />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-12">
          <PortfolioGrid />
          <p className="mx-auto mt-10 max-w-3xl text-center text-lg text-muted">
            This is a sample, not the whole shop. We also make{" "}
            <span className="text-foreground">UV-printed terrain tiles and custom tokens</span>,{" "}
            <span className="text-foreground">FDM replacement components and city &amp; terrain upgrade pieces</span>,
            custom 3D-printed card boxes and inserts,{" "}
            <span className="text-foreground">tarot and giant/jumbo card sizes</span> on custom order, and more.{" "}
            <a href="/contact/" className="font-semibold text-blue hover:underline">Just ask</a>{" "}
            and we&apos;ll show you examples or make something new. You can also browse our custom 3D
            (non-proprietary) models on{" "}
            <a href="https://makerworld.com/en/@skulbeth" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue hover:underline">MakerWorld</a>.
          </p>
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
