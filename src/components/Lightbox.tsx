"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Image lightbox. Tap/click a thumbnail to open; dismiss by tapping outside, the X,
 * a vertical swipe, or Escape. Pass `images` (2+) to make it a gallery: left/right
 * arrows, dots, horizontal swipe, and Arrow keys navigate. Works for static and
 * animated (WebP/GIF) images alike. Respects prefers-reduced-motion.
 */
export default function Lightbox({
  src,
  alt,
  title,
  images,
  onClose,
}: {
  src: string;
  alt: string;
  title?: string;
  images?: string[];
  onClose: () => void;
}) {
  const gallery = Array.isArray(images) && images.length > 1;
  const list = gallery ? (images as string[]) : [src];
  const start = gallery ? Math.max(0, (images as string[]).indexOf(src)) : 0;

  const [i, setI] = useState(start);
  const [shown, setShown] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const closing = useRef(false);

  function close() {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    setTimeout(onClose, 180);
  }
  const next = () => setI((n) => (n + 1) % list.length);
  const prev = () => setI((n) => (n - 1 + list.length) % list.length);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (gallery && e.key === "ArrowRight") next();
      else if (gallery && e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navBtn =
    "absolute top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-6xl leading-none text-white transition-colors hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || alt}
      onClick={close}
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (gallery && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
          if (dx < 0) next();
          else prev();
          return;
        }
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 60) close();
      }}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl leading-none text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        &times;
      </button>

      {gallery && (
        <>
          <button type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); prev(); }} className={`${navBtn} left-2 sm:left-4`}>
            &lsaquo;
          </button>
          <button type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); next(); }} className={`${navBtn} right-2 sm:right-4`}>
            &rsaquo;
          </button>
        </>
      )}

      <figure
        className="m-0 flex max-h-[90vh] max-w-6xl flex-col items-center"
        onClick={(e) => {
          // In gallery mode, tapping the image advances to the next one (close via X,
          // tapping outside, a vertical swipe, or Esc).
          if (gallery) {
            e.stopPropagation();
            next();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={list[i]}
          alt={alt}
          className={`max-h-[82vh] w-auto rounded-lg object-contain shadow-2xl transition-transform duration-200 motion-reduce:transition-none ${
            shown ? "scale-100" : "scale-95"
          } ${gallery ? "cursor-pointer" : ""}`}
        />
        {(title || gallery) && (
          <figcaption className="mt-3 text-center text-sm text-white/80">
            {title}
            {gallery && <span className="text-white/60"> · {i + 1}/{list.length}</span>}
          </figcaption>
        )}
        {gallery && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {list.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to image ${idx + 1}`}
                onClick={(e) => { e.stopPropagation(); setI(idx); }}
                className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        )}
      </figure>
    </div>
  );
}
