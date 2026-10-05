"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** First path segment -> what that page is called, so the button can name it. */
const PAGE_NAMES: Record<string, string> = {
  "": "home",
  services: "services",
  portfolio: "the work",
  pricing: "pricing",
  guides: "guides & FAQ",
  about: "about",
  contact: "contact",
  testimonials: "testimonials",
  order: "the card builder",
};

/**
 * "Back to where I was" button.
 *
 * Goes back through history rather than to a fixed page, because this page is
 * reached from several places. The label names the page they came from when the
 * referrer is one of ours; an off-site referrer is never named, and someone who
 * landed here cold gets sent home instead of into a dead end.
 */
export default function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("Back");
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    setHasHistory(window.history.length > 1);

    // An in-app Link does NOT update document.referrer, so the pages that send
    // people here say so with ?from=. The referrer below still covers a full page
    // load, e.g. arriving from search or a pasted link.
    const from = new URLSearchParams(window.location.search).get("from");
    if (from && PAGE_NAMES[from]) {
      setLabel(`Back to ${PAGE_NAMES[from]}`);
      return;
    }

    try {
      const ref = document.referrer;
      if (!ref) return;
      const url = new URL(ref);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      const segment = url.pathname.split("/").filter(Boolean)[0] ?? "";
      const name = PAGE_NAMES[segment];
      if (name) setLabel(`Back to ${name}`);
    } catch {
      /* a malformed referrer just leaves the plain label */
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => (hasHistory ? router.back() : router.push(fallback))}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-base font-semibold transition-all hover:-translate-x-0.5 hover:border-blue hover:text-blue sm:px-8 sm:py-4 sm:text-lg"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-5 w-5"
      >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}
