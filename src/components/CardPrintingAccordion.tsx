"use client";

import { useEffect } from "react";
import Link from "next/link";
import { cardPages } from "@/data/cardCluster";

// Grouping for the card-printing hub. Reorder slugs or move between groups freely.
const GROUPS = [
  {
    key: "design",
    title: "Design & Fast Prototyping",
    intro: "What we do best: fast card design and local prototypes.",
    slugs: ["card-design", "game-prototypes"],
  },
  {
    key: "sizes",
    title: "Card Sizes Offered",
    intro: "Pick the size that fits your deck.",
    slugs: ["poker-cards", "tarot-cards", "giant-cards", "trading-cards"],
  },
  {
    key: "upgrades",
    title: "Upgrades Offered",
    intro: "Finish the deck with boxes, sleeves, and other extras.",
    slugs: ["boxes-and-upgrades"],
  },
];

export default function CardPrintingAccordion() {
  // If the page is opened with a #slug (e.g. from "See card design"), expand it.
  useEffect(() => {
    const slug = window.location.hash.replace("#", "");
    if (!slug) return;
    const el = document.getElementById(slug);
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <>
      {GROUPS.map((g, gi) => {
        const items = g.slugs
          .map((slug) => cardPages.find((p) => p.slug === slug))
          .filter((p): p is (typeof cardPages)[number] => Boolean(p));
        if (!items.length) return null;
        return (
          <div key={g.key} className={gi > 0 ? "mt-10 border-t-2 border-gold/40 pt-10" : ""}>
            <h2 className="text-2xl font-extrabold text-gold text-glow-gold">{g.title}</h2>
            <p className="mt-1 text-muted">{g.intro}</p>
            <div className="mt-6 space-y-4">
              {items.map((p) => (
                <details
                  key={p.slug}
                  id={p.slug}
                  className="group scroll-mt-24 rounded-2xl border border-border bg-surface p-6 transition-colors open:border-blue/40"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{p.navLabel}</h3>
                      <p className="mt-1 text-muted">{p.cardBlurb}</p>
                    </div>
                    <span
                      aria-hidden
                      className="shrink-0 text-2xl leading-none text-gold transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>

                  <div className="mt-5 space-y-4 border-t border-border pt-5">
                    <p className="text-muted">{p.intro}</p>
                    {p.specs && (
                      <ul className="space-y-1.5 text-muted">
                        {p.specs.map((spec) => (
                          <li key={spec} className="flex gap-2">
                            <span aria-hidden className="text-gold">•</span>
                            <span>{spec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 pt-1">
                      <Link
                        href={`/services/card-printing/${p.slug}/`}
                        className="text-sm font-bold text-blue hover:underline"
                      >
                        ← Need more? Read more here
                      </Link>
                      <Link
                        href={`/contact/?type=${p.slug === "card-design" ? "card-design" : "card-printing"}`}
                        className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-primary-hover hover:shadow-glow"
                      >
                        Get a quote
                      </Link>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
