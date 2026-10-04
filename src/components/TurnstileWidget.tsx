"use client";

import { Turnstile } from "@marsidev/react-turnstile";

// Renders the Cloudflare Turnstile challenge and hands the solved token to the parent.
// Renders nothing if the site key isn't configured (so the app works pre-Turnstile).
export default function TurnstileWidget({
  onToken,
  size = "normal",
}: {
  onToken: (token: string) => void;
  /** "compact" (150x140) fits narrow columns; "normal" is a fixed 300px wide and
   *  will overflow anything narrower than that. */
  size?: "normal" | "compact";
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onToken}
      options={{ theme: "auto", size }}
    />
  );
}
