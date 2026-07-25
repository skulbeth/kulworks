"use client";

import { useState } from "react";

/** Copies `text` to the clipboard with brief "Copied!" feedback. */
export default function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked (rare on HTTPS) — no-op; the text is still visible to copy manually.
        }
      }}
      className={
        className ??
        "rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:border-blue hover:text-blue"
      }
      aria-label={`Copy ${label === "Copy" ? "to clipboard" : label}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
