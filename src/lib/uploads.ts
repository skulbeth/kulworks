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
