// Proofs: a private page per project where the client reviews every card at real
// size, pins notes on it and approves it.
//
// Only previews are stored: the admin uploader shrinks each card to PREVIEW_DPI and
// tiles a "PROOF" watermark over it in the browser before anything is uploaded, so
// the print files never leave Sam's machine. The watermark and the halved resolution
// are the protection; nothing stops a screenshot, but a screenshot is not printable.
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { UPLOAD_BUCKET } from "@/lib/uploads";
import { PREVIEW_DPI } from "@/lib/proof-constants";

export const PROOF_PREFIX = "proofs";
export { PREVIEW_DPI };

/** Physical card sizes offered when a proof is created. */
export const PROOF_SIZES = [
  { id: "tarot", label: "Tarot (2.75 x 4.75 in)", widthIn: 2.75, heightIn: 4.75 },
  { id: "poker", label: "Poker (2.5 x 3.5 in)", widthIn: 2.5, heightIn: 3.5 },
  { id: "large", label: "Large (3.5 x 5 in)", widthIn: 3.5, heightIn: 5 },
  { id: "board9", label: "Board (9 x 9 in)", widthIn: 9, heightIn: 9 },
] as const;

export function newProofToken(): string {
  return randomBytes(16).toString("hex");
}

export function publicProofUrl(base: string, token: string) {
  return `${base.replace(/\/+$/, "")}/proof/${token}/`;
}

/** A fresh path per upload, so a replaced card never serves a cached old image. */
export function proofImagePath(proofId: string, key: string, side: "front" | "back") {
  const safe = key.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40);
  return `${PROOF_PREFIX}/${proofId}/${safe}-${side}-${randomBytes(4).toString("hex")}.jpg`;
}

/** Signed view URLs for many paths at once (one request instead of one per card). */
export async function signProofPaths(paths: string[], expiresIn = 60 * 60 * 6) {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const supa = createAdminClient();
  const { data, error } = await supa.storage.from(UPLOAD_BUCKET).createSignedUrls(paths, expiresIn);
  if (error) {
    console.error("[proofs] sign failed:", error.message);
    return out;
  }
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

/** One-time upload slots the admin browser writes the previews into. */
export async function proofUploadSlot(path: string) {
  const supa = createAdminClient();
  const { data, error } = await supa.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[proofs] upload slot failed:", error?.message);
    return null;
  }
  return { path: data.path, token: data.token };
}

/** "Card 5" for Dextrous-style numeric keys ("05"), the key itself otherwise. */
export function itemLabel(key: string) {
  return /^\d+$/.test(key) ? `#${key}` : key;
}
