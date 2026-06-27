import Link from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "gold" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const sizes = {
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

const variants: Record<Variant, string> = {
  // Emerald CTA (matches Role to Reign's tracker button)
  primary:
    "bg-primary text-black hover:bg-primary-hover shadow-lg hover:shadow-glow",
  // Gold accent CTA
  gold: "bg-gold text-black hover:brightness-110 shadow-lg hover:shadow-glow-gold",
  // Outlined / subtle
  ghost:
    "border border-border bg-surface/60 text-foreground hover:border-blue hover:text-blue",
};

export default function Button({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
