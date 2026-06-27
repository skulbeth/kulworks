import Link from "next/link";
import SocialLinks from "@/components/SocialLinks";

const year = 2026; // static-export safe; bump as needed

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <span className="font-display text-2xl text-gold">Kulworks</span>
          <p className="mt-3 max-w-xs text-sm text-muted">
            One studio, many materials. Cards, tiles, and 3D, designed and made in-house.
          </p>
          <SocialLinks className="mt-4" />
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/services/" className="hover:text-blue">Services</Link></li>
            <li><Link href="/portfolio/" className="hover:text-blue">Portfolio</Link></li>
            <li><Link href="/who-its-for/" className="hover:text-blue">Who It's For</Link></li>
            <li><Link href="/about/" className="hover:text-blue">About</Link></li>
            <li><Link href="/contact/" className="hover:text-blue">Get a Quote</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {/* TODO: replace with real contact details */}
            <li>
              <a href="mailto:hello@kulworks.com" className="hover:text-blue">
                hello@kulworks.com
              </a>
            </li>
            <li>Find us at game conventions</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-xs text-muted sm:px-6 lg:px-8">
          © {year} Kulworks. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
