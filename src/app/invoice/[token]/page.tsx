import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { fmtMoney, fmtDate } from "@/lib/format";
import {
  computeTotals,
  lineAmount,
  docLabel,
  splitDeposit,
  fmtUnitPrice,
  quoteExpired,
  fmtValidDate,
} from "@/lib/invoice";
import { site, paymentConfig, paypalLink, venmoLink } from "@/data/site";
import { saveClientAddress, acceptQuote, requestQuoteExtension } from "./actions";
import PrintButton from "./PrintButton";
import MessageSam from "@/components/MessageSam";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";
// Private document — never index it.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function InvoiceViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { token } = await params;
  const { msg } = await searchParams;
  const inv = await prisma.invoice.findUnique({
    where: { token },
    include: { client: true, project: true, items: { orderBy: { position: "asc" } } },
  });
  if (!inv || inv.deletedAt) notFound();

  // The quote link is the client's one page for the job: once an invoice made from
  // it goes out (convert, or each half of a split), it shows up here to pay, and
  // the project's proofs are linked too. Drafts stay hidden until Sam sends them.
  const linked =
    inv.type === "QUOTE"
      ? await prisma.invoice.findMany({
          where: { sourceQuoteId: inv.id, deletedAt: null, status: { in: ["SENT", "PAID"] } },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        })
      : [];
  const proofs = await prisma.proof.findMany({
    where: { projectId: inv.projectId, active: true },
    orderBy: { createdAt: "asc" },
    select: { token: true, title: true, approvedAt: true },
  });

  const { subtotal, serviceCharge, total } = computeTotals(inv.items, inv.taxRate);
  const isInvoice = inv.type === "INVOICE";
  const label = docLabel(inv.type);
  const pay = paymentConfig();
  // A quote with a deposit on it is payable now: that deposit is what books the job.
  // Without one, a quote stays an estimate and only invoices can be paid.
  const { dueNow, balance, hasSplit } = splitDeposit(total, inv.depositPct);
  const live = inv.status !== "PAID" && inv.status !== "VOID";
  // What each linked invoice actually collects: a split invoice is only its deposit
  // (the balance goes out as its own invoice later).
  const linkedDocs = linked.map((d) => {
    const sp = splitDeposit(computeTotals(d.items, d.taxRate).total, d.depositPct);
    const kind = sp.hasSplit ? "Deposit" : d.notes?.startsWith("Balance for ") ? "Balance" : "Invoice";
    return { ...d, total: sp.dueNow, kind };
  });
  const unpaid = linkedDocs.find((d) => d.status !== "PAID");
  // Deposit in, balance not billed yet: not "paid in full".
  const awaitingBalance =
    linkedDocs.some((d) => d.kind === "Deposit") && !linkedDocs.some((d) => d.kind === "Balance");
  // Once an invoice exists for this quote, paying happens there, not off the quote.
  const showPay = live && (isInvoice || hasSplit) && linkedDocs.length === 0;
  const isQuoteLive = !isInvoice && live && inv.status !== "DRAFT";
  const expired = isQuoteLive && linkedDocs.length === 0 && !inv.acceptedAt && quoteExpired(inv.validUntil);
  const canAccept = isQuoteLive && linkedDocs.length === 0 && !inv.acceptedAt && !expired;
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

  const banner = "mb-4 rounded-2xl border px-5 py-4 text-sm print:hidden";

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 print:max-w-none print:p-0">
      {/* Where things stand, newest first: an invoice to pay beats "you accepted". */}
      {unpaid ? (
        <div className={`${banner} border-blue/40 bg-blue/10`}>
          <p className="font-bold">{unpaid.kind === "Deposit" ? "Your deposit invoice is ready" : "Your invoice is ready"}: {fmtMoney(unpaid.total)}</p>
          <p className="mt-0.5 text-muted">{unpaid.kind} {unpaid.number}. Pay it online in a minute.</p>
          <a href={`/invoice/${unpaid.token}/`}
            className="mt-3 inline-block rounded-full bg-primary px-5 py-2 font-bold text-black hover:bg-primary-hover">
            View and pay
          </a>
        </div>
      ) : linkedDocs.length > 0 ? (
        <div className={`${banner} border-green-500/40 bg-green-500/10`}>
          <p className="font-bold text-green-600">
            {awaitingBalance ? "Deposit received. Thank you!" : "Paid in full. Thank you!"}
          </p>
          {awaitingBalance && (
            <p className="mt-0.5 text-muted">The balance invoice will show up right here when your order is ready.</p>
          )}
        </div>
      ) : inv.acceptedAt && isQuoteLive ? (
        <div className={`${banner} border-green-500/40 bg-green-500/10`}>
          <p className="font-bold text-green-600">You accepted this quote on {fmtDate(inv.acceptedAt)}.</p>
          <p className="mt-0.5 text-muted">Thank you! I&apos;ll be in touch about next steps. Your invoice will show up right here.</p>
        </div>
      ) : expired ? (
        <div className={`${banner} border-gold/40 bg-gold/10`}>
          <p className="font-bold">This quote expired {fmtValidDate(inv.validUntil!)}.</p>
          {inv.extendRequestedAt ? (
            <p className="mt-0.5 text-muted">Got it, you asked on {fmtDate(inv.extendRequestedAt)}. I&apos;ll take another look and get back to you.</p>
          ) : (
            <form action={requestQuoteExtension} className="mt-2">
              <input type="hidden" name="token" value={inv.token} />
              <p className="text-muted">Still interested? Ask and I&apos;ll see if this quote can be extended.</p>
              <textarea name="note" rows={2} maxLength={2000} placeholder="Anything changed? (optional)"
                className={`${fieldCls} mt-2`} />
              <SubmitButton pendingText="Sending..." className="mt-2 rounded-full bg-primary px-5 py-2 font-bold text-black hover:bg-primary-hover">
                Ask about extending this quote
              </SubmitButton>
            </form>
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 print:rounded-none print:border-0 print:p-0">
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
            {!isInvoice && inv.validUntil && (
              <p><span className="text-muted">Valid until: </span>{fmtValidDate(inv.validUntil)}</p>
            )}
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

        {canAccept && (
          <form action={acceptQuote} className="mt-6 border-t border-border pt-5 print:hidden">
            <input type="hidden" name="token" value={inv.token} />
            <SubmitButton pendingText="Sending..." className="block w-full rounded-full bg-primary px-6 py-3 text-center font-bold text-black hover:bg-primary-hover">
              Looks good, let&apos;s do it
            </SubmitButton>
            <p className="mt-2 text-center text-xs text-muted">
              This just lets me know you&apos;re ready. Nothing is charged, and payment only comes after you approve your sample.
            </p>
          </form>
        )}

        {/* Invoices raised from this quote (one, or deposit + balance on a split). */}
        {linkedDocs.length > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 font-bold">Payments</p>
            <ul className="space-y-2 text-sm">
              {linkedDocs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-muted">{d.kind}</span>
                  <span className="font-semibold">{d.number}</span>
                  <span className="tabular-nums">{fmtMoney(d.total)}</span>
                  {d.status === "PAID" ? (
                    <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-600">Paid</span>
                  ) : (
                    <a href={`/invoice/${d.token}/`} className="ml-auto rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-black hover:bg-primary-hover print:hidden">
                      Pay now
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {proofs.length > 0 && (
          <div className="mt-6 border-t border-border pt-5 print:hidden">
            <p className="mb-2 font-bold">Your proofs</p>
            <ul className="space-y-2 text-sm">
              {proofs.map((pf) => (
                <li key={pf.token} className="flex flex-wrap items-center gap-2">
                  <a href={`/proof/${pf.token}/`} className="font-semibold text-blue hover:underline">{pf.title}</a>
                  {pf.approvedAt ? (
                    <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-600">Approved</span>
                  ) : (
                    <span className="text-xs text-muted">Review and approve</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pay options (invoices only, when unpaid) */}
        {showPay && (
          <div className="mt-6 border-t border-border pt-5 print:hidden">
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
          <form action={saveClientAddress} className="mt-6 border-t border-border pt-5 print:hidden">
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
            <SubmitButton pendingText="Saving..." className="mt-3 rounded-full bg-primary px-6 py-2.5 font-bold text-black hover:bg-primary-hover">
              Save my details
            </SubmitButton>
          </form>
        )}

        {inv.status !== "DRAFT" && inv.status !== "VOID" && <MessageSam kind="invoice" token={inv.token} status={msg} />}

        {!isInvoice && !hasSplit && (
          <p className="mt-6 text-xs text-muted">This is an estimate, not a bill. Questions? Reply to {site.email}.</p>
        )}
      </div>
      <div className="mt-4 flex justify-center">
        <PrintButton />
      </div>
      <p className="mt-4 text-center text-xs text-muted">{site.name} · {site.url.replace("https://", "")}</p>
    </main>
  );
}
