// Portfolio items. `category` values must match the filter list below.
// Drop a real image in /public/images/portfolio/<category>/ (cards, tiles, filament,
// resin, design) and set `src` to its path to replace the placeholder.
// Leave `src` undefined to show a labeled placeholder box.

export type PortfolioCategory =
  | "cards"
  | "tiles"
  | "filament"
  | "resin"
  | "design";

export interface PortfolioItem {
  title: string;
  category: PortfolioCategory;
  /** e.g. "/images/portfolio/cards/poker-deck-01.jpg". Optional; placeholder shown if omitted.
   *  This is the grid cover; for a gallery item it should be the first entry of `images`. */
  src?: string;
  /** Optional gallery: 2+ images the lightbox swipes through (cover = src). */
  images?: string[];
  alt: string;
}

export const portfolioFilters: { id: PortfolioCategory | "all"; label: string }[] = [
  { id: "all", label: "All Work" },
  { id: "cards", label: "Cards" },
  { id: "tiles", label: "Tiles" },
  { id: "filament", label: "Filament" },
  { id: "resin", label: "Resin" },
  { id: "design", label: "Design" },
];

// The "Custom Card Design & Printing" tile is a gallery (tap → swipe through all card
// samples + gifs). Remaining tiles alternate animated/static so a phone scroll isn't
// wall-to-wall motion (animated = WebPs made from a GIF/video: board-tiles, cad-3d-model).
export const portfolio: PortfolioItem[] = [
  {
    title: "Custom Card Design & Printing",
    category: "cards",
    src: "/images/portfolio/cards/cards-variety.webp",
    // Best work first, and one image per idea: printing, a finished deck in hand,
    // then the distinct card types. Near-duplicate stills (second angles of the
    // same decks, card-back repeats) were pulled out so the gallery reads as
    // range rather than repetition.
    images: [
      "/images/portfolio/cards/cards-variety.webp",
      "/images/studio/cards-printing-and-sheet.mp4",
      "/images/portfolio/cards/panic-cards-printing-still.webp",
      "/images/portfolio/cards/orc-character-card.webp",
      "/images/portfolio/cards/sports-cards.webp",
      "/images/portfolio/cards/game-cards.webp",
      "/images/portfolio/cards/game-deck-fan-still.webp",
      "/images/portfolio/cards/keepsake-cards.webp",
      "/images/portfolio/design/card-layout-photoshop.webp",
      "/images/portfolio/cards/client-deck-bagged.webp",
      "/images/portfolio/cards/sports-cards-backs.webp",
      "/images/studio/deck-printed-and-riffled.mp4",
      "/images/portfolio/cards/panic-cards-spread-still.webp",
    ],
    alt: "Custom cards by Kulworks: decks printing and curing on the UV flatbed, finished character and sports cards, decks fanned and riffled by hand, and a client deck bagged ready to ship.",
  },
  
  {
    // Was two tiles sections ("Modular Board Hexes" and "UV-Printed Game Boards")
    // that covered the same craft and between them carried nine clips. One section,
    // the best of each, and the near-duplicate clips combined at source.
    title: "UV-Printed Game Boards & Modular Hex Tiles",
    category: "tiles",
    src: "/images/portfolio/tiles/cut-tile-stacks.webp",
    images: [
      "/images/portfolio/tiles/cut-tile-stacks.webp",
      "/images/portfolio/tiles/hex-press-and-stacks.mp4",
      "/images/portfolio/tiles/board-panels.webp",
      "/images/portfolio/tiles/board-tiles-still.webp",
      "/images/portfolio/tiles/board-printing-still.webp",
      "/images/portfolio/tiles/chopping-piece-still.webp",
      "/images/portfolio/design/tile-artwork-prep.webp",
      "/images/portfolio/tiles/board-print-and-finish.mp4",
      "/images/studio/board-cutting.mp4",
    ],
    alt: "UV-printed game boards and modular hex tiles by Kulworks: navy and gold board panels printing on the flatbed and coming off finished, hex terrain tiles cut on the clicker press and freed from the die, a full run stacked and bundled on the bench, and tile artwork prepped for print",
  },

  
  {
    title: "Custom 3D Models",
    category: "design",
    // Cover is the three awards together, all modeled from scratch. Three separate
    // shots of them in identical framing read as one image repeated; one shot of
    // the set reads as range. The rotating CAD clip used to lead here at just over
    // a megabyte, more than every other grid cover put together.
    src: "/images/portfolio/filament/race-awards-trio.webp",
    images: [
      "/images/portfolio/filament/race-awards-trio.webp",
      "/images/portfolio/design/cad-3d-model-still.webp",
      "/images/portfolio/design/shapr3d-astros-logo.webp",
      "/images/portfolio/design/shapr3d-bomber-bees.webp",
      "/images/portfolio/design/shapr3d-sculpt.webp",
      "/images/portfolio/design/droideka-model-still.webp",
    ],
    alt: "Custom 3D models designed in Shapr3D: award designs modeled from scratch, client logos built as 3D artwork for Bulverde Astros and Bomber Bees, and character models.",
  },
  {
    title: "Resin 3D Printing (high-detail minis)",
    category: "resin",
    src: "/images/portfolio/resin/high-detail-miniature.webp",
    images: [
      "/images/portfolio/resin/high-detail-miniature.webp",
      "/images/studio/resin-plate-and-batch.mp4",
      "/images/portfolio/resin/3d-print-07.webp",
      "/images/portfolio/resin/3d-print-08.webp",
      "/images/portfolio/resin/race-model-still.webp",
      "/images/portfolio/resin/miniatures-cure-glow.webp",
    ],
    alt: "Resin 3D printing by Kulworks: high-detail painted tabletop miniatures, character models, a fresh print curing, and a plate of minis coming off the printer into a finished batch",
  },
  {
    title: "Color-Coded Hospital Tags",
    category: "filament",
    src: "/images/portfolio/filament/hospital-tags-variety.webp",
    images: [
      "/images/portfolio/filament/hospital-tags-variety.webp",
      "/images/portfolio/filament/hospital-tags-spread.webp",
      "/images/portfolio/filament/hospital-precaution-tags.webp",
    ],
    alt: "Color-coded hospital service and precaution tags designed and 3D printed by Kulworks, with UV-printed lettering, in full sets ready for a client",
  },
  {
    // Custom Prop Print used to be its own three-image section of the same craft.
    // Folded in here, leading with the helmet, which is the strongest filament shot.
    title: "Filament (FDM) 3D Printing: Props, Parts & Figures",
    category: "filament",
    src: "/images/portfolio/filament/helmet-prop.webp",
    images: [
      "/images/portfolio/filament/helmet-prop.webp",
      "/images/portfolio/filament/custom-prop-armor.webp",
      "/images/portfolio/filament/fdm-city-upgrades.webp",
      "/images/portfolio/filament/3d-print-03.webp",
      "/images/portfolio/filament/3d-print-10.webp",
      "/images/portfolio/filament/3d-print-09.webp",
      "/images/portfolio/filament/flags-set.webp",
      "/images/portfolio/filament/3d-print-06.webp",
      "/images/portfolio/filament/3d-print-01.webp",
      "/images/portfolio/filament/3d-print-05.webp",
      "/images/portfolio/filament/3d-print-11.webp",
      "/images/portfolio/filament/3d-print-02.webp",
      "/images/portfolio/filament/uv-art-on-3d-print.webp",
      "/images/portfolio/filament/race-awards-towers.webp",
      "/images/portfolio/filament/race-awards-number-ones.webp",
      "/images/portfolio/filament/race-awards-medallions.webp",
    ],
    alt: "Filament (FDM) 3D printing by Kulworks: a full-size gladiator helmet and prop armour, articulated figures, terrain and city pieces, game markers, functional parts, and full runs of custom awards.",
  },

];

// Which portfolio category represents each service (for "See examples" on /services).
export const SERVICE_CATEGORY: Record<string, PortfolioCategory> = {
  "card-printing": "cards",
  "uv-tiles": "tiles",
  fdm: "filament",
  resin: "resin",
  design: "design",
};

/** All example image paths for a service, flattening gallery items in its category. */
export function examplesForService(serviceId: string): string[] {
  const cat = SERVICE_CATEGORY[serviceId];
  if (!cat) return [];
  return portfolio
    .filter((p) => p.category === cat)
    .flatMap((p) => p.images ?? (p.src ? [p.src] : []));
}

/** Portfolio URL filtered to the work for one service. */
export function portfolioHrefForService(serviceId: string): string | null {
  const cat = SERVICE_CATEGORY[serviceId];
  return cat ? `/portfolio/?type=${cat}` : null;
}
