// Weekly data backup (Vercel Cron): emails Sam a JSON export as an attachment.
// Protected by CRON_SECRET.
import { gzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { buildBackup } from "@/lib/backup";
import { resend, FROM } from "@/lib/email";
import { logError } from "@/lib/log-error";
import { sendWeeklyStatsEmail } from "@/lib/weekly-stats";

export const runtime = "nodejs";

// Plain JSON while it's small (opens anywhere); gzipped once it grows, so years of page
// views can't push the email past the mail service's attachment limit.
function attachment(json: string, filename: string) {
  const raw = Buffer.from(json);
  if (raw.length < 8 * 1024 * 1024) return { filename, content: raw.toString("base64") };
  return { filename: `${filename}.gz`, content: gzipSync(raw).toString("base64") };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Fail closed: an unset CRON_SECRET must not leave the job open to anyone.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Weekly stats digest rides on this same Monday cron (keeps within Hobby cron limits).
  // Sent first and on its own, so a failed backup never costs the week's stats.
  try {
    await sendWeeklyStatsEmail();
  } catch (e) {
    await logError(e, "/api/cron/backup:weekly-stats");
  }

  try {
    const { json, filename, counts } = await buildBackup();
    if (resend) {
      // Resend hands a failure back instead of throwing, so check for one.
      const { error } = await resend.emails.send({
        from: FROM,
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        subject: `Kulworks weekly backup: ${filename}`,
        text: `Attached is your weekly data backup.\n\nRecord counts:\n${JSON.stringify(counts, null, 2)}`,
        attachments: [attachment(json, filename)],
      });
      if (error) throw new Error(`backup email: ${error.message}`);
    }
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    await logError(err, "/api/cron/backup");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
