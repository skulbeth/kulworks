import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Next doesn't pick up a stray parent lockfile.
  turbopack: { root: __dirname },

  // Static export so the site can be hosted anywhere (Netlify, Vercel, GitHub Pages, S3, etc.).
  // The contact form posts client-side to Formspree, so no server is required.
  output: "export",

  // next/image optimization needs a server; static export uses plain <img> output instead.
  images: { unoptimized: true },

  // Emit /about/index.html instead of /about.html — friendlier for static hosts like GitHub Pages.
  trailingSlash: true,
};

export default nextConfig;
