// Thin wrapper around Resend for transactional email. Safe no-op if the API key
// isn't set (so local dev / builds don't crash when email isn't configured).
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || "Kulworks <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping:", opts.subject);
    return { skipped: true as const };
  }
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    replyTo: opts.replyTo,
  });
  if (error) {
    console.error("[email] send failed:", error);
    return { error };
  }
  return { id: data?.id };
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
