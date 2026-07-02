// Sends one test email via Resend to confirm the key + sending work.
// Usage: npm run email:test  (sends to QUOTE_NOTIFY_EMAIL by default)
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const to = process.argv[2] || process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com";
const from = process.env.RESEND_FROM || "Kulworks <onboarding@resend.dev>";

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: "Kulworks email test ✅",
  text: "If you're reading this in your inbox, Resend sending works from your Kulworks backend.",
});

if (error) console.error("❌ send failed:", JSON.stringify(error));
else console.log(`✅ sent (id ${data.id}) from ${from} → ${to}`);
