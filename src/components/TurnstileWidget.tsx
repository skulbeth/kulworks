"use client";

import { Turnstile } from "@marsidev/react-turnstile";

// Renders the Cloudflare Turnstile challenge and hands the solved token to the parent.
// Renders nothing if the site key isn't configured (so the app works pre-Turnstile).
export default function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onToken}
      options={{ theme: "auto" }}
    />
  );
}
