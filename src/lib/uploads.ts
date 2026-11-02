import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

export const UPLOAD_BUCKET = "uploads";
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

// Photos go browser -> storage directly (Vercel caps a function body at ~4.5 MB, so two
// phone photos through the route used to die with a 413). /api/upload-url/ hands out
// signed upload URLs for server-chosen paths under pending/<kind>/; the form then posts
// only { path, grant } pairs, and the submit route claims them: grant checked, object
// checked in the bucket, then moved to its final home. A moved file can't be claimed
// twice. Unclaimed files (form abandoned after uploading) stay under pending/.
export type UploadKind = "order" | "upload";
export const PENDING_PREFIX = "pending/";
const GRANT_TTL_MS = 2 * 60 * 60 * 1000; // matches Supabase's 2h signed-upload lifetime
const PENDING_RE = /^pending\/(order|upload)\/[0-9a-f-]{36}\/(\d+)\.([a-z0-9]{1,5})$/;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

function grantSig(path: string, exp: number): string {
  const key = `${process.env.SUPABASE_SECRET_KEY || "kulworks"}:upload-grant`;
  return createHmac("sha256", key).update(`${path}|${exp}`).digest("base64url");
}

/** Signed upload URLs (browser PUTs straight to storage) + a grant per path. */
export async function issueUploadSlots(
  kind: UploadKind,
  types: string[]
): Promise<{ path: string; signedUrl: string; grant: string }[] | null> {
  const supa = createAdminClient();
  const folder = `${PENDING_PREFIX}${kind}/${randomUUID()}`;
  const exp = Date.now() + GRANT_TTL_MS;
  const slots: { path: string; signedUrl: string; grant: string }[] = [];
  for (const [i, type] of types.entries()) {
    const path = `${folder}/${i}.${EXT_BY_TYPE[type] ?? "jpg"}`;
    const { data, error } = await supa.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[uploads] signed upload url failed:", error?.message);
      return null;
    }
    slots.push({ path, signedUrl: data.signedUrl, grant: `${exp}.${grantSig(path, exp)}` });
  }
  return slots;
}

/** Was this grant issued by us, for this path, and is it still live? (No storage call.) */
export function grantValid(kind: UploadKind, path: string, grant: string): boolean {
  const m = PENDING_RE.exec(path);
  if (!m || m[1] !== kind) return false;
  const [expStr, sig] = grant.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  const want = Buffer.from(grantSig(path, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Grant OK + the object really landed in the bucket with an allowed type and size. */
export async function checkPendingUpload(
  kind: UploadKind,
  path: string,
  grant: string
): Promise<boolean> {
  if (!grantValid(kind, path, grant)) return false;
  const supa = createAdminClient();
  const { data, error } = await supa.storage.from(UPLOAD_BUCKET).info(path);
  if (error || !data) return false;
  const size = data.size ?? -1;
  const type = data.contentType ?? "";
  return size > 0 && size <= MAX_FILE_BYTES && ALLOWED_TYPES.includes(type);
}

/** Move a checked pending file to its final path. Returns where it ended up (the pending
 *  path itself if the move fails, so the photo is never lost). */
export async function claimPendingUpload(path: string, dest: string): Promise<string> {
  const supa = createAdminClient();
  const { error } = await supa.storage.from(UPLOAD_BUCKET).move(path, dest);
  if (error) {
    console.error("[uploads] move failed:", error.message);
    return path;
  }
  return dest;
}

/** File extension of a pending path (for naming the final copy). */
export function pendingExt(path: string): string {
  return PENDING_RE.exec(path)?.[3] ?? "jpg";
}

const UPLOADS_ENABLED_KEY = "uploads_enabled";

/** Is the public /upload page currently accepting photos? (Off by default.) */
export async function uploadsEnabled(): Promise<boolean> {
  const s = await prisma.setting.findUnique({ where: { key: UPLOADS_ENABLED_KEY } });
  return s?.value === "true";
}

export async function setUploadsEnabled(on: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: UPLOADS_ENABLED_KEY },
    update: { value: on ? "true" : "false" },
    create: { key: UPLOADS_ENABLED_KEY, value: on ? "true" : "false" },
  });
}

/** Upload a single image to the private bucket. Returns true on success. */
export async function putUploadImage(
  path: string,
  bytes: Buffer,
  contentType: string
): Promise<boolean> {
  const supa = createAdminClient();
  const { error } = await supa.storage
    .from(UPLOAD_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    console.error("[uploads] put failed:", error.message);
    return false;
  }
  return true;
}

/** Short-lived signed URL for viewing/downloading a stored image (default 7 days). */
export async function signedUploadUrl(
  path: string,
  expiresIn = 60 * 60 * 24 * 7
): Promise<string | null> {
  const supa = createAdminClient();
  const { data, error } = await supa.storage
    .from(UPLOAD_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error("[uploads] sign failed:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function removeUploadFiles(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const supa = createAdminClient();
  await supa.storage.from(UPLOAD_BUCKET).remove(paths);
}
