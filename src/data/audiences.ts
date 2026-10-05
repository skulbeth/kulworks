// Who Kulworks is for. Drives the "Who It's For" grid on home + dedicated page.

export interface Audience {
  title: string;
  blurb: string;
  icon: string;
  /** Square thumbnail of real work for this audience. Replaces the icon when set. */
  image?: string;
  /** Optional outbound link. Makes the whole card clickable (opens in a new tab). */
  href?: string;
}

export const audiences: Audience[] = [
  {
    title: "Sports Teams",
    blurb: "Player trading cards, team sets, and season keepsakes for rec leagues, travel teams, and athletic clubs.",
    icon: "🏅",
    image: "/images/audiences/sports-teams.webp",
  },
  {
    title: "Schools & Clubs",
    blurb: "Fundraisers, group branding, and custom cards for schools, student clubs, and community organizations.",
    icon: "🏫",
    image: "/images/audiences/schools-clubs.webp",
  },
  {
    title: "Game & Card Designers",
    blurb: "Prototypes through production runs, built by someone who designs games too. Print one, test it, tweak it, and print the next version, all without a big minimum.",
    icon: "🎲",
    image: "/images/audiences/game-designers.webp",
  },
  {
    title: "Our Own Games",
    blurb: "Like Role to Reign, our own fantasy-inspired game with 750 world and character-building cards, all designed and printed by us.",
    icon: "👑",
    image: "/images/audiences/our-own-games.webp",
    href: "https://roletoreign.com",
  },
  {
    title: "Events & Celebrations",
    blurb: "Weddings and venues, office and work parties, reunions, holidays, or any celebration you can dream up. Custom decks, favors, and printed pieces that make the day.",
    icon: "🎉",
    image: "/images/audiences/events.webp",
  },
  {
    title: "Photographers",
    blurb: "Turn your shots into premium printed cards and keepsakes.",
    icon: "📸",
    image: "/images/audiences/photographers.webp",
  },
  {
    title: "Local Activities & Market Sellers",
    blurb: "Short runs of cards and pieces for market day and local events.",
    icon: "🛒",
    image: "/images/audiences/market-sellers.webp",
  },
  {
    title: "Game Stores",
    blurb: "Stock custom components, demo copies, and store-branded decks.",
    icon: "🏪",
    image: "/images/audiences/game-stores.webp",
  },
  {
    title: "Convention Attendees",
    blurb: "We bring card design to game cons, with quick turnaround and delivery, sometimes next day at the con.",
    icon: "🎪",
    image: "/images/audiences/conventions.webp",
  },
];
