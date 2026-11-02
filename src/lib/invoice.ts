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

/** Splits a total into what is due now and what is left, given a deposit percent.
 *  A null/0/100+ deposit means the whole thing is due now and there is no balance. */
export function splitDeposit(total: number, depositPct: number | null | undefined) {
  const pct = depositPct ?? 0;
  if (pct <= 0 || pct >= 100) return { dueNow: total, balance: 0, hasSplit: false };
  const dueNow = Math.round(total * (pct / 100) * 100) / 100;
  return { dueNow, balance: Math.round((total - dueNow) * 100) / 100, hasSplit: true };
}

/** Unit prices can run to fractions of a cent on per-piece work (80 tiles that
 *  have to total $130 exactly). Show the cents everyone expects, and only show
 *  the extra places when the price actually has them, so quantity x unit price
 *  still visibly equals the line amount. */
export function fmtUnitPrice(n: number): string {
  const cents = Math.round(n * 100);
  if (Math.abs(n * 100 - cents) < 1e-9) {
    return `$${(cents / 100).toFixed(2)}`;
  }
  return `$${n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}`;
}

/** How long a quote holds once it is sent. Sam can extend any quote from the admin. */
export const QUOTE_VALID_DAYS = 7;

// Quote dates are stored as UTC midnight of the calendar day (what fmtDate shows),
// and a quote stays good through the end of that day in Texas.
const SHOP_UTC_OFFSET_H = 6;

/** The calendar day QUOTE_VALID_DAYS from today (shop time), as UTC midnight. */
export function defaultValidUntil(now = new Date()): Date {
  const shop = new Date(now.getTime() - SHOP_UTC_OFFSET_H * 3600_000);
  return new Date(Date.UTC(shop.getUTCFullYear(), shop.getUTCMonth(), shop.getUTCDate() + QUOTE_VALID_DAYS));
}

export function quoteExpired(validUntil: Date | null | undefined, now = new Date()): boolean {
  if (!validUntil) return false;
  return now.getTime() > validUntil.getTime() + (24 + SHOP_UTC_OFFSET_H) * 3600_000;
}

/** Valid-until dates are calendar days; format them in UTC so the day never shifts. */
export function fmtValidDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
