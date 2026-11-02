// Daily job (Vercel Cron) that emails Sam a digest of reminders due today/overdue.
// Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { maybeSweepInbox } from "@/lib/inbox-sweep";
import { sweepPendingUploads } from "@/lib/uploads";
import { pruneRateLimits } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";
import { SHOP_TZ } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Fail closed: an unset CRON_SECRET must not leave the job open to anyone.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Daily floor for the client-email / payment-receipt check (traffic and the app
  // run it more often; see lib/inbox-sweep.ts).
  await maybeSweepInbox(true);

  // Photos uploaded for a form that was never sent.
  try {
    await sweepPendingUploads();
  } catch (e) {
    await logError(e, "/api/cron/reminders:pending-uploads");
  }
  // Old rate-limit rows (each only matters for minutes to hours).
  try {
    await pruneRateLimits();
  } catch (e) {
    await logError(e, "/api/cron/reminders:rate-limits");
  }

  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const due = await prisma.activity.findMany({
    where: { type: "REMINDER", done: false, deletedAt: null, remindAt: { not: null, lte: endOfToday } },
    orderBy: { remindAt: "asc" },
    include: { project: true, client: true },
  });

  if (due.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Overdue = an earlier Texas day. Dates are stored as a day (noon or midnight UTC), so
  // comparing instants would call everything due today overdue by the 8am run.
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: SHOP_TZ });
  const today = dayKey(now);
  const lines = due.map((r) => {
    const overdue = r.remindAt && r.remindAt.toISOString().slice(0, 10) < today ? " (OVERDUE)" : "";
    const who = r.project?.title
      ? `: ${r.project.title}`
      : r.client?.name
        ? `: ${r.client.name}`
        : "";
    return `• ${r.body}${who}${overdue}`;
  });

  await sendMail({
    to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
    subject: `Kulworks: ${due.length} reminder${due.length === 1 ? "" : "s"} due`,
    text: ["Here's what's on your plate:", "", ...lines, "", "Kulworks admin"].join("\n"),
  });

  return NextResponse.json({ ok: true, sent: due.length });
}
