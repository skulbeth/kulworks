import { addPayment } from "../_actions";

const METHODS = [
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "VENMO", label: "Venmo" },
  { value: "ZELLE", label: "Zelle" },
  { value: "CHECK", label: "Check" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
];

const cls =
  "rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";

export default function AddPayment({ projectId }: { projectId: string }) {
  return (
    <form action={addPayment} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input
        name="amount"
        type="number"
        step="0.01"
        required
        placeholder="Amount"
        className={`w-28 ${cls}`}
      />
      <select name="method" defaultValue="CARD" className={cls}>
        {METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <input name="paidAt" type="date" className={cls} />
      <input name="note" placeholder="Note (optional)" className={`min-w-[8rem] flex-1 ${cls}`} />
      <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary-hover">
        Log payment
      </button>
    </form>
  );
}
