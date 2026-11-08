// The invoice a client pays, made the moment the job is ready to be paid for, so it is
// already on their job page (the quote link) and they get an email saying so. Nobody
// has to ask "where do I pay you?" (Scott, 11-07).
//
// Ready = the quote is accepted AND
//   - proofFirst (card jobs, the default): the project has a proof and every active proof
//     is approved. The invoice comes when they press Approve all.
//   - not proofFirst (3D prints, tokens): right away, on accept.
// Called from acceptQuote and the proof approval; safe to call any time, it makes at most
// one invoice per quote.
import { prisma } from "@/lib/prisma";
import { computeTotals, splitDeposit } from "@/lib/invoice";
import { createNumberedDoc } from "@/lib/doc-number";
import { copyQuoteToInvoice, mainInvoiceWhere, jobPath } from "@/lib/job";
import { sendToClient, mailSent } from "@/lib/email";
import { site } from "@/data/site";

export async function ensureInvoiceForProject(projectId: string): Promise<string | null> {
  const quote = await prisma.invoice.findFirst({
    where: { projectId, type: "QUOTE", deletedAt: null, acceptedAt: { not: null }, status: { in: ["SENT", "DRAFT"] } },
    include: { items: { orderBy: { position: "asc" } }, client: true, project: true },
    orderBy: { acceptedAt: "desc" },
  });
  if (!quote || quote.items.length === 0) return null;

  if (quote.proofFirst) {
    const proofs = await prisma.proof.findMany({ where: { projectId, active: true }, select: { approvedAt: true } });
    if (proofs.length === 0 || proofs.some((p) => !p.approvedAt)) return null;
  }

  // One invoice per quote, checked again inside the numbering lock so an accept and an
  // approval landing together can't make two.
  const existing = mainInvoiceWhere(quote.id);
  if (await prisma.invoice.count({ where: existing })) return null;
  const { number, doc } = await createNumberedDoc("INVOICE", async (number, tx) => {
    if (await tx.invoice.count({ where: existing })) return null;
    return copyQuoteToInvoice(tx, quote, number, "SENT");
  });
  if (!doc) return null;

  const { total } = computeTotals(quote.items, quote.taxRate);
  const { dueNow, hasSplit, balance } = splitDeposit(total, quote.depositPct);
  const why = quote.proofFirst ? "quote accepted and proof approved" : "quote accepted (no proof on this job)";

  // Tell them. The job page is the quote link they already have.
  const first = quote.client.name.trim().split(/\s+/)[0] || "there";
  const url = `${site.url}${jobPath(quote.token)}`;
  const r = await sendToClient({
    to: quote.client.email,
    subject: `Your Kulworks invoice is ready: ${number}`,
    text: [
      `Hi ${first},`,
      "",
      quote.proofFirst
        ? `Thanks for approving your proof! Your invoice for "${quote.project.title}" is ready.`
        : `Thanks for the go ahead! Your invoice for "${quote.project.title}" is ready.`,
      "",
      hasSplit
        ? `Deposit due now: $${dueNow.toFixed(2)} (the $${balance.toFixed(2)} balance is billed when your order is ready)`
        : `Amount due: $${total.toFixed(2)}`,
      "",
      "You can pay with Venmo or Zelle right on your job page, the same link as your quote:",
      url,
      "",
      "Thanks,",
      "Sam",
      "Kulworks",
    ].join("\n"),
  });

  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `${number} ($${(hasSplit ? dueNow : total).toFixed(2)}) made automatically from ${quote.number}: ${why}. ${
        mailSent(r) ? `Emailed ${quote.client.email} the job page link.` : "The invoice email did NOT go out; send the link by hand."
      }`,
      projectId: quote.projectId,
      clientId: quote.clientId,
    },
  });
  return number;
}
