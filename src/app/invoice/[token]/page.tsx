import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { fmtMoney, fmtDate, fmtDay } from "@/lib/format";
import {
  computeTotals,
  lineAmount,
  docLabel,
  splitDeposit,
  fmtUnitPrice,
  quoteExpired,
  fmtValidDate,
  isBalanceDoc,
} from "@/lib/invoice";
import { loadJob, jobPath, type PayRow } from "@/lib/job";
import { site } from "@/data/site";
import { saveClientAddress, acceptQuote, requestQuoteExtension } from "./actions";
import PrintButton from "./PrintButton";
import MessageSam from "@/components/MessageSam";
import PayOptions from "@/components/PayOptions";
import SendFiles from "@/components/SendFiles";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";
// Private document — never index it.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// THE JOB PAGE. The quote link is the client's one page for the whole job: the quote,
// "Looks good", their upload folder, their proof, the invoice with Venmo/Zelle, and
// where it ships. An invoice link opens this same page (?only=1 shows the invoice on
// its own, e.g. to save it as a PDF). What's owed comes from lib/job.ts, the same
// rules the proof page and the admin use.
export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ msg?: string; only?: string }>;
}) {
  const { token } = await params;
  const { msg, only } = await searchParams;
  const inv = await prisma.invoice.findUnique({
    where: { token },
    include: { client: true, project: true, items: { orderBy: { position: "asc" } } },
  });
  if (!inv || inv.deletedAt) notFound();
  const job = await loadJob(inv.projectId);
  if (!job) notFound();

  // Every link for the job opens the job page; a sent invoice lands on its payment section.
  const isInvoice = inv.type === "INVOICE";
  if (isInvoice && only !== "1" && (inv.status === "SENT" || inv.status === "PAID") && job.hub && job.hub.id !== inv.id) {
    redirect(`${jobPath(job.hub.token)}#pay`);
  }

  const isQuote = !isInvoice;
  const preview = inv.status === "DRAFT"; // Sam looking at a draft from the admin
  const voided = inv.status === "VOID";
  const showJob = !preview && !voided && only !== "1"; // the job sections (files, proof, payment)
  const { subtotal, serviceCharge, total } = computeTotals(inv.items, inv.taxRate);
  const { dueNow, balance, hasSplit } = splitDeposit(total, inv.depositPct);
  const label = docLabel(inv.type);

  // Once a quote has its invoice (sent or being drafted), it's past accepting.
  const quoteInvoiced =
    isQuote && job.project.invoices.some((d) => d.sourceQuoteId === inv.id && d.type === "INVOICE" && d.status !== "VOID" && !isBalanceDoc(d));
  const quoteOpen = isQuote && inv.status === "SENT" && !inv.acceptedAt && !quoteInvoiced;
  const expired = quoteOpen && quoteExpired(inv.validUntil);
  const canAccept = quoteOpen && !expired;
  const accepted = isQuote && !!inv.acceptedAt;
  const isHubQuote = job.hubQuote?.id === inv.id;

  const rows = job.rows;
  const unpaidInvoice = rows.find((r) => !r.paid && !r.isQuote);
  const paidUp = rows.length > 0 && rows.every((r) => r.paid) && !job.awaitingBalance;
  const proofOpen = job.proofs.find((p) => !p.approvedAt);
  const shipped = ["DELIVERED", "CLOSED"].includes(job.project.stage);

  const addr = [inv.client.street, inv.client.city, inv.client.state, inv.client.postalCode, inv.client.country]
    .filter(Boolean)
    .join(", ");
  const fieldCls =
    "w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";
  const issued = inv.issuedAt ?? inv.createdAt;
  const banner = "mb-4 rounded-2xl border px-5 py-4 text-sm print:hidden";
  const section = "mt-6 border-t border-border pt-5";
  const pill = "rounded-full px-2.5 py-0.5 text-xs font-bold";
  const cta = "min-h-11 mt-3 inline-flex items-center rounded-full bg-primary px-5 py-2 font-bold text-black hover:bg-primary-hover";

  const badge =
    inv.status === "PAID"
      ? { text: hasSplit ? "Deposit paid" : "Paid", cls: "bg-green-500/15 text-green-600" }
      : voided
      ? { text: "Void", cls: "bg-red-500/15 text-red-600" }
      : preview
      ? { text: "Draft", cls: "bg-gold/15 text-gold" }
      : null;

  // Where the job stands, as a row of steps.
  const steps: { label: string; done: boolean }[] = showJob
    ? [
        ...(job.hubQuote ? [{ label: "Accepted", done: !!job.hubQuote.acceptedAt }] : []),
        ...(job.needsProof ? [{ label: "Proof approved", done: job.proofsApproved }] : []),
        { label: "Paid", done: paidUp },
        { label: "Shipped", done: shipped },
      ]
    : [];
  const current = steps.findIndex((s) => !s.done);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 print:max-w-none print:p-0">
      {steps.length > 0 && (
        <ol className="mb-4 flex flex-wrap gap-2 text-xs print:hidden" aria-label="Where your job stands">
          {steps.map((s, i) => (
            <li
              key={s.label}
              aria-current={i === current ? "step" : undefined}
              className={`rounded-full border px-3 py-1 font-semibold ${
                s.done
                  ? "border-green-500/40 bg-green-500/10 text-green-600"
                  : i === current
                  ? "border-blue/50 bg-blue/10 text-blue"
                  : "border-border text-muted"
              }`}
            >
              {s.done ? "✓ " : ""}
              {s.label}
            </li>
          ))}
        </ol>
      )}

      {/* The one thing to do next. */}
      {showJob &&
        (unpaidInvoice ? (
          <div className={`${banner} border-blue/40 bg-blue/10`}>
            <p className="font-bold">
              {unpaidInvoice.kind === "Deposit"
                ? "Your deposit invoice is ready"
                : unpaidInvoice.kind === "Balance"
                ? "Your balance invoice is ready"
                : "Your invoice is ready"}
              {`: ${fmtMoney(unpaidInvoice.amount)}`}
            </p>
            <p className="mt-0.5 text-muted">Pay it below with Venmo or Zelle.</p>
            <a href="#pay" className={cta}>Pay now</a>
          </div>
        ) : proofOpen ? (
          <div className={`${banner} border-blue/40 bg-blue/10`}>
            <p className="font-bold">Your proof is ready to review</p>
            <p className="mt-0.5 text-muted">Look over your cards at real size, leave notes, and approve when it looks right.</p>
            <a href={`/proof/${proofOpen.token}/`} className={cta}>Review my proof</a>
          </div>
        ) : paidUp ? (
          <div className={`${banner} border-green-500/40 bg-green-500/10`}>
            <p className="font-bold text-green-600">{shipped ? "All done. Thank you!" : "Paid in full. Thank you!"}</p>
          </div>
        ) : job.awaitingBalance ? (
          <div className={`${banner} border-green-500/40 bg-green-500/10`}>
            <p className="font-bold text-green-600">Deposit received. Thank you!</p>
            <p className="mt-0.5 text-muted">The balance invoice will show up right here when your order is ready.</p>
          </div>
        ) : accepted ? (
          <div className={`${banner} border-green-500/40 bg-green-500/10`}>
            <p className="font-bold text-green-600">You accepted this quote on {fmtDay(inv.acceptedAt!)}.</p>
            <p className="mt-0.5 text-muted">
              Thank you! {job.folderUrl ? "Send your files below whenever they're ready. " : ""}
              {inv.proofFirst ? "Your proof and invoice will show up right here." : "Your invoice will show up right here."}
            </p>
          </div>
        ) : expired ? (
          <div className={`${banner} border-gold/40 bg-gold/10`}>
            <p className="font-bold">This quote expired {fmtValidDate(inv.validUntil!)}.</p>
            {inv.extendRequestedAt ? (
              <p className="mt-0.5 text-muted">Got it, you asked on {fmtDay(inv.extendRequestedAt)}. I&apos;ll take another look and get back to you.</p>
            ) : (
              <form action={requestQuoteExtension} className="mt-2">
                <input type="hidden" name="token" value={inv.token} />
                <p className="text-muted">Still interested? Ask and I&apos;ll see if this quote can be extended.</p>
                <textarea name="note" rows={2} maxLength={2000} placeholder="Anything changed? (optional)" className={`${fieldCls} mt-2`} />
                <SubmitButton pendingText="Sending..." className="min-h-11 mt-2 rounded-full bg-primary px-5 py-2 font-bold text-black hover:bg-primary-hover">
                  Ask about extending this quote
                </SubmitButton>
              </form>
            )}
          </div>
        ) : null)}

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
            {badge && <span className={`mt-1 inline-block ${pill} ${badge.cls}`}>{badge.text}</span>}
          </div>
        </div>

        {/* Meta */}
        <div className="mt-6 flex flex-wrap justify-between gap-4 border-t border-border pt-4 text-sm">
          <div>
            <p className="text-muted">{isQuote ? "Prepared for" : "Billed to"}</p>
            <p className="font-semibold">{inv.client.name}</p>
            <p className="text-muted">{inv.client.email}</p>
          </div>
          <div className="text-right">
            <p><span className="text-muted">Date: </span>{fmtDay(issued)}</p>
            {inv.dueDate && <p><span className="text-muted">Due: </span>{fmtDate(inv.dueDate)}</p>}
            {isQuote && inv.validUntil && !accepted && !quoteInvoiced && (
              <p><span className="text-muted">Good through: </span>{fmtValidDate(inv.validUntil)}</p>
            )}
            <p className="text-muted">Re: {inv.project.title}</p>
          </div>
        </div>

        <ItemsTable items={inv.items} />

        {/* Totals */}
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums">{fmtMoney(subtotal)}</span></div>
          {inv.taxRate > 0 && (
            <div className="flex justify-between"><span className="text-muted">Service charge ({inv.taxRate}%)</span><span className="tabular-nums">{fmtMoney(serviceCharge)}</span></div>
          )}
          <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
            <span>Total</span><span className="tabular-nums">{fmtMoney(total)}</span>
          </div>
          {hasSplit && (
            <>
              <div className="flex justify-between">
                <span className="text-muted">{inv.status === "PAID" ? "Deposit paid" : `Deposit to book it (${inv.depositPct}%)`}</span>
                <span className="tabular-nums">{fmtMoney(dueNow)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Balance on completion</span>
                <span className="tabular-nums">{fmtMoney(balance)}</span>
              </div>
            </>
          )}
        </div>

        {inv.notes && <p className={`${section} whitespace-pre-wrap text-sm text-muted`}>{inv.notes}</p>}

        {canAccept && (
          <form action={acceptQuote} className={`${section} print:hidden`}>
            <input type="hidden" name="token" value={inv.token} />
            <SubmitButton pendingText="Setting up your upload folder..." className="min-h-11 block w-full rounded-full bg-primary px-6 py-3 text-center font-bold text-black hover:bg-primary-hover">
              Looks good, let&apos;s do it
            </SubmitButton>
            <p className="mt-2 text-center text-xs text-muted">
              This lets me know you&apos;re ready and opens a spot right here to send your files.{" "}
              {hasSplit
                ? "The deposit below books your spot; the rest is due on completion."
                : inv.proofFirst
                ? "Nothing is charged, and payment only comes after you approve your sample."
                : "Your invoice shows up right here once you say go."}
            </p>
          </form>
        )}

        {/* 1. Their files, straight into the job's Drive folder, once they've said yes. */}
        {showJob && isHubQuote && accepted && job.folderUrl && (
          <div className="print:hidden">
            <SendFiles token={inv.token} folderUrl={job.folderUrl} />
          </div>
        )}

        {/* 2. Their proof: a placeholder until Sam uploads it. */}
        {showJob && (job.needsProof || job.proofs.length > 0) && (
          <div className={`${section} print:hidden`}>
            <p className="mb-2 font-bold">Your proof</p>
            {job.proofs.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {job.proofs.map((pf) => (
                  <li key={pf.token} className="flex flex-wrap items-center gap-2">
                    <a href={`/proof/${pf.token}/`} className="inline-block py-2 font-semibold text-blue hover:underline">{pf.title}</a>
                    {pf.approvedAt ? (
                      <span className={`${pill} bg-green-500/15 text-green-600`}>Approved</span>
                    ) : (
                      <span className="text-xs text-muted">Review and approve</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Once your sample is printed, I upload photos to a private approval page just for you. The link shows up right here.
              </p>
            )}
          </div>
        )}

        {/* 3. Invoice and payment: every bill on the job, paid or not. */}
        {showJob && (
          <div id="pay" className={`${section} scroll-mt-6`}>
            <p className="mb-2 font-bold">Invoice and payment</p>
            {rows.length > 0 ? (
              <ul className="space-y-5">
                {rows.map((r) => (
                  <PayRowView key={r.id} r={r} self={r.id === inv.id} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                {job.drafting
                  ? "Your invoice is being prepared. It will show up right here to pay."
                  : isQuote && !inv.proofFirst
                  ? "Your invoice shows up right here once you accept. You can pay it with Venmo or Zelle."
                  : "Your invoice shows up right here once you approve your proof. You can pay it with Venmo or Zelle."}
              </p>
            )}
            {job.awaitingBalance && (
              <p className="mt-3 text-xs text-muted">The balance is billed when your order is ready, and shows up right here.</p>
            )}
          </div>
        )}

        {/* 4. Where it ships. Saves straight onto the client record. */}
        {showJob && !shipped && (
          <form action={saveClientAddress} className={`${section} print:hidden`}>
            <input type="hidden" name="token" value={inv.token} />
            <p className="font-bold">Where should this ship?</p>
            <p className="mb-3 text-sm text-muted">
              {addr ? "We have this on file. Update it here if anything has changed." : "Fill this in and we'll have everything we need to get started."}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input name="street" defaultValue={inv.client.street ?? ""} placeholder="Street address" className={`${fieldCls} sm:col-span-2`} autoComplete="street-address" />
              <input name="city" defaultValue={inv.client.city ?? ""} placeholder="City" className={fieldCls} autoComplete="address-level2" />
              <input name="state" defaultValue={inv.client.state ?? ""} placeholder="State" className={fieldCls} autoComplete="address-level1" />
              <input name="postalCode" defaultValue={inv.client.postalCode ?? ""} placeholder="ZIP" className={fieldCls} autoComplete="postal-code" />
              <input name="country" defaultValue={inv.client.country ?? ""} placeholder="Country" className={fieldCls} autoComplete="country-name" />
              <input name="phone" defaultValue={inv.client.phone ?? ""} placeholder="Phone (for delivery)" className={`${fieldCls} sm:col-span-2`} autoComplete="tel" />
            </div>
            <SubmitButton pendingText="Saving..." className="min-h-11 mt-3 rounded-full bg-primary px-6 py-2.5 font-bold text-black hover:bg-primary-hover">
              Save my details
            </SubmitButton>
          </form>
        )}

        {!preview && !voided && <MessageSam kind="invoice" token={inv.token} status={msg} />}

        {isQuote && !hasSplit && !quoteInvoiced && (
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

function ItemsTable({ items }: { items: { id: string; description: string; quantity: number; unitPrice: number }[] }) {
  return (
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
          {items.map((it) => (
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
  );
}

// One bill on the job: what it is, paid or the pay buttons, and its lines when they
// aren't the document already shown above.
function PayRowView({ r, self }: { r: PayRow; self: boolean }) {
  const name = r.kind === "Invoice" ? `Invoice ${r.number}` : `${r.kind} (${r.number})`;
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{name}</span>
        <span className="tabular-nums">{fmtMoney(r.amount)}</span>
        {r.paid ? (
          <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-600">
            Paid{r.paidAt ? ` ${fmtDay(r.paidAt)}` : ""}
          </span>
        ) : (
          <span className="rounded-full bg-blue/10 px-2.5 py-0.5 text-xs font-bold text-blue">Due</span>
        )}
        {!r.isQuote && !self && (
          <a href={`${jobPath(r.token)}?only=1`} className="ml-auto inline-block py-2 text-xs text-muted hover:text-blue hover:underline print:hidden">
            Printable copy
          </a>
        )}
      </div>
      {!self && !r.isQuote && (
        <details className="mt-1 text-sm print:hidden">
          <summary className="cursor-pointer select-none py-1 text-xs font-semibold text-blue">What this covers</summary>
          <ul className="mt-1 space-y-0.5 text-xs text-muted">
            {r.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3">
                <span>{it.description}{it.quantity !== 1 ? ` (x${it.quantity})` : ""}</span>
                <span className="tabular-nums">{fmtMoney(lineAmount(it))}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!r.paid && (
        <div className="mt-3 print:hidden">
          <PayOptions amount={r.amount} note={`${site.name} ${r.number}`} />
        </div>
      )}
    </li>
  );
}
