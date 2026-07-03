// Pure helpers for quotes/invoices — used by the admin, the public view page, and email.

export type LineLike = { quantity: number; unitPrice: number };

/** Amount for a single line, rounded to cents. */
export function lineAmount(it: LineLike): number {
  return Math.round(it.quantity * it.unitPrice * 100) / 100;
}

/** Subtotal / tax / total for a set of line items at a given tax rate (percent). */
export function computeTotals(items: LineLike[], taxRate: number) {
  const subtotal = Math.round(items.reduce((s, it) => s + lineAmount(it), 0) * 100) / 100;
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

export function docLabel(type: "QUOTE" | "INVOICE"): string {
  return type === "QUOTE" ? "Quote" : "Invoice";
}
