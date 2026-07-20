// Records a server-side error into the ErrorLog table so it's visible in the admin,
// and emails Sam a heads-up (throttled). Best-effort — never throws (logging must not
// break the request).
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";

const ALERT_WINDOW_MS = 15 * 60 * 1000; // email at most once per 15 min (avoid floods)

export async function logError(err: unknown, context: string) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? null : null;
  console.error(`[${context}]`, message);
  try {
    await prisma.errorLog.create({
      data: { message: message.slice(0, 1000), context, stack: stack?.slice(0, 4000) },
    });

    // Throttled alert: only email if this is the first error in the last 15 min, so a
    // burst of errors sends one email, not hundreds. (Count includes the row just added.)
    const recent = await prisma.errorLog.count({
      where: { createdAt: { gte: new Date(Date.now() - ALERT_WINDOW_MS) } },
    });
    if (recent <= 1) {
      const to = process.env.QUOTE_NOTIFY_EMAIL;
      if (to) {
        await sendMail({
          to,
          subject: `⚠️ Kulworks site error — ${context}`,
          text: [
            `A server error was logged on the Kulworks site.`,
            "",
            `Where: ${context}`,
            `Error: ${message}`,
            "",
            "See the Team page → System errors in /admin for the full list.",
            "(You'll get at most one of these every 15 minutes, even if more errors occur.)",
          ].join("\n"),
        });
      }
    }
  } catch {
    /* ignore — logging/alerting must never break the request */
  }
}
