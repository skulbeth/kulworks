"use client";

import { useState } from "react";
import InfoPopup from "@/components/InfoPopup";
import ShippingWhy from "@/components/ShippingWhy";
import { SUPER_RUSH_FEE, SUPER_RUSH_LABEL, FEES_NOTE, SHIP_COUNTRIES, shipCountryOf, isTightDate, todayISO } from "@/lib/order-details";

/**
 * Basic card-order cost estimator. Mirrors the published card pricing. These are
 * estimates, not quotes. Adjust the rate constants below if pricing changes.
 */

// Standard sizes with a published rate; bridge, giant and oracle stay custom and quote-only.
// Keep in step with data/pricing.ts and data/guides.ts, which publish the same rates.
// Poker: $0.13 until 2026-10-20, $0.25 until 2026-10-22. Tarot set 2026-10-25 at 2x poker
// (about 9-10 fit a bed vs 18 poker, so twice the beds and hand placement).
// Floor (Sam, 2026-10-22): setup + printing never works out under the size's rate per card,
// however big the run. The bulk discount stops where it would cross it.
const SIZES = {
  poker: { label: "Poker (2.5 x 3.5 in)", rate: 0.3 },
  tarot: { label: "Tarot (2.75 x 4.75 in)", rate: 0.6 },
} as const;
type SizeKey = keyof typeof SIZES;

