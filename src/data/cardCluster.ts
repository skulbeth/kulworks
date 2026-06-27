// =============================================================================
// Card-printing content cluster.
//
// WHY THIS EXISTS: the studios that dominate custom-card search (PrintNinja,
// Ad Magic, MakePlayingCards) do not rank with one page. They use a hub page
// that links to focused sub-pages by card type, size, and intent. This mirrors
// that, scaled to a new local studio: a hub at /services/card-printing/ plus a
// handful of focused sub-pages. Each page targets a distinct search intent.
//
// Edit copy freely. Add new sub-pages by adding to `cardPages` (a route and
// sitemap entry are generated automatically). Keep it honest and specific.
// =============================================================================

export interface CardPageSection {
  h: string;
  body: string;
}

export interface CardPage {
  slug: string;
  /** Short label for the hub grid + breadcrumb. */
  navLabel: string;
  /** Hub-grid one-liner. */
  cardBlurb: string;
  /** <title> (the layout appends " | Kulworks"). */
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  sections: CardPageSection[];
  /** Optional spec/option bullets. */
  specs?: string[];
  keywords?: string[];
}

const CITY = "San Antonio";

export const cardHub = {
  title: `Custom Card Printing in ${CITY}`,
  metaDescription: `Custom card printing in ${CITY}: poker and playing cards, tarot decks, trading-style cards, and game prototypes. Custom backs and faces, single decks to short runs.`,
  eyebrow: "Card printing",
  h1: `Custom Card Printing in ${CITY}`,
  intro:
    "Card printing is what we do most. We print custom cards with your own backs and faces, in sizes from standard poker up to tarot, for everything from a single prototype deck to a finished short run. Pick the path that fits your project.",
};

