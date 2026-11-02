"use client";

import { useId, useState } from "react";

type Item = { file: File; progress: number; state: "waiting" | "uploading" | "done" | "error"; error?: string };

/** Upload box on an accepted quote: each file goes straight into the client's Google
 *  Drive folder (see /api/files/). Works with any email, no Google account needed. */
export default function SendFiles({ token, folderUrl }: { token: string; folderUrl: string }) {
  const uid = useId();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function patch(file: File, p: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.file === file ? { ...it, ...p } : it)));
  }

  function put(url: string, file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) patch(file, { progress: Math.round((e.loaded / e.total) * 100) });
      };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.send(file);
    });
  }

  async function upload(list: File[]) {
    if (!list.length) return;
    setMessage(null);
    setBusy(true);
    setItems((prev) => [...prev, ...list.map((file) => ({ file, progress: 0, state: "waiting" as const }))]);
    const sent: string[] = [];
    let failed = 0;
    for (const file of list) {
      patch(file, { state: "uploading" });
      let err = "Didn't upload. Try again.";
      try {
        const res = await fetch("/api/files/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action: "start", name: file.name, size: file.size, type: file.type }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.uploadUrl && (await put(data.uploadUrl, file))) {
          patch(file, { state: "done", progress: 100 });
          sent.push(file.name);
          continue;
        }
        if (data.error) err = data.error;
      } catch {
        err = "Network error. Try again.";
      }
      failed++;
      patch(file, { state: "error", error: err });
    }
    if (sent.length) {
      await fetch("/api/files/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "done", names: sent }),
      }).catch(() => {});
    }
    setBusy(false);
    setMessage(
      failed
        ? { ok: false, text: `${failed} file${failed === 1 ? "" : "s"} didn't upload. Pick ${failed === 1 ? "it" : "them"} again to retry.` }
        : { ok: true, text: `Got ${sent.length === 1 ? "it" : `all ${sent.length}`}. Thank you! I'll take it from here.` }
    );
  }

  return (
    <div className="mt-6 border-t border-border pt-5 print:hidden">
      <p className="font-bold">Send your files</p>
      <p className="mb-3 text-sm text-muted">
        Artwork, fonts, references, anything you have. They go straight into your own folder for this job.
      </p>
      <label
        htmlFor={`${uid}-files`}
        className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface2 px-4 py-5 text-center hover:border-blue"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) upload(Array.from(e.dataTransfer.files));
        }}
      >
        <span className="font-semibold">{busy ? "Uploading..." : "Choose files"}</span>
        <span className="text-xs text-muted">or drop them here · any file type, up to 2 GB each</span>
      </label>
      <input
        id={`${uid}-files`}
        type="file"
        multiple
        disabled={busy}
        className="sr-only"
        onChange={(e) => {
          upload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm" aria-live="polite">
          {items.map((it, i) => (
            <li key={`${it.file.name}-${i}`} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{it.file.name}</span>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    it.state === "done" ? "text-green-600" : it.state === "error" ? "text-red-600" : "text-muted"
                  }`}
                >
                  {it.state === "done" ? "Uploaded" : it.state === "error" ? "Failed" : it.state === "uploading" ? `${it.progress}%` : "Waiting"}
                </span>
              </div>
              {it.state === "uploading" && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-blue" style={{ width: `${it.progress}%` }} />
                </div>
              )}
              {it.state === "error" && it.error && <p className="mt-1 text-xs text-red-600">{it.error}</p>}
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p role="status" className={`mt-3 text-sm font-semibold ${message.ok ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        Have a Google account?{" "}
        <a href={folderUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue hover:underline">
          Open your Drive folder
        </a>{" "}
        to see everything that&apos;s there. You can also just reply to my email with the files.
      </p>
    </div>
  );
}
