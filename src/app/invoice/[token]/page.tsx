import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { fmtMoney, fmtDate } from "@/lib/format";
import { computeTotals, lineAmount, docLabel, splitDeposit, fmtUnitPrice } from "@/lib/invoice";
import { site, paymentConfig, paypalLink, venmoLink } from "@/data/site";
import { saveClientAddress } from "./actions";

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

  const { subtotal, serviceCharge, total } = computeTotals(inv.items, inv.taxRate);
  const isInvoice = inv.type === "INVOICE";
  const label = docLabel(inv.type);
  const pay = paymentConfig();
  // A quote with a deposit on it is payable now: that deposit is what books the job.
  // Without one, a quote stays an estimate and only invoices can be paid.
  const { dueNow, balance, hasSplit } = splitDeposit(total, inv.depositPct);
  const live = inv.status !== "PAID" && inv.status !== "VOID";
  const showPay = live && (isInvoice || hasSplit);
  const payAmount = isInvoice ? total : dueNow;
  const anyPay = pay.paypalMe || pay.venmoUser || pay.zelle;
  const note = `${site.name} ${inv.number}`;
  const addr = [inv.client.street, inv.client.city, inv.client.state, inv.client.postalCode, inv.client.country]
    .filter(Boolean)
    .join(", ");
  const fieldCls =
    "w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";
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
                  <td className="py-2 text-right tabular-nums">{fmtUnitPrice(it.unitPrice)}</td>
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
            <div className="flex justify-between"><span className="text-muted">Service charge ({inv.taxRate}%)</span><span className="tabular-nums">{fmtMoney(serviceCharge)}</span></div>
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
            <p className="mb-1 font-bold">
              {hasSplit ? `Pay the ${inv.depositPct}% deposit to book this` : "Pay this invoice"}
            </p>
            {hasSplit && (
              <p className="mb-3 text-sm text-muted">
                {fmtMoney(dueNow)} now, {fmtMoney(balance)} on completion.
              </p>
            )}
            {anyPay ? (
              <div className="space-y-2.5">
                {pay.paypalMe && (
                  <a href={paypalLink(pay.paypalMe, payAmount)} target="_blank" rel="noopener noreferrer"
                    className={`${payBtn} bg-[#0070ba] text-white hover:opacity-90`}>
                    Pay {fmtMoney(payAmount)} with PayPal
                  </a>
                )}
                {pay.venmoUser && (
                  <a href={venmoLink(pay.venmoUser, payAmount, note)} target="_blank" rel="noopener noreferrer"
                    className={`${payBtn} bg-[#008cff] text-white hover:opacity-90`}>
                    Pay {fmtMoney(payAmount)} with Venmo (@{pay.venmoUser})
                  </a>
                )}
                {pay.zelle && (
                  <div className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm">
                    <span className="font-semibold">Zelle (no fee):</span> send {fmtMoney(payAmount)} to{" "}
                    <span className="font-semibold">{pay.zelle}</span>
                  </div>
                )}
                <p className="pt-1 text-xs text-muted">
                  Once it lands we&apos;ll mark it received. Questions? Reply to {site.email}.
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
            Paid in full. Thank you!
          </p>
        )}
        {/* Where it ships. Saves straight onto the client record, so the shop has
            the address without a round of emails asking for it. */}
        {live && (
          <form action={saveClientAddress} className="mt-6 border-t border-border pt-5">
            <input type="hidden" name="token" value={inv.token} />
            <p className="font-bold">Where should this ship?</p>
            <p className="mb-3 text-sm text-muted">
              {addr
                ? "We have this on file. Update it here if anything has changed."
                : "Fill this in and we'll have everything we need to get started."}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input name="street" defaultValue={inv.client.street ?? ""} placeholder="Street address"
                className={`${fieldCls} sm:col-span-2`} autoComplete="street-address" />
              <input name="city" defaultValue={inv.client.city ?? ""} placeholder="City"
                className={fieldCls} autoComplete="address-level2" />
              <input name="state" defaultValue={inv.client.state ?? ""} placeholder="State"
                className={fieldCls} autoComplete="address-level1" />
              <input name="postalCode" defaultValue={inv.client.postalCode ?? ""} placeholder="ZIP"
                className={fieldCls} autoComplete="postal-code" />
              <input name="country" defaultValue={inv.client.country ?? ""} placeholder="Country"
                className={fieldCls} autoComplete="country-name" />
              <input name="phone" defaultValue={inv.client.phone ?? ""} placeholder="Phone (for delivery)"
                className={`${fieldCls} sm:col-span-2`} autoComplete="tel" />
            </div>
            <button className="mt-3 rounded-full bg-primary px-6 py-2.5 font-bold text-black hover:bg-primary-hover">
              Save my details
            </button>
          </form>
        )}

        {!isInvoice && !hasSplit && (
          <p className="mt-6 text-xs text-muted">This is an estimate, not a bill. Reply to {site.email} to proceed.</p>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-muted">{site.name} · {site.url.replace("https://", "")}</p>
    </main>
  );
}
