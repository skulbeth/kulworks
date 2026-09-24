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
    images: [
      "/images/portfolio/cards/cards-variety.webp",
      "/images/portfolio/design/card-layout-photoshop.webp",
      "/images/portfolio/cards/card-printing-clip.webp",
      "/images/portfolio/cards/sports-cards.webp",
      "/images/portfolio/cards/cards-showcase.webp",
      "/images/portfolio/cards/game-cards.webp",
      "/images/portfolio/cards/custom-cards.webp",
      "/images/portfolio/cards/keepsake-cards.webp",
      "/images/portfolio/cards/card-fronts.webp",
      "/images/portfolio/cards/sports-cards-backs.webp",
      "/images/portfolio/cards/prototype-card-backs.webp",
      "/images/portfolio/cards/keepsake-card-backs.webp",
      "/images/portfolio/cards/custom-deck-creation.webp",
      "/images/portfolio/cards/client-deck-finished.webp",
      "/images/portfolio/cards/client-deck-bagged.webp",
    ],
    alt: "Custom cards by Kulworks: card layout and design, sports trading cards, game and prototype decks, keepsake cards fronts and backs, and a finished client deck bagged and ready to ship",
  },
  {
    title: "Custom Prop Print",
    category: "filament",
    src: "/images/portfolio/filament/helmet-prop.webp",
    images: [
      "/images/portfolio/filament/helmet-prop.webp",
      "/images/portfolio/filament/custom-prop-armor.webp",
      "/images/portfolio/filament/fdm-city-upgrades.webp",
    ],
    alt: "FDM-printed props: a full-size spiked gladiator helmet finished in matte navy, a custom prop armor set, and city and terrain upgrade pieces",
  },
  {
    title: "Modular Board Hexes",
    category: "tiles",
    src: "/images/portfolio/tiles/board-tiles.webp",
    images: [
      "/images/portfolio/tiles/board-tiles.webp",
      "/images/portfolio/tiles/board-printing.webp",
      "/images/portfolio/tiles/chopping-piece.webp",
      "/images/portfolio/design/tile-artwork-prep.webp",
    ],
    alt: "UV-printed modular board game hex tiles, printing and cutting pieces on the flatbed, and tile artwork prepped for print",
  },
  {
    title: "UV-Printed Game Boards",
    category: "tiles",
    src: "/images/portfolio/tiles/board-panels.webp",
    images: [
      "/images/portfolio/tiles/board-panels.webp",
      "/images/portfolio/tiles/board-panel-printing.webp",
      "/images/portfolio/tiles/board-panels-finished.webp",
    ],
    alt: "Navy and gold game board panels being UV-printed on the flatbed and the finished boards fresh off the press",
  },
  {
    title: "Custom 3D Models",
    category: "design",
    src: "/images/portfolio/design/cad-3d-model.webp",
    images: [
      "/images/portfolio/design/cad-3d-model.webp",
      "/images/portfolio/design/shapr3d-library.webp",
      "/images/portfolio/design/droideka-model.webp",
      "/images/portfolio/design/model-render.webp",
      "/images/portfolio/filament/race-award-tower.webp",
      "/images/portfolio/filament/race-award-number-one.webp",
      "/images/portfolio/filament/race-award-medallion.webp",
    ],
    alt: "Custom 3D models designed in Shapr3D: a full library of parts and props, a rotating droideka model, finished renders, and custom award designs — a tower, a number one, and a runner medallion — modeled from scratch for a client",
  },
  {
    title: "Resin 3D Printing (high-detail minis)",
    category: "resin",
    src: "/images/portfolio/resin/high-detail-miniature.webp",
    images: [
      "/images/portfolio/resin/high-detail-miniature.webp",
      "/images/portfolio/resin/3d-print-07.webp",
      "/images/portfolio/resin/3d-print-08.webp",
      "/images/portfolio/resin/race-model-showcase.webp",
      "/images/portfolio/resin/miniatures-cure-glow.webp",
    ],
    alt: "Resin 3D printing by Kulworks: high-detail painted tabletop miniatures, character models, and a fresh print curing",
  },
  {
    title: "Color-Coded Hospital Tags",
    category: "filament",
    src: "/images/portfolio/filament/hospital-tags-variety.webp",
    images: [
      "/images/portfolio/filament/hospital-tags-variety.webp",
      "/images/portfolio/filament/hospital-tags-clip.webp",
      "/images/portfolio/filament/hospital-precaution-tags.webp",
    ],
    alt: "Color-coded hospital service and precaution tags designed and 3D printed by Kulworks, with UV-printed lettering, in full sets ready for a client",
  },
  {
    title: "Filament (FDM) 3D Printing",
    category: "filament",
    src: "/images/portfolio/filament/3d-print-03.webp",
    images: [
      "/images/portfolio/filament/3d-print-03.webp",
      "/images/portfolio/filament/3d-print-10.webp",
      "/images/portfolio/filament/3d-print-09.webp",
      "/images/portfolio/filament/3d-print-04.webp",
      "/images/portfolio/filament/flags-set.webp",
      "/images/portfolio/filament/3d-print-06.webp",
      "/images/portfolio/filament/3d-print-01.webp",
      "/images/portfolio/filament/3d-print-05.webp",
      "/images/portfolio/filament/3d-print-11.webp",
      "/images/portfolio/filament/3d-print-02.webp",
      "/images/portfolio/filament/uv-art-on-3d-print.webp",
      "/images/portfolio/filament/race-awards-trio.webp",
      "/images/portfolio/filament/race-awards-towers.webp",
      "/images/portfolio/filament/race-awards-number-ones.webp",
      "/images/portfolio/filament/race-awards-medallions.webp",
    ],
    alt: "Filament (FDM) 3D printing by Kulworks: articulated figures and large builds, a spaceship, game flag markers, functional parts, props, full-color art UV-printed straight onto a printed blank, and a full run of custom awards on UV-printed bases",
  },
];

// Which portfolio category represents each service (for "See examples" on /services).
const SERVICE_CATEGORY: Record<string, PortfolioCategory> = {
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
