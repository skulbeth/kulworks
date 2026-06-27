"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { services } from "@/data/services";
import { site } from "@/data/site";

// ===========================================================================
// TODO: paste your Formspree form ID here (https://formspree.io).
// Create a form, copy the endpoint, and replace the placeholder below.
// While this is the placeholder, the form runs in "demo mode" and won't send.
// ===========================================================================
const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID";
const isConfigured = !FORMSPREE_ENDPOINT.includes("REPLACE_WITH_YOUR_FORM_ID");

type Status = "idle" | "submitting" | "success" | "error";

function FormInner() {
  const params = useSearchParams();
  const [projectType, setProjectType] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Pre-select the project type from ?type=<service-id> (the "Request this" CTAs).
  useEffect(() => {
    const t = params.get("type");
    if (t && services.some((s) => s.id === t)) setProjectType(t);
  }, [params]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    if (!isConfigured) {
      // Demo mode: no endpoint set yet.
      setStatus("success");
      form.reset();
      setProjectType("");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        setProjectType("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const field =
    "w-full rounded-lg border border-border bg-surface2 px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
  const label = "mb-1.5 block text-sm font-semibold";

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-primary/40 bg-surface p-8 text-center">
        <div className="text-4xl">✅</div>
        <h3 className="mt-3 text-xl font-bold">Thanks, your request is in!</h3>
        <p className="mt-2 text-muted">
          {isConfigured
            ? "I'll get back to you shortly with next steps and a quote."
            : "Demo mode: connect a Formspree endpoint to receive real submissions."}
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-5 rounded-full border border-border px-5 py-2 font-semibold hover:border-blue hover:text-blue"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isConfigured && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          Demo mode: set your Formspree endpoint in <code>ContactForm.tsx</code> to go live.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">Name</label>
          <input id="name" name="name" required className={field} placeholder="Your name" />
        </div>
        <div>
          <label className={label} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className={field} placeholder="you@email.com" />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="projectType">Project type</label>
        <select
          id="projectType"
          name="projectType"
          className={field}
          value={projectType}
          onChange={(e) => setProjectType(e.target.value)}
          required
        >
          <option value="" disabled>Choose a service…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          <option value="other">Something else</option>
        </select>
      </div>

      <div>
        <label className={label} htmlFor="message">Project details</label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className={field}
          placeholder="Tell me about your project: quantities, sizes, timeline, and anything else that helps me quote it."
        />
      </div>

      <div>
        <label className={label} htmlFor="reference">Reference / artwork (optional)</label>
        <input
          id="reference"
          name="reference"
          type="text"
          className={field}
          placeholder="Paste a link to artwork or references (or mention you'll email files)."
        />
        <p className="mt-1.5 text-xs text-muted">
          Have files? Mention it here and I&apos;ll reply with an upload link.
        </p>
      </div>

      {status === "error" && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Something went wrong sending your message. Please email{" "}
          <a href={`mailto:${site.email}`} className="underline">{site.email}</a> instead.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-primary px-6 py-4 text-lg font-bold text-black transition-all hover:bg-primary-hover hover:shadow-glow disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? "Sending…" : "Request a Quote"}
      </button>
    </form>
  );
}

export default function ContactForm() {
  return (
    <Suspense fallback={<div className="text-muted">Loading form…</div>}>
      <FormInner />
    </Suspense>
  );
}
