// Generates the default social-share image at public/images/og-default.png (1200x630).
// Re-run after changing it:  npm run og
//
// Design notes, because the first version got this wrong:
//  - Link previews are rendered SMALL. Slack, Discord and iMessage shrink this to a few
//    hundred pixels wide, so anything under ~40px here is unreadable where it matters.
//    One short line beats three long ones.
//  - The logo already reads CARDS - TILES - 3D, so a tagline repeating "card printing,
//    UV tiles, 3D printing" was saying the same thing twice and crowding the wordmark.
//  - Everything sits well inside the frame: previews get cropped to anywhere between
//    1.91:1 and 2:1 depending on the platform, and some centre-crop.
import sharp from "sharp";

const W = 1200, H = 630;
const BG = "#0b0b0b";   // dark theme page base
const GOLD = "#fcd34d"; // signature highlight (amber-300)

const LOGO_W = 860;
const RULE = 8;

const logo = await sharp("public/images/kulworks-logo-dark.png")
  .resize({ width: LOGO_W })
  .toBuffer();
const { width: lw = LOGO_W, height: lh = 0 } = await sharp(logo).metadata();

// Logo + one line, centred as a group.
const GAP = 76;
const TEXT_SIZE = 50;
const blockH = lh + GAP + TEXT_SIZE;
// The logo PNG carries transparent padding, so the measured block sits high; nudged to
// balance the real ink, which is what the eye reads.
const top = Math.round((H - blockH) / 2) + 6;
const logoTop = top;
const textBaseline = top + lh + GAP + TEXT_SIZE * 0.78;

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect x="0" y="0" width="${W}" height="${RULE}" fill="${GOLD}"/>
  <rect x="0" y="${H - RULE}" width="${W}" height="${RULE}" fill="${GOLD}"/>
  <text x="${W / 2}" y="${textBaseline}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="${TEXT_SIZE}"
        font-weight="700" letter-spacing="7" fill="${GOLD}">
    PROTOTYPE MANUFACTURER
  </text>
</svg>`;

await sharp(Buffer.from(svg))
  .composite([{ input: logo, top: logoTop, left: Math.round((W - lw) / 2) }])
  .png()
  .toFile("public/images/og-default.png");

console.log(`wrote public/images/og-default.png (${W}x${H})`);
