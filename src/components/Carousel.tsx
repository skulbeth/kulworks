"use client";

/**
 * Image carousel, modeled on the Role to Reign site (autoplay, swipe, arrows, dots).
 * Each slide takes an optional `src`. Until you set one, the slide shows an obvious
 * labeled placeholder box, so you can drop real photos in later without touching layout.
 *
 * To use real photos: put files in /public/images/<folder>/ and set `src` on each slide.
 */

import { useEffect, useState } from "react";

export interface Slide {
  /** e.g. "/images/studio/bench-01.jpg". Leave undefined to show a placeholder. */
  src?: string;
  label: string;
  alt?: string;
}

export default function Carousel({
  slides,
  autoPlay = true,
  autoPlayInterval = 5000,
  ratio = "pb-[66%]",
}: {
  slides: Slide[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  /** Aspect ratio as a bottom-padding utility (height as % of width). */
  ratio?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pauseTimeout, setPauseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  // On-demand loading: only fetch a slide's image once it's the current slide (or an
  // immediate neighbour, so the next swipe is ready). Heavy animated slides therefore
  // don't all download on page load — big win on mobile. Once loaded, a slide stays loaded.
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));

  const length = slides.length;
  const next = () => setCurrent((prev) => (prev + 1) % length);
  const prev = () => setCurrent((prev) => (prev - 1 + length) % length);

  const minSwipeDistance = 50;

  const pauseBriefly = () => {
    setPaused(true);
    if (pauseTimeout) clearTimeout(pauseTimeout);
    setPauseTimeout(setTimeout(() => setPaused(false), 8000));
  };

  const handleManualNav = (direction: "next" | "prev") => {
    if (direction === "next") next();
    else prev();
    pauseBriefly();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleManualNav("next");
    else if (distance < -minSwipeDistance) handleManualNav("prev");
  };

  useEffect(() => {
    if (!autoPlay || paused || length <= 1) return;
    const timer = setInterval(next, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, paused, length]);

  // Grow the "loaded" set to include the current slide + its neighbours.
  useEffect(() => {
    setLoaded((prev) => {
      const nxt = new Set(prev);
      nxt.add(current);
      nxt.add((current + 1) % length);
      nxt.add((current - 1 + length) % length);
      return nxt;
    });
  }, [current, length]);

  return (
    <div
      className="relative w-full max-w-full overflow-hidden rounded-2xl border border-border shadow-lg"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, idx) => (
          <div key={idx} className="w-full flex-shrink-0">
            <div className={`relative w-full ${ratio}`}>
              {slide.src && loaded.has(idx) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.src}
                  alt={slide.alt ?? slide.label}
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 h-full w-full bg-background object-cover"
                />
              ) : slide.src ? (
                // Not reached yet — hold the layout with a neutral panel until it loads.
                <div className="absolute inset-0 bg-surface2" aria-hidden />
              ) : (
                <div
                  role="img"
                  aria-label={`${slide.label} (placeholder image)`}
                  className="absolute inset-0 flex items-center justify-center bg-surface2"
                >
                  <div className="px-4 text-center">
                    <div className="text-2xl opacity-50">🖼️</div>
                    <div className="mt-1 text-sm font-semibold text-muted">{slide.label}</div>
                    <div className="text-xs text-muted/60">replace me</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {length > 1 && (
        <>
          <button
            type="button"
            onClick={() => handleManualNav("prev")}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:left-4"
            aria-label="Previous slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleManualNav("next")}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:right-4"
            aria-label="Next slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrent(idx);
                  pauseBriefly();
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === current ? "w-4 bg-gold" : "w-2 bg-white/50"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
