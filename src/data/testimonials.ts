// Customer testimonials / social proof.
//
// IMPORTANT: only REAL quotes from real people go here. The home-page section
// renders ONLY when this array has at least one entry, so the live site never
// shows placeholder or invented reviews. While the array is empty, no section
// appears at all.
//
// To add one, copy this shape into the array below and replace with real words:
//   {
//     quote: "Sam turned our rough idea into a clean prototype deck in days. We playtested the same week.",
//     name: "First L.",                       // name or initials, whatever the person is comfortable sharing
//     detail: "Game designer, San Antonio",   // optional: role, location, or project
//   },
//
// Good sources for real ones: a Role to Reign playtester, an early client, or
// someone you designed cards for at a convention. Two or three short, specific
// quotes beat a dozen vague ones.

export interface Testimonial {
  /** The customer's words, verbatim. */
  quote: string;
  /** Who said it (name or initials). */
  name: string;
  /** Optional context: role, location, or project. */
  detail?: string;
}

export const testimonials: Testimonial[] = [];
