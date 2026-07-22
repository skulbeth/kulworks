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

export const portfolio: PortfolioItem[] = [
  { title: "Poker-Sized Cards, Custom Production", category: "cards", src: "/images/portfolio/cards/custom-cards.webp", alt: "Custom poker-sized promo cards printed at Kulworks" },
  { title: "Game Prototype Deck", category: "cards", src: "/images/portfolio/cards/card-fronts.webp", alt: "Custom game card fronts for a prototype deck" },
  { title: "Custom Deck Creation", category: "cards", src: "/images/portfolio/cards/custom-deck-creation.webp", alt: "Building a custom card deck in our card generator, laying out fronts and card data" },
  { title: "Modular Board Hexes", category: "tiles", src: "/images/portfolio/tiles/board-tiles.webp", alt: "UV-printed modular board game hex tiles" },
  { title: "Custom Prop Print", category: "filament", src: "/images/portfolio/filament/custom-prop-armor.webp", alt: "FDM-printed custom prop armor set: breastplate, shield, helmet, and sword" },
  { title: "High-Detail Miniature", category: "resin", src: "/images/portfolio/resin/high-detail-miniature.webp", alt: "Painted high-detail 3D-printed character miniatures" },
  { title: "Character Mini Set", category: "resin", src: "/images/portfolio/resin/miniatures-cure-glow.webp", alt: "Resin printed character miniatures" },
  { title: "Custom 3D Models", category: "design", src: "/images/portfolio/design/race-3d-model.webp", alt: "Custom 3D character model designed and printed by Kulworks" },
  { title: "Card Layout & Artwork Prep", category: "design", src: "/images/portfolio/design/card-layout-photoshop.webp", alt: "Designing and laying out custom character class cards in Photoshop" },
  { title: "Tile Artwork Prep", category: "design", src: "/images/portfolio/design/tile-artwork-prep.webp", alt: "Board tile and map artwork prepared for UV printing" },
];
