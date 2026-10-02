"use client";

import { useState } from "react";
import { createInvoiceDoc, updateInvoiceDoc } from "../_actions";
import { computeTotals, lineAmount, splitDeposit } from "@/lib/invoice";
import { fmtMoney } from "@/lib/format";

type Row = { description: string; quantity: string; unitPrice: string };

// Build a quote/invoice with add/removable line items + a live total. Submits to
// the createInvoiceDoc server action (line items go up as parallel itemDesc/Qty/Price arrays).
export type EditingDoc = {
  id: string;
  type: "INVOICE" | "QUOTE";
  taxRate: number;
  depositPct: number | null;
  notes: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
};

export default function InvoiceEditor({
  projectId,
  defaultServiceCharge,
  editing,
}: {
  projectId: string;
  defaultServiceCharge: number;
  /** Pass a DRAFT document to edit it in place; omit to create a new one. */
  editing?: EditingDoc;
}) {
  const [type, setType] = useState<"INVOICE" | "QUOTE">(editing?.type ?? "INVOICE");
  // Stored per-invoice in the `taxRate` column (name kept for history); it's the service-charge %.
  const [rate, setRate] = useState(String(editing ? editing.taxRate : defaultServiceCharge));
  const [rows, setRows] = useState<Row[]>(
    editing && editing.items.length
      ? editing.items.map((i) => ({
          description: i.description,
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice),
        }))
      : [{ description: "", quantity: "1", unitPrice: "" }]
  );
  // Deposit asked up front. Set it on a quote and the quote becomes payable now.
  const [deposit, setDeposit] = useState(editing?.depositPct ? String(editing.depositPct) : "");
  // "I quoted them $130, make it say $130." Typing a target here back-solves the
  // line prices so the total lands exactly there, service charge and all.
  const [target, setTarget] = useState("");

  const numeric = rows.map((r) => ({
    quantity: Number(r.quantity) || 0,
    unitPrice: Number(r.unitPrice) || 0,
  }));
  const { subtotal, serviceCharge, total } = computeTotals(numeric, Number(rate) || 0);
  const { dueNow, balance, hasSplit } = splitDeposit(total, Number(deposit) || 0);
  const money = (n: number) => fmtMoney(n);

  const chargeOn = (Number(rate) || 0) > 0;
  const toggleCharge = () => setRate(chargeOn ? "0" : String(defaultServiceCharge || 9));

  // Make the finished total exactly the number typed. Done in integer cents,
  // because computeTotals rounds each line and then the charge, and chaining
  // floats through that leaves you a cent or two short.
  const applyTarget = () => {
    const wantDollars = Number(target);
    if (!Number.isFinite(wantDollars) || wantDollars <= 0) return;
    const want = Math.round(wantDollars * 100);
    const r = Number(rate) || 0;

    // Which subtotal yields exactly `want` once the charge is added and rounded?
    const ideal = Math.round(want / (1 + r / 100));
    let S: number | null = null;
    for (let d = 0; d <= 5 && S === null; d++) {
      for (const cand of d === 0 ? [ideal] : [ideal - d, ideal + d]) {
        if (cand > 0 && cand + Math.round((cand * r) / 100) === want) {
          S = cand;
          break;
        }
      }
    }
    if (S === null) S = ideal; // target unreachable at this rate; land nearest

    const live = rows.map((row, i) => ({ row, i, q: Number(row.quantity) || 0 })).filter((x) => x.q > 0);
    if (live.length === 0) return;

    const currentCents = live.map((x) => Math.round(x.q * (Number(rows[x.i].unitPrice) || 0) * 100));
    const curTotal = currentCents.reduce((a, b) => a + b, 0);
    const amounts =
      curTotal > 0
        ? currentCents.map((c) => Math.round((c / curTotal) * S!))
        : live.map((_, i) => (i === 0 ? S! : 0));
    amounts[amounts.length - 1] += S - amounts.reduce((a, b) => a + b, 0);

    // Back out a unit price that re-rounds to exactly that line amount. Whole
    // cents where possible; more places only when the quantity demands it.
    const next = [...rows];
    live.forEach((x, k) => {
      const targetCents = amounts[k];
      let up = Math.round(targetCents / x.q) / 100;
      if (Math.round(x.q * up * 100) !== targetCents) {
        up = Math.round((targetCents / 100 / x.q) * 1000000) / 1000000;
        for (let n = 0; n < 6 && Math.round(x.q * up * 100) !== targetCents; n++) {
          up = Math.round((up + (targetCents - Math.round(x.q * up * 100)) / 100 / x.q) * 1000000) / 1000000;
        }
      }
      next[x.i] = { ...next[x.i], unitPrice: String(up) };
    });
    setRows(next);
    setTarget("");
  };

  const setRow = (i: number, key: keyof Row, val: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  const addRow = () => setRows((rs) => [...rs, { description: "", quantity: "1", unitPrice: "" }]);
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const field =
    "rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";

  return (
    <form action={editing ? updateInvoiceDoc : createInvoiceDoc} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="flex flex-wrap items-center gap-3">
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "INVOICE" | "QUOTE")}
          className={field}
        >
          <option value="INVOICE">Invoice</option>
          <option value="QUOTE">Quote (estimate)</option>
        </select>
        <label className="text-xs text-muted">
          Deposit %
          <input
            name="depositPct"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            inputMode="decimal"
            placeholder="none"
            title="Set this on a quote to make it payable now: they pay the deposit to book the job, the balance comes later."
            className={`ml-1 w-20 ${field}`}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted" title="Adds your flat service charge on top of the lines. Turn it off to bill the line prices exactly as typed.">
          <input
            type="checkbox"
            checked={chargeOn}
            onChange={toggleCharge}
            className="h-3.5 w-3.5 accent-primary"
          />
          Service charge
          <input
            name="taxRate"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            inputMode="decimal"
            disabled={!chargeOn}
            className={`ml-1 w-14 disabled:opacity-40 ${field}`}
          />
        </label>
        <label className="text-xs text-muted">
          Due
          <input type="date" name="dueDate" className={`ml-1 ${field}`} />
        </label>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              name="itemDesc"
              value={r.description}
              onChange={(e) => setRow(i, "description", e.target.value)}
              placeholder="Description"
              className={`min-w-[12rem] flex-1 ${field}`}
            />
            <input
              name="itemQty"
              value={r.quantity}
              onChange={(e) => setRow(i, "quantity", e.target.value)}
              inputMode="decimal"
              placeholder="Qty"
              className={`w-16 ${field}`}
            />
            <input
              name="itemPrice"
              value={r.unitPrice}
              onChange={(e) => setRow(i, "unitPrice", e.target.value)}
              inputMode="decimal"
              placeholder="Unit $"
              className={`w-24 ${field}`}
            />
            <span className="w-24 text-right text-sm tabular-nums text-muted">
              {fmtMoney(lineAmount(numeric[i]))}
            </span>
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="px-1 text-muted hover:text-red-600"
              aria-label="Remove line"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-sm font-semibold text-blue hover:underline">
          + Add line
        </button>
      </div>

      <textarea
        name="notes"
        rows={2}
        placeholder="Notes / terms shown on the document (optional)"
        className={`w-full ${field}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="text-sm text-muted">
          Subtotal {fmtMoney(subtotal)} · Service charge {fmtMoney(serviceCharge)} ·{" "}
          <span className="font-bold text-foreground">Total {fmtMoney(total)}</span>
          {hasSplit && (
            <span className="text-blue">
              {money(dueNow)} to book, {money(balance)} on completion
            </span>
          )}
          {/* Quote someone a round number, then make the document say it. */}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
            Make total exactly
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyTarget();
                }
              }}
              inputMode="decimal"
              placeholder="130"
              className={`w-20 ${field}`}
            />
            <button
              type="button"
              onClick={applyTarget}
              className="rounded-full border border-border px-2.5 py-1 font-semibold hover:border-blue hover:text-blue"
            >
              Set
            </button>
          </span>
        </div>
        <button className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover">
          {editing ? "Save changes" : `Create ${type === "QUOTE" ? "quote" : "invoice"}`}
        </button>
      </div>
    </form>
  );
}
