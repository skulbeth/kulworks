import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import RevealOnScroll from "@/components/RevealOnScroll";
import TestimonialCard from "@/components/TestimonialCard";
import { publishedTestimonials } from "@/lib/testimonials";

/** Home-page social-proof strip.
 *
 *  Renders nothing until something is published, so the live site never shows
 *  placeholder quotes. Shows the three most recent, pinned ones first, and links
 *  to the full page only when there are more than three to see. */
export default async function Testimonials() {
  const items = await publishedTestimonials({ take: 4 });
  if (items.length === 0) return null;

  const shown = items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <section className="border-b border-border bg-surface/30">
      <Container className="py-16">
        <RevealOnScroll>
          <SectionHeading
            eyebrow="Social proof"
            title="What people say"
            intro="A few words from people we've made things for."
          />
        </RevealOnScroll>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
        {hasMore && (
          <div className="mt-8">
            <a
              href="/testimonials/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-3 text-base font-semibold transition-colors hover:border-blue hover:text-blue"
            >
              Read more &rarr;
            </a>
          </div>
        )}
      </Container>
    </section>
  );
}
