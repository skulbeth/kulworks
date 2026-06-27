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
  /** Emoji used as a lightweight icon placeholder (swap for an SVG/image later). */
  icon: string;
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
      "Custom playing, poker, and game cards in sizes from standard poker up to tarot, with your own card backs and faces.",
    details:
      "This is our flagship craft. We print crisp, durable UV cards with custom backs and faces, in sizes from standard poker up to larger tarot cards. That covers everything from one prototype deck to trading-style cards for a club or a branded deck for a venue. One-off jobs and short runs are both fine, prototypes turn around fast, and we can print cards on-site at game conventions.",
    icon: "🃏",
    lead: true,
  },
  {
    id: "uv-tiles",
    name: "UV Printing for Board Game Tiles",
    tagline: "Vivid UV flatbed printing on tiles and components.",
    description:
      "UV flatbed printing on small board game tiles and components, with sharp full-color art bonded straight to the surface.",
    details:
      "UV flatbed printing lays vivid, durable color directly onto small tiles and game components. It works well for modular boards, terrain tiles, tokens, and custom pieces that need to survive real play. Bring your artwork or let us prep it for you.",
    icon: "🟧",
  },
  {
    id: "fdm",
    name: "Filament 3D Printing (FDM)",
    tagline: "Functional parts, props, and components.",
    description:
      "FDM printing for parts, props, and functional components, with sturdy prints in a range of materials and sizes.",
    details:
      "Filament (FDM) printing is our workhorse for functional parts, props, jigs, and larger components. A range of materials and finishes to match the job, whether it's a one-off prop or a batch of replacement pieces.",
    icon: "⚙️",
  },
  {
    id: "resin",
    name: "Resin 3D Printing (SLA)",
    tagline: "High-detail miniatures and small parts.",
    description:
      "SLA resin printing for high-detail miniatures and small parts where crisp detail matters most.",
    details:
      "Resin (SLA) printing captures fine features that filament can't, which makes it the right choice for miniatures, intricate small parts, and display pieces. It suits tabletop minis and showpiece components.",
    icon: "🐉",
  },
  {
    id: "design",
    name: "3D Modeling & Design",
    tagline: "Custom models in Shapr3D + design support.",
    description:
      "Custom 3D models designed in Shapr3D, plus the design support behind your print job, including card layout and tile artwork prep.",
    details:
      "We design custom 3D models in Shapr3D and handle the design work that supports everything else: card layouts, tile artwork prep, and getting files print-ready before they go to the printer.",
    icon: "✏️",
    link: { label: "See my models on MakerWorld", href: "https://makerworld.com/en/@skulbeth" },
  },
];

export const getService = (id: string) =>
  services.find((s) => s.id === id);
