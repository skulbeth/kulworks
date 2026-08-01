// Receives "Design your cards" builder orders. Validates the chosen template's fields,
// uploads the attached photos to Supabase Storage, and creates a Submission (so card
// orders land in the same admin inbox as quote requests, with the art attached).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { site } from "@/data/site";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";
import { getCardTemplate } from "@/data/cardTemplates";
import {
  putUploadImage,
  signedUploadUrl,
  MAX_FILE_BYTES,
  ALLOWED_TYPES,
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

    // Photos — one file per slot (keyed img_<slotKey>).
    const files: { slot: string; file: File }[] = [];
    for (const slot of template.imageSlots) {
      const f = form.get(`img_${slot.key}`);
      if (f instanceof File && f.size > 0) {
        if (f.size > MAX_FILE_BYTES)
          return NextResponse.json({ ok: false, error: `"${slot.label}" is too large (15 MB max).` }, { status: 400 });
        if (f.type && !ALLOWED_TYPES.includes(f.type))
          return NextResponse.json({ ok: false, error: `"${slot.label}" must be an image.` }, { status: 400 });
        files.push({ slot: slot.label, file: f });
      } else if (slot.required) {
        return NextResponse.json({ ok: false, error: `Please attach "${slot.label}".` }, { status: 400 });
      }
    }

    // Anti-flood: same email within 60s → treat as duplicate.
    const dup = await prisma.submission.findFirst({
      where: { email, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (dup) return NextResponse.json({ ok: true });

    const client = await prisma.client.upsert({
      where: { email },
      create: { name, email, phone },
      update: phone ? { phone } : {},
    });

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

    const submission = await prisma.submission.create({
      data: {
        name,
        email,
        phone,
        projectType: template.name,
        message,
        sessionId,
        clientId: client.id,
        storagePaths: [],
      },
    });

    // Upload photos under the submission id.
    const paths: string[] = [];
    let i = 0;
    for (const { file } of files) {
      const ext =
        (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) ||
        "jpg";
      const path = `orders/${submission.id}/${i}.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      if (await putUploadImage(path, buf, file.type || "image/jpeg")) paths.push(path);
      i++;
    }
    if (paths.length) {
      await prisma.submission.update({ where: { id: submission.id }, data: { storagePaths: paths } });
    }

    // Notify Sam.
    try {
      const links = (await Promise.all(paths.map((p) => signedUploadUrl(p)))).filter(Boolean) as string[];
      await sendMail({
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        replyTo: email,
        subject: `New card order — ${template.name} (${name})`,
        text: [
          `New card design order:`,
          "",
          message,
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          `Phone: ${phone ?? "—"}`,
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
        subject: "Thanks — we got your card order!",
        text: [
          `Hi ${name},`,
          "",
          `Thanks for your ${template.name} order! We've got your details and photos and will`,
          "reach out with next steps, a proof, and a quote.",
          "",
          "— Kulworks",
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
