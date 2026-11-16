// WP3040 "Print Watch" alerts, sent from Sam's print PC (D:\Kulworks\Tools\Print Watch).
// The PC sends x-printer-key; we compare its SHA-256 with the Setting "printer_key_sha256"
// (the raw key only lives in the PC's config). Recipients are fixed here, so a leaked key can
// only ever send Sam a printer alert.
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendMail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";

export const runtime = "nodejs";

const EVENTS = ["started", "almost", "finished", "stopped", "test"] as const;

async function keyOk(sent: string | null): Promise<boolean> {
  if (!sent || sent.length < 32 || sent.length > 200) return false;
  const row = await prisma.setting.findUnique({ where: { key: "printer_key_sha256" } });
  if (!row) return false;
  const a = createHash("sha256").update(sent).digest();
  const b = Buffer.from(row.value, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(req: Request) {
  if (!(await keyOk(req.headers.get("x-printer-key")))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit("printer", 60, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const event = typeof b.event === "string" && (EVENTS as readonly string[]).includes(b.event) ? b.event : null;
  const title = str(b.title, 120);
  const body = str(b.body, 600) ?? "";
  const jobId = str(b.jobId, 80);
  if (!event || !title) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  try {
    const sendPush = b.push !== false;
    if (sendPush) {
      await notify({
        kind: "printer",
        title,
        body,
        dedupeKey: jobId && event !== "test" ? `printer:${jobId}:${event}` : undefined,
      });
    }
    let emailed = false;
    if (b.email === true) {
      const to = process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com";
      const r = await sendMail({ to, subject: title, text: `${body}\n\n(Print Watch on the WP3040 PC)` });
      emailed = !("error" in r && r.error);
    }
    return NextResponse.json({ ok: true, pushed: sendPush, emailed });
  } catch (err) {
    await logError(err, "api/printer").catch(() => {});
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
