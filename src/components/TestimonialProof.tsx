"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";

/**
 * What sits under a testimonial's words: a photo of the thing that was made, and
 * a link to the original message.
 *
 * The item photo is shown, because that is what someone reading a testimonial
 * actually wants to see. The message screenshot is not: a chat window squeezed to
 * card width is unreadable, and the shots are all different shapes, which left the
 * grid ragged. It opens full size on click instead.
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

  return (
    <>
      {photoSrc && (
        <button
          type="button"
          onClick={() => setOpen("photo")}
          aria-label={`See ${photoAlt} larger`}
          className="group mt-4 block w-full overflow-hidden rounded-xl border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt={photoAlt}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full bg-surface2 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>
      )}

      {messageSrc && (
        <button
          type="button"
          onClick={() => setOpen("message")}
          className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-blue transition-colors hover:underline"
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
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
          </svg>
          See the message
        </button>
      )}

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
