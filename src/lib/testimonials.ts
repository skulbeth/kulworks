import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { UPLOAD_BUCKET } from "@/lib/uploads";

/** Screenshots live beside the event photos, in the same private bucket. */
export const TESTIMONIAL_PREFIX = "testimonials";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export const MAX_QUOTE_CHARS = 900;

/** Single-use link for a requested testimonial. 32 hex chars is not guessable. */
export function newToken(): string {
  return randomBytes(16).toString("hex");
}

export function publicTestimonialUrl(base: string, token: string) {
  return `${base.replace(/\/+$/, "")}/testimonial/${token}`;
}

/**
 * What the public site shows. Published, not deleted, and consented.
 *
 * `consent` is checked here as well as at the point of publishing. Publishing is
 * the gate, but a stale row that somehow went public without permission should
 * not keep showing just because its status says PUBLISHED.
 */
export async function publishedTestimonials(opts: { featuredOnly?: boolean; take?: number } = {}) {
  return prisma.testimonial.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      consent: true,
      ...(opts.featuredOnly ? { featured: true } : {}),
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: opts.take,
    select: {
      id: true, quote: true, name: true, detail: true, imagePath: true, photoPath: true,
      featured: true,
      // Cache-buster: the image route caches hard per id, so a replaced screenshot
      // would otherwise keep serving the old file for an hour.
      updatedAt: true,
    },
  });
}

export async function putTestimonialImage(path: string, bytes: Buffer, contentType: string) {
  const supa = createAdminClient();
  const { error } = await supa.storage
    .from(UPLOAD_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) {
    console.error("[testimonials] put failed:", error.message);
    return false;
  }
  return true;
}

/** Bytes for the image route. Returns null when the object is missing. */
export async function getTestimonialImage(
  path: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const supa = createAdminClient();
  const { data, error } = await supa.storage.from(UPLOAD_BUCKET).download(path);
  if (error || !data) {
    console.error("[testimonials] download failed:", error?.message);
    return null;
  }
  return {
    bytes: Buffer.from(await data.arrayBuffer()),
    contentType: data.type || "image/jpeg",
  };
}
