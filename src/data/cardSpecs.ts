// "What our cards are": the honest spec sheet, answered up front because the same
// questions came in on most quote requests (stock, finish, foil/holo, packaging, proofs,
// big runs). Sam's wording, 2026-11-13. Shown on /services/card-printing/ and mirrored in
// data/faq.ts. Never describe the finish as glossy, and never offer foil, holo or
// metallic: those words appear here only to say we don't do them.

export interface CardSpec {
  label: string;
  body: string;
  /** One-line version for the compact box beside UV Card Printing on /services/. */
  short: string;
}

export const cardSpecs: CardSpec[] = [
  {
    label: "Card stock",
    short: "310gsm, rounded corners, standard weight",
    body: "White 310gsm card stock with rounded corners. That's standard playing-card weight, not extra-thick.",
  },
  {
    label: "Finish",
    short: "Between semi-gloss and satin, Sharpie-friendly",
    body: "Our UV finish sits between semi-gloss and satin, with a slight texture. It takes a Sharpie, so cards can be autographed.",
  },
  {
    label: "Foil and holographic",
    short: "Not offered",
    body: "We don't do foil, holographic, or metallic stock. Gold and shiny looks are printed as flat color.",
  },
  {
    label: "Boxes",
    short: "Tuck boxes for 52-card decks, 3D-printed for the rest",
    body: "For standard 52-card decks we can custom order printed tuck boxes. Any other deck gets a custom 3D-printed box made here. No shrink wrap.",
  },
  {
    label: "Proofs",
    short: "On every order",
    body: "Every card order gets a proof to review and approve before anything prints.",
  },
  {
    label: "How many",
    short: "1 to 5 decks",
    body: "We're set up for 1 to 5 decks. Planning a bigger run? Send it anyway. We'll look over your project and point you to the best printer for it. We know them all.",
  },
];
