// Card design templates for the "Design your cards" builder (/order).
//
// Each template is a ready-made design the customer browses, picks, and fills in.
// Different design = different fields + photo slots. Add a template by adding an entry
// here. Swap `image` for a real preview of the design (front, ideally), and drop the
// files in public/images/card-templates/.
//
// Contact fields (name/email/phone) and quantity are collected on every order by the
// form itself — don't repeat them here. Keep it to what THIS design needs.

export type FieldType = "text" | "textarea" | "number" | "select";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for type: "select"
}

export interface ImageSlot {
  key: string;
  label: string;
  required?: boolean;
}

export interface CardTemplate {
  id: string;
  name: string;
  blurb: string;
  /** Preview image of the design (temporary stock shown until real previews are added). */
  image: string;
  imageSlots: ImageSlot[];
  fields: TemplateField[];
}

export const cardTemplates: CardTemplate[] = [
  {
    id: "baseball-trading-card",
    name: "Baseball Trading Card",
    blurb: "Player card with a headshot front and an action-shot back.",
    image: "/images/portfolio/cards/card-fronts.webp",
    imageSlots: [
      { key: "front_photo", label: "Front photo (headshot)", required: true },
      { key: "back_photo", label: "Back photo (action shot)" },
      { key: "logo", label: "Team / school logo" },
    ],
    fields: [
      { key: "player_name", label: "Player name", type: "text", required: true, placeholder: "Sebastian Hawthorn" },
      { key: "team", label: "Team", type: "text", placeholder: "Bobcats" },
      { key: "school", label: "School / organization", type: "text", placeholder: "Bulverde Middle School" },
      { key: "position", label: "Position", type: "text", placeholder: "Shortstop" },
      { key: "height", label: "Height", type: "text", placeholder: `5'1"` },
      { key: "jersey", label: "Jersey number", type: "text", placeholder: "#12" },
      { key: "season", label: "Season / year", type: "text", placeholder: "2026" },
      { key: "highlight", label: "Highlight or favorite memory", type: "textarea", placeholder: "A short season highlight or a favorite memory." },
    ],
  },
  {
    id: "basketball-trading-card",
    name: "Basketball Trading Card",
    blurb: "Full-photo player card with number, team, and stats.",
    image: "/images/portfolio/cards/character-cards-in-jig.webp",
    imageSlots: [
      { key: "front_photo", label: "Player photo", required: true },
      { key: "logo", label: "Team / school logo" },
    ],
    fields: [
      { key: "player_name", label: "Player name", type: "text", required: true, placeholder: "Jordan Miller" },
      { key: "number", label: "Number", type: "text", placeholder: "#18" },
      { key: "team", label: "Team", type: "text", placeholder: "Bobcats" },
      { key: "school", label: "School / organization", type: "text", placeholder: "Smithson Valley" },
      { key: "position", label: "Position / role", type: "text", placeholder: "Captain" },
      { key: "height", label: "Height", type: "text", placeholder: `5'0"` },
      { key: "grade", label: "Class / grade", type: "text", placeholder: "9th Grade" },
      { key: "season", label: "Season", type: "text", placeholder: "Bobcats Basketball 2026" },
    ],
  },
  {
    id: "custom",
    name: "Something else / custom",
    blurb: "Not seeing your design? Tell us what you want and attach any art or references.",
    image: "/images/portfolio/cards/cards-displayed.webp",
    imageSlots: [
      { key: "art_1", label: "Artwork / photo" },
      { key: "art_2", label: "Artwork / photo (2)" },
      { key: "art_3", label: "Artwork / photo (3)" },
    ],
    fields: [
      { key: "card_type", label: "What kind of cards?", type: "text", placeholder: "Poker deck, tarot, game prototype, photo cards…" },
      { key: "details", label: "Describe what you'd like", type: "textarea", required: true, placeholder: "Sizes, quantities, style, what goes on the front and back…" },
    ],
  },
];

export const getCardTemplate = (id: string) => cardTemplates.find((t) => t.id === id);
