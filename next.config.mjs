import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Next doesn't pick up a stray parent lockfile.
  turbopack: { root: __dirname },

  // Runs as a server app on Vercel (NOT a static export) so we can use API routes,
  // server-side auth, and database queries. Marketing pages are still pre-rendered.
  // Note: the site must now be hosted on a Node/Vercel runtime, not a pure static
  // host (GitHub Pages, plain S3).

  // Optimize next/image output (e.g. the logo). Most photos use plain <img> and are
  // already hand-optimized WebP, so this mainly helps the logo + any next/image.
  images: { unoptimized: false },

  // Emit /about/index.html style URLs — keeps existing trailing-slash URLs stable.
  trailingSlash: true,

  // Permanent redirects for retired URLs (preserve any link equity, avoid 404s).
  async redirects() {
    return [
      {
        // Merged into the broader "prototype vs. short run" guide (2026-07-24).
        source: "/guides/how-many-prototype-copies",
        destination: "/guides/prototype-vs-short-run/",
        permanent: true,
      },
      {
        source: "/guides/how-many-prototype-copies/",
        destination: "/guides/prototype-vs-short-run/",
        permanent: true,
      },
    ];
  },

  // Baseline security headers on every response. (A strict Content-Security-Policy is
  // intentionally NOT set here yet — it needs per-route nonces/hashes for the inline
  // theme-init script + JSON-LD, and a wrong CSP silently breaks the site. Tracked in TODO.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Content-Security-Policy. 'unsafe-inline' is kept for scripts/styles because the
          // app uses inline scripts (theme init, JSON-LD) + Next hydration; every external
          // host the site actually uses is allowlisted (Turnstile, Supabase, Google Fonts).
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
              "connect-src 'self' https://gzavumiukhahbrgzcaxo.supabase.co wss://gzavumiukhahbrgzcaxo.supabase.co https://challenges.cloudflare.com",
              "frame-src https://challenges.cloudflare.com",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          // Force HTTPS for 2 years, including subdomains.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Don't let browsers MIME-sniff responses.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Disallow the site being framed by other origins (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Send only the origin on cross-origin navigations.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Lock down powerful browser features we don't use.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
      {
        // Static media. Next only fingerprints what it builds, and these are hand-made
        // files served straight from public/, so they were falling back to the default
        // "max-age=0, must-revalidate": a conditional request for every photo and clip on
        // every visit. The bodies were not re-sent (304s), but on mobile that is still a
        // dozen round trips before the page settles.
        //
        // Deliberately NOT immutable. Files here get overwritten in place rather than
        // renamed (the carousel clips were replaced several times this week), and
        // immutable would pin the old bytes in returning browsers with no way to bust it.
        // A day of freshness plus a month of stale-while-revalidate means a repeat visit
        // costs no network at all, and a replaced file is picked up on the visit after
        // the next one at the latest. A hard refresh still bypasses it.
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
