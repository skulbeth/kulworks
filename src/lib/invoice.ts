// Pure helpers for quotes/invoices — used by the admin, the public view page, and email.

export type LineLike = { quantity: number; unitPrice: number };

/** Amount for a single line, rounded to cents. */
export function lineAmount(it: LineLike): number {
  return Math.round(it.quantity * it.unitPrice * 100) / 100;
}

/** Subtotal / service charge / total for a set of line items at a given rate (percent).
 *  (The `rate` is stored per-invoice in `Invoice.taxRate` — kept that column name for
 *  history; it now represents the flat service-charge percent, not sales tax.) */
export function computeTotals(items: LineLike[], rate: number) {
  const subtotal = Math.round(items.reduce((s, it) => s + lineAmount(it), 0) * 100) / 100;
  const serviceCharge = Math.round(subtotal * (rate / 100) * 100) / 100;
  const total = Math.round((subtotal + serviceCharge) * 100) / 100;
  return { subtotal, serviceCharge, total };
}

export function docLabel(type: "QUOTE" | "INVOICE"): string {
  return type === "QUOTE" ? "Quote" : "Invoice";
}
