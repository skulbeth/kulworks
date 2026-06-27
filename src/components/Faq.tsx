import { faqs as defaultFaqs, Faq } from "@/data/faq";

/**
 * Accessible FAQ section using native <details>/<summary> (no JS needed, works
 * with static export). Pair this with the FAQPage JSON-LD from structured-data.ts
 * so the same content is eligible for FAQ rich results.
 */
export default function FaqSection({ items = defaultFaqs }: { items?: Faq[] }) {
  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-surface">
      {items.map((f) => (
        <details key={f.q} className="group p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            <span>{f.q}</span>
            <span
              aria-hidden
              className="shrink-0 text-gold transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-3 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
