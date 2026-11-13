"use client";

import { useState } from "react";
import { SIZES, SETUP_FEE, ESTIMATE_MARKER, cardPrintingCost, usd, type SizeKey } from "@/lib/card-pricing";

/**
 * "See your price first": a short version of the pricing-page calculator, shown on the
 * quote form for card orders that didn't come from the calculator (Sam 2026-11-13, after
 * a customer sent a card request without ever seeing a price). It covers setup + printing
 * only; "Add this to my request" drops the numbers into the project details, the same way
 * the full calculator hands its estimate over. Design, boxes and sleeves stay on the full
 * calculator.
 */
export default function QuickCardEstimate({ onAdd }: { onAdd: (summary: string) => void }) {
  const [sizeKey, setSizeKey] = useState<SizeKey>("poker");
  const [cardsPerDeck, setCardsPerDeck] = useState(54);
  const [decks, setDecks] = useState(1);

  const cpd = Math.max(0, Math.floor(cardsPerDeck) || 0);
  const deckCount = Math.max(0, Math.floor(decks) || 0);
  const totalCards = cpd * deckCount;
  const size = SIZES[sizeKey];
  const { printing, bulkRate, bulkDiscount } = cardPrintingCost(sizeKey, totalCards);
  const total = SETUP_FEE + printing - bulkDiscount;

  const summary = [
    `${ESTIMATE_MARKER} from the quote form:`,
    `- Size: ${size.label}`,
    `- Quantity: ${deckCount} deck(s) x ${cpd} cards = ${totalCards} cards`,
    bulkRate > 0 ? `- Bulk discount applied: ${Math.round(bulkRate * 100)}%` : null,
    `- Estimated setup + printing: ${usd(total)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const input =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-blue focus:outline-none";
  const lbl = "mb-1 block text-xs font-semibold text-muted";

  return (
    <div className="rounded-lg border border-gold/40 bg-gold/10 p-4">
      <p className="text-sm font-bold text-foreground">See your price first</p>
      <p className="mt-0.5 text-xs text-muted">
        A quick estimate for printing your cards. Add it to your request so we&apos;re on the same page.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className={lbl} htmlFor="qe-size">Card size</label>
          <select
            id="qe-size"
            className={input}
            value={sizeKey}
            onChange={(e) => setSizeKey(e.target.value as SizeKey)}
          >
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <option key={k} value={k}>
                {SIZES[k].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl} htmlFor="qe-cards">Cards per deck</label>
          <input
            id="qe-cards"
            type="number"
            min={1}
            inputMode="numeric"
            className={input}
            value={cardsPerDeck}
            onChange={(e) => setCardsPerDeck(Number(e.target.value))}
          />
        </div>
        <div>
          <label className={lbl} htmlFor="qe-decks">Decks</label>
          <input
            id="qe-decks"
            type="number"
            min={1}
            inputMode="numeric"
            className={input}
            value={decks}
            onChange={(e) => setDecks(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {totalCards} cards:{" "}
          <span className="font-mono text-xl font-semibold text-gold">{usd(total)}</span>
          <span className="block text-xs">
            {usd(SETUP_FEE)} setup + {usd(size.rate)} a card
            {bulkRate > 0 ? `, ${Math.round(bulkRate * 100)}% bulk discount` : ""}
          </span>
        </p>
        <button
          type="button"
          disabled={totalCards === 0}
          onClick={() => onAdd(summary)}
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black transition-all hover:bg-primary-hover disabled:opacity-50"
        >
          Add this to my request
        </button>
      </div>

      <p className="mt-2 text-xs text-muted">
        Need design, a box or sleeves?{" "}
        <a href="/pricing/#estimator" className="font-semibold text-blue hover:underline">
          Open the full calculator
        </a>
        .
      </p>
    </div>
  );
}
