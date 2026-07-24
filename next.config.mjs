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

  // Keep <img> output unoptimized for now (unchanged behavior).
  images: { unoptimized: true },

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
    ];
  },
};

export default nextConfig;
