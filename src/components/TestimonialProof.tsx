"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";

/**
 * "See the message" link that opens the original screenshot full size.
 *
 * The screenshot used to sit inside the card, which read badly: a chat window
 * squeezed to card width is too small to read, and because the shots are all
 * different shapes the cards ended up ragged with big empty gaps. The words are
 * the testimonial; the screenshot is only there to show they are real, so it
 * waits behind a click.
 */
export default function TestimonialProof({ src, name }: { src: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-blue transition-colors hover:underline"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-4 w-4"
        >
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 14-5-5L5 17" />
        </svg>
        See the message
      </button>

      {open && (
        <Lightbox
          src={src}
          alt={`The original message from ${name}`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
