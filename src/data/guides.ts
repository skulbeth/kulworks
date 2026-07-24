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
    title: "Prototype Decks vs. Short Runs: How Many Cards to Print",
    description:
      "When to print a single prototype deck, how many copies to make for playtesting, and when to move up to a short run, all without committing to a big factory order.",
    datePublished: "2026-06-27",
    readMinutes: 5,
    intro:
      "Printing a game is not one decision, it is a few: how many copies to make, and when to move from a prototype to a short run. You do not need a big order to test well. Here is a simple way to decide at each stage.",
    sections: [
      {
        h: "Start with one",
        body: [
          "A single printed prototype tells you things a screen never will: how the cards feel, whether the text is readable, and whether the layout works at the table. You catch the obvious problems yourself before anyone else sees the deck.",
          "Print one, play it solo or with one other person, and mark what needs to change. This round is cheap, and it saves you from printing a mistake more than once.",
        ],
      },
      {
        h: "A few for a playtest group",
        body: [
          "Once the game holds up, a small batch of two to five copies lets a table actually play without passing one deck back and forth.",
          "This is the sweet spot for most designers, and it is exactly the kind of small number we specialize in: no big minimum, and quick reprints when the design changes.",
        ],
      },
      {
        h: "Move to a short run when the design settles",
        body: [
          "When the rules and layout are stable, a short run gets you enough copies for a focused playtest group, demos, early sales, or clean decks to hand a store, a reviewer, or a publisher. Short runs also suit clubs and events that need a modest number of finished decks.",
          "You need more copies once the game leaves your table: blind playtests, conventions, and review copies all call for extra. Even then it is usually a modest run, not a factory order.",
        ],
      },
      {
        h: "Scale up with confidence",
        body: [
          "When the game is proven and the art is final, you can commit to a larger run knowing the deck is right. At every stage a real printed deck is the best test, so print what you need for the stage you are in and scale up only once the design has earned it.",
        ],
      },
    ],
    keywords: [
      "card game prototype vs short run",
      "how many decks to print",
      "how many prototype copies to print",
      "playtest copies board game",
      "test a card game before printing",
      "card game prototype quantity",
    ],
  },
  {
    slug: "print-and-play-vs-real-prototype",
    title: "Print-and-Play vs. a Real Prototype: When to Make the Jump",
    description:
      "Printing your game at home is a great start, but at some point a clean prototype pays off. Here is how to know when to make the jump.",
    datePublished: "2026-07-12",
    readMinutes: 4,
    intro:
      "Every designer starts by printing pages at home and cutting them out. That is a smart, cheap way to begin. But there is a point where a cleaner prototype is worth it, and knowing when saves you time and makes your game look the way it plays in your head.",
    sections: [
      {
        h: "What print-and-play is good for",
        body: [
          "Home print-and-play is free and instant, which makes it perfect for the earliest, roughest testing. You are checking whether the idea works at all, so ugly is fine.",
          "If the rules are still moving around a lot, stay here. There is no reason to print anything nice while big things are still changing.",
        ],
      },
      {
        h: "Where a real prototype starts to help",
        body: [
          "Once the core game holds up, paper scraps start to get in the way. Cards that curl, smudge, or are hard to read make it harder to tell whether a problem is the game or the paper.",
          "A clean prototype also changes how other people treat your game. Playtesters, a game store, or a publisher take a real deck more seriously than a stack of cut-up printer paper, and you get better feedback because of it.",
          "Real cards shuffle and handle the way the finished game will, so you catch things like text that is too small or a layout that is awkward in hand.",
        ],
      },
      {
        h: "The middle ground is what we specialize in",
        body: [
          "There is a big gap between a home printer and paying a factory for a thousand copies. That gap is where we live. We get you clean, table ready cards and pieces in small numbers, without a huge minimum, so your game looks and plays like the real thing while you are still refining it.",
          "You do not have to pick one forever either. Plenty of designers keep doing quick home versions for wild new ideas, then come to us for a clean prototype once a version is worth showing off.",
        ],
      },
    ],
    keywords: [
      "print and play vs prototype",
      "board game prototype printing",
      "when to print a game prototype",
    ],
  },
];

export const getGuide = (slug: string) => guides.find((g) => g.slug === slug);
