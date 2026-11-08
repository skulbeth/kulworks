// THE job model: one client job = one project = one page (the quote link).
//
// Everything a client sees about a job (the quote, their upload folder, their proofs,
// what they owe and what's paid) is worked out HERE and nowhere else, so the job page,
// the proof page, the admin and the emails can never disagree. Before 11-08 the quote
// page and the proof page each had their own "what's owed" rules and gave different
// answers (Aaron's quote kept offering a deposit he had already paid).
//
// Rules:
// - Hub = the page every link for the job resolves to: the live quote (accepted first,
//   else newest). Jobs billed without a quote use their first sent invoice.
// - Payment rows = every SENT/PAID invoice on the project, plus a quote's own deposit
//   while that quote has no invoice of its own yet. Drafts never show.
// - A quote's "main invoice" = an invoice made from it that is not a balance invoice.
//   mainInvoiceWhere() is the only definition of it.
import type { Invoice, InvoiceItem, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BALANCE_PREFIX, computeTotals, splitDeposit, isBalanceDoc } from "@/lib/invoice";

export type DocWithItems = Invoice & { items: InvoiceItem[] };

/** Invoices made from this quote that bill the job (not its balance), void ones excluded. */
export function mainInvoiceWhere(quoteId: string): Prisma.InvoiceWhereInput {
  return {
    sourceQuoteId: quoteId,
    deletedAt: null,
    status: { not: "VOID" },
    // A null note is "not a balance" too; NOT on its own would skip those rows.
    OR: [{ notes: null }, { NOT: { notes: { startsWith: BALANCE_PREFIX } } }],
  };
}

/** The one way a quote becomes an invoice (auto on accept/approve, or Convert in the admin). */
export function copyQuoteToInvoice(
  tx: Prisma.TransactionClient,
  quote: DocWithItems,
  number: string,
  status: "DRAFT" | "SENT"
) {
  return tx.invoice.create({
    data: {
      number,
      type: "INVOICE",
      status,
      ...(status === "SENT" ? { issuedAt: new Date() } : {}),
      projectId: quote.projectId,
      clientId: quote.clientId,
      taxRate: quote.taxRate,
      depositPct: quote.depositPct, // keep the split; converting shouldn't quietly bill in full
      sourceQuoteId: quote.id, // lists it under the job's payments
      dueDate: quote.dueDate ?? undefined,
      notes: quote.notes,
      items: {
        create: [...quote.items]
          .sort((a, b) => a.position - b.position)
          .map((it, i) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, position: i })),
      },
    },
  });
}

const liveQuote = (d: Invoice) => d.type === "QUOTE" && !d.deletedAt && (d.status === "SENT" || d.status === "PAID");

/** The job's hub doc among a project's docs (see the rules at the top). */
export function pickHub<T extends Invoice>(docs: T[]): T | null {
  const quotes = docs.filter(liveQuote).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const hub = quotes.find((q) => q.acceptedAt) ?? quotes[0];
  if (hub) return hub;
  return (
    docs
      .filter((d) => d.type === "INVOICE" && !d.deletedAt && (d.status === "SENT" || d.status === "PAID"))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
  );
}

export type PayRow = {
  id: string;
  number: string;
  token: string;
  kind: "Deposit" | "Balance" | "Invoice";
  isQuote: boolean;
  amount: number; // what this doc collects (a split doc only collects its deposit)
  paid: boolean;
  paidAt: Date | null;
  issuedAt: Date | null;
  items: InvoiceItem[];
  taxRate: number;
  notes: string | null;
};

