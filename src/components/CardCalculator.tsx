"use client";

import { useState } from "react";
import { RUSH_FEE, RUSH_WITHIN_DAYS, FEES_NOTE, isRush, todayISO } from "@/lib/order-details";

/**
 * Basic card-order cost estimator. Mirrors the published card pricing. These are
 * estimates, not quotes. Adjust the rate constants below if pricing changes.
 */

// Standard poker size only; other sizes are custom and quote-only.
// Keep in step with data/pricing.ts and data/guides.ts, which publish the same rate.
const POKER_RATE = 0.3; // per card, print-ready poker size ($0.13 until 2026-10-20, $0.25 until 2026-10-22)

const SETUP_FEE = 25; // one-time per project
// Floor (Sam, 2026-10-22): setup + printing never works out under this per card, however
// big the run. The bulk discount stops where it would cross it.
const MIN_PER_CARD = 0.3;
const LAYOUT_FEE = 40; // per layout we design (front or back); each is a template all cards share
const BOX_BASE = 9; // custom 3D-printed box for a deck under 100 cards
const BOX_PER_100 = 18; // larger decks: $18 per 100 cards (total)
const SLEEVE_PER_100: Record<string, number> = { standard: 10, premium: 15 };

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CardCalculator() {
  const [cardsPerDeck, setCardsPerDeck] = useState(54);
  const [decks, setDecks] = useState(1);
  const [frontLayouts, setFrontLayouts] = useState(0);
  const [backLayouts, setBackLayouts] = useState(0);
  const [addBox, setAddBox] = useState(false);
  const [sleeves, setSleeves] = useState("none");
  const [dueDate, setDueDate] = useState("");

  const cpd = Math.max(0, Math.floor(cardsPerDeck) || 0);
  const deckCount = Math.max(0, Math.floor(decks) || 0);
  const totalCards = cpd * deckCount;

  const printing = totalCards * POKER_RATE;

  // Bulk discount on printing (setup fee always stays). Trimmed 2026-10-22 from
  // 5% @ 250 / 10% @ 500 / 12.5% @ 800. Keep in step with data/pricing.ts and data/guides.ts.
  const bulkRate = totalCards >= 1000 ? 0.1 : totalCards >= 500 ? 0.05 : 0;
  const maxDiscount = Math.max(0, SETUP_FEE + printing - MIN_PER_CARD * totalCards);
  const bulkDiscount = Math.min(printing * bulkRate, maxDiscount);
  const bulkCapped = bulkRate > 0 && printing * bulkRate > maxDiscount;

  // Design: $40 per layout, for as many distinct front and back layouts as needed.
  const frontN = Math.max(0, Math.floor(frontLayouts) || 0);
  const backN = Math.max(0, Math.floor(backLayouts) || 0);
  const layoutCount = frontN + backN;
  const design = layoutCount * LAYOUT_FEE;

  // Box: $9 for a deck under 100 cards, otherwise $18 per 100 cards (by total).
  const boxes = addBox
    ? totalCards < 100
      ? BOX_BASE
      : (totalCards / 100) * BOX_PER_100
    : 0;
  const sleevePacks = sleeves === "none" ? 0 : Math.ceil(totalCards / 100);
  const sleeveCost = sleeves === "none" ? 0 : sleevePacks * SLEEVE_PER_100[sleeves];
  // Rush: needed in under RUSH_WITHIN_DAYS days. A flat fee, same as its invoice line.
  const rush = isRush(dueDate);
  const rushFee = rush ? RUSH_FEE : 0;
  // No service charge on top since 2026-10-22: the estimate is the price.
  const total = SETUP_FEE + printing - bulkDiscount + design + boxes + sleeveCost + rushFee;

  // Hand the configured estimate to the quote form (prefills type + details).
  const quoteTypes = layoutCount > 0 ? "card-printing,card-design" : "card-printing";
  const summary = [
    "Card printing estimate from the website calculator:",
    "- Size: Poker (2.5 x 3.5 in)",
    `- Quantity: ${deckCount} deck(s) x ${cpd} cards = ${totalCards} cards`,
    layoutCount > 0
      ? `- Design: ${frontN} front + ${backN} back layout(s)`
      : "- Files: print-ready (no design)",
    addBox ? "- Custom 3D-printed box: yes" : "- Custom box: no",
    sleeves !== "none" ? `- Sleeves: ${sleeves}` : "- Sleeves: none",
    bulkRate > 0 ? `- Bulk discount applied: ${Math.round(bulkRate * 100)}%` : null,
    dueDate ? `- Needed in hand by: ${dueDate}${rush ? ` (rush, +${usd(RUSH_FEE)})` : ""}` : null,
    `- Estimated total: ${usd(total)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const quoteHref =
    `/contact/?type=${quoteTypes}&details=${encodeURIComponent(summary)}` +
    (dueDate ? `&due=${dueDate}` : "");

  const inputCls =
    "w-full rounded-lg border border-border bg-surface2 px-3 py-2.5 text-base text-foreground focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
  const labelCls = "mb-1.5 block text-sm font-semibold";

  const rows: { label: string; value: number; show: boolean }[] = [
    { label: "Setup fee", value: SETUP_FEE, show: true },
    { label: `Printing (${totalCards} cards)`, value: printing, show: true },
    {
      label: bulkCapped
        ? `Bulk discount (${Math.round(bulkRate * 100)}%, capped at ${usd(MIN_PER_CARD)}/card)`
        : `Bulk discount (${Math.round(bulkRate * 100)}%)`,
      value: -bulkDiscount,
      show: bulkRate > 0,
    },
    { label: `Card layouts (${layoutCount})`, value: design, show: layoutCount > 0 },
    { label: "Custom 3D-printed box", value: boxes, show: addBox },
    {
      label: `Sleeves (${sleevePacks} x 100)`,
      value: sleeveCost,
      show: sleeves !== "none",
    },
    { label: `Rush fee (under ${RUSH_WITHIN_DAYS} days)`, value: rushFee, show: rush },
  ];

  return (
    <div className="grid gap-6 rounded-2xl border border-border bg-surface p-6 sm:p-8 md:grid-cols-2">
      {/* Inputs */}
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Standard poker size (2.5 x 3.5 in). Need a custom size? Ask for a quote.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="calc-cpd">Cards per deck</label>
            <input
              id="calc-cpd"
              type="number"
              min={1}
              className={inputCls}
              value={cardsPerDeck}
              onChange={(e) => setCardsPerDeck(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="calc-decks">Number of decks</label>
            <input
              id="calc-decks"
              type="number"
              min={1}
              className={inputCls}
              value={decks}
              onChange={(e) => setDecks(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="calc-sleeves">Sleeves</label>
          <select
            id="calc-sleeves"
            className={inputCls}
            value={sleeves}
            onChange={(e) => setSleeves(e.target.value)}
          >
            <option value="none">No sleeves</option>
            <option value="standard">Standard ($10 / 100)</option>
            <option value="premium">Premium ($15 / 100)</option>
          </select>
        </div>

        <div>
          <p className={labelCls}>Card design ({usd(LAYOUT_FEE)} per layout)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-muted" htmlFor="calc-front">
                Front layouts
              </label>
              <input
                id="calc-front"
                type="number"
                min={0}
                className={inputCls}
                value={frontLayouts}
                onChange={(e) => setFrontLayouts(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted" htmlFor="calc-back">
                Back layouts
              </label>
              <input
                id="calc-back"
                type="number"
                min={0}
                className={inputCls}
                value={backLayouts}
                onChange={(e) => setBackLayouts(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            How many distinct card layouts you need us to design (leave at 0 if your files
            are print-ready).
          </p>
        </div>

        <div>
          <label className={labelCls} htmlFor="calc-due">
            Needed in hand by <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="calc-due"
            type="date"
            min={todayISO()}
            className={inputCls}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">
            Under {RUSH_WITHIN_DAYS} days out adds a flat {usd(RUSH_FEE)} rush fee.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={addBox}
            onChange={(e) => setAddBox(e.target.checked)}
          />
          <span>Add a custom 3D-printed box ({usd(BOX_BASE)}, or {usd(BOX_PER_100)} per 100 cards for big decks)</span>
        </label>
      </div>

      {/* Estimate */}
      <div className="flex flex-col rounded-xl border border-border bg-surface2 p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-muted">
          Estimated total
        </p>
        <p className="mt-1 font-mono text-4xl font-semibold text-gold">{usd(total)}</p>

        <ul className="mt-5 space-y-2 text-sm">
          {rows
            .filter((r) => r.show)
            .map((r) => (
              <li key={r.label} className="flex justify-between gap-4 text-muted">
                <span>{r.label}</span>
                <span className="font-mono font-medium text-foreground">{usd(r.value)}</span>
              </li>
            ))}
        </ul>


        <a
          href={quoteHref}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-black transition-all hover:bg-primary-hover hover:shadow-glow"
        >
          Request this estimate
        </a>

        <p className="mt-auto pt-5 text-xs text-muted/70">
          {FEES_NOTE} Cards come with rounded corners.
          Final pricing depends on files, finishing, and quantity, so send your project for
          an exact quote.
        </p>
        <p className="mt-2 text-xs text-muted/70">
          Estimates assume print-ready files that need no adjustment (when we are not
          designing the layouts). If any edits are needed, we will always let you know
          before we start the project.
        </p>
      </div>
    </div>
  );
}
