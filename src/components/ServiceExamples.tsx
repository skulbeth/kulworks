import Link from "next/link";

/** Sends the visitor to this service's work in the portfolio.
 *
 *  This used to open a lightbox holding every image in the category, which meant
 *  the portfolio and the services pages showed the same galleries twice and both
 *  had to be kept in step by hand. The portfolio is the better place to browse
 *  (it gets roughly four times the traffic), and a services page has one job,
 *  which is getting someone to ask for a quote. So this points there instead. */
export default function ServiceExamples({
  href,
  title,
  count,
}: {
  href: string | null;
  title: string;
  count: number;
}) {
  if (!href || count === 0) return null;
  return (
    <Link
      href={href}
      aria-label={`See all ${count} ${title} examples in the portfolio`}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-3 text-base font-semibold text-foreground transition-colors hover:border-blue hover:text-blue"
    >
      See all {count} examples &rarr;
    </Link>
  );
}
