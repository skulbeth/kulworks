// Pricing shown on /pricing/. These are starting points, not final quotes.
// Numbers reflect Sam's rates + market research (modestly under US market,
// leaning on the local / US-made / in-house advantage). Resin and UV-tile
// pricing stay quote-by-project until they're researched/costed separately.

export interface PriceItem {
  label: string;
  price: string;
}

export interface PriceGroup {
  name: string;
  intro?: string;
  items: PriceItem[];
  note?: string;
}

export const pricingIntro =
  "Honest starting prices, in USD. Final pricing depends on quantity, size, finishing, and delivery, so send your project for an exact quote.";

export const pricing: PriceGroup[] = [
  {
    name: "Card Printing",
    intro: "Poker-size cards. No minimums, so a single deck, or even a single card, is fine. Larger sizes scale up.",
    items: [
      { label: "Setup fee (one-time, per project)", price: "$25" },
      { label: "Per card, poker size (print-ready files)", price: "$0.10 to $0.15" },
      { label: "Larger sizes (tarot, giant)", price: "About 2 to 3x per size step up" },
      { label: "Bulk discount (on printing)", price: "5% at 250 cards, 10% at 500, 12.5% at 800" },
      { label: "Delivery", price: "Varies by order and location" },
    ],
    note: "Per-card pricing assumes print-ready, correctly designed files. Need the cards designed? See Card Design. All cards currently come with rounded corners (square corners not available yet).",
  },
  {
    name: "Card Design",
    intro: "We design the structure and layout; you provide the content and artwork.",
    items: [
      { label: "Card layout design, per side (front or back)", price: "$40" },
      { label: "Further iterations", price: "$20 / hour, or by project" },
      { label: "Whole deck or project", price: "Flat rate by agreement" },
    ],
    note: "A front and a back layout is $80 total, and the layout is a template all your cards share. Want us to manage the content too? Once the layouts are done, we can set up a shared Google Sheet that updates the cards as you fill it in.",
  },
  {
    name: "Card Boxes & Sleeves",
    intro: "Finish the deck. Custom 3D-printed boxes made in-house, plus sleeves.",
    items: [
      { label: "Custom 3D-printed box (deck under 100 cards)", price: "$9" },
      { label: "Larger decks (100+ cards)", price: "$18 per 100 cards" },
      { label: "Standard sleeves", price: "$6 / 100" },
      { label: "Premium matte sleeves (Dragon Shield grade)", price: "$11 / 100" },
    ],
    note: "Boxes use an adjustable in-house design, so rebranding is quick and bulk orders get better per-unit pricing. Custom artwork prep, if needed, is billed at the design rate.",
  },
  {
    name: "3D Modeling & Design",
    intro: "Custom models in Shapr3D for printable parts and pieces.",
    items: [
      { label: "Modeling", price: "$20 / hour" },
      { label: "Project rate", price: "By agreement" },
      { label: "Iterations", price: "Negotiable" },
    ],
  },
  {
    name: "FDM / Filament 3D Printing",
    intro: "Functional parts, props, and components.",
    items: [
      { label: "Material", price: "$0.15 / gram" },
      { label: "Setup fee (per part)", price: "$5" },
      { label: "Minimum order", price: "$10" },
    ],
    note: "A rough guide: a 100-gram part runs about $20. Final price depends on material, size, and finishing.",
  },
  {
    name: "Resin / SLA 3D Printing",
    intro: "High-detail miniatures and small parts, printed in Elegoo tough resin.",
    items: [
      { label: "Setup and cleanup", price: "$15" },
      { label: "Print time", price: "$3 / hour" },
      { label: "Resin and materials (100% solid infill)", price: "Estimated, ~$0.10 / gram" },
    ],
    note: "Resin is priced by solid volume (no discount for hollowing): a flat $15 setup and cleanup fee, plus $3 per print hour, plus estimated material cost. Final price by quote.",
  },
  {
    name: "UV Tile Printing",
    intro: "UV-printed board game tiles and components.",
    items: [{ label: "Custom UV-printed tiles and tokens", price: "Quote by project" }],
    note: "Send the size, art, and quantity and we will quote it.",
  },
];
