// What a quote request says about timing and hand-off: the due date, how it gets to
// the customer, and (for cards) whether every card shares one back. Shared by the
// quote form, the card calculator, the quote API, the admin and the emails, so the
// labels and the rush rule only live here.

/** Flat fee when production has to happen in under RUSH_WITHIN_DAYS days. Goes on the
 *  invoice as its own line. */
export const RUSH_FEE = 15;
export const RUSH_WITHIN_DAYS = 3;

export const DELIVERY_OPTIONS = [
  { id: "pickup", label: "Local pickup in San Antonio" },
  { id: "ship", label: "Shipped" },
  { id: "meetup", label: "Meet up" },
] as const;
export type DeliveryMethod = (typeof DELIVERY_OPTIONS)[number]["id"];

export const CARD_BACK_OPTIONS = [
  { id: "same", label: "Same back on every card" },
  { id: "different", label: "A different back per card" },
] as const;
export type CardBacks = (typeof CARD_BACK_OPTIONS)[number]["id"];

/** Project types that are card orders (the card-back question only applies to these). */
export const CARD_TYPES = ["card-printing", "card-design", "prototype"];

export const FEES_NOTE =
  `Need it in under ${RUSH_WITHIN_DAYS} days? Rush production is a flat $${RUSH_FEE}. ` +
  "Shipping is added to your invoice, and a travel fee may apply for meetups far across or outside San Antonio.";

export function deliveryLabel(id: string | null | undefined): string {
  return DELIVERY_OPTIONS.find((o) => o.id === id)?.label ?? "";
}

export function cardBacksLabel(id: string | null | undefined): string {
  return CARD_BACK_OPTIONS.find((o) => o.id === id)?.label ?? "";
}

/** "YYYY-MM-DD" for today in the visitor's local time (date inputs work in local days). */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days from `fromISO` to `dueISO`, both "YYYY-MM-DD". Calendar days, no clock. */
export function daysUntil(dueISO: string, fromISO: string): number {
  const a = Date.UTC(+fromISO.slice(0, 4), +fromISO.slice(5, 7) - 1, +fromISO.slice(8, 10));
  const b = Date.UTC(+dueISO.slice(0, 4), +dueISO.slice(5, 7) - 1, +dueISO.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Rush when the due date is less than RUSH_WITHIN_DAYS days out (today, tomorrow, or
 *  the day after). A date in the past counts too: it is at least that urgent. */
export function isRush(dueISO: string | null | undefined, fromISO = todayISO()): boolean {
  if (!dueISO || !/^\d{4}-\d{2}-\d{2}$/.test(dueISO)) return false;
  return daysUntil(dueISO, fromISO) < RUSH_WITHIN_DAYS;
}

/** One-line summary of the shipping address, or "" if there isn't one. */
export function shipAddressLine(a: {
  shipStreet?: string | null;
  shipCity?: string | null;
  shipState?: string | null;
  shipPostalCode?: string | null;
}): string {
  const cityLine = [a.shipCity, [a.shipState, a.shipPostalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [a.shipStreet, cityLine].filter(Boolean).join(", ");
}
