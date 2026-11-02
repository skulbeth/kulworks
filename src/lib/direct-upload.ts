// Browser side of the direct-to-storage photo upload (see lib/uploads.ts): ask
// /api/upload-url/ for signed URLs, then PUT each file straight to Supabase Storage
// with progress. Vercel never sees the bytes, so phone photos can't hit its 4.5 MB cap.
// Client-safe: no server imports.

export type UploadSlot = { path: string; signedUrl: string; grant: string };

const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};
const ALLOWED = new Set(Object.values(TYPE_BY_EXT)); // = ALLOWED_TYPES in lib/uploads

/** The file's image type; some browsers leave HEIC blank, so fall back to the extension.
 *  "" = not an image we accept. */
export function photoType(f: File): string {
  if (f.type) return ALLOWED.has(f.type) ? f.type : "";
  return TYPE_BY_EXT[(f.name.split(".").pop() || "").toLowerCase()] ?? "";
}

/** POST /api/upload-url/. Returns the slots, or the server's error message. */
export async function requestUploadSlots(
  body: Record<string, unknown>
): Promise<{ slots: UploadSlot[] } | { error: string }> {
  try {
    const res = await fetch("/api/upload-url/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok && Array.isArray(data.slots)) return { slots: data.slots as UploadSlot[] };
    return { error: data.error || "Couldn't start the upload. Please try again." };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

/** PUT one file to its signed URL. onProgress gets 0-100. Resolves true on success. */
export function putToSignedUrl(
  signedUrl: string,
  file: File,
  type: string,
  onProgress: (pct: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.ontimeout = () => resolve(false);
    xhr.send(file);
  });
}
