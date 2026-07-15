// Generates the default social-share image at public/images/og-default.png (1200×630).
// Branded placeholder until a custom share graphic exists. Re-run to regenerate:
//   npm run og
// Uses sharp (already a dependency). Dark brand background + light logo + tagline.
import sharp from "sharp";
import { readFileSync } from "node:fs";

const W = 1200, H = 630;
const BG = "#0b0b0b";       // dark theme page base
const GOLD = "#fcd34d";     // signature highlight (amber-300)
const MUTED = "#cbd5e1";    // slate-300

// Logo: the dark-theme wordmark (light text, transparent) so it reads on the dark bg.
const logo = await sharp("public/images/kulworks-logo-dark.png")
  .resize({ width: 820 })
  .toBuffer();
const logoMeta = await sharp(logo).metadata();
const logoTop = Math.round(H * 0.30);
const logoLeft = Math.round((W - logoMeta.width) / 2);

// Text + accent layer as an SVG overlay (Arial/sans is safe under librsvg).
const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0" y="0" width="${W}" height="10" fill="${GOLD}"/>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="${GOLD}"/>
  <text x="${W / 2}" y="${H * 0.66}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#ffffff">
    Custom card printing · UV tiles · 3D printing &amp; design
  </text>
  <text x="${W / 2}" y="${H * 0.66 + 60}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="600" fill="${GOLD}">
    San Antonio, TX — made in-house · ships nationwide
  </text>
  <text x="${W / 2}" y="${H - 40}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="24" fill="${MUTED}">
    kulworks.com
  </text>
</svg>`;

await sharp(Buffer.from(svg))
  .composite([{ input: logo, top: logoTop, left: logoLeft }])
  .png()
  .toFile("public/images/og-default.png");

console.log("✅ wrote public/images/og-default.png (1200×630)");
