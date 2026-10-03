import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTestimonialImage } from "@/lib/testimonials";

export const runtime = "nodejs";

/**
 * Serves a published testimonial screenshot.
 *
 * The images sit in the private uploads bucket, so this streams them rather than
 * handing out a signed URL: a signed URL expires, and a public bucket would make
 * every pending and archived screenshot reachable by anyone who guessed a path.
 * Here the database decides what is visible, and only a published, consented,
 * non-deleted row resolves.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const t = await prisma.testimonial.findFirst({
    where: { id, status: "PUBLISHED", consent: true, deletedAt: null },
    select: { imagePath: true },
  });
  if (!t?.imagePath) return new NextResponse("Not found", { status: 404 });

  const file = await getTestimonialImage(t.imagePath);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      // Content for an id never changes; unpublishing 404s it instead.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
