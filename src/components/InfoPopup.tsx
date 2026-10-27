"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Small explainer popup ("What is this?"), rendered via a portal to <body> like the
 * Lightbox so it always covers the viewport. Sam wanted it gone on one click or tap
 * anywhere: on the popup itself, on the backdrop around it, the X, or Escape.
 */
export default function InfoPopup({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closing = useRef(false);

  function close() {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    setTimeout(onClose, 150);
  }

  useEffect(() => {
    setMounted(true);
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={close}
      className={`fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-150 motion-reduce:transition-none ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-left shadow-2xl transition-transform duration-150 motion-reduce:transition-none ${
          shown ? "scale-100" : "scale-95"
        }`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          autoFocus
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-muted transition-colors hover:bg-surface2 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
        >
          &times;
        </button>
        <h3 className="pr-8 text-lg font-extrabold text-gold">{title}</h3>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
        <p className="mt-4 text-xs text-muted/70">Tap anywhere to close.</p>
      </div>
    </div>,
    document.body
  );
}
