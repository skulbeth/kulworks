// The invoice a client pays, made the moment the job is ready to be paid for, so the
// Pay now button is already on their quote page (and proof page) and nobody has to ask
// "where do I pay you?".
//
// Ready = the quote is accepted AND the project has a proof that is fully approved.
// The quote page promises "payment only comes after you approve your sample", so an
// accept with no proof yet makes nothing; the invoice comes when they press Approve all.
// Jobs that never get a proof are still converted by hand from the admin.
import { prisma } from "@/lib/prisma";
import { BALANCE_PREFIX, computeTotals } from "@/lib/invoice";
import { createNumberedDoc } from "@/lib/doc-number";

export async function ensureInvoiceForProject(projectId: string): Promise<string | null> {
  const proofs = await prisma.proof.findMany({ where: { projectId, active: true }, select: { approvedAt: true } });
  if (proofs.length === 0 || proofs.some((p) => !p.approvedAt)) return null;

  const quote = await prisma.invoice.findFirst({
    where: { projectId, type: "QUOTE", deletedAt: null, acceptedAt: { not: null }, status: { in: ["SENT", "DRAFT"] } },
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: { acceptedAt: "desc" },
  });
  if (!quote || quote.items.length === 0) return null;

  // One invoice per quote (a balance invoice doesn't count), checked again inside the
  // numbering lock so an accept and an approval landing together can't make two.
  const existingWhere = {
    sourceQuoteId: quote.id,
    deletedAt: null,
    status: { not: "VOID" as const },
    OR: [{ notes: null }, { NOT: { notes: { startsWith: BALANCE_PREFIX } } }],
  };
  if (await prisma.invoice.count({ where: existingWhere })) return null;

  const { number, doc } = await createNumberedDoc("INVOICE", async (number, tx) => {
    if (await tx.invoice.count({ where: existingWhere })) return null;
    return tx.invoice.create({
      data: {
        number,
        type: "INVOICE",
        status: "SENT", // SENT is what lists it under Payments with Pay now
        issuedAt: new Date(),
        projectId: quote.projectId,
        clientId: quote.clientId,
        taxRate: quote.taxRate,
        depositPct: quote.depositPct,
        sourceQuoteId: quote.id,
        dueDate: quote.dueDate ?? undefined,
        notes: quote.notes,
        items: {
          create: quote.items.map((it, i) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            position: i,
          })),
        },
      },
    });
  });
  if (!doc) return null;

  const { total } = computeTotals(quote.items, quote.taxRate);
  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `${number} ($${total.toFixed(2)}) made automatically from ${quote.number}: quote accepted and proof approved. Pay now is on their quote and proof pages.`,
      projectId: quote.projectId,
      clientId: quote.clientId,
    },
  });
  return number;
}
