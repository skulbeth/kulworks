"use client";

import { useId, useState } from "react";
import { cardTemplates, getCardTemplate } from "@/data/cardTemplates";
import TurnstileWidget from "@/components/TurnstileWidget";
import { photoType, putToSignedUrl, requestUploadSlots } from "@/lib/direct-upload";

const MAX_MB = 15; // = MAX_FILE_BYTES in lib/uploads

// One photo slot: the picked file, and once it's in storage, its { path, grant }.
type Photo = {
  file: File;
  preview: string;
  up?: { path: string; grant: string };
  progress?: number;
  error?: string;
};

export default function OrderBuilder() {
  const uid = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<Record<string, Photo>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const template = selectedId ? getCardTemplate(selectedId) : null;
  const input =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base focus:border-blue focus:outline-none";

  function reset() {
    setSelectedId(null);
    setStatus("idle");
    setError("");
    setPhotos({});
  }

  // Tokens are single-use: after any request that spent one (or failed), get a fresh one.
  function resetTurnstile() {
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
  }

  function patchPhoto(key: string, patch: Partial<Photo>) {
    setPhotos((p) => (p[key] ? { ...p, [key]: { ...p[key], ...patch } } : p));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!template) return;
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("templateId", template.id);

    // Check the photos before sending anything.
    for (const slot of template.imageSlots) {
      const ph = photos[slot.key];
      if (!ph) continue;
      if (!photoType(ph.file)) {
        patchPhoto(slot.key, { error: "Not a photo we can use (JPG, PNG, WebP, GIF or HEIC)." });
        setError(`"${slot.label}" must be an image.`);
        return;
      }
      if (ph.file.size > MAX_MB * 1024 * 1024) {
        patchPhoto(slot.key, { error: `Too large (${MAX_MB} MB max).` });
        setError(`"${slot.label}" is too large (${MAX_MB} MB max).`);
        return;
      }
    }

    // 1) Photos go straight to storage (anything not already uploaded on an earlier try).
    const done: Record<string, { path: string; grant: string }> = {};
    const todo: string[] = [];
    for (const slot of template.imageSlots) {
      const ph = photos[slot.key];
      if (ph?.up) done[slot.key] = ph.up;
      else if (ph) todo.push(slot.key);
    }
    if (todo.length) {
      setStatus("uploading");
      const got = await requestUploadSlots({
        kind: "order",
        templateId: template.id,
        files: todo.map((k) => ({ type: photoType(photos[k].file), size: photos[k].file.size })),
        turnstileToken,
        company_website: fd.get("company_website"), // honeypot
      });
      resetTurnstile(); // spent either way
      if ("error" in got) {
        setStatus("error");
        setError(got.error);
        return;
      }
      const results = await Promise.all(
        todo.map(async (k, i) => {
          const slot = got.slots[i];
          if (!slot) return false;
          const ph = photos[k];
          patchPhoto(k, { progress: 0, error: undefined });
          const ok = await putToSignedUrl(slot.signedUrl, ph.file, photoType(ph.file), (pct) =>
            patchPhoto(k, { progress: pct })
          );
          if (ok) {
            done[k] = { path: slot.path, grant: slot.grant };
            patchPhoto(k, { up: done[k], progress: 100 });
          } else {
            patchPhoto(k, { progress: undefined, error: "Didn't upload. Press send to try again." });
          }
          return ok;
        })
      );
      const failed = todo.filter((_, i) => !results[i]);
      if (failed.length) {
        const labels = failed.map((k) => `"${template.imageSlots.find((s) => s.key === k)?.label}"`);
        setStatus("error");
        setError(
          `${labels.join(" and ")} didn't upload, so your order wasn't sent yet. Check your connection and press send again.`
        );
        return;
      }
    }

    // 2) The order itself: just the text and the storage paths.
    for (const [k, up] of Object.entries(done)) {
      fd.set(`img_${k}`, up.path);
      fd.set(`grant_${k}`, up.grant);
    }
    if (turnstileToken && !todo.length) fd.set("turnstileToken", turnstileToken);
    setStatus("sending");
    try {
      const res = await fetch("/api/order/", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setStatus("done");
      else {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        if (!todo.length) resetTurnstile();
        // The server couldn't find a photo: forget the uploads so the next try re-sends them.
        if (typeof data.error === "string" && data.error.includes("didn't upload")) {
          setPhotos((p) =>
            Object.fromEntries(
              Object.entries(p).map(([k, v]) => [k, { ...v, up: undefined, progress: undefined }])
            )
          );
        }
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
      if (!todo.length) resetTurnstile();
    }
  }

  // ---- Success ----
  if (status === "done") {
    const sentPhotos = Object.keys(photos).length > 0;
    return (
      <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-center">
        <h2 className="text-xl font-bold text-green-600">Order received. Thanks!</h2>
        <p className="mt-2 text-muted">
          We&apos;ve got your details{sentPhotos ? " and photos" : ""}. We&apos;ll reach out with a
          proof and a quote.
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

  const busy = status === "sending" || status === "uploading";

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
            {template.imageSlots.map((slot) => {
              const ph = photos[slot.key];
              return (
                <div key={slot.key}>
                  <label htmlFor={`${uid}-img-${slot.key}`} className="mb-1 block text-sm font-semibold">
                    {slot.label}
                    {slot.required && <span className="text-gold"> *</span>}
                  </label>
                  {/* No name: the file never rides in the form post, it goes straight to storage. */}
                  <input
                    id={`${uid}-img-${slot.key}`}
                    type="file"
                    accept="image/*"
                    required={slot.required}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setPhotos((p) => {
                        const next = { ...p };
                        if (f) next[slot.key] = { file: f, preview: URL.createObjectURL(f) };
                        else delete next[slot.key];
                        return next;
                      });
                    }}
                    className={input}
                  />
                  {ph && (
                    <div className="mt-2 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ph.preview}
                        alt=""
                        className="h-24 w-24 rounded-lg border border-border object-cover"
                      />
                      <div className="min-w-0 flex-1 text-sm" aria-live="polite">
                        {ph.error ? (
                          <p className="font-semibold text-red-600">{ph.error}</p>
                        ) : ph.up ? (
                          <p className="font-semibold text-green-600">Uploaded</p>
                        ) : ph.progress !== undefined ? (
                          <>
                            <p className="text-muted">Uploading… {ph.progress}%</p>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                              <div className="h-full bg-blue" style={{ width: `${ph.progress}%` }} />
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Template fields */}
        {template.fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={`${uid}-f-${f.key}`} className="mb-1 block text-sm font-semibold">
              {f.label}
              {f.required && <span className="text-gold"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea id={`${uid}-f-${f.key}`} name={`f_${f.key}`} rows={3} required={f.required} placeholder={f.placeholder} className={input} />
            ) : f.type === "select" ? (
              <select id={`${uid}-f-${f.key}`} name={`f_${f.key}`} required={f.required} defaultValue="" className={input}>
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
                id={`${uid}-f-${f.key}`}
                type={f.type === "number" ? "number" : "text"}
                inputMode={f.type === "number" ? "numeric" : undefined}
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
            <label htmlFor={`${uid}-quantity`} className="mb-1 block text-sm font-semibold">How many?</label>
            <input id={`${uid}-quantity`} name="quantity" inputMode="numeric" placeholder="e.g. 25" className={input} />
          </div>
          <div>
            <label htmlFor={`${uid}-name`} className="mb-1 block text-sm font-semibold">
              Your name <span className="text-gold">*</span>
            </label>
            <input id={`${uid}-name`} name="name" required autoComplete="name" className={input} />
          </div>
          <div>
            <label htmlFor={`${uid}-email`} className="mb-1 block text-sm font-semibold">
              Email <span className="text-gold">*</span>
            </label>
            <input id={`${uid}-email`} name="email" type="email" required autoComplete="email" className={input} />
          </div>
          <div>
            <label htmlFor={`${uid}-phone`} className="mb-1 block text-sm font-semibold">Phone (optional)</label>
            <input id={`${uid}-phone`} name="phone" type="tel" autoComplete="tel" className={input} />
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-note`} className="mb-1 block text-sm font-semibold">Anything else? (optional)</label>
          <textarea id={`${uid}-note`} name="note" rows={3} placeholder="Colors, deadline, extra requests…" className={input} />
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary px-6 py-4 text-lg font-bold text-black hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "uploading" ? "Uploading photos…" : status === "sending" ? "Sending…" : "Send my card order"}
        </button>
        <p className="text-center text-xs text-muted">
          We&apos;ll send a proof and a quote before anything is printed.
        </p>
      </form>
    </div>
  );
}
