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
  { title: "Custom Poker Deck", category: "cards", alt: "Custom poker deck with branded card backs" },
  { title: "Game Prototype Deck", category: "cards", alt: "Prototype game card deck" },
  { title: "Trading-Style Team Cards", category: "cards", alt: "Sports team trading cards" },
  { title: "Role to Reign Card Set", category: "cards", alt: "Role to Reign game cards" },
  { title: "UV-Printed Terrain Tiles", category: "tiles", alt: "UV printed board game terrain tiles" },
  { title: "Modular Board Hexes", category: "tiles", alt: "Modular hex board tiles" },
  { title: "Custom Tokens", category: "tiles", alt: "UV printed custom game tokens" },
  { title: "Functional Prop Print", category: "filament", alt: "FDM printed functional prop" },
  { title: "Replacement Components", category: "filament", alt: "FDM printed replacement game components" },
  { title: "City Upgrade Pieces", category: "filament", alt: "FDM printed city upgrade pieces" },
  { title: "High-Detail Miniature", category: "resin", alt: "Resin printed high-detail miniature" },
  { title: "Character Mini Set", category: "resin", alt: "Resin printed character miniatures" },
  { title: "Shapr3D Model: Mini Base", category: "design", alt: "3D model of a miniature base designed in Shapr3D" },
  { title: "Card Layout & Artwork Prep", category: "design", alt: "Card layout and artwork preparation" },
  { title: "Tile Artwork Prep", category: "design", alt: "Board tile artwork preparation" },
];
