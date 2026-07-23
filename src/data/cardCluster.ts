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
  /** Optional sample photo (4:3). Placeholder shown if omitted. */
  image?: string;
  /** Optional spec/option bullets. */
  specs?: string[];
  keywords?: string[];
  /** Optional outbound link shown on the page (e.g. a tool we design with). */
  link?: { label: string; href: string };
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
    navLabel: "Poker Size Playing Cards",
    cardBlurb: "Standard-size custom decks for games, clubs, and keepsakes.",
    image: "/images/portfolio/cards/role-to-reign-dice-cards-alt.webp",
    title: `Poker Size Playing Card Printing in ${CITY}`,
    metaDescription:
      "Poker size playing card printing with your own backs and faces. The standard size, single decks to short runs, made in San Antonio.",
    eyebrow: "Card printing",
    h1: "Poker Size Playing Card Printing",
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
      "Rounded corners (our only corner option right now), plus tuck boxes",
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
    image: "/images/portfolio/cards/character-cards-in-jig.webp",
    title: `Board Game & Card Prototype Printing in ${CITY}`,
    metaDescription:
      "Print board game and card game prototypes in San Antonio. Fast-turnaround proto decks and short runs so designers can test before a big print run.",
    eyebrow: "Card printing",
    h1: "Board Game & Card Prototype Printing",
    intro:
      "Designing a game means printing it over and over as it changes. We specialize in getting you real prototype cards and pieces fast, so you can playtest, fix what is broken, and print the next version without waiting weeks or paying for a giant run.",
    sections: [
      {
        h: "The clean middle ground",
        body: "There is a big gap between printing cards at home and cutting them out with scissors, and paying a factory for a thousand of them. That gap is what we specialize in. We get you clean, table ready prototype cards and pieces in small numbers, so your game looks and plays like the real thing while you are still working out the design. We are not a big manufacturer, and for this stage that is the point. You get quality, quick turnaround, and no huge minimum.",
      },
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
      "Card design at conventions, with quick turnaround and delivery",
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
    image: "/images/portfolio/cards/card-fronts.webp",
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
  {
    slug: "giant-cards",
    navLabel: "Giant & Jumbo Cards",
    cardBlurb: "Oversized cards for events, demos, and visibility.",
    title: `Custom Giant & Jumbo Card Printing in ${CITY}`,
    metaDescription:
      "Custom giant and jumbo card printing in San Antonio. Oversized cards for events, demos, teaching, and accessibility, with full custom artwork.",
    eyebrow: "Card printing",
    h1: "Custom Giant & Jumbo Card Printing",
    intro:
      "Giant cards turn heads. Oversized decks are great for events, demos, photo booths, teaching, and anyone who needs cards that are easy to see from across a room or easier to handle.",
    sections: [
      {
        h: "Built to be seen",
        body: "Big format means your artwork reads from a distance, which is perfect for trade shows, store displays, parties, and group activities.",
      },
      {
        h: "Useful at the table",
        body: "Oversized cards also help with teaching a game to a crowd and with accessibility for players who find standard cards hard to handle.",
      },
      {
        h: "Your art, full size",
        body: "We print full custom faces and backs at the larger size with the same durable color and clean cuts.",
      },
    ],
    specs: [
      "Oversized, commonly around 3.5 x 5 in (89 x 127 mm) or larger",
      "Full custom faces and backs",
      "Single decks through short runs",
      "Great for events, demos, and accessibility",
    ],
    keywords: [
      "giant card printing",
      "jumbo playing cards custom",
      "oversized cards San Antonio",
    ],
  },
  {
    slug: "boxes-and-upgrades",
    navLabel: "Custom Card Boxes & Other Upgrades",
    image: "/images/portfolio/design/shapr3d-box-insert.webp",
    cardBlurb: "Custom 3D-printed card boxes, sleeves, and other upgrades, in tiers.",
    title: `Custom Card Boxes & Other Upgrades in ${CITY}`,
    metaDescription:
      "Custom 3D-printed card boxes, sleeve upgrades, and other finishing options for your deck, offered in tiers. Designed and made in-house in San Antonio.",
    eyebrow: "Card printing",
    h1: "Custom Card Boxes & Other Upgrades",
    intro:
      "Finish your deck the right way. Because we print cards and run our own 3D printers, we can package and upgrade your deck in-house, from the box it lives in to the sleeves that protect it. Pick the tier that fits your project and budget.",
    sections: [
      {
        h: "Custom 3D-printed card boxes",
        body: "We 3D print rigid card boxes built to fit your deck. We use an adjustable in-house design, so putting your logo or name on the outside is quick and affordable, and reorders or rebrands are easy. A real box turns a stack of cards into a finished product people want to keep.",
      },
      {
        h: "Sleeve upgrades",
        body: "Protect the cards and upgrade how the deck feels in hand. We offer sleeve options at different levels so you can match the durability and finish to the project.",
      },
      {
        h: "Tiered to your budget",
        body: "Mix and match the box and sleeve level that fits. Tell us the project and we will quote the tier that makes sense.",
      },
    ],
    specs: [
      "Tier 1 (Essentials): standard tuck box and basic sleeves",
      "Tier 2 (Standard): custom-printed box and premium sleeves",
      "Tier 3 (Premium): custom 3D-printed rigid box, top sleeves, and a fitted insert",
      "Pricing is quote-based; mix box and sleeve tiers as needed",
    ],
    keywords: [
      "custom card box printing",
      "3D printed card box",
      "card sleeve upgrades San Antonio",
    ],
  },
  {
    slug: "card-design",
    navLabel: "Card Design & Fast Prototyping",
    cardBlurb: "We design your cards fast and prototype them locally before a run.",
    image: "/images/portfolio/cards/prototyping-software.webp",
    title: `Custom Card Design & Fast Prototyping in ${CITY}`,
    metaDescription:
      "Custom card design and fast prototyping in San Antonio. We lay out and design your cards quickly, then prototype a deck locally so you can test before a full run.",
    eyebrow: "Card printing",
    h1: "Custom Card Design & Fast Prototyping",
    intro:
      "This is something we do really well. We design and lay out custom cards fast using Dextrous, a professional card-design tool, which means you can go from a concept to a print-ready deck quickly, and prototype it locally before committing to a full run.",
    sections: [
      {
        h: "Designed fast",
        body: "We focus on the card design, layout, and structure. Using Dextrous, turning your concept, card data, and artwork into clean, consistent, print-ready cards is quick. Less waiting, faster iteration.",
      },
      {
        h: "You bring the art, we do the design",
        body: "You provide the artwork, or we can point you to artists and organic 3D modelers when you need content. Either way, we handle the layout and structure that turns it into a finished deck.",
      },
      {
        h: "Prototype before you commit",
        body: "Since the design step is fast and it's all done locally, we can get a prototype deck in your hands quickly. Hold it, play it, and refine the design before you order a larger run.",
      },
      {
        h: "Built for designers",
        body: "Dextrous makes it easy to manage a deck full of unique cards and keep everything consistent, which is ideal for game and card designers iterating toward a final version.",
      },
      {
        h: "Manage your content in a shared sheet",
        body: "Want us to design and manage the card content too? Once the layouts are done, we set up a shared Google Sheet for your card text and data. You add content to the sheet and it updates the cards in Dextrous, so adding cards or making changes is quick. Ideal for decks with lots of unique cards.",
      },
    ],
    specs: [
      "Fast, professional card design, layout, and structure",
      "Local prototype decks so you can test before a run",
      "Great for designers iterating on a game",
      "You provide artwork, or we point you to artists and 3D modelers",
      "At conventions: on-the-spot design with quick turnaround and delivery, sometimes next day",
    ],
    keywords: [
      "custom card design San Antonio",
      "fast card prototyping",
      "card game design service",
      "card design at conventions",
    ],
    link: { label: "We design in Dextrous", href: "https://www.dextrous.com.au/" },
  },
];

export const getCardPage = (slug: string) =>
  cardPages.find((p) => p.slug === slug);
