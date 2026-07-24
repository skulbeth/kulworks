import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import RevealOnScroll from "@/components/RevealOnScroll";
import { testimonials } from "@/data/testimonials";

/** Home-page social-proof strip. Renders nothing until real testimonials exist
 *  in src/data/testimonials.ts, so the live site never shows placeholder quotes. */
export default function Testimonials() {
  if (testimonials.length === 0) return null;

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
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6"
            >
              <span aria-hidden className="text-4xl leading-none text-gold">&ldquo;</span>
              <blockquote className="mt-2 flex-1 text-muted">{t.quote}</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">
                {t.name}
                {t.detail && (
                  <span className="mt-0.5 block font-normal text-muted">{t.detail}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
