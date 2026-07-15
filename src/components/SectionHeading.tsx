import { ReactNode } from "react";

/** Consistent section heading: small gold eyebrow + large title + optional intro.
 *  Pass `as="h1"` for the top-of-page heading (defaults to `h2` for in-page sections). */
export default function SectionHeading({
  eyebrow,
  title,
  intro,
  center = false,
  as: As = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  center?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && (
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
          {eyebrow}
        </p>
      )}
      <As className="text-3xl font-extrabold sm:text-4xl">{title}</As>
      {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
    </div>
  );
}
