// What a client owes on a job, as the client sees it: every quote deposit or invoice
// that has gone out, with what each one collects and whether it's paid. Proof pages
// use it so a client reviewing cards can pay right there, and see "paid" once Sam
// marks it, without hunting for the invoice link.
import { prisma } from "@/lib/prisma";
import { computeTotals, splitDeposit, isBalanceDoc, BALANCE_PREFIX } from "@/lib/invoice";

export type BillingDoc = {
  number: string;
  token: string;
  kind: "Deposit" | "Balance" | "Invoice";
  amount: number;
  paid: boolean;
};

export async function projectBilling(projectId: string): Promise<{ hub: { token: string; number: string } | null; docs: BillingDoc[] }> {
  const all = await prisma.invoice.findMany({
    where: { projectId, deletedAt: null, status: { in: ["DRAFT", "SENT", "PAID"] } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });
  const out = all.filter((d) => d.status !== "DRAFT");
  // A quote whose invoice exists (sent, or drafted and on its way) is paid through
  // that invoice, the same rule the quote page follows.
  const converted = new Set(
    all
      .filter((d) => d.type === "INVOICE" && d.sourceQuoteId && !d.notes?.startsWith(BALANCE_PREFIX))
      .map((d) => d.sourceQuoteId)
  );

  const docs: BillingDoc[] = [];
  for (const d of out) {
    const { total } = computeTotals(d.items, d.taxRate);
    const split = splitDeposit(total, d.depositPct);
    if (d.type === "QUOTE") {
      // A plain quote is an estimate; only a deposit on it is payable.
      if (!split.hasSplit || converted.has(d.id)) continue;
      docs.push({ number: d.number, token: d.token, kind: "Deposit", amount: split.dueNow, paid: d.status === "PAID" });
    } else {
      const kind = isBalanceDoc(d) ? "Balance" : split.hasSplit ? "Deposit" : "Invoice";
      docs.push({ number: d.number, token: d.token, kind, amount: split.dueNow, paid: d.status === "PAID" });
    }
  }

  // The client's main page for the job: their quote, or the first invoice if there's no quote.
  const hubDoc = out.find((d) => d.type === "QUOTE") ?? out.find((d) => d.type === "INVOICE");
  return { hub: hubDoc ? { token: hubDoc.token, number: hubDoc.number } : null, docs };
}
