import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not set"); // never sign with a guessable key
  const key = `${secret}:upload-grant`;
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
async function pendingOk(path: string): Promise<boolean> {
  const supa = createAdminClient();
  const { data, error } = await supa.storage.from(UPLOAD_BUCKET).info(path);
  if (error || !data) return false;
  const size = data.size ?? -1;
  const type = data.contentType ?? "";
  return size > 0 && size <= MAX_FILE_BYTES && ALLOWED_TYPES.includes(type);
}

async function exists(path: string): Promise<boolean> {
  const { data, error } = await createAdminClient().storage.from(UPLOAD_BUCKET).info(path);
  return !error && !!data;
}

// Where a claimed file lives: its pending path minus "pending/", e.g.
// pending/order/<uuid>/0.jpg -> order/<uuid>/0.jpg. Fixed per file, so a retried submit
// (the first one worked but its reply was lost) can see the file was already claimed.
function claimedPath(path: string): string {
  return path.slice(PENDING_PREFIX.length);
}

export type ClaimResult =
  | { status: "ok"; paths: string[] }
  | { status: "duplicate" } // already saved (a resend), or a racing submit is saving it
  | { status: "missing"; index: number } // this file isn't in storage (or the grant is bad)
  | { status: "retry" }; // storage hiccup moving a file; nothing saved, try again

type Db = Prisma.TransactionClient;

/** Is a saved record already holding this claimed file? */
async function claimedBySavedRecord(db: Db, kind: UploadKind, path: string): Promise<boolean> {
  const where = { storagePaths: { has: path } };
  return kind === "order"
    ? !!(await db.submission.findFirst({ where, select: { id: true } }))
    : !!(await db.upload.findFirst({ where, select: { id: true } }));
}

/** Run claim + save as one locked unit per set of photos: a second submit of the same
 *  photos waits here until the first has saved (or failed), then sees the result. Without
 *  it, a submit landing between the first one's move and its save would save again. */
export async function withUploadLock<T>(
  files: { path: string }[],
  fn: (tx: Db) => Promise<T>
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      if (files[0]) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${files[0].path}))`;
      return fn(tx);
    },
    { maxWait: 10_000, timeout: 30_000 }
  );
}

/** Check every file first, then move them all to their final paths. Call BEFORE saving
 *  the record, so a resend or a racing double submit never saves a second one. */
export async function claimUploads(
  db: Db,
  kind: UploadKind,
  files: { path: string; grant: string }[]
): Promise<ClaimResult> {
  const fresh: boolean[] = [];
  for (const [i, f] of files.entries()) {
    if (!grantValid(kind, f.path, f.grant)) return { status: "missing", index: i };
    if (await pendingOk(f.path)) fresh.push(true);
    else if (await exists(claimedPath(f.path))) fresh.push(false);
    else return { status: "missing", index: i };
  }
  const dests = files.map((f) => claimedPath(f.path));
  // Everything already moved: a resend. It's only a duplicate if the first try's record
  // was saved; if saving failed (database hiccup), save it now with the moved files.
  if (files.length && fresh.every((x) => !x)) {
    return (await claimedBySavedRecord(db, kind, dests[0])) ? { status: "duplicate" } : { status: "ok", paths: dests };
  }

  const supa = createAdminClient();
  for (const [i, f] of files.entries()) {
    if (!fresh[i]) continue;
    const { error } = await supa.storage.from(UPLOAD_BUCKET).move(f.path, dests[i]);
    if (!error) continue;
    if (await exists(dests[i])) {
      // Another request moved it a moment ago. Whoever moved the FIRST file owns the
      // claim: losing that one means the other request saves the record.
      if (i === 0) return { status: "duplicate" };
      continue;
    }
    if (await exists(f.path)) {
      console.error("[uploads] move failed:", error.message);
      return { status: "retry" };
    }
    return { status: "missing", index: i };
  }
  return { status: "ok", paths: dests };
}

/** Delete pending/ files nobody claimed (form abandoned after the photos went up).
 *  Grants die after 2h, so anything a day old can never be claimed. Returns the count. */
export async function sweepPendingUploads(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
  const supa = createAdminClient();
  const bucket = supa.storage.from(UPLOAD_BUCKET);
  const cutoff = Date.now() - maxAgeMs;
  const stale: string[] = [];
  for (const kind of ["order", "upload"] as UploadKind[]) {
    const base = `${PENDING_PREFIX}${kind}`;
    const { data: folders, error } = await bucket.list(base, { limit: 1000 });
    if (error) throw new Error(`pending list ${base}: ${error.message}`);
    for (const folder of folders ?? []) {
      const { data: files } = await bucket.list(`${base}/${folder.name}`, { limit: 100 });
      for (const f of files ?? []) {
        const at = Date.parse(f.created_at ?? "");
        if (Number.isFinite(at) && at < cutoff) stale.push(`${base}/${folder.name}/${f.name}`);
      }
    }
  }
  for (let i = 0; i < stale.length; i += 100) await bucket.remove(stale.slice(i, i + 100));
  return stale.length;
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
