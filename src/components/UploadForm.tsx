"use client";

import { useId, useState } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { photoType, putToSignedUrl, requestUploadSlots } from "@/lib/direct-upload";

// A picked photo, and once it's in storage, its { path, grant }.
type Item = {
  file: File;
  preview: string;
  up?: { path: string; grant: string };
  progress?: number;
  error?: string;
};

/** Public trade-show photo uploader. Native photo picker + a few optional fields.
 *  Photos go browser -> storage directly (see lib/direct-upload); the form post is text. */
export default function UploadForm({
  maxFiles,
  maxSizeMb,
}: {
  maxFiles: number;
  maxSizeMb: number;
}) {
  const uid = useId();
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const input =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base focus:border-blue focus:outline-none";
  const label = "mb-1 block text-sm font-semibold";

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setItems((prev) => [...prev, ...picked].slice(0, maxFiles));
    e.target.value = "";
  }

  function patchItem(file: File, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.file === file ? { ...it, ...patch } : it)));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!items.length) {
      setError("Add at least one photo.");
      return;
    }
    if (items.some((it) => !photoType(it.file))) {
      setError("Please pick images only (JPG, PNG, WebP, GIF or HEIC).");
      return;
    }
    if (items.some((it) => it.file.size > maxSizeMb * 1024 * 1024)) {
      setError(`Each photo must be under ${maxSizeMb} MB.`);
      return;
    }
    const fd = new FormData(e.currentTarget);

    // 1) Photos straight to storage (skipping any that made it on an earlier try).
    const ups = new Map<File, { path: string; grant: string }>();
    items.forEach((it) => it.up && ups.set(it.file, it.up));
    const todo = items.filter((it) => !it.up);
    if (todo.length) {
      setStatus("uploading");
      const got = await requestUploadSlots({
        kind: "upload",
        files: todo.map((it) => ({ type: photoType(it.file), size: it.file.size })),
        turnstileToken,
        company: fd.get("company"), // honeypot
      });
      // Tokens are single-use: spent either way, so get a fresh one for any retry.
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
      if ("error" in got) {
        setStatus("error");
        setError(got.error);
        return;
      }
      const results = await Promise.all(
        todo.map(async (it, i) => {
          const slot = got.slots[i];
          if (!slot) return false;
          patchItem(it.file, { progress: 0, error: undefined });
          const ok = await putToSignedUrl(slot.signedUrl, it.file, photoType(it.file), (pct) =>
            patchItem(it.file, { progress: pct })
          );
          if (ok) {
            ups.set(it.file, { path: slot.path, grant: slot.grant });
            patchItem(it.file, { up: ups.get(it.file), progress: 100 });
          } else {
            patchItem(it.file, { progress: undefined, error: "Didn't upload" });
          }
          return ok;
        })
      );
      const failed = todo.flatMap((it, i) => (results[i] ? [] : [items.indexOf(it) + 1]));
      if (failed.length) {
        setStatus("error");
        setError(
          `Photo ${failed.join(" and ")} didn't upload, so nothing was sent yet. Check your connection and press send again.`
        );
        return;
      }
    }

    // 2) The details + where the photos landed.
    setStatus("sending");
    try {
      const res = await fetch("/api/upload/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          contact: fd.get("contact"),
          note: fd.get("note"),
          company: fd.get("company"),
          photos: items.map((it) => ups.get(it.file)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setStatus("done");
      else {
        setStatus("error");
        setError(data.error || "Upload failed. Please try again.");
        // The server couldn't find a photo: forget the uploads so the next try re-sends them.
        if (typeof data.error === "string" && data.error.includes("didn't upload")) {
          setItems((prev) => prev.map((it) => ({ ...it, up: undefined, progress: undefined })));
        }
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-center">
        <h2 className="text-xl font-bold text-green-600">Got it. Thanks!</h2>
        <p className="mt-2 text-muted">
          Your photo{items.length > 1 ? "s" : ""} landed with Kulworks. We&apos;ll take it from here.
        </p>
        <button
          type="button"
          onClick={() => {
            setItems([]);
            setStatus("idle");
          }}
          className="mt-5 rounded-full border border-border px-5 py-2 font-semibold hover:border-blue hover:text-blue"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Honeypot */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <div>
        <label htmlFor={`${uid}-files`} className={label}>
          Photos (up to {maxFiles})
        </label>
        <input id={`${uid}-files`} type="file" accept="image/*" multiple onChange={onPick} className={input} />
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {items.map((it, i) => (
            <div key={it.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.preview}
                alt={`Selected ${i + 1}`}
                className="h-24 w-full rounded-lg border border-border object-cover"
              />
              <div className="mt-1 text-xs" aria-live="polite">
                {it.error ? (
                  <span className="font-semibold text-red-600">{it.error}</span>
                ) : it.up ? (
                  <span className="font-semibold text-green-600">Uploaded</span>
                ) : it.progress !== undefined ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-blue" style={{ width: `${it.progress}%` }} />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                disabled={status === "uploading" || status === "sending"}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-sm font-bold text-white"
                aria-label={`Remove photo ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor={`${uid}-name`} className={label}>
          Your name (optional)
        </label>
        <input id={`${uid}-name`} name="name" className={input} autoComplete="name" />
      </div>
      <div>
        <label htmlFor={`${uid}-contact`} className={label}>
          Email or phone (optional)
        </label>
        {/* Takes either, so a plain text box: no email-only keyboard or validation. */}
        <input
          id={`${uid}-contact`}
          name="contact"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="So we can reach you"
          className={input}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-note`} className={label}>
          What would you like made? (optional)
        </label>
        <textarea id={`${uid}-note`} name="note" rows={3} className={input} />
      </div>

      <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "uploading" || status === "sending"}
        className="w-full rounded-full bg-primary px-6 py-4 text-lg font-bold text-black hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "uploading" ? "Uploading photos…" : status === "sending" ? "Sending…" : "Send to Kulworks"}
      </button>
    </form>
  );
}
