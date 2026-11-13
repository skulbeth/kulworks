// Card printing prices: the one place the calculator (pricing page) and the quick
// estimate on the quote form both read. Keep in step with data/pricing.ts and
// data/guides.ts, which publish the same rates as text.
//
// Poker: $0.13 until 2026-10-20, $0.25 until 2026-10-22. Tarot set 2026-10-25 at 2x poker
// (about 9-10 fit a bed vs 18 poker, so twice the beds and hand placement).
// 2026-11-12 (Sam): poker $0.30 -> $0.40, tarot $0.60 -> $0.70.
// Bridge, giant and oracle stay custom and quote-only.
export const SIZES = {
  poker: { label: "Poker (2.5 x 3.5 in)", rate: 0.4 },
  tarot: { label: "Tarot (2.75 x 4.75 in)", rate: 0.7 },
} as const;
export type SizeKey = keyof typeof SIZES;

export const SETUP_FEE = 25; // one-time per project

// Text that starts every estimate dropped into the quote form's message, so the form
// can tell one is already there.
export const ESTIMATE_MARKER = "Card printing estimate";

/**
 * Setup + printing for a run of cards, after the bulk discount.
 * Bulk: 5% @ 500 / 10% @ 1,000 on printing (trimmed 2026-10-22 from 5/10/12.5 @ 250/500/800).
 * Floor (Sam, 2026-10-22): setup + printing never works out under the size's rate per card,
 * however big the run, so the discount stops where it would cross it.
 */
export function cardPrintingCost(sizeKey: SizeKey, totalCards: number) {
  const rate = SIZES[sizeKey].rate;
  const printing = totalCards * rate;
  const bulkRate = totalCards >= 1000 ? 0.1 : totalCards >= 500 ? 0.05 : 0;
  const maxDiscount = Math.max(0, SETUP_FEE + printing - rate * totalCards);
  const bulkDiscount = Math.min(printing * bulkRate, maxDiscount);
  const bulkCapped = bulkRate > 0 && printing * bulkRate > maxDiscount;
  return { printing, bulkRate, bulkDiscount, bulkCapped };
}

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
