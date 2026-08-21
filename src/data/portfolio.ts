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
    ],
    alt: "Custom cards by Kulworks: card layout and design, sports trading cards, game and prototype decks, and keepsake cards, fronts and backs",
  },
  { title: "Custom Prop Print", category: "filament", src: "/images/portfolio/filament/custom-prop-armor.webp", alt: "FDM-printed custom prop armor set: breastplate, shield, helmet, and sword" },
  {
    title: "Modular Board Hexes",
    category: "tiles",
    src: "/images/portfolio/tiles/board-tiles.webp",
    images: [
      "/images/portfolio/tiles/board-tiles.webp",
      "/images/portfolio/design/tile-artwork-prep.webp",
    ],
    alt: "UV-printed modular board game hex tiles, plus tile and map artwork prepped for printing",
  },
  { title: "Custom 3D Models", category: "design", src: "/images/portfolio/design/cad-3d-model.webp", alt: "Designing a custom 3D model in Shapr3D" },
  {
    title: "Resin Printing (minis and more!)",
    category: "resin",
    src: "/images/portfolio/resin/high-detail-miniature.webp",
    images: [
      "/images/portfolio/resin/high-detail-miniature.webp",
      "/images/portfolio/resin/miniatures-cure-glow.webp",
    ],
    alt: "High-detail resin-printed character miniatures, painted and fresh off the printer",
  },
];
