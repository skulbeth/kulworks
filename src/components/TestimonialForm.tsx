"use client";

import { useState } from "react";

/** What a client fills in after Sam sends them their private link. */
export default function TestimonialForm({
  token,
  name,
  maxChars,
}: {
  token: string;
  name: string;
  maxChars: number;
}) {
  const [quote, setQuote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const input =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base focus:border-blue focus:outline-none";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (quote.trim().length < 15) {
      setError("A sentence or two is plenty, but we need a little more than that.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("token", token);
    setStatus("sending");
    try {
      const res = await fetch("/api/testimonial/", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setStatus("done");
      else {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6">
        <h2 className="text-xl font-bold text-green-600">Thank you, genuinely.</h2>
        <p className="mt-2 text-muted">
          That means a lot. Sam will have a read before it goes on the site, so it may be a day or
          two before you see it.
        </p>
        <a href="/" className="mt-5 inline-flex font-semibold text-blue hover:underline">
          Have a look round the site &rarr;
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Bots fill hidden fields. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <div>
        <label htmlFor="quote" className="mb-1.5 block text-sm font-semibold">
          In your own words
        </label>
        <textarea
          id="quote"
          name="quote"
          rows={6}
          required
          maxLength={maxChars}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="What did you have made, and how did it go?"
          className={input}
        />
        <p className="mt-1 text-right text-xs text-muted">
          {quote.length}/{maxChars}
        </p>
      </div>

      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-semibold">
          Name to show
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={name}
          required
          maxLength={80}
          className={input}
        />
        <p className="mt-1 text-xs text-muted">
          Shorten it if you&apos;d rather, for example &ldquo;{name.split(" ")[0]} D.&rdquo;
        </p>
      </div>

      <div>
        <label htmlFor="detail" className="mb-1.5 block text-sm font-semibold">
          A bit of context <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="detail"
          name="detail"
          maxLength={120}
          placeholder="Game designer, San Antonio"
          className={input}
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
        <span className="text-sm text-muted">
          Kulworks can publish this on their website, with the name I entered above. I understand
          I can ask for it to be taken down at any time.
        </span>
      </label>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Send it"}
      </button>
    </form>
  );
}
