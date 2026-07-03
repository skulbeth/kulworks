import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { fmtMoney, fmtDate } from "@/lib/format";
import { computeTotals, lineAmount, docLabel } from "@/lib/invoice";
import { site, paymentConfig, paypalLink, venmoLink } from "@/data/site";

export const dynamic = "force-dynamic";
// Private document — never index it.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { token },
    include: { client: true, project: true, items: { orderBy: { position: "asc" } } },
  });
  if (!inv || inv.deletedAt) notFound();

  const { subtotal, tax, total } = computeTotals(inv.items, inv.taxRate);
  const isInvoice = inv.type === "INVOICE";
  const label = docLabel(inv.type);
  const pay = paymentConfig();
  const showPay = isInvoice && inv.status !== "PAID" && inv.status !== "VOID";
  const anyPay = pay.paypalMe || pay.venmoUser || pay.zelle;
  const note = `${site.name} ${inv.number}`;
  const issued = inv.issuedAt ?? inv.createdAt;

  const badge =
    inv.status === "PAID"
      ? { text: "Paid", cls: "bg-green-500/15 text-green-600" }
      : inv.status === "VOID"
      ? { text: "Void", cls: "bg-red-500/15 text-red-600" }
      : null;

  const payBtn =
    "block w-full rounded-full px-6 py-3 text-center font-bold transition-all";

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-black tracking-tight">{site.name}</p>
            <p className="text-sm text-muted">{site.email}</p>
            <p className="text-sm text-muted">{site.telephoneDisplay}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide text-muted">{label}</p>
            <p className="font-semibold">{inv.number}</p>
            {badge && (
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>
                {badge.text}
              </span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="mt-6 flex flex-wrap justify-between gap-4 border-t border-border pt-4 text-sm">
          <div>
            <p className="text-muted">Billed to</p>
            <p className="font-semibold">{inv.client.name}</p>
            <p className="text-muted">{inv.client.email}</p>
          </div>
          <div className="text-right">
            <p><span className="text-muted">Date: </span>{fmtDate(issued)}</p>
            {inv.dueDate && <p><span className="text-muted">Due: </span>{fmtDate(inv.dueDate)}</p>}
            <p className="text-muted">Re: {inv.project.title}</p>
          </div>
        </div>

        {/* Line items */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Unit</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it) => (
                <tr key={it.id} className="border-b border-border/60">
                  <td className="py-2 pr-2">{it.description}</td>
                  <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(it.unitPrice)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(lineAmount(it))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums">{fmtMoney(subtotal)}</span></div>
          {inv.taxRate > 0 && (
            <div className="flex justify-between"><span className="text-muted">Tax ({inv.taxRate}%)</span><span className="tabular-nums">{fmtMoney(tax)}</span></div>
          )}
          <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
            <span>Total</span><span className="tabular-nums">{fmtMoney(total)}</span>
          </div>
        </div>

        {inv.notes && (
          <p className="mt-6 whitespace-pre-wrap border-t border-border pt-4 text-sm text-muted">{inv.notes}</p>
        )}

        {/* Pay options (invoices only, when unpaid) */}
        {showPay && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 font-bold">Pay this invoice</p>
            {anyPay ? (
              <div className="space-y-2.5">
                {pay.paypalMe && (
                  <a href={paypalLink(pay.paypalMe, total)} target="_blank" rel="noopener noreferrer"
                    className={`${payBtn} bg-[#0070ba] text-white hover:opacity-90`}>
                    Pay {fmtMoney(total)} with PayPal
                  </a>
                )}
                {pay.venmoUser && (
                  <a href={venmoLink(pay.venmoUser, total, note)} target="_blank" rel="noopener noreferrer"
                    className={`${payBtn} bg-[#008cff] text-white hover:opacity-90`}>
                    Pay with Venmo (@{pay.venmoUser})
                  </a>
                )}
                {pay.zelle && (
                  <div className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm">
                    <span className="font-semibold">Zelle (no fee):</span> send {fmtMoney(total)} to{" "}
                    <span className="font-semibold">{pay.zelle}</span>
                  </div>
                )}
                <p className="pt-1 text-xs text-muted">
                  After paying, we&apos;ll mark this invoice paid. Questions? Reply to {site.email}.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">
                To arrange payment, contact us at <span className="font-semibold">{site.email}</span>.
              </p>
            )}
          </div>
        )}

        {inv.status === "PAID" && (
          <p className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-center text-sm font-semibold text-green-600">
            Paid in full — thank you!
          </p>
        )}
        {!isInvoice && (
          <p className="mt-6 text-xs text-muted">This is an estimate, not a bill. Reply to {site.email} to proceed.</p>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-muted">{site.name} · {site.url.replace("https://", "")}</p>
    </main>
  );
}
