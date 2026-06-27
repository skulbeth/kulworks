// Who Kulworks is for. Drives the "Who It's For" grid on home + dedicated page.

export interface Audience {
  title: string;
  blurb: string;
  icon: string;
  /** Optional outbound link. Makes the whole card clickable (opens in a new tab). */
  href?: string;
}

export const audiences: Audience[] = [
  {
    title: "Sports Teams & Clubs",
    blurb: "Custom decks and trading-style cards your team will actually want to keep.",
    icon: "🏅",
  },
  {
    title: "School Sport Teams",
    blurb: "Roster cards, fundraisers, and keepsakes for the season.",
    icon: "🎒",
  },
  {
    title: "Club Sport Teams",
    blurb: "Branded card sets and components for clubs of any size.",
    icon: "⚽",
  },
  {
    title: "Game & Card Designers",
    blurb: "Prototypes through production runs, built by someone who designs games too.",
    icon: "🎲",
  },
  {
    title: "Designer Prototypes",
    blurb: "Fast-turnaround proto decks so you can test, tweak, and test again.",
    icon: "⚡",
  },
  {
    title: "Our Own Games",
    blurb: "Like Role to Reign. Proof we build what we'd use ourselves.",
    icon: "👑",
    href: "https://roletoreign.com",
  },
  {
    title: "Wedding Venues",
    blurb: "Custom card decks and printed pieces for events and favors.",
    icon: "💍",
  },
  {
    title: "Photographers",
    blurb: "Turn your shots into premium printed cards and keepsakes.",
    icon: "📸",
  },
  {
    title: "School Clubs",
    blurb: "Custom cards and 3D pieces for clubs, projects, and fundraisers.",
    icon: "🏫",
  },
  {
    title: "Local Activities & Market Sellers",
    blurb: "Short runs of cards and pieces for market day and local events.",
    icon: "🛒",
  },
  {
    title: "Game Stores",
    blurb: "Stock custom components, demo copies, and store-branded decks.",
    icon: "🏪",
  },
  {
    title: "Convention Attendees",
    blurb: "We take projects to game cons and can print cards right there.",
    icon: "🎪",
  },
];
