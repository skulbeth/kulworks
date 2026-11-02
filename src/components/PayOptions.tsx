import { site, paymentConfig, paypalLink, venmoLink } from "@/data/site";
import { fmtMoney } from "@/lib/format";

// The pay buttons for one amount: PayPal / Venmo prefilled, Zelle details. Shared by the
// invoice page and the proof pages so they always offer the same ways to pay.
export default function PayOptions({ amount, note }: { amount: number; note: string }) {
  const pay = paymentConfig();
  const payBtn = "block w-full rounded-full px-6 py-3 text-center font-bold transition-all";
  if (!pay.paypalMe && !pay.venmoUser && !pay.zelle) {
    return (
      <p className="text-sm text-muted">
        To arrange payment, contact us at <span className="font-semibold">{site.email}</span>.
      </p>
    );
  }
  return (
    <div className="space-y-2.5">
      {pay.paypalMe && (
        <a href={paypalLink(pay.paypalMe, amount)} target="_blank" rel="noopener noreferrer"
          className={`${payBtn} bg-[#0070ba] text-white hover:opacity-90`}>
          Pay {fmtMoney(amount)} with PayPal
        </a>
      )}
      {pay.venmoUser && (
        <a href={venmoLink(pay.venmoUser, amount, note)} target="_blank" rel="noopener noreferrer"
          className={`${payBtn} bg-[#008cff] text-white hover:opacity-90`}>
          Pay {fmtMoney(amount)} with Venmo (@{pay.venmoUser})
        </a>
      )}
      {pay.zelle && (
        <div className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm">
          <span className="font-semibold">Zelle (no fee):</span> send {fmtMoney(amount)} to{" "}
          <span className="font-semibold">{pay.zelle}</span>
        </div>
      )}
      <p className="pt-1 text-xs text-muted">
        Once it lands we&apos;ll mark it received. Questions? Reply to {site.email}.
      </p>
    </div>
  );
}
