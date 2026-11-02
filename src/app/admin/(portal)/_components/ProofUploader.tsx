"use client";

// Drop a folder of card exports in; each one is shrunk to PREVIEW_DPI and covered in
// a "PROOF" watermark HERE, in the browser, then written straight to storage. The
// print-resolution files never leave this computer.
//
// Fronts and backs pair up by file name, the way Dextrous exports them:
// 05.png + 05_back.png (also "05-back", "05 back"; "Flashback" is a front), or
// fronts/05.png + backs/05.png when a folder is picked. Re-uploading a name replaces it,
// unless the file is identical to the one already up: then it's skipped, so a whole
// export can be dropped back in and only the edited cards change.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PREVIEW_DPI, PROOF_BUCKET } from "@/lib/proof-constants";
import { fingerprint } from "@/lib/proof-fingerprint";
import { prepareProofUploads, registerProofImages, type UploadEntry } from "../_proof-actions";

type Picked = UploadEntry & { file: File; position: number; hash?: string };

const BATCH = 8;

// "05_back" / "05-back" / "05 back" (a separator is required, so "Flashback" stays a front).
const BACK_SUFFIX = /^(.+?)[\s_-]+back$/i;

// Side from the folder the file sits in, when a folder was picked: the nearest
// folder named back/backs or front/fronts wins.
function folderSide(file: File): "front" | "back" | null {
  const dirs = (file.webkitRelativePath || "").split("/").slice(0, -1).reverse();
  for (const d of dirs) {
    const n = d.trim().toLowerCase();
    if (n === "back" || n === "backs") return "back";
    if (n === "front" || n === "fronts") return "front";
  }
  return null;
}

function parse(files: File[]): { picked: Picked[]; dupes: number } {
  // One file per card side: two files that land on the same side of the same card
  // (05.png + 05.jpg, or fronts/05.png + 05.png) would fight over one storage slot.
  const bySlot = new Map<string, Omit<Picked, "position">>();
  let dupes = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const base = file.name.replace(/\.[^.]+$/, "").trim();
    const m = base.match(BACK_SUFFIX);
    const side = folderSide(file) ?? (m ? "back" : "front");
    const key = (side === "back" && m ? m[1] : base).trim();
    if (!key) continue;
    const slot = `${side}:${key}`; // side has no colon, so this is unambiguous
    if (bySlot.has(slot)) dupes++;
    bySlot.set(slot, { file, key, side });
  }
  const picked = [...bySlot.values()];
  const keys = [...new Set(picked.map((p) => p.key))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
  return { picked: picked.map((p) => ({ ...p, position: keys.indexOf(p.key) })), dupes };
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
    const { picked, dupes } = parse(files);
    if (!picked.length) return setStatus("No images in that selection.");
    setBusy(true);
    const supa = createClient();
    let done = 0;
    let failed = 0;
    let same = 0;
    try {
      for (let i = 0; i < picked.length; i += BATCH) {
        const batch = picked.slice(i, i + BATCH);
        setStatus(`Checking ${i + 1}-${Math.min(i + BATCH, picked.length)} of ${picked.length} for changes…`);
        for (const p of batch) p.hash = await fingerprint(await p.file.arrayBuffer());
        const { slots, same: unchanged } = await prepareProofUploads(
          proofId,
          batch.map(({ key, side, hash }) => ({ key, side, hash }))
        );
        same += unchanged.length;
        const landed = [];
        for (const p of batch) {
          // Take the slot out as it's used, so no two files can share one.
          const at = slots.findIndex((s) => s.key === p.key && s.side === p.side);
          const slot = at >= 0 ? slots.splice(at, 1)[0] : undefined;
          if (!slot) {
            if (!unchanged.some((u) => u.key === p.key && u.side === p.side)) failed++;
            continue;
          }
          setStatus(`Preparing ${p.file.name} (${done + failed + same + 1} of ${picked.length})…`);
          try {
            const blob = await preview(p.file, widthIn);
            const { error } = await supa.storage
              .from(PROOF_BUCKET)
              .uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "image/jpeg" });
            if (error) throw error;
            landed.push({ key: p.key, side: p.side, hash: p.hash, path: slot.path, position: p.position });
            done++;
          } catch {
            failed++;
          }
        }
        if (landed.length) await registerProofImages(proofId, landed);
      }
      setStatus(
        `Uploaded ${done} image${done === 1 ? "" : "s"}` +
          (same ? `, ${same} unchanged (skipped)` : "") +
          (failed ? `, ${failed} failed` : "") +
          (dupes ? `, ${dupes} duplicate name${dupes === 1 ? "" : "s"} ignored (last one used)` : "") +
          "."
      );
    } catch (e) {
      // A server action that throws (session expired, network) would otherwise leave the
      // last "Checking…" message up forever.
      console.error(e);
      setStatus(
        `Upload stopped: ${e instanceof Error ? e.message : "something went wrong"}. ` +
          `${done} uploaded before it stopped. Reload the page and try again.`
      );
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
        Pick the exported PNGs (fronts and backs together). 05.png and 05_back.png (or 05-back, 05 back) become
        one card, and so do fronts/05.png and backs/05.png in a picked folder. They&apos;re
        shrunk to {PREVIEW_DPI} dpi and watermarked on this computer before upload. You can drop the whole export
        in again after edits: files that haven&apos;t changed are skipped and keep their approval.
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
