// Receives "Design your cards" builder orders. Validates the chosen template's fields,
// claims the photos the browser already uploaded to Supabase Storage (via
// /api/upload-url/), and creates a Submission (so card orders land in the same admin
// inbox as quote requests, with the art attached).
import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { site } from "@/data/site";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { logError } from "@/lib/log-error";
import { getCardTemplate } from "@/data/cardTemplates";
import {
  signedUploadUrl,
  grantValid,
  claimUploads,
} from "@/lib/uploads";

export const runtime = "nodejs";

function str(v: FormDataEntryValue | null, max = 2000): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.slice(0, max);
}
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 320;
}

export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`order:${clientIp(request)}`, 6, 60_000))) {
      return NextResponse.json(
        { ok: false, error: "Too many requests, give it a moment." },
        { status: 429 }
      );
    }

    const form = await request.formData();
    if (str(form.get("company_website"))) return NextResponse.json({ ok: true }); // honeypot

    const template = getCardTemplate(str(form.get("templateId")));
    if (!template) {
      return NextResponse.json({ ok: false, error: "Pick a card design." }, { status: 400 });
    }

    const name = str(form.get("name"), 200);
    const email = str(form.get("email"), 320).toLowerCase();
    const phone = str(form.get("phone"), 40) || null;
    const quantity = str(form.get("quantity"), 100);
    const note = str(form.get("note"), 3000);
    const sessionId = str(form.get("sessionId"), 100) || null;

    if (!name) return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
    if (!isEmail(email))
      return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });

    // Template-specific fields.
    const fieldLines: string[] = [];
    for (const f of template.fields) {
      const val = str(form.get(`f_${f.key}`), 3000);
      if (f.required && !val) {
        return NextResponse.json(
          { ok: false, error: `Please fill in "${f.label}".` },
          { status: 400 }
        );
      }
      if (val) fieldLines.push(`${f.label}: ${val}`);
    }

    // Photos — already in storage; one { path, grant } per slot (img_/grant_<slotKey>).
    const files: { slot: string; path: string; grant: string }[] = [];
    for (const slot of template.imageSlots) {
      const path = str(form.get(`img_${slot.key}`), 300);
      const grant = str(form.get(`grant_${slot.key}`), 300);
      if (path) {
        if (!grantValid("order", path, grant))
          return NextResponse.json(
            { ok: false, error: `"${slot.label}" didn't upload. Please attach it again.` },
            { status: 400 }
          );
        files.push({ slot: slot.label, path, grant });
      } else if (slot.required) {
        return NextResponse.json({ ok: false, error: `Please attach "${slot.label}".` }, { status: 400 });
      }
    }

    // Build a readable message for the submissions inbox.
    const message = [
      `Card design: ${template.name}`,
      quantity ? `Quantity: ${quantity}` : null,
      "",
      ...fieldLines,
      note ? `\nNotes: ${note}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n");

    // Anti-flood: the SAME order (email + design + every detail) within 60s is a double
    // submit; say ok, save nothing. A different order, or a quote, still goes through.
    const dup = await prisma.submission.findFirst({
      where: {
        email,
        projectType: template.name,
        message,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (dup) return NextResponse.json({ ok: true });

    // Bot protection. Photo grants are only issued after /api/upload-url/ passed
    // Turnstile (and that spent the token), so an order with photos is already verified.
    if (!files.length && !(await verifyTurnstile(str(form.get("turnstileToken"), 4000), clientIp(request)))) {
      return NextResponse.json(
        { ok: false, error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    // Every photo must really be in the bucket (right type and size); they're moved to
    // their final paths BEFORE anything is saved. If they were already moved, this is a
    // resend of an order that went through (its reply was lost): say ok, save nothing.
    const claim = await claimUploads("order", files);
    if (claim.status === "missing") {
      return NextResponse.json(
        { ok: false, error: `"${files[claim.index].slot}" didn't upload. Please attach it again.` },
        { status: 400 }
      );
    }
    if (claim.status === "duplicate") return NextResponse.json({ ok: true });
    const paths = claim.paths;

    const existing = await prisma.client.findUnique({ where: { email }, select: { phone: true } });
    const client = await prisma.client.upsert({
      where: { email },
      create: { name, email, phone },
      // Fill a missing phone, never overwrite the one on file.
      update: phone && !existing?.phone ? { phone } : {},
    });

    const submission = await prisma.submission.create({
      data: {
        name,
        email,
        phone,
        projectType: template.name,
        message,
        sessionId,
        clientId: client.id,
        storagePaths: paths,
      },
    });

    // Push alert after the response is sent: a slow push service must not hold up the client.
    after(() =>
      notify({
        kind: "lead",
        title: `New order: ${name}`,
        body: `${template.name}${paths.length ? ` · ${paths.length} photo(s)` : ""}`,
        url: "/admin/submissions/",
        clientId: client.id,
        dedupeKey: `lead:${submission.id}`,
      })
    );

    // Notify Sam.
    try {
      const links = (await Promise.all(paths.map((p) => signedUploadUrl(p)))).filter(Boolean) as string[];
      await sendMail({
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        replyTo: email,
        subject: `New card order: ${template.name} (${name})`,
        text: [
          `New card design order:`,
          "",
          message,
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          `Phone: ${phone ?? "(none)"}`,
          "",
          paths.length ? `Photos (${paths.length}, links valid ~7 days):` : "No photos attached.",
          ...links,
          "",
          `Open in admin: ${site.url}/admin/submissions/?open=${submission.id}`,
        ].join("\n"),
      });
    } catch (e) {
      console.error("[/api/order] notify failed:", e);
    }

    // Auto-confirm the customer.
    try {
      await sendMail({
        to: email,
        replyTo: site.email,
        subject: "Thanks! We got your card order",
        text: [
          `Hi ${name},`,
          "",
          `Thanks for your ${template.name} order! We've got your details${paths.length ? " and photos" : ""} and will`,
          "reach out with next steps, a proof, and a quote.",
          "",
          "Kulworks",
        ].join("\n"),
      });
    } catch (e) {
      console.error("[/api/order] confirm failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError(err, "/api/order");
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
