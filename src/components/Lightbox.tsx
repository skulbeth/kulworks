"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Image lightbox, rendered via a portal to <body> so it always covers the full
 * viewport (never trapped inside a transformed/animated ancestor). Tapping the image
 * advances in gallery mode; tapping anywhere else (backdrop), the X, a vertical swipe,
 * or Escape closes. Every image sits in a fixed-size frame so the size doesn't jump
 * between slides. Works for static and animated (WebP/GIF) images alike.
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
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
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

  if (!mounted) return null;

  const navBtn =
    "absolute top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-6xl leading-none text-white transition-colors hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return createPortal(
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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
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

      {/* Fixed-size frame so images don't change scale between slides. The frame area
          around the image is transparent; clicks on it bubble up and close. */}
      <div className="flex h-[78vh] w-full max-w-5xl items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={list[i]}
          alt={alt}
          onClick={(e) => {
            if (gallery) {
              e.stopPropagation();
              next();
            }
          }}
          className={`h-full w-full rounded-lg object-contain transition-transform duration-200 motion-reduce:transition-none ${
            shown ? "scale-100" : "scale-95"
          } ${gallery ? "cursor-pointer" : "cursor-zoom-out"}`}
        />
      </div>

      {(title || gallery) && (
        <div className="mt-3 text-center text-sm text-white/80">
          {title}
          {gallery && <span className="text-white/60"> · {i + 1}/{list.length}</span>}
        </div>
      )}
      {gallery && (
        <div className="mt-3 flex max-w-full flex-wrap justify-center gap-2 px-4">
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
    </div>,
    document.body
  );
}
