import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { site } from "@/data/site";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";
import {
  uploadsEnabled,
  putUploadImage,
  signedUploadUrl,
  MAX_FILES,
  MAX_FILE_BYTES,
  ALLOWED_TYPES,
} from "@/lib/uploads";

export const runtime = "nodejs";

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

export async function POST(request: Request) {
  try {
    if (!(await uploadsEnabled())) {
      return NextResponse.json(
        { ok: false, error: "Photo uploads are closed right now." },
        { status: 403 }
      );
    }

    // A few uploads per minute per device is plenty.
    if (!(await rateLimit(`upload:${clientIp(request)}`, 6, 60_000))) {
      return NextResponse.json(
        { ok: false, error: "Too many uploads, give it a minute." },
        { status: 429 }
      );
    }

    const form = await request.formData();

    // Honeypot — bots fill hidden fields.
    if (str(form.get("company"))) return NextResponse.json({ ok: true });

    const name = str(form.get("name"));
    const contact = str(form.get("contact"));
    const note = str(form.get("note"));
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File && f.size > 0);

    if (!files.length) {
      return NextResponse.json({ ok: false, error: "Add at least one photo." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { ok: false, error: `Up to ${MAX_FILES} photos at a time.` },
        { status: 400 }
      );
    }
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { ok: false, error: "A photo is too large (15 MB max each)." },
          { status: 400 }
        );
      }
      if (f.type && !ALLOWED_TYPES.includes(f.type)) {
        return NextResponse.json(
          { ok: false, error: "Please upload images only." },
          { status: 400 }
        );
      }
    }

    // Create the record first so its id is the storage folder.
    const upload = await prisma.upload.create({
      data: { name, contact, note, storagePaths: [] },
    });

    const paths: string[] = [];
    let i = 0;
    for (const f of files) {
      const ext =
        (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) ||
        "jpg";
      const path = `${upload.id}/${i}.${ext}`;
      const buf = Buffer.from(await f.arrayBuffer());
      if (await putUploadImage(path, buf, f.type || "image/jpeg")) paths.push(path);
      i++;
    }

    if (!paths.length) {
      await prisma.upload.delete({ where: { id: upload.id } });
      return NextResponse.json(
        { ok: false, error: "Upload failed, please try again." },
        { status: 500 }
      );
    }
    await prisma.upload.update({ where: { id: upload.id }, data: { storagePaths: paths } });

    // Alert Sam with signed links + an admin link. Non-blocking.
    try {
      const links = (await Promise.all(paths.map((p) => signedUploadUrl(p)))).filter(
        Boolean
      ) as string[];
      await sendMail({
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        replyTo: contact && contact.includes("@") ? contact : site.email,
        subject: `New photo upload${name ? ` — ${name}` : ""} (${paths.length})`,
        text: [
          "New photo upload from the trade-show QR page:",
          "",
          `Name: ${name || "—"}`,
          `Contact: ${contact || "—"}`,
          `What they want: ${note || "—"}`,
          "",
          "Photos (links valid ~7 days):",
          ...links,
          "",
          `View in admin: ${site.url}/admin/uploads/`,
        ].join("\n"),
      });
    } catch (e) {
      console.error("[/api/upload] notify failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError(err, "/api/upload");
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
