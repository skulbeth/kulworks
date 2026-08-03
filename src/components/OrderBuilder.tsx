"use client";

import { useState } from "react";
import { cardTemplates, getCardTemplate } from "@/data/cardTemplates";

export default function OrderBuilder() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const template = selectedId ? getCardTemplate(selectedId) : null;
  const input =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base focus:border-blue focus:outline-none";

  function reset() {
    setSelectedId(null);
    setStatus("idle");
    setError("");
    setPreviews({});
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!template) return;
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("templateId", template.id);
    setStatus("sending");
    try {
      const res = await fetch("/api/order", { method: "POST", body: fd });
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

  // ---- Success ----
  if (status === "done") {
    return (
      <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-center">
        <h2 className="text-xl font-bold text-green-600">Order received — thanks!</h2>
        <p className="mt-2 text-muted">
          We&apos;ve got your details and photos. We&apos;ll reach out with a proof and a quote.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-full border border-border px-5 py-2 font-semibold hover:border-blue hover:text-blue"
        >
          Start another
        </button>
      </div>
    );
  }

  // ---- Step 1: browse designs ----
  if (!template) {
    return (
      <div>
        <p className="mb-4 text-muted">Pick a design to start. You&apos;ll fill in the details next.</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cardTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className="group overflow-hidden rounded-2xl border border-border bg-surface text-left transition-all hover:-translate-y-1 hover:border-blue"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt={t.name} className="aspect-[4/3] w-full object-cover" />
              <div className="p-4">
                <h3 className="font-bold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted">{t.blurb}</p>
                <span className="mt-3 inline-block text-sm font-bold text-blue">Choose this →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Step 2: fill in the chosen design ----
  return (
    <div>
      <button
        type="button"
        onClick={reset}
        className="mb-4 text-sm font-semibold text-blue hover:underline"
      >
        ← Back to designs
      </button>
      <h2 className="text-2xl font-extrabold">{template.name}</h2>
      <p className="mt-1 text-muted">{template.blurb}</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

        {/* Photos */}
        {template.imageSlots.length > 0 && (
          <div className="space-y-3">
            {template.imageSlots.map((slot) => (
              <div key={slot.key}>
                <label className="mb-1 block text-sm font-semibold">
                  {slot.label}
                  {slot.required && <span className="text-gold"> *</span>}
                </label>
                <input
                  type="file"
                  name={`img_${slot.key}`}
                  accept="image/*"
                  required={slot.required}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPreviews((p) => ({ ...p, [slot.key]: f ? URL.createObjectURL(f) : "" }));
                  }}
                  className={input}
                />
                {previews[slot.key] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previews[slot.key]}
                    alt=""
                    className="mt-2 h-24 w-24 rounded-lg border border-border object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Template fields */}
        {template.fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-semibold">
              {f.label}
              {f.required && <span className="text-gold"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea name={`f_${f.key}`} rows={3} required={f.required} placeholder={f.placeholder} className={input} />
            ) : f.type === "select" ? (
              <select name={`f_${f.key}`} required={f.required} defaultValue="" className={input}>
                <option value="" disabled>
                  Select…
                </option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                name={`f_${f.key}`}
                required={f.required}
                placeholder={f.placeholder}
                className={input}
              />
            )}
          </div>
        ))}

        {/* Quantity + contact */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold">How many?</label>
            <input name="quantity" placeholder="e.g. 25 cards" className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Your name <span className="text-gold">*</span>
            </label>
            <input name="name" required autoComplete="name" className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Email <span className="text-gold">*</span>
            </label>
            <input name="email" type="email" required autoComplete="email" className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Phone (optional)</label>
            <input name="phone" type="tel" autoComplete="tel" className={input} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Anything else? (optional)</label>
          <textarea name="note" rows={3} placeholder="Colors, deadline, extra requests…" className={input} />
        </div>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-full bg-primary px-6 py-4 text-lg font-bold text-black hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send my card order"}
        </button>
        <p className="text-center text-xs text-muted">
          We&apos;ll send a proof and a quote before anything is printed.
        </p>
      </form>
    </div>
  );
}
