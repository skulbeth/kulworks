"use client";

import { useState } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";

// Newsletter email capture. Saves to the Subscriber table via /api/subscribe.
export default function NewsletterSignup() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          source: "footer",
          company_website: fd.get("company_website"), // honeypot
          turnstileToken,
        }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setError(data.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setError("Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <p className="text-sm font-semibold text-green-600">
        Thanks! You&apos;re on the list! 🎉
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-2">
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        name="email"
        required
        placeholder="you@email.com"
        aria-label="Email address"
        className="flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-blue focus:outline-none"
      />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "submitting" ? "…" : "Subscribe"}
        </button>
      </div>
      <TurnstileWidget onToken={setTurnstileToken} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
