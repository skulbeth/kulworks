// Google review request emails.
//
// A project marked Delivered or Closed queues one request for its client (once per
// client, ever, so repeat customers aren't asked again and again). Past clients can be
// queued by hand with a personalized body. The daily cron (api/cron/reminders) sends at
// most ONE due request per run, so they trickle out one a day.
//
// Google bans rewards for reviews, so the $10 thank-you in the email is for every past
// customer, review or not. Keep it that way if this text is edited.
import { prisma } from "@/lib/prisma";
import { sendToClient, mailSent } from "@/lib/email";
import { site } from "@/data/site";

/** Days after "finished" before the email goes out (they've had the order a bit). */
export const REVIEW_DELAY_DAYS = 2;

export function reviewSubject() {
  return "Thank you from Kulworks (and a quick favor)";
}

/** The standard email. `personal` is an optional line about their project. */
export function reviewBody(firstName: string, personal?: string | null) {
  return [
    `Hi ${firstName},`,
    "",
    `Thanks again for ordering from Kulworks!${personal ? " " + personal : " I hope you love how everything turned out."}`,
    "",
    "I just got Kulworks set up on Google, and reviews are the biggest thing that helps a small shop like mine get found. If you have a minute, I'd really appreciate an honest review here:",
    "",
    "{REVIEW_LINK}",
    "",
    "Also, as a thank you to everyone who's ordered from me, you've got $10 off your next order, review or not. Just mention this email when you reach out.",
    "",
    "Thanks so much!",
    "Sam",
    "Kulworks",
    `kulworks.com | ${site.telephoneDisplay}`,
  ].join("\n");
}

function firstName(name: string) {
  return (name.trim().split(/\s+/)[0] || "there").replace(/^./, (c) => c.toUpperCase());
}

function usableEmail(email: string | null | undefined): email is string {
  return !!email && /@/.test(email) && !/\.invalid$|@example\.com$/i.test(email);
}

/**
 * Queue a review request for a project's client. No-op if the client was already asked
 * (any request that isn't CANCELED) or has no real email. Returns true if queued.
 */
export async function queueReviewRequestForProject(projectId: string, authorId?: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  const client = project?.client;
  if (!project || !client || !usableEmail(client.email)) return false;

  const already = await prisma.reviewRequest.findFirst({
    where: { clientId: client.id, status: { not: "CANCELED" } },
  });
  if (already) return false;

  const sendAfter = new Date(Date.now() + REVIEW_DELAY_DAYS * 86_400_000);
  await prisma.reviewRequest.create({
    data: {
      clientId: client.id,
      projectId: project.id,
      email: client.email,
      subject: reviewSubject(),
      body: reviewBody(firstName(client.name)),
      sendAfter,
    },
  });
  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `Google review request queued (goes out ${sendAfter.toLocaleDateString("en-US", { timeZone: "America/Chicago" })} or later, one a day).`,
      projectId: project.id,
      clientId: client.id,
      authorId: authorId ?? null,
    },
  });
  return true;
}

/** Send the single oldest due request. Called once a day by the cron. */
export async function sendNextReviewRequest() {
  const link = site.googleReviewUrl;
  if (!link) return { sent: 0, reason: "no review link set" };

  const next = await prisma.reviewRequest.findFirst({
    where: { status: "QUEUED", sendAfter: { lte: new Date() } },
    orderBy: { sendAfter: "asc" },
  });
  if (!next) return { sent: 0 };

  const r = await sendToClient({
    to: next.email,
    subject: next.subject,
    text: next.body.replaceAll("{REVIEW_LINK}", link),
  });
  if (!mailSent(r)) {
    const msg = "error" in r && r.error ? r.error.message : "not sent";
    await prisma.reviewRequest.update({ where: { id: next.id }, data: { status: "FAILED", error: msg } });
    return { sent: 0, failed: next.email };
  }

  await prisma.reviewRequest.update({ where: { id: next.id }, data: { status: "SENT", sentAt: new Date() } });
  await prisma.activity.create({
    data: {
      type: "EMAIL_SENT",
      body: `Sent the Google review request email to ${next.email}.`,
      projectId: next.projectId,
      clientId: next.clientId,
    },
  });
  return { sent: 1, to: next.email };
}