export const cardPages: CardPage[] = [
  {
    slug: "poker-cards",
    navLabel: "Poker & Playing Cards",
    cardBlurb: "Standard-size custom decks for games, clubs, and keepsakes.",
    title: `Custom Poker & Playing Card Printing in ${CITY}`,
    metaDescription:
      "Custom poker and playing card printing with your own backs and faces. Standard poker size, single decks to short runs, made in San Antonio.",
    eyebrow: "Card printing",
    h1: "Custom Poker & Playing Card Printing",
    intro:
      "Standard poker-size cards are the classic choice, and they cover most projects: branded decks, club cards, party favors, and full custom games. We print your art on both backs and faces with clean, durable color.",
    sections: [
      {
        h: "Your art, front and back",
        body: "Bring fully custom faces and a custom back, or just a custom back on a standard face. Either way we keep the color crisp and the cuts clean so the deck feels good in hand.",
      },
      {
        h: "One deck or a short run",
        body: "Print a single deck to try an idea, or a short run for a club, store, or event. There is no need to commit to a huge order to get real, finished cards.",
      },
      {
        h: "Good for",
        body: "Branded poker decks, sports and club cards, wedding and event favors, photographers turning shots into decks, and game designers who want a polished playing-card base.",
      },
    ],
    specs: [
      "Standard poker size (about 2.5 x 3.5 in / 63 x 88 mm)",
      "Custom backs and custom or standard faces",
      "Single decks through short runs",
      "Ask about rounded corners, finishes, and tuck boxes",
    ],
    keywords: [
      "custom poker cards San Antonio",
      "custom playing card printing",
      "print your own deck",
    ],
  },
  {
    slug: "tarot-cards",
    navLabel: "Tarot Cards",
    cardBlurb: "Larger tarot-size decks with full custom artwork.",
    title: `Custom Tarot Card Printing in ${CITY}`,
    metaDescription:
      "Custom tarot card printing in San Antonio. Larger tarot-size cards with full custom artwork, single decks to short runs.",
    eyebrow: "Card printing",
    h1: "Custom Tarot Card Printing",
    intro:
      "Tarot cards are larger than poker cards, which gives your artwork more room to breathe. We print tarot-size decks with full custom faces and backs, whether you are making a traditional 78-card deck, an oracle set, or your own larger game cards.",
    sections: [
      {
        h: "Built for bigger art",
        body: "The larger tarot format suits detailed illustration and full-bleed designs. We print rich, durable color so the art holds up to repeated shuffling and handling.",
      },
      {
        h: "Traditional decks or your own",
        body: "Print a classic 78-card tarot deck, an oracle deck of any count, or oversized cards for a game that needs more space than poker size allows.",
      },
      {
        h: "Good for",
        body: "Artists and illustrators self-publishing a deck, oracle and tarot creators, and designers whose cards need extra room.",
      },
    ],
    specs: [
      "Tarot size (about 2.75 x 4.75 in / 70 x 121 mm)",
      "Any card count (78-card tarot, oracle, or custom)",
      "Full custom faces and backs",
      "Single decks through short runs",
    ],
    keywords: [
      "custom tarot card printing",
      "print tarot deck San Antonio",
      "oracle card printing",
    ],
  },
  {
    slug: "game-prototypes",
    navLabel: "Game Prototypes",
    cardBlurb: "Fast proto decks so you can test, tweak, and test again.",
    title: `Board Game & Card Prototype Printing in ${CITY}`,
    metaDescription:
      "Print board game and card game prototypes in San Antonio. Fast-turnaround proto decks and short runs so designers can test before a big print run.",
    eyebrow: "Card printing",
    h1: "Board Game & Card Prototype Printing",
    intro:
      "Designing a game means printing it over and over as it changes. We turn around prototype decks fast so you can playtest, fix what is broken, and print the next version without waiting weeks or paying for a giant run.",
    sections: [
      {
        h: "Test before you commit",
        body: "A real, printed prototype tells you things a screen never will. Get a finished-feeling deck in hand, run it at the table, and iterate quickly.",
      },
      {
        h: "No giant minimum",
        body: "Print one prototype deck or a small batch for a playtest group. When the design is locked, scale up to a short run for backers, demos, or a launch.",
      },
      {
        h: "We make games too",
        body: "We build our own games, like Role to Reign, so we know the prototype loop firsthand and can help you get clean, consistent test decks.",
      },
    ],
    specs: [
      "Poker or tarot size",
      "Single prototype decks and small batches",
      "Fast turnaround for iteration",
      "We can print on-site at game conventions",
    ],
    keywords: [
      "board game prototype printing",
      "card game prototype San Antonio",
      "print game prototype deck",
    ],
  },
  {
    slug: "trading-cards",
    navLabel: "Trading-Style Cards",
    cardBlurb: "Team, school, and collectible-style card sets.",
    title: `Custom Trading-Style Card Printing in ${CITY}`,
    metaDescription:
      "Custom trading-style card printing in San Antonio for sports teams, schools, clubs, and collectibles. Branded card sets, single sets to short runs.",
    eyebrow: "Card printing",
    h1: "Custom Trading-Style Card Printing",
    intro:
      "Trading-style cards turn a roster, a season, or a brand into something people want to keep. We print custom card sets for sports teams, schools, clubs, and collectibles, with your photos and design front and back.",
    sections: [
      {
        h: "Make the season a keepsake",
        body: "Player cards, team sets, and end-of-season keepsakes that look the part. Bring your photos and we handle the layout and print.",
      },
      {
        h: "Fundraisers and giveaways",
        body: "Trading-style sets work well for fundraisers, school clubs, market days, and event giveaways. Print a single set or a short run.",
      },
      {
        h: "Good for",
        body: "School and club sports teams, photographers, collectors, and any group that wants branded, collectible-style cards.",
      },
    ],
    specs: [
      "Standard poker/trading size",
      "Custom photos and design, front and back",
      "Single sets through short runs",
      "Great for fundraisers and giveaways",
    ],
    keywords: [
      "custom trading cards San Antonio",
      "sports team card printing",
      "school team trading cards",
    ],
  },
];

export const getCardPage = (slug: string) =>
  cardPages.find((p) => p.slug === slug);
