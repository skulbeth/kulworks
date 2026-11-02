// Hands out signed upload URLs so photos go from the browser straight to Supabase
// Storage (a function body over ~4.5 MB is rejected by Vercel before it reaches us).
// The paths are chosen here, under pending/<kind>/, and each comes with a grant the
// submit route (/api/order or /api/upload) checks before it attaches the file.
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { logError } from "@/lib/log-error";
import { getCardTemplate } from "@/data/cardTemplates";
import {
  uploadsEnabled,
  issueUploadSlots,
  MAX_FILES,
  MAX_FILE_BYTES,
  ALLOWED_TYPES,
} from "@/lib/uploads";

export const runtime = "nodejs";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`upload-url:${clientIp(request)}`, 10, 60_000))) {
      return NextResponse.json(
        { ok: false, error: "Too many uploads, give it a minute." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    // Honeypot (each form names it differently). Bots get nothing to upload to.
    if (str(body.company) || str(body.company_website)) {
      return NextResponse.json({ ok: true, slots: [] });
    }

    const kind = body.kind === "order" ? "order" : body.kind === "upload" ? "upload" : null;
    if (!kind) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });

    let limit = MAX_FILES;
    if (kind === "upload") {
      if (!(await uploadsEnabled())) {
        return NextResponse.json(
          { ok: false, error: "Photo uploads are closed right now." },
          { status: 403 }
        );
      }
    } else {
      const template = getCardTemplate(str(body.templateId));
      if (!template) {
        return NextResponse.json({ ok: false, error: "Pick a card design." }, { status: 400 });
      }
      limit = template.imageSlots.length;
    }

    const files = Array.isArray(body.files) ? (body.files as { type?: unknown; size?: unknown }[]) : [];
    if (!files.length) {
      return NextResponse.json({ ok: false, error: "Add at least one photo." }, { status: 400 });
    }
    if (files.length > limit) {
      return NextResponse.json(
        { ok: false, error: `Up to ${limit} photo${limit === 1 ? "" : "s"} at a time.` },
        { status: 400 }
      );
    }
    const types: string[] = [];
    for (const f of files) {
      const type = str(f?.type);
      const size = typeof f?.size === "number" ? f.size : -1;
      if (!ALLOWED_TYPES.includes(type)) {
        return NextResponse.json({ ok: false, error: "Please upload images only." }, { status: 400 });
      }
      if (size <= 0 || size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { ok: false, error: "A photo is too large (15 MB max each)." },
          { status: 400 }
        );
      }
      types.push(type);
    }

    // Bot protection (both forms carry the widget). Checked after the cheap validation
    // so a typo doesn't burn the token. The submit routes trust a valid grant as proof.
    if (!(await verifyTurnstile(str(body.turnstileToken), clientIp(request)))) {
      return NextResponse.json(
        { ok: false, error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const slots = await issueUploadSlots(kind, types);
    if (!slots) {
      return NextResponse.json(
        { ok: false, error: "Couldn't start the upload, please try again." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, slots });
  } catch (err) {
    await logError(err, "/api/upload-url");
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