/** What the client is billed on the job, oldest first. */
export function payRows(docs: DocWithItems[]): PayRow[] {
  const live = docs.filter((d) => !d.deletedAt && d.status !== "VOID");
  // Quotes with an invoice of their own (sent OR drafted): paid through that invoice.
  const invoiced = new Set(
    live.filter((d) => d.type === "INVOICE" && d.sourceQuoteId && !isBalanceDoc(d)).map((d) => d.sourceQuoteId!)
  );
  const rows: PayRow[] = [];
  for (const d of [...live].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (d.status === "DRAFT") continue;
    const split = splitDeposit(computeTotals(d.items, d.taxRate).total, d.depositPct);
    let kind: PayRow["kind"];
    if (d.type === "QUOTE") {
      // A plain quote is an estimate; only a deposit on it is payable.
      if (!split.hasSplit || invoiced.has(d.id)) continue;
      kind = "Deposit";
    } else {
      kind = isBalanceDoc(d) ? "Balance" : split.hasSplit ? "Deposit" : "Invoice";
    }
    rows.push({
      id: d.id,
      number: d.number,
      token: d.token,
      kind,
      isQuote: d.type === "QUOTE",
      amount: split.dueNow,
      paid: d.status === "PAID",
      paidAt: d.paidAt,
      issuedAt: d.issuedAt,
      items: [...d.items].sort((a, b) => a.position - b.position),
      taxRate: d.taxRate,
      notes: d.notes,
    });
  }
  return rows;
}

/** The job's Drive folder: the project's own, else the one their request made. */
export function jobFolderUrl(project: { driveFolderUrl: string | null; submissions?: { driveFolderUrl: string | null }[] }) {
  return project.driveFolderUrl ?? project.submissions?.find((s) => s.driveFolderUrl)?.driveFolderUrl ?? null;
}

export function jobPath(token: string) {
  return `/invoice/${token}/`;
}

/** Everything the job page / proof page / emails need, in one read. */
export async function loadJob(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      submissions: { where: { driveFolderUrl: { not: null } }, orderBy: { createdAt: "desc" }, select: { driveFolderUrl: true } },
      invoices: { where: { deletedAt: null }, include: { items: { orderBy: { position: "asc" } } } },
      proofs: { where: { active: true }, orderBy: { createdAt: "asc" }, select: { id: true, token: true, title: true, approvedAt: true } },
    },
  });
  if (!project) return null;
  const hub = pickHub(project.invoices);
  const rows = payRows(project.invoices);
  const hubQuote = hub?.type === "QUOTE" ? hub : null;
  // The hub quote's invoice is being drafted by Sam: numbers may change, nothing payable yet.
  const drafting =
    !!hubQuote &&
    project.invoices.some((d) => d.sourceQuoteId === hubQuote.id && d.status === "DRAFT" && !isBalanceDoc(d));
  const hubInvoiced = !!hubQuote && project.invoices.some((d) => d.sourceQuoteId === hubQuote.id && d.type === "INVOICE" && d.status !== "VOID" && !isBalanceDoc(d));
  const needsProof = hubQuote ? hubQuote.proofFirst : project.proofs.length > 0;
  const proofsApproved = project.proofs.length > 0 && project.proofs.every((p) => p.approvedAt);
  const unpaid = rows.filter((r) => !r.paid);
  // A deposit is in but the balance hasn't been billed yet.
  const awaitingBalance = rows.some((r) => r.kind === "Deposit" && r.paid) && !rows.some((r) => r.kind === "Balance");
  return {
    project,
    client: project.client,
    hub,
    hubQuote,
    rows,
    unpaid,
    drafting,
    hubInvoiced,
    awaitingBalance,
    proofs: project.proofs,
    needsProof,
    proofsApproved,
    folderUrl: jobFolderUrl(project),
  };
}

export type Job = NonNullable<Awaited<ReturnType<typeof loadJob>>>;

/** The token of the job's one page, for links in emails and on the proof page. */
export async function jobHubToken(projectId: string): Promise<string | null> {
  const docs = await prisma.invoice.findMany({ where: { projectId, deletedAt: null, status: { in: ["SENT", "PAID"] } } });
  return pickHub(docs)?.token ?? null;
}
