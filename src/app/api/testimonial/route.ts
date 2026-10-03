import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";
import { MAX_QUOTE_CHARS } from "@/lib/testimonials";

export const runtime = "nodejs";

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

/**
 * A client submitting through their private link.
 *
 * The token is the only authentication, so it is single-use: once submittedAt is
 * set the row stops accepting writes. The row already exists (Sam created it when
 * he sent the request), so this fills it in rather than creating anything, which
 * means a stranger with a guessed token still cannot add a new testimonial.
 */
export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`testimonial:${clientIp(request)}`, 5, 60_000))) {
      return NextResponse.json(
        { ok: false, error: "Too many tries, give it a minute." },
        { status: 429 }
      );
    }

    const form = await request.formData();
    if (str(form.get("company"))) return NextResponse.json({ ok: true }); // honeypot

    const token = str(form.get("token"));
    const quote = str(form.get("quote"));
    const displayName = str(form.get("displayName"));
    const detail = str(form.get("detail"));
    const consent = form.get("consent") === "on" || form.get("consent") === "true";

    if (!token) return NextResponse.json({ ok: false, error: "Bad link." }, { status: 400 });
    if (!quote || quote.length < 15) {
      return NextResponse.json({ ok: false, error: "Please write a little more." }, { status: 400 });
    }
    if (quote.length > MAX_QUOTE_CHARS) {
      return NextResponse.json({ ok: false, error: "That's a bit long." }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json({ ok: false, error: "Add a name to show." }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json(
        { ok: false, error: "We need your permission to publish it." },
        { status: 400 }
      );
    }

    const row = await prisma.testimonial.findFirst({
      where: { token, deletedAt: null },
      select: { id: true, submittedAt: true },
    });
    if (!row) return NextResponse.json({ ok: false, error: "This link has expired." }, { status: 404 });
    if (row.submittedAt) {
      return NextResponse.json({ ok: false, error: "This link was already used." }, { status: 409 });
    }

    await prisma.testimonial.update({
      where: { id: row.id },
      data: {
        quote,
        name: displayName,
        detail,
        consent: true,
        consentNote: "Ticked the permission box on the submission form.",
        submittedAt: new Date(),
        status: "PENDING",
      },
    });

    // Best-effort nudge so it doesn't sit unseen. Never fails the submission.
    try {
      await sendMail({
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        subject: `New testimonial from ${displayName}`,
        text: [
          `${displayName}${detail ? ` (${detail})` : ""} wrote:`,
          "",
          quote,
          "",
          "Review and publish it:",
          "https://kulworks.com/admin/testimonials/",
        ].join("\n"),
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError(err, "testimonial.submit");
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
