// =============================================================================
// Guides / articles. Plain informational content that captures "how do I..."
// searches and feeds internal links to the card-printing pages. Each guide
// becomes a static page at /guides/<slug>/ with Article structured data.
//
// Add a guide by adding an entry here (route + sitemap update automatically).
// Keep dates as fixed "YYYY-MM-DD" strings (no new Date() so builds stay stable).
// =============================================================================

export interface GuideSection {
  h: string;
  body: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  datePublished: string; // YYYY-MM-DD
  readMinutes: number;
  intro: string;
  sections: GuideSection[];
  keywords?: string[];
}

export const guides: Guide[] = [
  {
    slug: "poker-vs-tarot-card-sizes",
    title: "Poker vs. Tarot Card Sizes: Which Should You Print?",
    description:
      "A plain-language guide to the common custom card sizes (poker, bridge, tarot, giant) and how to pick the right one for your deck.",
    datePublished: "2026-06-27",
    readMinutes: 4,
    intro:
      "Card size shapes how a deck feels, how it plays, and how much room your art gets. Here is how the common sizes compare and how to choose.",
    sections: [
      {
        h: "The common sizes at a glance",
        body: [
          "Poker is the standard size, about 2.5 by 3.5 inches (63 by 88 mm). It is what most people picture when they think of a deck, and it suits the widest range of games and projects.",
          "Bridge is a touch narrower, about 2.25 by 3.5 inches (57 by 89 mm). The slimmer width makes a large hand easier to hold and fan.",
          "Tarot is larger overall, about 2.75 by 4.75 inches (70 by 121 mm). The extra space gives illustration more room to breathe.",
          "Giant or jumbo cards are oversized, often around 3.5 by 5 inches or larger, built to be seen from a distance.",
        ],
      },
      {
        h: "Match the size to how the deck is used",
        body: [
          "If players hold a lot of cards at once, bridge size keeps a big hand manageable.",
          "If your game leans on artwork or you are making an oracle or tarot deck, the larger tarot size lets the art lead.",
          "If the cards are for demos, teaching a crowd, or events, giant cards read across a room.",
          "If you are unsure, poker size is the safe default and works for most decks.",
        ],
      },
      {
        h: "Other things that affect the feel",
        body: [
          "Finish and sleeves change how a deck handles as much as size does. A good box and the right sleeve tier make a deck feel finished.",
          "Whatever size you choose, keep your art at full resolution with a small bleed so nothing important gets trimmed.",
        ],
      },
    ],
    keywords: [
      "poker vs tarot card size",
      "custom card sizes",
      "bridge size cards",
    ],
  },
  {
    slug: "prep-card-art-for-printing",
    title: "How to Prep Your Card Art for Printing",
    description:
      "Resolution, bleed, safe zones, and file formats: how to get your card artwork print-ready so the final deck looks the way you designed it.",
    datePublished: "2026-06-27",
    readMinutes: 5,
    intro:
      "Good print starts with good files. A little prep up front avoids blurry art, trimmed edges, and surprises in the final deck. Here is what to set up.",
    sections: [
      {
        h: "Resolution",
        body: [
          "Design at 300 DPI at the final card size. Art that looks crisp on screen can still print soft if it is low resolution, so start high rather than scaling up later.",
        ],
      },
      {
        h: "Bleed and safe zone",
        body: [
          "Bleed is extra art that extends past the trim line, usually about 1/8 inch (3 mm) on each side. It means that if the cut shifts slightly, you still get color to the edge instead of a thin white sliver.",
          "The safe zone is the opposite: keep text, logos, and anything important a little inside the trim line so it never gets cut off.",
        ],
      },
      {
        h: "File formats",
        body: [
          "Send press-ready PDFs or high-resolution PNG or TIFF files. Vector art (logos, type) stays sharp at any size, so keep it vector when you can.",
          "Name files clearly and keep fronts and backs organized, especially for a full deck with many unique faces.",
        ],
      },
      {
        h: "Not sure? Send what you have",
        body: [
          "If files and bleed are not your thing, that is fine. Our design service can prep your artwork, add bleed, and get everything press-ready, or design the cards from scratch.",
        ],
      },
    ],
    keywords: [
      "prep card art for printing",
      "card printing bleed and resolution",
      "print ready card files",
    ],
  },
  {
    slug: "prototype-vs-short-run",
    title: "Prototype Decks vs. Short Runs: How Many Cards to Print First",
    description:
      "When to print a single prototype deck, when to do a short run, and how to test a card game before committing to a big order.",
    datePublished: "2026-06-27",
    readMinutes: 4,
    intro:
      "Printing a game is not one decision, it is a few. Knowing when to print one deck versus a small batch saves money and catches problems early.",
    sections: [
      {
        h: "Start with a prototype deck",
        body: [
          "A single printed prototype tells you things a screen never will: how the cards feel, whether the text is readable, and whether the layout works at the table.",
          "Print one, play it, and mark what needs to change. Then print the next version. Fast iteration beats a perfect first try.",
        ],
      },
      {
        h: "Move to a short run when the design settles",
        body: [
          "Once the rules and layout are stable, a short run gets you enough copies for a focused playtest group, demos, or early sales without the cost of a large order.",
          "Short runs are also good for clubs, events, and stores that need a modest number of finished decks.",
        ],
      },
      {
        h: "Scale up with confidence",
        body: [
          "When the game is proven and the art is final, you can commit to a larger run knowing the deck is right.",
          "At every stage, a real printed deck is the best test. We keep prototypes quick so you can keep improving.",
        ],
      },
    ],
    keywords: [
      "card game prototype vs short run",
      "how many decks to print",
      "test a card game before printing",
    ],
  },
];

export const getGuide = (slug: string) => guides.find((g) => g.slug === slug);
