"use server";

// Public actions for the client-facing quote/invoice page.
//
// These are reachable without a login, so the unguessable invoice token IS the
// credential: the same thing that lets someone read the document lets them fill
// in the shipping address on it. Nothing here exposes anything a holder of the
// link cannot already see, and nothing here touches money. Accepting a quote or
// asking to extend one only records the request and emails Sam.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { notify, projectUrl } from "@/lib/notify";
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
    select: { id: true, clientId: true, deletedAt: true, projectId: true, number: true, status: true },
  });
  if (!inv || inv.deletedAt || inv.status === "VOID") return;
  // Each save pings Sam's phone, so a held-down Enter or a script can't flood it.
  if (!(await rateLimit(`client-addr:${token}`, 5, 60 * 60_000))) return;

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
  // After the response: a slow push service shouldn't hold up the client's page.
  after(() =>
    notify({
      kind: "address",
      title: `Shipping details saved (${inv.number})`,
      body: [parts, phone].filter(Boolean).join(" · "),
      url: projectUrl(inv.projectId),
      projectId: inv.projectId,
      clientId: inv.clientId,
    })
  );
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
  // Nothing to do from a stale tab: refresh it so the page shows the real state.
  const stale = () => revalidatePath(`/invoice/${clean(formData, "token", 200)}`);
  if (!q || q.acceptedAt || q.status === "PAID" || quoteExpired(q.validUntil)) return stale();
  // Once there's an invoice for it, the quote is past accepting.
  const invoiced = await prisma.invoice.count({
    where: { sourceQuoteId: q.id, deletedAt: null, status: { in: ["SENT", "PAID"] } },
  });
  if (invoiced > 0) return stale();
  const { total } = computeTotals(q.items, q.taxRate);
  const url = `${site.url}/invoice/${q.token}/`;

  // Claim it in one statement, so two quick presses send Sam one email, not two.
  const claimed = await prisma.invoice.updateMany({
    where: { id: q.id, acceptedAt: null },
    data: { acceptedAt: new Date() },
  });
  if (claimed.count === 0) return stale();
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
  after(() =>
    notify({
      kind: "quote_accepted",
      title: `Quote accepted: ${q.client.name}`,
      body: `${q.number} · $${total.toFixed(2)} · ${q.project.title}`,
      url: projectUrl(q.projectId),
      projectId: q.projectId,
      clientId: q.clientId,
      dedupeKey: `quote_accepted:${q.id}`,
    })
  );
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
  // Stale tab (Sam already extended it, or it was asked today): refresh the page so it
  // shows where things stand instead of a button that silently does nothing.
  const stale = () => revalidatePath(`/invoice/${clean(formData, "token", 200)}`);
  if (!q || !quoteExpired(q.validUntil)) return stale();
  const note = clean(formData, "note", 2000);
  const { total } = computeTotals(q.items, q.taxRate);

  // Claim the once-a-day slot in one statement, so a double tap can't send two.
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const claimed = await prisma.invoice.updateMany({
    where: { id: q.id, OR: [{ extendRequestedAt: null }, { extendRequestedAt: { lt: dayAgo } }] },
    data: { extendRequestedAt: new Date() },
  });
  if (claimed.count === 0) return stale();
  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `Client asked to extend expired ${q.number}${note ? `: "${note}"` : "."}`,
      clientId: q.clientId,
      projectId: q.projectId,
    },
  });
  after(() =>
    notify({
      kind: "quote_extend",
      title: `Extend quote? ${q.client.name}`,
      body: `${q.number} · $${total.toFixed(2)}${note ? ` · "${note.slice(0, 120)}"` : ""}`,
      url: projectUrl(q.projectId),
      projectId: q.projectId,
      clientId: q.clientId,
    })
  );
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

// "Message Sam" from a quote/invoice or proof page: contact that doesn't depend on
// email or texting. Lands on the project timeline, buzzes Sam's phone, and is
// emailed to him with Reply-To set to the client so he can answer from Gmail.
export async function sendClientMessage(formData: FormData) {
  const kind = clean(formData, "kind", 10);
  const token = clean(formData, "token", 200);
  const body = clean(formData, "message", 2000);
  if (!token || (kind !== "invoice" && kind !== "proof")) return;
  const back = kind === "invoice" ? `/invoice/${token}/` : `/proof/${token}/`;
  if (!body) redirect(`${back}?msg=empty#message`);

  let ctx: { projectId: string; clientId: string; clientName: string; clientEmail: string; label: string } | null = null;
  if (kind === "invoice") {
    const inv = await prisma.invoice.findUnique({ where: { token }, include: { client: true } });
    if (inv && !inv.deletedAt && inv.status !== "DRAFT") {
      ctx = { projectId: inv.projectId, clientId: inv.clientId, clientName: inv.client.name, clientEmail: inv.client.email, label: inv.number };
    }
  } else {
    const p = await prisma.proof.findUnique({ where: { token }, include: { project: { include: { client: true } } } });
    if (p && p.active && !p.project.deletedAt) {
      ctx = { projectId: p.projectId, clientId: p.project.clientId, clientName: p.project.client.name, clientEmail: p.project.client.email, label: `proof "${p.title}"` };
    }
  }
  if (!ctx) return;
  if (!(await rateLimit(`client-msg:${token}`, 8, 60 * 60_000))) redirect(`${back}?msg=slow#message`);

  await prisma.activity.create({
    data: { type: "EMAIL_RECEIVED", body: `Message from ${ctx.label} page:\n${body}`, clientId: ctx.clientId, projectId: ctx.projectId },
  });
  const c = ctx;
  after(() =>
    notify({
      kind: "message",
      title: `Message from ${c.clientName}`,
      body: body.slice(0, 180),
      url: projectUrl(c.projectId),
      projectId: c.projectId,
      clientId: c.clientId,
    })
  );
  await sendMail({
    to: NOTIFY_TO(),
    replyTo: ctx.clientEmail,
    subject: `Message from ${ctx.clientName} (${ctx.label})`,
    text: [`${ctx.clientName} (${ctx.clientEmail}) wrote from their ${ctx.label} page:`, "", body, "", "Reply to this email to answer them."].join("\n"),
  });
  revalidatePath("/admin", "layout");
  redirect(`${back}?msg=sent#message`);
}
