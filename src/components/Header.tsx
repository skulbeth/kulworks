"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { site } from "@/data/site";
import ThemeToggle from "@/components/ThemeToggle";

const navLinks = [
  { href: "/services/", label: "Services" },
  { href: "/portfolio/", label: "Portfolio" },
  { href: "/guides/", label: "Guides & FAQ" },
  { href: "/pricing/", label: "Pricing" },
  { href: "/who-its-for/", label: "Who It's For" },
  { href: "/about/", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  // While under construction, the landing (home) shows no navigation.
  if (site.constructionMode && pathname === "/") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <nav
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Main"
      >
        {/* Wordmark: the only place we use the display/fantasy font */}
        <Link
          href="/"
          className="group flex items-center gap-2 text-gold"
          aria-label="Kulworks home"
          onClick={() => setOpen(false)}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="shrink-0 transition-transform group-hover:-translate-y-0.5"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
          <span className="font-display text-2xl tracking-wide text-glow-gold">
            Kulworks
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-7 md:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`text-sm font-semibold transition-colors hover:text-blue ${
                  isActive(l.href) ? "text-blue" : "text-muted"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/contact/"
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black transition-all hover:bg-primary-hover hover:shadow-glow"
            >
              Get a Quote
            </Link>
          </li>
          <li>
            <ThemeToggle />
          </li>
        </ul>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-border p-2"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-xl leading-none">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="border-t border-border bg-background md:hidden">
          <ul className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2 font-semibold ${
                    isActive(l.href) ? "bg-surface text-blue" : "text-muted hover:bg-surface"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-1">
              <Link
                href="/contact/"
                onClick={() => setOpen(false)}
                className="block rounded-full bg-primary px-4 py-2 text-center font-bold text-black"
              >
                Get a Quote
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
