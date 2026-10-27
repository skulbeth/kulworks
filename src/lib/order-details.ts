// What a quote request says about timing and hand-off: the due date, how it gets to
// the customer, and (for cards) whether every card shares one back. Shared by the
// quote form, the card calculator, the quote API, the admin and the emails, so the
// labels and the rush rule only live here.

/** Super rush: the customer opts in and their project goes to the front of the queue.
 *  A flat fee, on the invoice as its own line. Until 2026-10-27 this was a $15 fee added
 *  automatically for any due date under 3 days out, which charged ordinary ~2-day jobs. */
export const SUPER_RUSH_FEE = 25;
export const SUPER_RUSH_LABEL = "Super rush: place my project above others in the queue";
/** A due date closer than this is tight: the form suggests super rush but charges nothing. */
export const TIGHT_WITHIN_DAYS = 2;

export const DELIVERY_OPTIONS = [
  { id: "pickup", label: "Local pickup in San Antonio" },
  { id: "ship", label: "Shipped" },
  { id: "meetup", label: "Meet up" },
] as const;
export type DeliveryMethod = (typeof DELIVERY_OPTIONS)[number]["id"];

/** Where we ship, with the rough cost Sam quotes for a run of about 120 cards (~9 oz in a
 *  6x9 padded envelope). Past Canada and Mexico postage costs more than the cards, so no. */
export const SHIP_COUNTRIES = [
  { id: "US", label: "United States", postalLabel: "ZIP code", estimate: "usually under $15" },
  { id: "CA", label: "Canada", postalLabel: "Postal code", estimate: "about $25" },
  { id: "MX", label: "Mexico", postalLabel: "Postal code", estimate: "about $25" },
] as const;
export type ShipCountry = (typeof SHIP_COUNTRIES)[number]["id"];

export function shipCountryOf(id: string | null | undefined) {
  return SHIP_COUNTRIES.find((c) => c.id === id);
}

export const CARD_BACK_OPTIONS = [
  { id: "same", label: "Same back on every card" },
  { id: "different", label: "A different back per card" },
] as const;
export type CardBacks = (typeof CARD_BACK_OPTIONS)[number]["id"];

/** Project types that are card orders (the card-back question only applies to these). */
export const CARD_TYPES = ["card-printing", "card-design", "prototype"];

export const FEES_NOTE =
  `Need it sooner? Super rush puts your project at the front of the queue for a flat $${SUPER_RUSH_FEE}. ` +
  "Shipping is added to your invoice (we ship to the US, Canada and Mexico), and a travel fee may apply for meetups far across or outside San Antonio.";

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

/** Tight when the due date is less than TIGHT_WITHIN_DAYS days out (today or tomorrow).
 *  A date in the past counts too: it is at least that urgent. Only ever a nudge. */
export function isTightDate(dueISO: string | null | undefined, fromISO = todayISO()): boolean {
  if (!dueISO || !/^\d{4}-\d{2}-\d{2}$/.test(dueISO)) return false;
  return daysUntil(dueISO, fromISO) < TIGHT_WITHIN_DAYS;
}

/** One-line summary of the shipping address, or "" if there isn't one. */
export function shipAddressLine(a: {
  shipStreet?: string | null;
  shipCity?: string | null;
  shipState?: string | null;
  shipPostalCode?: string | null;
  shipCountry?: string | null;
}): string {
  const cityLine = [a.shipCity, [a.shipState, a.shipPostalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  // US is the default and older rows have no country, so only name the others.
  const country = a.shipCountry && a.shipCountry !== "US" ? shipCountryOf(a.shipCountry)?.label ?? a.shipCountry : null;
  return [a.shipStreet, cityLine, country].filter(Boolean).join(", ");
}
