// Receives quote-request submissions from the site contact form.
// Saves the request to the DB: upserts a Client (deduped by email) and creates a
// Submission linked to it, creates the shared Drive folder if they asked for one, then
// emails Sam (new-request notice) and the customer (confirmation).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { site } from "@/data/site";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { logError } from "@/lib/log-error";
import { driveConfigured, createClientFolder } from "@/lib/google-drive";
import {
  DELIVERY_OPTIONS,
  CARD_BACK_OPTIONS,
  RUSH_FEE,
  isRush,
  deliveryLabel,
  cardBacksLabel,
  shipAddressLine,
} from "@/lib/order-details";

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
      { ok: false, error: "Too many requests. Please wait a moment and try again." },
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
      { ok: false, error: "Verification failed. Please try again." },
      { status: 400 }
    );
  }

  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const projectType = str(body.projectType).slice(0, MAX.projectType);
  const message = str(body.message);
  const reference = str(body.reference).slice(0, MAX.reference) || null;
  const phone = str(body.phone).slice(0, 40) || null;
  const driveFolder = body.driveFolder === true;
  const sessionId = str(body.sessionId).slice(0, 100) || null;

  // Timing + hand-off. All optional on the wire; validated so junk never reaches the DB.
  const dueRaw = str(body.dueDate);
  const dueISO = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;
  const dueDate = dueISO ? new Date(`${dueISO}T12:00:00Z`) : null; // noon UTC: same calendar day everywhere
  const deliveryRaw = str(body.deliveryMethod);
  const deliveryMethod = DELIVERY_OPTIONS.some((o) => o.id === deliveryRaw) ? deliveryRaw : null;
  const ship =
    deliveryMethod === "ship"
      ? {
          shipStreet: str(body.shipStreet).slice(0, 200) || null,
          shipCity: str(body.shipCity).slice(0, 100) || null,
          shipState: str(body.shipState).slice(0, 50) || null,
          shipPostalCode: str(body.shipPostalCode).slice(0, 20) || null,
        }
      : { shipStreet: null, shipCity: null, shipState: null, shipPostalCode: null };
  const backsRaw = str(body.cardBacks);
  const cardBacks = CARD_BACK_OPTIONS.some((o) => o.id === backsRaw) ? backsRaw : null;

  if (!name || name.length > MAX.name) {
    return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }
  if (!message || message.length > MAX.message) {
    return NextResponse.json({ ok: false, error: "Please include project details." }, { status: 400 });
  }
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ ok: false, error: "Please pick a valid date." }, { status: 400 });
  }
  if (deliveryMethod === "ship" && !(ship.shipStreet && ship.shipCity && ship.shipState && ship.shipPostalCode)) {
    return NextResponse.json(
      { ok: false, error: "Please fill in the full shipping address." },
      { status: 400 }
    );
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
      create: { name, email, phone },
      update: phone ? { phone } : {},
    });

    const submission = await prisma.submission.create({
      data: {
        name,
        email,
        phone,
        projectType: projectType || null,
        message,
        reference,
        driveFolder,
        sessionId,
        clientId: client.id,
        dueDate,
        deliveryMethod,
        ...ship,
        cardBacks,
      },
    });

    // Shared Drive folder: create it now when they ticked the box, so the link can go
    // out in the confirmation email. (From 2026-07-25 to 2026-10-20 this was only a flag
    // and Sam made folders by hand from the admin; that is why Janice Degollado's request
    // had driveFolder: true and no folder. The admin "Create shared folder" button stays
    // for requests that didn't ask.) Same naming as the admin button. Non-blocking.
    let folderUrl: string | null = null;
    if (driveFolder && driveConfigured()) {
      try {
        folderUrl = await createClientFolder(
          `C - ${name} - ${new Date().toISOString().slice(0, 10)}`
        );
        if (folderUrl) {
          await prisma.submission.update({
            where: { id: submission.id },
            data: { driveFolderUrl: folderUrl },
          });
        } else {
          // createClientFolder only console.errors on failure; put it where the admin
          // error log can show it, so a missing folder is never silent again.
          await logError(new Error(`Drive folder not created for submission ${submission.id}`), "/api/quote drive folder");
        }
      } catch (e) {
        await logError(e, "/api/quote drive folder");
      }
    } else if (driveFolder) {
      await logError(new Error("Drive folder requested but Google Drive is not configured"), "/api/quote drive folder");
    }

    const rush = isRush(dueISO);
    const detailLines = [
      `Due date: ${dueISO ?? "(not given)"}${rush ? ` (RUSH: under 3 days, $${RUSH_FEE} rush fee)` : ""}`,
      `Delivery: ${deliveryLabel(deliveryMethod) || "(not given)"}`,
      deliveryMethod === "ship" ? `Ship to: ${shipAddressLine(ship)}` : null,
      cardBacks ? `Card backs: ${cardBacksLabel(cardBacks)}` : null,
    ].filter(Boolean) as string[];

    // Notify Sam of the new request. Reply-To is the customer, so hitting Reply in
    // the inbox goes straight to them. Non-blocking — never fail the save on email.
    try {
      await sendMail({
        to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
        replyTo: email,
        subject: `New quote request: ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Phone: ${phone ?? "(none)"}`,
          `Project type: ${projectType || "(none)"}`,
          `Shared Drive folder requested: ${driveFolder ? (folderUrl ? `yes, created: ${folderUrl}` : "yes, NOT created (make it from the admin)") : "no"}`,
          `Reference: ${reference ?? "(none)"}`,
          ...detailLines,
          "",
          "Message:",
          message,
        ].join("\n"),
      });
    } catch (e) {
      console.error("[/api/quote] notification email failed:", e);
    }

    // Optional short SMS ping via a carrier email-to-SMS gateway (heads-up only).
    if (process.env.NOTIFY_SMS) {
      try {
        await sendMail({
          to: process.env.NOTIFY_SMS,
          subject: "New Kulworks lead",
          text: [
            `New lead: ${name}`,
            projectType ? `Wants: ${projectType}` : null,
            email,
            phone,
            message ? `"${message.slice(0, 100)}${message.length > 100 ? "…" : ""}"` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } catch (e) {
        console.error("[/api/quote] SMS ping failed:", e);
      }
    }

    // Auto-confirmation to the customer. Reply-To is Sam, so their reply reaches him.
    try {
      await sendMail({
        to: email,
        replyTo: site.email, // branded contact@kulworks.com (forwards to Sam's Gmail)
        subject: "Thanks! We got your Kulworks request",
        text: [
          `Hi ${name},`,
          "",
          "Thanks for reaching out to Kulworks! We've received your request and will",
          "respond as soon as we can with next steps and any questions we may have to",
          "clarify your request before sending a quote.",
          "",
          folderUrl ? "Here's your shared folder for artwork and project files:" : null,
          folderUrl,
          folderUrl ? "" : null,
          "For your records, here's what you sent:",
          "",
          message,
          "",
          ...detailLines,
          "",
          "Kulworks",
        ]
          .filter((l) => l !== null)
          .join("\n"),
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
