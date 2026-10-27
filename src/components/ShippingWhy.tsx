"use client";

import { useState } from "react";
import InfoPopup from "@/components/InfoPopup";

/**
 * "Why this?" link + popup explaining why we ask where an order is going, and what
 * shipping usually costs. Used by the card calculator and the quote form so the
 * numbers only live here (and in SHIP_COUNTRIES in lib/order-details).
 */
export default function ShippingWhy() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="ml-2 text-xs font-semibold text-blue hover:underline"
      >
        Why this?
      </button>
      {open && (
        <InfoPopup title="Why we ask where it's going" onClose={() => setOpen(false)}>
          <p className="rounded-lg bg-gold/10 px-3 py-2 font-semibold text-foreground">
            TLDR: In the US, a run of about 120 cards usually ships for under $15. Canada and
            Mexico are about $25. We can&apos;t ship past there.
          </p>
          <p>
            Your ZIP or postal code lets us estimate shipping before you order. Postage depends on
            weight and distance, and a run of about 120 cards in a padded envelope weighs around
            9 oz.
          </p>
          <p>
            Bigger runs, 3D-printed cases and boxes add weight, so they cost more to ship. The
            exact amount goes on your invoice.
          </p>
          <p>
            Outside the US, Canada and Mexico, postage costs more than the cards, so we don&apos;t
            ship there. Local pickup in San Antonio is free.
          </p>
        </InfoPopup>
      )}
    </>
  );
}
