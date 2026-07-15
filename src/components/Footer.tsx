"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SocialLinks from "@/components/SocialLinks";
import NewsletterSignup from "@/components/NewsletterSignup";
import { site } from "@/data/site";

const year = 2026; // static-export safe; bump as needed

export default function Footer() {
  const pathname = usePathname();
  // While under construction, the landing (home) shows no footer/nav.
  if (site.constructionMode && pathname === "/") return null;

  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <span className="font-display text-2xl text-gold">Kulworks</span>
          <p className="mt-3 max-w-xs text-sm text-muted">
            One studio, many materials. Cards, tiles, and 3D, designed and made in-house.
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Based in San Antonio, TX — serving the surrounding Hill Country, and shipping
            finished work nationwide.
          </p>
          <SocialLinks className="mt-4" />
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/services/" className="hover:text-blue">Services</Link></li>
            <li><Link href="/portfolio/" className="hover:text-blue">Portfolio</Link></li>
            <li><Link href="/guides/" className="hover:text-blue">Guides & FAQ</Link></li>
            <li><Link href="/pricing/" className="hover:text-blue">Pricing</Link></li>
            <li><Link href="/who-its-for/" className="hover:text-blue">Who It's For</Link></li>
            <li><Link href="/about/" className="hover:text-blue">About</Link></li>
            <li><Link href="/contact/" className="hover:text-blue">Get a Quote</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-blue">
                {site.email}
              </a>
            </li>
            <li>Find us at game conventions</li>
          </ul>

          <h3 className="mt-6 text-sm font-bold uppercase tracking-widest text-muted">
            Newsletter
          </h3>
          <p className="mt-2 text-sm text-muted">
            Occasional updates on new services and deals.
          </p>
          <div className="mt-3">
            <NewsletterSignup />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-xs text-muted sm:px-6 lg:px-8">
          © {year} Kulworks. All rights reserved. ·{" "}
          <Link href="/privacy/" className="hover:text-blue">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href="/terms/" className="hover:text-blue">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
