import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import TestimonialCard from "@/components/TestimonialCard";
import { publishedTestimonials } from "@/lib/testimonials";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Testimonials",
  description:
    "What clients say about working with Kulworks: custom card printing, UV-printed boards and tiles, and 3D design and printing in San Antonio.",
  alternates: { canonical: "/testimonials/" },
};

export default async function TestimonialsPage() {
  const items = await publishedTestimonials();

  return (
    <section className="border-b border-border">
      <Container className="py-16">
        <SectionHeading
          as="h1"
          eyebrow="Social proof"
          title="What people say"
          intro="Real words from people we've made things for, published with their permission."
        />

        {items.length === 0 ? (
          <p className="mt-10 rounded-xl border border-border bg-surface p-6 text-muted">
            Nothing here yet. If we&apos;ve made something for you and you&apos;d be happy to say
            so,{" "}
            <a href="/contact/" className="font-semibold text-blue hover:underline">
              get in touch
            </a>{" "}
            and we&apos;ll send you a link.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-bold">Want something made?</h2>
          <p className="mt-2 text-muted">
            Tell us what you have in mind and we&apos;ll come back with a price.
          </p>
          <a
            href="/contact/"
            className="mt-4 inline-flex rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover"
          >
            Get a quote
          </a>
        </div>
      </Container>
    </section>
  );
}
