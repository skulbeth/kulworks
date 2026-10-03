"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  portfolio,
  portfolioFilters,
  PortfolioCategory,
  PortfolioItem,
} from "@/data/portfolio";
import Placeholder from "./Placeholder";
import Lightbox from "./Lightbox";

export default function PortfolioGrid({ initial }: { initial?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const valid = portfolioFilters.some((f) => f.id === initial);
  const [active, setActive] = useState<PortfolioCategory | "all">(
    valid ? (initial as PortfolioCategory) : "all"
  );

  // Keep the address bar honest without a navigation, so Back works and the
  // current view can be copied out of the URL bar.
  const choose = (id: PortfolioCategory | "all") => {
    setActive(id);
    router.replace(id === "all" ? pathname : `${pathname}?type=${id}`, { scroll: false });
  };
  const [zoom, setZoom] = useState<PortfolioItem | null>(null);

  const items =
    active === "all" ? portfolio : portfolio.filter((p) => p.category === active);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter portfolio">
        {portfolioFilters.map((f) => {
          const selected = active === f.id;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={selected}
              onClick={() => choose(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selected
                  ? "bg-primary text-black"
                  : "border border-border bg-surface text-muted hover:border-blue hover:text-blue"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <figure
            key={item.title}
            className="overflow-hidden rounded-xl border border-border bg-surface transition-transform duration-200 hover:-translate-y-1"
          >
            {item.src ? (
              <button
                type="button"
                onClick={() => setZoom(item)}
                aria-label={`View ${item.title} larger`}
                className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
              >
                <Placeholder
                  label={item.title}
                  src={item.src}
                  alt={item.alt}
                  ratio="aspect-[4/3]"
                  className="rounded-none"
                />
              </button>
            ) : (
              <Placeholder
                label={item.title}
                src={item.src}
                alt={item.alt}
                ratio="aspect-[4/3]"
                className="rounded-none"
              />
            )}
            <figcaption className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{item.title}</span>
                <span className="shrink-0 rounded-full bg-surface2 px-2.5 py-0.5 text-xs uppercase tracking-wide text-muted">
                  {item.category}
                </span>
              </div>
              {item.note && (
                <p className="mt-2 text-sm leading-snug text-muted">{item.note}</p>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-12 text-center text-muted">No work in this category yet.</p>
      )}

      {zoom?.src && (
        <Lightbox
          src={zoom.src}
          alt={zoom.alt}
          title={zoom.title}
          note={zoom.note}
          images={zoom.images}
          onClose={() => setZoom(null)}
        />
      )}
    </div>
  );
}
