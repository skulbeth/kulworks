// Receives quote-request submissions from the site contact form.
// Saves the request to the DB: upserts a Client (deduped by email) and creates a
// Submission linked to it. Email-on-submit (Resend) will be added here later.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { site } from "@/data/site";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { driveConfigured, createClientFolder } from "@/lib/google-drive";
import { logError } from "@/lib/log-error";

// Prisma needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

const MAX = { name: 200, email: 320, projectType: 500, message: 5000, reference: 2000 };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= MAX.email;
}

export async function POST(request: Request) {
  if (!(await rateLimit(`quote:${clientIp(request)}`, 5, 60_000))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests — please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field. If it's set, silently accept
  // (so the bot thinks it worked) but save nothing.
  if (str(body.company_website)) {
    return NextResponse.json({ ok: true });
  }

  // Bot protection (Cloudflare Turnstile) — no-op until configured.
  if (!(await verifyTurnstile(str(body.turnstileToken), clientIp(request)))) {
    return NextResponse.json(
      { ok: false, error: "Verification failed — please try again." },
      { status: 400 }
    );
  }

  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const projectType = str(body.projectType).slice(0, MAX.projectType);
  const message = str(body.message);
  const reference = str(body.reference).slice(0, MAX.reference) || null;
  const driveFolder = body.driveFolder === true;
  const sessionId = str(body.sessionId).slice(0, 100) || null;

  if (!name || name.length > MAX.name) {
    return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }
  if (!message || message.length > MAX.message) {
    return NextResponse.json({ ok: false, error: "Please include project details." }, { status: 400 });
  }

  try {
    // Light anti-flood: same email within 60s → treat as duplicate; don't re-save/re-email.
    const recentDup = await prisma.submission.findFirst({
      where: { email, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recentDup) return NextResponse.json({ ok: true });

    // Dedupe the person by email; keep a stable Client record they hang submissions off of.
    const client = await prisma.client.upsert({
      where: { email },
      create: { name, email },
      update: {},
    });

    const submission = await prisma.submission.create({
      data: {
        name,
        email,
        projectType: projectType || null,
        message,
        reference,
        driveFolder,
        sessionId,
        clientId: client.id,
      },
    });

    // If they asked for a shared Drive folder and Drive is configured, auto-create one,
    // email them the link, and save it on the submission. Non-blocking.
    if (driveFolder && driveConfigured()) {
      try {
        const folderUrl = await createClientFolder(
          `${name} — ${new Date().toISOString().slice(0, 10)}`
        );
        if (folderUrl) {
          await prisma.submission.update({
            where: { id: submission.id },
            data: { driveFolderUrl: folderUrl },
          });
          await sendMail({
            to: email,
            replyTo: site.email,
            subject: "Your Kulworks file-sharing folder",
            text: [
              `Hi ${name},`,
              "",
              "Here's a shared folder to drop your artwork and project files into:",
              folderUrl,
              "",
              "— Kulworks",
            ].join("\n"),
          });
        }
      } catch (e) {
        console.error("[/api/quote] drive folder failed:", e);
      }
    }

    // Notify Sam of the new request. Reply-To is the customer, so hitting Reply in
    // the inbox goes straight to them. Non-blocking — never fail the save on email.
    try {
      await sendMail({
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        replyTo: email,
        subject: `New quote request — ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Project type: ${projectType || "—"}`,
          `Shared Drive folder requested: ${driveFolder ? "yes" : "no"}`,
          `Reference: ${reference ?? "—"}`,
          "",
          "Message:",
          message,
        ].join("\n"),
      });
    } catch (e) {
      console.error("[/api/quote] notification email failed:", e);
    }

    // Auto-confirmation to the customer. Reply-To is Sam, so their reply reaches him.
    try {
      await sendMail({
        to: email,
        replyTo: site.email, // branded contact@kulworks.com (forwards to Sam's Gmail)
        subject: "Thanks — we got your Kulworks request!",
        text: [
          `Hi ${name},`,
          "",
          "Thanks for reaching out to Kulworks! We've received your request and will",
          "respond as soon as we can with next steps and any questions we may have to",
          "clarify your request before sending a quote.",
          "",
          "For your records, here's what you sent:",
          "",
          message,
          "",
          "— Kulworks",
        ].join("\n"),
      });
    } catch (e) {
      console.error("[/api/quote] confirmation email failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError(err, "/api/quote");
    return NextResponse.json(
      { ok: false, error: "Something went wrong saving your request." },
      { status: 500 }
    );
  }
}
