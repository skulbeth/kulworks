"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";
import Placeholder from "./Placeholder";

/** The service section's image; clicking it opens that service's examples in the
 *  lightbox gallery (same as the "See examples" button). Falls back to a plain
 *  image when there are no examples. */
export default function ServiceImage({
  src,
  alt,
  label,
  images,
  title,
}: {
  src?: string;
  alt: string;
  label: string;
  images: string[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const canOpen = images.length > 0;

  const img = <Placeholder label={label} src={src} alt={alt} ratio="aspect-[4/3]" />;

  if (!canOpen) return img;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`See ${title} examples`}
        className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
      >
        {img}
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
