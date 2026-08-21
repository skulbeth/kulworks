"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

/** A "See examples" button that pops the service's portfolio images in a lightbox
 *  gallery, keeping the visitor on the page (no navigation, no inline carousel). */
export default function ServiceExamples({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  if (!images.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-3 text-base font-semibold text-foreground transition-colors hover:border-blue hover:text-blue"
      >
        See examples →
      </button>
      {open && (
        <Lightbox
          src={images[0]}
          alt={`${title} examples`}
          title={`${title} — examples`}
          images={images}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
