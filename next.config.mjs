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
};

export default nextConfig;
