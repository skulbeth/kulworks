// Daily job (Vercel Cron) that emails Sam a digest of reminders due today/overdue.
// Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
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

  const lines = due.map((r) => {
    const overdue = r.remindAt && r.remindAt < now ? " (OVERDUE)" : "";
    const who = r.project?.title
      ? ` — ${r.project.title}`
      : r.client?.name
        ? ` — ${r.client.name}`
        : "";
    return `• ${r.body}${who}${overdue}`;
  });

  await sendMail({
    to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
    subject: `Kulworks: ${due.length} reminder${due.length === 1 ? "" : "s"} due`,
    text: ["Here's what's on your plate:", "", ...lines, "", "— Kulworks admin"].join("\n"),
  });

  return NextResponse.json({ ok: true, sent: due.length });
}
