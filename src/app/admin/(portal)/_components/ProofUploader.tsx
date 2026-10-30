"use client";

// Drop a folder of card exports in; each one is shrunk to PREVIEW_DPI and covered in
// a "PROOF" watermark HERE, in the browser, then written straight to storage. The
// print-resolution files never leave this computer.
//
// Fronts and backs pair up by file name, the way Dextrous exports them:
// 05.png + 05_back.png (also "05-back", "05 back"). Re-uploading a name replaces it.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PREVIEW_DPI, PROOF_BUCKET } from "@/lib/proof-constants";
import { prepareProofUploads, registerProofImages, type UploadEntry } from "../_proof-actions";

type Picked = UploadEntry & { file: File; position: number };

const BATCH = 8;

function parse(files: File[]): Picked[] {
  const picked: Omit<Picked, "position">[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const base = file.name.replace(/\.[^.]+$/, "");
    const m = base.match(/^(.*?)[\s_-]*back$/i);
    picked.push(m && m[1] ? { file, key: m[1].trim(), side: "back" } : { file, key: base.trim(), side: "front" });
  }
  const keys = [...new Set(picked.map((p) => p.key))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  return picked.map((p) => ({ ...p, position: keys.indexOf(p.key) }));
}

async function preview(file: File, widthIn: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, (widthIn * PREVIEW_DPI) / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; // JPEG has no alpha; rounded-corner PNGs would go black
  g.fillRect(0, 0, w, h);
  g.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  // Tiled diagonal watermark, light and dark together so it reads on any color.
  const size = Math.max(14, Math.round(w / 11));
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(-Math.PI / 6);
  g.font = `700 ${size}px sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const mark = "PROOF · KULWORKS";
  const step = g.measureText(mark).width + size * 2; // a gap between repeats so they never run together
  const span = Math.hypot(w, h);
  for (let y = -span / 2, row = 0; y < span / 2; y += size * 3.2, row++) {
    const off = (row % 2) * (step / 2);
    for (let x = -span / 2 - step; x < span / 2 + step; x += step) {
      g.fillStyle = "rgba(255,255,255,0.22)";
      g.fillText(mark, x + off, y);
      g.fillStyle = "rgba(0,0,0,0.10)";
      g.fillText(mark, x + off + 1.5, y + 1.5);
    }
  }
  g.restore();

  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85)
  );
}

export default function ProofUploader({ proofId, widthIn }: { proofId: string; widthIn: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (files: File[]) => {
    const picked = parse(files);
    if (!picked.length) return setStatus("No images in that selection.");
    setBusy(true);
    const supa = createClient();
    let done = 0;
    let failed = 0;
    try {
      for (let i = 0; i < picked.length; i += BATCH) {
        const batch = picked.slice(i, i + BATCH);
        const slots = await prepareProofUploads(
          proofId,
          batch.map(({ key, side }) => ({ key, side }))
        );
        const landed = [];
        for (const p of batch) {
          const slot = slots.find((s) => s.key === p.key && s.side === p.side);
          if (!slot) {
            failed++;
            continue;
          }
          setStatus(`Preparing ${p.file.name} (${done + failed + 1} of ${picked.length})…`);
          try {
            const blob = await preview(p.file, widthIn);
            const { error } = await supa.storage
              .from(PROOF_BUCKET)
              .uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "image/jpeg" });
            if (error) throw error;
            landed.push({ key: p.key, side: p.side, path: slot.path, position: p.position });
            done++;
          } catch {
            failed++;
          }
        }
        if (landed.length) await registerProofImages(proofId, landed);
      }
      setStatus(`Uploaded ${done} image${done === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}.`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
      if (folder.current) folder.current.value = "";
      router.refresh();
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-border bg-surface2 p-4">
      <p className="text-sm font-semibold">Add or replace cards</p>
      <p className="mt-1 text-xs text-muted">
        Pick the exported PNGs (fronts and backs together). 05.png and 05_back.png become one card. They&apos;re
        shrunk to {PREVIEW_DPI} dpi and watermarked on this computer before upload.
      </p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="block">
          <span className="text-xs text-muted">Pick files</span>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => e.target.files && run(Array.from(e.target.files))}
            className="mt-1 block"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Or a whole folder (fronts/ and backs/ inside it are fine)</span>
          <input
            ref={(el) => {
              folder.current = el;
              // Not in React's input typings; set it on the element itself.
              el?.setAttribute("webkitdirectory", "");
            }}
            type="file"
            multiple
            disabled={busy}
            onChange={(e) => e.target.files && run(Array.from(e.target.files))}
            className="mt-1 block"
          />
        </label>
      </div>
      {status && <p className="mt-2 text-xs" role="status">{status}</p>}
    </div>
  );
}
