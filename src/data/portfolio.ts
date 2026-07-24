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
  /** e.g. "/images/portfolio/cards/poker-deck-01.jpg". Optional; placeholder shown if omitted. */
  src?: string;
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

// Order intentionally alternates animated (A) and static (S) items — A,S,A,S,… — so a
// single-column phone scroll (and the desktop grid) isn't wall-to-wall motion. We have 4
// animated + 6 static, so the extra static items trail at the end; no two animated are adjacent.
// If you add an item, keep the alternation (animated = the WebP files made from a GIF/video:
// custom-cards, card-fronts, board-tiles, race-3d-model).
export const portfolio: PortfolioItem[] = [
  { title: "Poker-Sized Cards, Custom Production", category: "cards", src: "/images/portfolio/cards/custom-cards.webp", alt: "Custom poker-sized promo cards printed at Kulworks" }, // A
  { title: "Custom Deck Creation", category: "design", src: "/images/portfolio/cards/custom-deck-creation.webp", alt: "Building a custom card deck in our card generator, laying out fronts and card data" }, // S
  { title: "Game Prototype Deck Printing", category: "cards", src: "/images/portfolio/cards/card-fronts.webp", alt: "Custom game card fronts for a prototype deck" }, // A
  { title: "Custom Prop Print", category: "filament", src: "/images/portfolio/filament/custom-prop-armor.webp", alt: "FDM-printed custom prop armor set: breastplate, shield, helmet, and sword" }, // S
  { title: "Modular Board Hexes", category: "tiles", src: "/images/portfolio/tiles/board-tiles.webp", alt: "UV-printed modular board game hex tiles" }, // A
  { title: "High-Detail Miniature", category: "resin", src: "/images/portfolio/resin/high-detail-miniature.webp", alt: "Painted high-detail 3D-printed character miniatures" }, // S
  { title: "Custom 3D Models", category: "design", src: "/images/portfolio/design/cad-3d-model.webp", alt: "Designing a custom 3D model in Shapr3D" }, // A
  { title: "Resin Printing (minis and more!)", category: "resin", src: "/images/portfolio/resin/miniatures-cure-glow.webp", alt: "Resin printed character miniatures" }, // S
  { title: "Card Layout & Artwork Prep", category: "design", src: "/images/portfolio/design/card-layout-photoshop.webp", alt: "Designing and laying out custom character class cards in Photoshop" }, // S
  { title: "Tile Artwork Prep", category: "design", src: "/images/portfolio/design/tile-artwork-prep.webp", alt: "Board tile and map artwork prepared for UV printing" }, // S
];
