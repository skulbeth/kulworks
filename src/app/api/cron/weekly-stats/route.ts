// Weekly site-stats digest email. Runs alongside the Monday backup cron (see
// /api/cron/backup) to stay within Hobby's cron limits; this route also lets you
// trigger it manually (Bearer CRON_SECRET) for testing or a future dedicated schedule.
import { NextResponse } from "next/server";
import { sendWeeklyStatsEmail } from "@/lib/weekly-stats";
import { logError } from "@/lib/log-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const res = await sendWeeklyStatsEmail();
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    await logError(err, "/api/cron/weekly-stats");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