const SETUP_FEE = 25; // one-time per project
const LAYOUT_FEE = 40; // per layout we design (front or back); each is a template all cards share
const BOX_BASE = 9; // custom 3D-printed box for a deck under 100 cards
const BOX_PER_100 = 18; // larger decks: $18 per 100 cards (total)
const SLEEVE_PER_100: Record<string, number> = { standard: 10, premium: 15 };

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CardCalculator() {
  const [sizeKey, setSizeKey] = useState<SizeKey>("poker");
  const [cardsPerDeck, setCardsPerDeck] = useState(54);
  const [decks, setDecks] = useState(1);
  const [frontLayouts, setFrontLayouts] = useState(0);
  const [backLayouts, setBackLayouts] = useState(0);
  const [addBox, setAddBox] = useState(false);
  const [sleeves, setSleeves] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [superRush, setSuperRush] = useState(false);
  const [setupInfoOpen, setSetupInfoOpen] = useState(false);
  // Where it's going: "" (not said), "pickup", "elsewhere", or a SHIP_COUNTRIES id.
  const [shipTo, setShipTo] = useState("");
  const [postal, setPostal] = useState("");

  const cpd = Math.max(0, Math.floor(cardsPerDeck) || 0);
  const deckCount = Math.max(0, Math.floor(decks) || 0);
  const totalCards = cpd * deckCount;

  const size = SIZES[sizeKey];
  const MIN_PER_CARD = size.rate;
  const printing = totalCards * size.rate;

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
  // Super rush: opted in, front of the queue. A flat fee, same as its invoice line.
  // A tight due date only suggests it; it never adds the fee by itself.
  const tight = isTightDate(dueDate);
  const rushFee = superRush ? SUPER_RUSH_FEE : 0;
  // No service charge on top since 2026-10-22: the estimate is the price.
  const total = SETUP_FEE + printing - bulkDiscount + design + boxes + sleeveCost + rushFee;

  // Hand the configured estimate to the quote form (prefills type + details).
  const quoteTypes = layoutCount > 0 ? "card-printing,card-design" : "card-printing";
  const summary = [
    "Card printing estimate from the website calculator:",
    `- Size: ${size.label}`,
    `- Quantity: ${deckCount} deck(s) x ${cpd} cards = ${totalCards} cards`,
    layoutCount > 0
      ? `- Design: ${frontN} front + ${backN} back layout(s)`
      : "- Files: print-ready (no design)",
    addBox ? "- Custom 3D-printed box: yes" : "- Custom box: no",
    sleeves !== "none" ? `- Sleeves: ${sleeves}` : "- Sleeves: none",
    bulkRate > 0 ? `- Bulk discount applied: ${Math.round(bulkRate * 100)}%` : null,
    dueDate ? `- Needed in hand by: ${dueDate}` : null,
    shipTo === "pickup"
      ? "- Delivery: local pickup in San Antonio"
      : shipCountryOf(shipTo)
        ? `- Ship to: ${shipCountryOf(shipTo)!.label}${postal ? ` ${postal}` : ""} (shipping ${shipCountryOf(shipTo)!.estimate})`
        : null,
    superRush ? `- Super rush: front of the queue (+${usd(SUPER_RUSH_FEE)})` : null,
    `- Estimated total: ${usd(total)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const quoteHref =
    `/contact/?type=${quoteTypes}&details=${encodeURIComponent(summary)}` +
    (dueDate ? `&due=${dueDate}` : "") +
    (superRush ? "&rush=1" : "") +
    (shipTo === "pickup" || shipCountryOf(shipTo) ? `&ship=${shipTo}` : "") +
    (shipCountryOf(shipTo) && postal ? `&zip=${encodeURIComponent(postal)}` : "");

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
    { label: "Super rush (front of the queue)", value: rushFee, show: superRush },
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
            value={sizeKey}
            onChange={(e) => setSizeKey(e.target.value as SizeKey)}
          >
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <option key={k} value={k}>
                {SIZES[k].label}, {usd(SIZES[k].rate)} a card
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Need bridge, giant, or oracle size? Those are custom, so ask for a quote.
          </p>
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
          {tight && !superRush && (
            <p className="mt-1.5 text-xs font-semibold text-gold">
              That&apos;s tight. Add super rush to move to the front of the queue.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline">
            <label className="text-sm font-semibold" htmlFor="calc-ship">
              Where is it going? <span className="font-normal text-muted">(optional)</span>
            </label>
            <ShippingWhy />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <select
              id="calc-ship"
              className={inputCls}
              value={shipTo}
              onChange={(e) => {
                setShipTo(e.target.value);
                setPostal(""); // a US ZIP means nothing once Canada is picked
              }}
            >
              <option value="">Choose…</option>
              <option value="pickup">Local pickup in San Antonio (free)</option>
              {SHIP_COUNTRIES.map((c) => (
                <option key={c.id} value={c.id}>Ship to {c.label}</option>
              ))}
              <option value="elsewhere">Somewhere else</option>
            </select>
            {shipCountryOf(shipTo) && (
              <input
                aria-label={shipCountryOf(shipTo)!.postalLabel}
                className={inputCls}
                value={postal}
                maxLength={12}
                inputMode={shipTo === "US" ? "numeric" : "text"}
                autoComplete="postal-code"
                placeholder={shipCountryOf(shipTo)!.postalLabel}
                onChange={(e) => setPostal(e.target.value)}
              />
            )}
          </div>
          {shipTo === "elsewhere" && (
            <p className="mt-1.5 text-xs font-semibold text-gold">
              Sorry, we can only ship to the US, Canada and Mexico. Past there, postage costs more
              than the cards.
            </p>
          )}
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            checked={superRush}
            onChange={(e) => setSuperRush(e.target.checked)}
          />
          <span>{SUPER_RUSH_LABEL} (+{usd(SUPER_RUSH_FEE)} flat)</span>
        </label>

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
              <li key={r.label} className="text-muted">
                <div className="flex justify-between gap-4">
                  <span>
                    {r.label}
                    {r.label === "Setup fee" && (
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => setSetupInfoOpen(true)}
                        className="ml-2 text-xs font-semibold text-blue hover:underline"
                      >
                        What is this?
                      </button>
                    )}
                  </span>
                  <span className="font-mono font-medium text-foreground">{usd(r.value)}</span>
                </div>
              </li>
            ))}
        </ul>

        {/* Shipping is an estimate on the invoice, never part of the total. */}
        {(shipTo === "pickup" || shipCountryOf(shipTo)) && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
            {shipTo === "pickup" ? (
              <>Local pickup: <span className="font-semibold text-foreground">free</span></>
            ) : (
              <>
                Shipping to {postal || shipCountryOf(shipTo)!.label}:{" "}
                <span className="font-semibold text-foreground">{shipCountryOf(shipTo)!.estimate}</span>
                <span className="block text-xs">For a run of about 120 cards; added to your invoice.</span>
              </>
            )}
          </p>
        )}

        {/* Sam's own explanation to a customer who asked to waive it (2026-10). */}
        {setupInfoOpen && (
          <InfoPopup title="What is the setup fee?" onClose={() => setSetupInfoOpen(false)}>
            <p className="rounded-lg bg-gold/10 px-3 py-2 font-semibold text-foreground">
              TLDR: You&apos;re paying for our expertise and knowledge, and for the time and wear on
              the printer. It&apos;s one charge per order.
            </p>
            <p>
              It&apos;s for the whole order, not per design or per card. It covers getting your
              job onto the machine: checking your files and fitting them to the printer, arranging
              the cards on the print bed, lining up the fronts and backs, and the time to run them.
              Put plainly, you&apos;re paying for the know-how to get it right and for the machine
              time, as well as the printing itself.
            </p>
            <p>
              It applies even with print-ready files. On a small order the printing itself is only
              a few dollars, so the setup is what makes a small job worth running, and it&apos;s why
              we can take small orders at all.
            </p>
          </InfoPopup>
        )}


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
