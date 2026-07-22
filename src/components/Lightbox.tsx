"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Simple image lightbox. Tap/click a thumbnail to open; dismiss by tapping the image,
 * tapping outside it, swiping, the X button, or Escape. Works for static and animated
 * (WebP/GIF) images alike — it's just an <img>. Respects prefers-reduced-motion.
 */
export default function Lightbox({
  src,
  alt,
  title,
  onClose,
}: {
  src: string;
  alt: string;
  title?: string;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  // Animate-out, then unmount. Idempotent — extra calls just no-op.
  const closing = useRef(false);
  function close() {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    setTimeout(onClose, 180);
  }

  useEffect(() => {
    // Trigger the enter transition on the next frame.
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // lock background scroll while open
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl leading-none text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        &times;
      </button>

      <figure className="m-0 flex max-h-[90vh] max-w-6xl flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`max-h-[82vh] w-auto rounded-lg object-contain shadow-2xl transition-transform duration-200 motion-reduce:transition-none ${
            shown ? "scale-100" : "scale-95"
          }`}
        />
        {title && (
          <figcaption className="mt-3 text-center text-sm text-white/80">{title}</figcaption>
        )}
      </figure>
    </div>
  );
}
