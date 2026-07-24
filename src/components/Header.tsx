"use client";

import Link from "next/link";
import Image from "next/image";
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
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2 text-gold"
          aria-label="Kulworks home"
          title="Home"
          onClick={() => setOpen(false)}
        >
          {/* Home button (house icon) — hidden for now; re-enable to show it left of the logo.
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="h-9 w-9 shrink-0 transition-transform group-hover:-translate-y-0.5 sm:h-10 sm:w-10"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
          */}
          {/* Light theme logo (default) */}
          <Image
            src="/images/kulworks-logo-light-transparent.png"
            alt="Kulworks"
            width={714}
            height={181}
            priority
            className="logo-light h-9 w-auto transition-transform group-hover:-translate-y-0.5 sm:h-10"
          />
          {/* Dark theme logo (shown when data-theme="dark") */}
          <Image
            src="/images/kulworks-logo-dark.png"
            alt="Kulworks"
            width={3320}
            height={834}
            priority
            className="logo-dark h-9 w-auto transition-transform group-hover:-translate-y-0.5 sm:h-10"
          />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-7 md:flex">
          <li>
            <Link
              href="/"
              aria-label="Home"
              title="Home"
              className={`flex items-center transition-colors hover:text-blue ${
                pathname === "/" ? "text-blue" : "text-muted"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="h-5 w-5"
              >
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
                <path d="M9.5 21v-6h5v6" />
              </svg>
            </Link>
          </li>
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
            <li>
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 font-semibold ${
                  pathname === "/" ? "bg-surface text-blue" : "text-muted hover:bg-surface"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                  <path d="M9.5 21v-6h5v6" />
                </svg>
                Home
              </Link>
            </li>
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
