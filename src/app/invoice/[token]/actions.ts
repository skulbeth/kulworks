"use server";

// Public actions for the client-facing quote/invoice page.
//
// These are reachable without a login, so the unguessable invoice token IS the
// credential: the same thing that lets someone read the document lets them fill
// in the shipping address on it. Nothing here exposes anything a holder of the
// link cannot already see, and nothing here touches money. Accepting a quote or
// asking to extend one only records the request and emails Sam.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { computeTotals, quoteExpired, fmtValidDate } from "@/lib/invoice";
import { site } from "@/data/site";

const NOTIFY_TO = () => process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com";

function clean(fd: FormData, k: string, max = 120): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim().slice(0, max) : "";
  return t === "" ? null : t;
}

export async function saveClientAddress(formData: FormData) {
  const token = clean(formData, "token", 200);
  if (!token) return;

  const inv = await prisma.invoice.findUnique({
    where: { token },
    select: { id: true, clientId: true, deletedAt: true, projectId: true, number: true },
  });
  if (!inv || inv.deletedAt) return;

  const street = clean(formData, "street");
  const city = clean(formData, "city");
  const state = clean(formData, "state", 60);
  const postalCode = clean(formData, "postalCode", 20);
  const country = clean(formData, "country", 60);
  const phone = clean(formData, "phone", 40);

  // An all-empty submit is a no-op rather than a way to wipe an address.
  if (!street && !city && !state && !postalCode && !country && !phone) return;

  await prisma.client.update({
    where: { id: inv.clientId },
    data: {
      ...(street ? { street } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(postalCode ? { postalCode } : {}),
      ...(country ? { country } : {}),
      ...(phone ? { phone } : {}),
    },
  });

  const parts = [street, city, state, postalCode, country].filter(Boolean).join(", ");
  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `Client filled in their details from ${inv.number}: ${parts}${phone ? ` · ${phone}` : ""}`,
      clientId: inv.clientId,
      projectId: inv.projectId,
    },
  });

  revalidatePath(`/invoice/${token}`);
  revalidatePath("/admin", "layout");
}

async function liveQuote(fd: FormData) {
  const token = clean(fd, "token", 200);
  if (!token) return null;
  const q = await prisma.invoice.findUnique({
    where: { token },
    include: { client: true, project: true, items: true },
  });
  if (!q || q.deletedAt || q.type !== "QUOTE" || q.status === "VOID" || q.status === "DRAFT") return null;
  return q;
}

// "Looks good, let's do it." Once per quote; a second press changes nothing.
export async function acceptQuote(formData: FormData) {
  const q = await liveQuote(formData);
  if (!q || q.acceptedAt || quoteExpired(q.validUntil)) return;
  const { total } = computeTotals(q.items, q.taxRate);
  const url = `${site.url}/invoice/${q.token}/`;

  await prisma.invoice.update({ where: { id: q.id }, data: { acceptedAt: new Date() } });
  if (q.project.stage === "LEAD" || q.project.stage === "QUOTED") {
    await prisma.project.update({ where: { id: q.projectId }, data: { stage: "APPROVED" } });
  }
  await prisma.activity.create({
    data: {
      type: "STATUS_CHANGE",
      body: `Client accepted ${q.number} ($${total.toFixed(2)}) from the quote page.`,
      clientId: q.clientId,
      projectId: q.projectId,
    },
  });
  await sendMail({
    to: NOTIFY_TO(),
    replyTo: q.client.email,
    subject: `Quote ACCEPTED: ${q.number} ${q.client.name} $${total.toFixed(2)}`,
    text: [
      `${q.client.name} (${q.client.email}) pressed "Looks good" on ${q.number} for "${q.project.title}".`,
      `Total: $${total.toFixed(2)}`,
      "",
      `Quote page: ${url}`,
      "Reply to this email to answer them directly.",
    ].join("\n"),
  });

  revalidatePath(`/invoice/${q.token}`);
  revalidatePath("/admin", "layout");
}

// Expired quote: "can you take another look?" Records it and emails Sam; he
// extends it from the admin. Once a day at most, so a refresh can't spam him.
export async function requestQuoteExtension(formData: FormData) {
  const q = await liveQuote(formData);
  if (!q || !quoteExpired(q.validUntil)) return;
  if (q.extendRequestedAt && Date.now() - q.extendRequestedAt.getTime() < 24 * 3600_000) return;
  const note = clean(formData, "note", 2000);
  const { total } = computeTotals(q.items, q.taxRate);

  await prisma.invoice.update({ where: { id: q.id }, data: { extendRequestedAt: new Date() } });
  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `Client asked to extend expired ${q.number}${note ? `: "${note}"` : "."}`,
      clientId: q.clientId,
      projectId: q.projectId,
    },
  });
  await sendMail({
    to: NOTIFY_TO(),
    replyTo: q.client.email,
    subject: `Extend quote? ${q.number} ${q.client.name}`,
    text: [
      `${q.client.name} (${q.client.email}) wants to revisit ${q.number} for "${q.project.title}" ($${total.toFixed(2)}).`,
      q.validUntil ? `It expired after ${fmtValidDate(q.validUntil)}.` : "",
      note ? `\nTheir note:\n${note}\n` : "",
      `Extend it from the project page in the admin, then let them know.`,
      `Quote page: ${site.url}/invoice/${q.token}/`,
    ].filter(Boolean).join("\n"),
  });

  revalidatePath(`/invoice/${q.token}`);
  revalidatePath("/admin", "layout");
}
