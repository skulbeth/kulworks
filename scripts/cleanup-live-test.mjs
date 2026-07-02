// Verifies audience sync, then removes the live-test rows (quote test + audience test).
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);
const audienceId = process.env.RESEND_AUDIENCE_ID;

try {
  const sub = await prisma.subscriber.findUnique({
    where: { email: "audience-test@example.com" },
  });
  console.log(`audience sync: resendContactId=${sub?.resendContactId ?? "(none)"}`);

  if (sub) {
    try {
      await resend.contacts.remove({ email: "audience-test@example.com", audienceId });
    } catch (e) {
      console.warn("(audience contact remove skipped)", e?.message);
    }
    await prisma.subscriber.delete({ where: { email: "audience-test@example.com" } });
  }

  const s = await prisma.submission.deleteMany({ where: { email: "kulworksdesign@gmail.com" } });
  const c = await prisma.client.deleteMany({ where: { email: "kulworksdesign@gmail.com" } });
  console.log(`🧹 cleaned quote test: ${s.count} submission(s), ${c.count} client(s)`);
} finally {
  await prisma.$disconnect();
}
