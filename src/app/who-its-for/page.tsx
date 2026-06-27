import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import AudienceCard from "@/components/AudienceCard";
import Button from "@/components/Button";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { audiences } from "@/data/audiences";

export const metadata: Metadata = {
  title: "Who It's For",
  description:
    "Kulworks works with game and card designers, game stores, sports teams and clubs, schools, photographers, wedding venues, and convention-goers in San Antonio and beyond.",
  alternates: { canonical: "/who-its-for/" },
};

export default function WhoItsForPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Who It's For", path: "/who-its-for/" },
        ])}
      />
      <section className="border-b border-border">
        <Container className="py-16">
          <SectionHeading
            eyebrow="Who it's for"
            title="People we love making for"
            intro="Card printing is especially popular with teams, designers, and sellers, but whatever you bring, we'll make it real."
          />
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((a) => (
              <AudienceCard key={a.title} audience={a} />
            ))}
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">See yourself on this list?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Tell me about your project and I&apos;ll get you a quote.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/contact/" variant="gold" size="lg">Get a Quote</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
