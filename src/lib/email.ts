// Thin wrapper around Resend for transactional email. Safe no-op if the API key
// isn't set (so local dev / builds don't crash when email isn't configured).
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || "Kulworks <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

// Never throws: a failed send returns { error } and is recorded with logError (callers'
// try/catch blocks never saw these, so failures used to vanish into the console).
export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  bcc?: string | string[];
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping:", opts.subject);
    return { skipped: true as const };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      replyTo: opts.replyTo,
      ...(opts.bcc ? { bcc: opts.bcc } : {}),
    });
    if (error) {
      await logMailFailure(error.message || String(error.name), opts.subject);
      return { error };
    }
    return { id: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logMailFailure(message, opts.subject);
    return { error: { message, name: "send_threw" } };
  }
}

/**
 * Anything that goes to a CLIENT: from the shop address, replies come back to contact@
 * (Mailgun forwards it to Sam's Gmail), and a BCC to contact@ so Sam's inbox holds what
 * was sent (Resend sends never land in Gmail's Sent folder). One sender so every client
 * email behaves the same way.
 */
export function sendToClient(opts: { to: string; subject: string; text: string }) {
  const shop = process.env.CLIENT_MAIL_BCC || "contact@kulworks.com";
  return sendMail({ ...opts, replyTo: shop, bcc: shop });
}

/** Did sendMail actually hand the email to Resend? (Skipped counts only outside production.) */
export function mailSent(r: Awaited<ReturnType<typeof sendMail>>): boolean {
  if ("error" in r && r.error) return false;
  if ("skipped" in r && r.skipped) return process.env.NODE_ENV !== "production";
  return true;
}

// log-error imports this file (its alert is an email), so load it lazily. Its own alert
// is throttled to one per 15 min, so a failing alert can't loop.
async function logMailFailure(message: string, subject: string) {
  const { logError } = await import("@/lib/log-error");
  await logError(new Error(`Email send failed: ${message} (subject: ${subject.slice(0, 120)})`), "sendMail");
}

// Adds an email to the Resend Audience (newsletter list). Returns the contact id.
export async function addSubscriberToAudience(email: string): Promise<string | null> {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!resend || !audienceId) return null;
  try {
    const { data, error } = await resend.contacts.create({
      email,
      audienceId,
      unsubscribed: false,
    });
    if (error) {
      console.error("[email] audience add failed:", error);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("[email] audience add threw:", e);
    return null;
  }
}

export { resend, FROM };
