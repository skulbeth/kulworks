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
}

export const faqs: Faq[] = [
  {
    q: "Do you print custom playing and poker cards in San Antonio?",
    a: "Yes. Kulworks is a San Antonio maker studio and custom card printing is our lead service. We print custom playing, poker, and game cards with your own backs and faces, from a single prototype deck to a finished short run.",
  },
  {
    q: "What card sizes can you print, and can you do tarot-size cards?",
    a: "We print sizes from standard poker cards up to larger tarot cards, so we can handle traditional decks as well as oversized game and tarot cards.",
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
    q: "Can you print cards at game conventions?",
    a: "Yes. We take projects to game conventions and can print cards on-site. If you are heading to a con, mention it in your message and we can plan around it.",
  },
  {
    q: "Who do you work with?",
    a: "We work with board game and card designers, game stores, sports teams and clubs, schools, wedding venues, photographers, and market-day sellers across the San Antonio area, plus our own games like Role to Reign.",
  },
  {
    q: "How do I get a quote?",
    a: "Use the Get a Quote form with your project details, including quantities, sizes, and timeline. We reply with questions, options, and a price, then finalize artwork and production.",
  },
];
