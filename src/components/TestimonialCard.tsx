import TestimonialProof from "@/components/TestimonialProof";

/** One testimonial: typed words, a screenshot of them, or both.
 *
 *  A screenshot carries no text for a screen reader or for search, so the words
 *  are always shown as real text. The screenshot itself opens on click rather
 *  than sitting in the card, where it was too small to read. */
export type TestimonialView = {
  id: string;
  quote: string | null;
  name: string;
  detail: string | null;
  imagePath: string | null;
  updatedAt?: Date | string;
};

export default function TestimonialCard({ t }: { t: TestimonialView }) {
  const v = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
  const imageSrc = `/api/testimonial-image/${t.id}${v ? `?v=${v}` : ""}`;

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6">
      {t.quote && (
        <div className="flex-1">
          <span aria-hidden className="text-4xl leading-none text-gold">
            &ldquo;
          </span>
          <blockquote className="mt-2 whitespace-pre-line text-muted">{t.quote}</blockquote>
          {t.imagePath && <TestimonialProof src={imageSrc} name={t.name} />}
        </div>
      )}

      {t.imagePath &&
        (t.quote ? null : (
          // No words to show, so the screenshot IS the testimonial and stays in the card.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={`A message from ${t.name}`}
            loading="lazy"
            decoding="async"
            className="w-full flex-1 rounded-xl border border-border"
          />
        ))}

      <figcaption className="mt-4 text-sm font-semibold">
        {t.name}
        {t.detail && <span className="mt-0.5 block font-normal text-muted">{t.detail}</span>}
      </figcaption>
    </figure>
  );
}
