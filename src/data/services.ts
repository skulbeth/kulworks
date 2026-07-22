// Single source of truth for services.
// Drives: the Services page, the home services grid, the "Request this" CTAs
// (which deep-link to /contact?type=<id>), and the contact form's project dropdown.

export type ServiceId =
  | "card-printing"
  | "uv-tiles"
  | "fdm"
  | "resin"
  | "design";

export interface Service {
  id: ServiceId;
  name: string;
  /** Short punchy line for cards. */
  tagline: string;
  /** One or two sentence description. */
  description: string;
  /** Longer copy for the Services page. */
  details: string;
  /** Optional scannable bullet points shown under the details on the Services page. */
  highlights?: string[];
  /** Emoji used as a lightweight icon placeholder (swap for an SVG/image later). */
  icon: string;
  /** Optional sample photo shown on the Services page (4:3). Placeholder shown if omitted. */
  image?: string;
  /** Set true for the lead service (gets extra prominence). */
  lead?: boolean;
  /** Optional outbound link shown on the Services page (e.g. a portfolio profile). */
  link?: { label: string; href: string };
}

export const services: Service[] = [
  {
    id: "card-printing",
    name: "UV Card Printing",
    tagline: "Custom decks, prototypes to finished runs.",
    description:
      "Custom playing, poker, and game cards in sizes from standard poker up to tarot, with your own card backs and faces. We can even design the cards for you.",
    details:
      "Custom card printing is our flagship craft. We print crisp, durable UV cards with custom backs and faces, in sizes from standard poker up to larger tarot cards.",
    highlights: [
      "Prototypes, one-off decks, and short runs, all with fast turnaround",
      "Custom backs and faces, from poker (2.5 x 3.5 in / 63 x 88 mm) up to tarot (2.75 x 4.75 in / 70 x 121 mm)",
      "We design the card structure, fill it with your content, and go straight to print, the whole process under one roof",
      "Custom 3D-printed card boxes and sleeve upgrades, offered in tiers",
      "Cards come with rounded corners (the only corner option right now)",
      "Card design at conventions, with quick turnaround and delivery, sometimes next day",
    ],
    icon: "🃏",
    image: "/images/portfolio/cards/character-cards-in-jig.webp",
    lead: true,
  },
  {
    id: "uv-tiles",
    name: "UV Printing for Board Game Tiles",
    tagline: "Vivid UV flatbed printing on tiles and components.",
    description:
      "UV flatbed printing on small board game tiles and components, with sharp full-color art bonded straight to the surface.",
    details:
      "UV flatbed printing lays vivid, durable color directly onto small tiles and game components.",
    highlights: [
      "Sharp, full-color art bonded straight to the surface",
      "Great for modular boards, terrain tiles, and tokens",
      "Built to survive real play",
      "Bring your artwork or let us prep it for you",
    ],
    icon: "🟧",
    image: "/images/portfolio/tiles/terrain-hexes-hero.webp",
  },
  {
    id: "fdm",
    name: "Filament 3D Printing (FDM)",
    tagline: "Functional parts, props, and components.",
    description:
      "FDM printing for parts, props, and functional components, with sturdy prints in a range of materials and sizes.",
    details:
      "Filament (FDM) printing is our workhorse for functional parts, props, and larger components.",
    highlights: [
      "Parts, props, jigs, and replacement pieces",
      "A range of materials and finishes to match the job",
      "One-off prints or batches",
      "Sturdy prints in a range of sizes",
    ],
    icon: "⚙️",
    image: "/images/portfolio/filament/fdm-city-upgrades.webp",
  },
  {
    id: "resin",
    name: "Resin 3D Printing (SLA)",
    tagline: "High-detail miniatures and small parts.",
    description:
      "SLA resin printing for high-detail miniatures and small parts where crisp detail matters most.",
    details:
      "Resin (SLA) printing captures fine features that filament can't.",
    highlights: [
      "High detail for miniatures and intricate small parts",
      "Great for tabletop minis and display pieces",
      "Crisp features and smooth finishes",
      "Single pieces or small batches",
    ],
    icon: "🐉",
    image: "/images/portfolio/resin/miniatures-plate-hero.webp",
  },
  {
    id: "design",
    name: "3D Modeling & Design",
    tagline: "Custom models in Shapr3D + design support.",
    description:
      "Custom 3D models designed in Shapr3D, plus the design support behind your print job, including card layout and tile artwork prep. Because we handle the design, we can tweak and update it as your game develops and grows.",
    details:
      "We design custom 3D models in Shapr3D and handle the design work behind everything else.",
    highlights: [
      "Custom 3D models designed in Shapr3D",
      "Card layouts, tile artwork prep, and print-ready files",
      "We tweak and make changes as needed",
      "Keeps evolving as your game develops and grows",
    ],
    icon: "✏️",
    image: "/images/portfolio/design/card-layout-artwork.webp",
    link: { label: "See my models on MakerWorld", href: "https://makerworld.com/en/@skulbeth" },
  },
];

export const getService = (id: string) =>
  services.find((s) => s.id === id);
