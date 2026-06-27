// Frequently asked questions. This doubles as SEO content: it answers the
// long-tail questions people actually search ("can you print tarot size cards",
// "where to print board game prototypes in San Antonio") in plain language,
// which adds real topical depth to the page.
//
// Note: Google deprecated FAQ *rich results* in 2026, so this is for users and
// content depth, not for star/expander SERP features. Keep answers genuinely
// useful and honest. Edit freely.

export interface Faq {
  q: string;
  a: string;
  /** Optional bullet points shown under the answer (and folded into FAQ schema). */
  bullets?: string[];
}

export const faqs: Faq[] = [
  {
    q: "Do you print custom playing and poker cards in San Antonio?",
    a: "Yes. Kulworks is a San Antonio maker studio and custom card printing is our lead service. We print custom playing, poker, and game cards with your own backs and faces, from a single prototype deck to a finished short run.",
  },
  {
    q: "What card sizes can you print, and can you do tarot-size cards?",
    a: "Yes, tarot size included. The sizes we print:",
    bullets: [
      "Poker (standard): 2.5 x 3.5 in / 63 x 88 mm",
      "Tarot: 2.75 x 4.75 in / 70 x 121 mm",
      "Giant / jumbo: about 3.5 x 5 in / 89 x 127 mm",
    ],
  },
  {
    q: "Can you print board game prototypes and short runs for designers?",
    a: "Yes. We work with game and card designers on fast-turnaround prototype decks and short production runs, which makes it easy to test, tweak, and test again before committing to a large order.",
  },
  {
    q: "Do you have a minimum order, or can you print a single deck?",
    a: "We take one-off jobs and short runs. A single prototype deck is fine, and so is a small batch for a club, store, or event.",
  },
  {
    q: "What is UV card and tile printing?",
    a: "UV printing cures ink instantly with UV light, which bonds sharp, full-color, durable art directly to the surface. We use it for cards and for flatbed printing on small board game tiles and components that need to survive real play.",
  },
  {
    q: "What 3D printing do you offer?",
    a: "We offer both FDM (filament) printing for functional parts, props, and larger components, and resin (SLA) printing for high-detail miniatures and small parts. We also design custom 3D models in Shapr3D when you need the model before the print.",
  },
  {
    q: "Do you work at game conventions?",
    a: "Yes. We bring card design to game conventions, with quick turnaround and delivery, sometimes even next day at the con. If you are heading to a con, mention it in your message and we can plan around it.",
  },
  {
    q: "Who do you work with?",
    a: "We work with board game and card designers, game stores, sports teams and clubs, schools, wedding venues, photographers, and market-day sellers across the San Antonio area, plus our own games like Role to Reign.",
  },
  {
    q: "How do I get a quote?",
    a: "Use the Get a Quote form with your project details, including quantities, sizes, and timeline. We reply with questions, options, and a price, then finalize artwork and production.",
  },
  {
    q: "What is the difference between poker, bridge, and tarot card sizes?",
    a: "Poker cards are the standard size (about 2.5 by 3.5 inches). Bridge cards are a bit narrower, which makes a large hand easier to hold. Tarot cards are larger overall, giving artwork more room. We print all three, plus giant and oracle decks.",
  },
  {
    q: "Can you design the cards for me if I don't have artwork?",
    a: "Yes. Our design service can lay out your cards, prep artwork for print, and get the files press-ready, so you can come to us with just an idea or with finished art.",
  },
  {
    q: "What file format and resolution do you need for card art?",
    a: "High-resolution files (300 DPI at final card size) work best, with a small bleed around the edges so nothing important gets trimmed. If you are not sure, send what you have and we will tell you what we need or prep it for you.",
  },
  {
    q: "Do you make custom card boxes and offer sleeves?",
    a: "Yes. Because we print cards and run our own 3D printers, we can finish your deck in-house with custom 3D-printed card boxes and sleeve upgrades, offered in tiers to fit your project and budget.",
  },
  {
    q: "Do you print double-sided cards and custom card backs?",
    a: "Yes. We print full custom faces and a custom back, or a custom back with standard faces, whatever your project needs.",
  },
  {
    q: "How long does a custom card order take?",
    a: "It depends on the size of the run and whether artwork is print-ready. Prototype decks turn around fast. Tell us your timeline in the quote and we will let you know what is realistic.",
  },
];
