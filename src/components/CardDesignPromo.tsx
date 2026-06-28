import Container from "@/components/Container";
import Button from "@/components/Button";

/**
 * Promo callout for the "we design and develop your cards" service. Meant for
 * the guides (where designers researching card creation land), but reusable
 * anywhere. You bring the content/art; Kulworks does the design and structure.
 */
export default function CardDesignPromo() {
  return (
    <section className="border-t border-border bg-surface/30">
      <Container className="py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gold/40 bg-gold/5 p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Done for you
          </p>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            We can design and develop your cards, or the content
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Have it ready? We design, lay out, and structure the cards from the content and
            artwork you provide. Need help with the content itself? We can develop that with you
            too, then prototype it fast. Either way, you get finished, print-ready cards.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button href="/services/card-printing/#card-design" variant="gold" size="lg">
              See card design
            </Button>
            <Button href="/contact/?type=card-design" variant="ghost" size="lg">
              Get a quote
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
