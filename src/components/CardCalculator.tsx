"use client";

import { useState } from "react";

/**
 * Basic card-order cost estimator. Mirrors the published card pricing. These are
 * estimates, not quotes. Adjust the rate constants below if pricing changes.
 */

// Per-card print rate by size (poker is the base; larger sizes scale up ~2-3x).
const SIZE_RATES: Record<string, number> = {
  poker: 0.13,
  tarot: 0.33,
  giant: 0.39,
};
const SIZE_OPTIONS = [
  { id: "poker", label: "Poker (2.5 x 3.5 in)" },
  { id: "tarot", label: "Tarot (2.75 x 4.75 in)" },
  { id: "giant", label: "Giant (3.5 x 5 in)" },
];

const SETUP_FEE = 25; // one-time per project
const LAYOUT_FEE = 40; // per layout we design (front or back); each is a template all cards share
const BOX_BASE = 9; // custom 3D-printed box for a deck under 100 cards
const BOX_PER_100 = 18; // larger decks: $18 per 100 cards (total)
const SLEEVE_PER_100: Record<string, number> = { standard: 6, premium: 11 };

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CardCalculator() {
  const [size, setSize] = useState("poker");
  const [cardsPerDeck, setCardsPerDeck] = useState(54);
  const [decks, setDecks] = useState(1);
  const [frontLayout, setFrontLayout] = useState(false);
  const [backLayout, setBackLayout] = useState(false);
  const [addBox, setAddBox] = useState(false);
  const [sleeves, setSleeves] = useState("none");

  const cpd = Math.max(0, Math.floor(cardsPerDeck) || 0);
  const deckCount = Math.max(0, Math.floor(decks) || 0);
  const totalCards = cpd * deckCount;

  const printing = totalCards * SIZE_RATES[size];
  const layoutCount = (frontLayout ? 1 : 0) + (backLayout ? 1 : 0);
  const design = layoutCount * LAYOUT_FEE;
  // Box: $9 for a deck under 100 cards, otherwise $18 per 100 cards (by total).
  const boxes = addBox
    ? totalCards < 100
      ? BOX_BASE
      : (totalCards / 100) * BOX_PER_100
    : 0;
  const sleevePacks = sleeves === "none" ? 0 : Math.ceil(totalCards / 100);
  const sleeveCost = sleeves === "none" ? 0 : sleevePacks * SLEEVE_PER_100[sleeves];
  const total = SETUP_FEE + printing + design + boxes + sleeveCost;

  const inputCls =
    "w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-foreground focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
  const labelCls = "mb-1.5 block text-sm font-semibold";

  const rows: { label: string; value: number; show: boolean }[] = [
    { label: "Setup fee", value: SETUP_FEE, show: true },
    { label: `Printing (${totalCards} cards)`, value: printing, show: true },
    { label: `Card layouts (${layoutCount})`, value: design, show: layoutCount > 0 },
    { label: "Custom 3D-printed box", value: boxes, show: addBox },
    {
      label: `Sleeves (${sleevePacks} x 100)`,
      value: sleeveCost,
      show: sleeves !== "none",
    },
  ];

  return (
    <div className="grid gap-6 rounded-2xl border border-border bg-surface p-6 sm:p-8 md:grid-cols-2">
      {/* Inputs */}
      <div className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="calc-size">Card size</label>
          <select
            id="calc-size"
            className={inputCls}
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            {SIZE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

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
            <option value="standard">Standard ($6 / 100)</option>
            <option value="premium">Premium ($11 / 100)</option>
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Card design ({usd(LAYOUT_FEE)} per layout)</p>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={frontLayout}
              onChange={(e) => setFrontLayout(e.target.checked)}
            />
            <span>Design the front layout</span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={backLayout}
              onChange={(e) => setBackLayout(e.target.checked)}
            />
            <span>Design the back layout</span>
          </label>
          <label className="flex items-center gap-3 pt-1 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={addBox}
              onChange={(e) => setAddBox(e.target.checked)}
            />
            <span>Add a custom 3D-printed box ({usd(BOX_BASE)}, or {usd(BOX_PER_100)} per 100 cards for big decks)</span>
          </label>
        </div>
      </div>

      {/* Estimate */}
      <div className="flex flex-col rounded-xl border border-border bg-surface2 p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-muted">
          Estimated total
        </p>
        <p className="mt-1 text-4xl font-extrabold text-gold">{usd(total)}</p>

        <ul className="mt-5 space-y-2 text-sm">
          {rows
            .filter((r) => r.show)
            .map((r) => (
              <li key={r.label} className="flex justify-between gap-4 text-muted">
                <span>{r.label}</span>
                <span className="font-semibold text-foreground">{usd(r.value)}</span>
              </li>
            ))}
        </ul>

        <p className="mt-auto pt-5 text-xs text-muted/70">
          Estimate only. Does not include delivery, and final pricing depends on files,
          finishing, and quantity. Send your project for an exact quote.
        </p>
      </div>
    </div>
  );
}
