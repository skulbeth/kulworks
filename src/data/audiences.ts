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
    title: "Sports Teams",
    blurb: "Player trading cards, team sets, and season keepsakes for rec leagues, travel teams, and athletic clubs.",
    icon: "🏅",
  },
  {
    title: "Schools & Clubs",
    blurb: "Fundraisers, group branding, and custom cards for schools, student clubs, and community organizations.",
    icon: "🏫",
  },
  {
    title: "Game & Card Designers",
    blurb: "Prototypes through production runs, built by someone who designs games too.",
    icon: "🎲",
  },
  {
    title: "Designer Prototypes",
    blurb: "We specialize in prototype work, that clean middle ground between a home printer and a full print run, so you can test, tweak, and test again.",
    icon: "⚡",
  },
  {
    title: "Our Own Games",
    blurb: "Like Role to Reign, our own fantasy-inspired game with 750 world and character-building cards, all designed and printed by us.",
    icon: "👑",
    href: "https://roletoreign.com",
  },
  {
    title: "Wedding Venues",
    blurb: "Custom card decks and printed pieces for events and favors.",
    icon: "💍",
  },
  {
    title: "Work Parties",
    blurb: "Office parties, team-building, and company events. Custom decks and pieces that make the day.",
    icon: "💼",
  },
  {
    title: "Events & Celebrations",
    blurb: "Weddings, family reunions, holidays, or any event you can dream up. If you can think of it, we can make cards for it.",
    icon: "🎉",
  },
  {
    title: "Photographers",
    blurb: "Turn your shots into premium printed cards and keepsakes.",
    icon: "📸",
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
    blurb: "We bring card design to game cons, with quick turnaround and delivery, sometimes next day at the con.",
    icon: "🎪",
  },
];
