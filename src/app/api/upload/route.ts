import { NextResponse, after } from "next/server";
import { sendMail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { site } from "@/data/site";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";
import {
  uploadsEnabled,
  signedUploadUrl,
  claimUploads,
  withUploadLock,
  MAX_FILES,
} from "@/lib/uploads";

export const runtime = "nodejs";

function str(v: unknown, max = 2000): string | null {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
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

    // JSON only: the photos themselves went browser -> storage via /api/upload-url/.
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    // Honeypot — bots fill hidden fields.
    if (str(body.company)) return NextResponse.json({ ok: true });

    const name = str(body.name, 200);
    const contact = str(body.contact, 320);
    const note = str(body.note, 3000);
    const files = (Array.isArray(body.photos) ? (body.photos as Record<string, unknown>[]) : [])
      .map((p) => ({ path: str(p?.path, 300) ?? "", grant: str(p?.grant, 300) ?? "" }))
      .filter((p) => p.path);

    if (!files.length) {
      return NextResponse.json({ ok: false, error: "Add at least one photo." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { ok: false, error: `Up to ${MAX_FILES} photos at a time.` },
        { status: 400 }
      );
    }
    // Each path must be one /api/upload-url/ issued, and really be in the bucket
    // (allowed type, under the size cap) before we attach it.
    // They're moved to their final paths before anything is saved; already moved means
    // this is a resend of an upload that went through (its reply was lost), so say ok.
    const saved = await withUploadLock(files, async (tx) => {
      const claim = await claimUploads(tx, "upload", files);
      if (claim.status !== "ok") return { claim } as const;
      const upload = await tx.upload.create({
        data: { name, contact, note, storagePaths: claim.paths },
      });
      return { claim, upload } as const;
    });
    const { claim } = saved;
    if (claim.status === "missing") {
      return NextResponse.json(
        { ok: false, error: `Photo ${claim.index + 1} didn't upload. Please add it again.` },
        { status: 400 }
      );
    }
    if (claim.status === "duplicate") return NextResponse.json({ ok: true });
    if (claim.status === "retry") {
      return NextResponse.json(
        { ok: false, error: "Couldn't save your photos just now. Please press send again." },
        { status: 503 }
      );
    }
    // claim is "ok" here, so the upload was saved in the same step.
    const { upload } = saved as Extract<typeof saved, { upload: unknown }>;
    const paths = claim.paths;

    // Push alert after the response is sent: a slow push service must not hold up the client.
    after(() =>
      notify({
        kind: "upload",
        title: `New photo upload${name ? `: ${name}` : ""}`,
        body: `${paths.length} photo(s)${note ? ` · ${note.slice(0, 120)}` : ""}`,
        url: "/admin/uploads/",
        dedupeKey: `upload:${upload.id}`,
      })
    );

    // Alert Sam with signed links + an admin link. Non-blocking.
    try {
      const links = (await Promise.all(paths.map((p) => signedUploadUrl(p)))).filter(
        Boolean
      ) as string[];
      await sendMail({
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        replyTo: contact && contact.includes("@") ? contact : site.email,
        subject: `New photo upload${name ? `: ${name}` : ""} (${paths.length})`,
        text: [
          "New photo upload from the trade-show QR page:",
          "",
          `Name: ${name || "(none)"}`,
          `Contact: ${contact || "(none)"}`,
          `What they want: ${note || "(none)"}`,
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
