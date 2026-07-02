// Newsletter signup: saves an email to the Subscriber table (deduped).
// Later, once Resend is wired, this will also sync to a Resend Audience + confirm.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addSubscriberToAudience } from "@/lib/email";

export const runtime = "nodejs";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 320;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot — bots fill this hidden field.
  if (str(body.company_website)) return NextResponse.json({ ok: true });

  const email = str(body.email).toLowerCase();
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  try {
    await prisma.subscriber.upsert({
      where: { email },
      create: { email, source: str(body.source) || "footer" },
      update: { unsubscribedAt: null }, // re-subscribe if they'd previously left
    });

    // Sync to the Resend Audience (non-blocking).
    try {
      const contactId = await addSubscriberToAudience(email);
      if (contactId) {
        await prisma.subscriber.update({ where: { email }, data: { resendContactId: contactId } });
      }
    } catch (e) {
      console.error("[/api/subscribe] audience sync failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/subscribe] failed:", err);
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
