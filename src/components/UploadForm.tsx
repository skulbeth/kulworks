"use client";

import { useState } from "react";

/** Public trade-show photo uploader. Native photo picker + a few optional fields. */
export default function UploadForm({
  maxFiles,
  maxSizeMb,
}: {
  maxFiles: number;
  maxSizeMb: number;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const input =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base focus:border-blue focus:outline-none";

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, maxFiles));
    e.target.value = "";
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!files.length) {
      setError("Add at least one photo.");
      return;
    }
    if (files.some((f) => f.size > maxSizeMb * 1024 * 1024)) {
      setError(`Each photo must be under ${maxSizeMb} MB.`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.delete("files");
    files.forEach((f) => fd.append("files", f));
    setStatus("sending");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setStatus("done");
      else {
        setStatus("error");
        setError(data.error || "Upload failed. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-center">
        <h2 className="text-xl font-bold text-green-600">Got it — thanks!</h2>
        <p className="mt-2 text-muted">
          Your photo{files.length > 1 ? "s" : ""} landed with Kulworks. We&apos;ll take it from here.
        </p>
        <button
          type="button"
          onClick={() => {
            setFiles([]);
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
        <label className="mb-1 block text-sm font-semibold">Photos (up to {maxFiles})</label>
        <input type="file" accept="image/*" multiple onChange={onPick} className={input} />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {files.map((f, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
                alt={`Selected ${i + 1}`}
                className="h-24 w-full rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-sm font-bold text-white"
                aria-label="Remove photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input name="name" placeholder="Your name (optional)" className={input} autoComplete="name" />
      <input
        name="contact"
        placeholder="Email or phone, so we can reach you (optional)"
        className={input}
      />
      <textarea
        name="note"
        rows={3}
        placeholder="What would you like made? (optional)"
        className={input}
      />

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-primary px-6 py-4 text-lg font-bold text-black hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send to Kulworks"}
      </button>
    </form>
  );
}
