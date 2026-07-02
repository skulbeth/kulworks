// Weekly data backup (Vercel Cron): emails Sam a JSON export as an attachment.
// Protected by CRON_SECRET.
import { NextResponse } from "next/server";
import { buildBackup } from "@/lib/backup";
import { resend, FROM } from "@/lib/email";
import { logError } from "@/lib/log-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const { json, filename, counts } = await buildBackup();
    if (resend) {
      await resend.emails.send({
        from: FROM,
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        subject: `Kulworks weekly backup — ${filename}`,
        text: `Attached is your weekly data backup.\n\nRecord counts:\n${JSON.stringify(counts, null, 2)}`,
        attachments: [{ filename, content: Buffer.from(json).toString("base64") }],
      });
    }
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    await logError(err, "/api/cron/backup");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
