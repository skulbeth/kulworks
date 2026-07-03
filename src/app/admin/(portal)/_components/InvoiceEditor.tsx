"use client";

import { useState } from "react";
import { createInvoiceDoc } from "../_actions";
import { computeTotals, lineAmount } from "@/lib/invoice";
import { fmtMoney } from "@/lib/format";

type Row = { description: string; quantity: string; unitPrice: string };

// Build a quote/invoice with add/removable line items + a live total. Submits to
// the createInvoiceDoc server action (line items go up as parallel itemDesc/Qty/Price arrays).
export default function InvoiceEditor({
  projectId,
  defaultTaxRate,
}: {
  projectId: string;
  defaultTaxRate: number;
}) {
  const [type, setType] = useState<"INVOICE" | "QUOTE">("INVOICE");
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate));
  const [rows, setRows] = useState<Row[]>([{ description: "", quantity: "1", unitPrice: "" }]);

  const numeric = rows.map((r) => ({
    quantity: Number(r.quantity) || 0,
    unitPrice: Number(r.unitPrice) || 0,
  }));
  const { subtotal, tax, total } = computeTotals(numeric, Number(taxRate) || 0);

  const setRow = (i: number, key: keyof Row, val: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  const addRow = () => setRows((rs) => [...rs, { description: "", quantity: "1", unitPrice: "" }]);
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const field =
    "rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";

  return (
    <form action={createInvoiceDoc} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />

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
          Tax %
          <input
            name="taxRate"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            inputMode="decimal"
            className={`ml-1 w-20 ${field}`}
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
          Subtotal {fmtMoney(subtotal)} · Tax {fmtMoney(tax)} ·{" "}
          <span className="font-bold text-foreground">Total {fmtMoney(total)}</span>
        </div>
        <button className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover">
          Create {type === "QUOTE" ? "quote" : "invoice"}
        </button>
      </div>
    </form>
  );
}
