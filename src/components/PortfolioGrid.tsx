"use client";

import { useState } from "react";
import {
  portfolio,
  portfolioFilters,
  PortfolioCategory,
  PortfolioItem,
} from "@/data/portfolio";
import Placeholder from "./Placeholder";
import Lightbox from "./Lightbox";

export default function PortfolioGrid() {
  const [active, setActive] = useState<PortfolioCategory | "all">("all");
  const [zoom, setZoom] = useState<PortfolioItem | null>(null);

  const items =
    active === "all" ? portfolio : portfolio.filter((p) => p.category === active);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter portfolio">
        {portfolioFilters.map((f) => {
          const selected = active === f.id;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(f.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
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
            <figcaption className="flex items-center justify-between gap-2 p-4">
              <span className="font-semibold">{item.title}</span>
              <span className="rounded-full bg-surface2 px-2.5 py-0.5 text-xs uppercase tracking-wide text-muted">
                {item.category}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-12 text-center text-muted">No work in this category yet.</p>
      )}

      {zoom?.src && (
        <Lightbox src={zoom.src} alt={zoom.alt} title={zoom.title} onClose={() => setZoom(null)} />
      )}
    </div>
  );
}
