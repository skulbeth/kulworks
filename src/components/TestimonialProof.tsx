"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";

/**
 * The two links under a testimonial's words: the thing that was made, and the
 * original message. Both open full size on click.
 *
 * Neither is shown inline. A chat window squeezed to card width is unreadable,
 * and an inline photo turns every card into a different height, which left the
 * grid ragged with dead space. Links keep the cards tight and the words first.
 */
export default function TestimonialProof({
  photoSrc,
  messageSrc,
  name,
  detail,
}: {
  photoSrc?: string;
  messageSrc?: string;
  name: string;
  detail?: string | null;
}) {
  const [open, setOpen] = useState<"photo" | "message" | null>(null);

  const photoAlt = detail ? `${detail} made for ${name}` : `Work made for ${name}`;
  const link =
    "inline-flex items-center gap-1.5 text-sm font-semibold text-blue transition-colors hover:underline";

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {photoSrc && (
          <button type="button" onClick={() => setOpen("photo")} className={link}>
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
            See the item
          </button>
        )}

        {messageSrc && (
          <button type="button" onClick={() => setOpen("message")} className={link}>
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
              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
            </svg>
            See the message
          </button>
        )}
      </div>

      {open && (
        <Lightbox
          src={(open === "photo" ? photoSrc : messageSrc) as string}
          alt={open === "photo" ? photoAlt : `The original message from ${name}`}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
