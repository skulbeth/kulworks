import sharp from "sharp";
import path from "node:path";
const CAND = "C:/Users/skulb/AppData/Local/Temp/claude/C--Users-skulb/d40ffefc-4087-4806-b953-0b8c768a4266/scratchpad/candidates";
const OUT = "D:/Kulworks/Raw Footage/Website Selects";
const R43 = [1200, 900], R32 = [1200, 800];

// center-crop (default position) — reliable for centered subjects/faces
async function make(srcAbs, outAbs, [w, h], rotate) {
  let img = sharp(srcAbs);
  if (rotate) img = img.rotate(rotate);
  await img.resize(w, h, { fit: "cover" }).webp({ quality: 84 }).toFile(outAbs);
  console.log("->", outAbs.split("/Website Selects/")[1]);
}

// tiles hero: best-composed full-map frame, center 4:3
await make(path.join(CAND, "tiles/hero_fr_3.jpg"), path.join(OUT, "tiles/terrain-hexes-hero_4x3.webp"), R43);
// person shots: center gravity so the face is kept
await make(path.join(CAND, "studio/s_decks_009.jpg"), path.join(OUT, "studio/maker-portrait-smiling_4x3.webp"), R43);
await make(path.join(CAND, "studio/s_decks_009.jpg"), path.join(OUT, "studio/maker-portrait-smiling_3x2.webp"), R32);
await make(path.join(CAND, "studio/s_decks_012.jpg"), path.join(OUT, "studio/maker-holding-minis_4x3.webp"), R43);
await make(path.join(CAND, "studio/s_decks_012.jpg"), path.join(OUT, "studio/maker-holding-minis_3x2.webp"), R32);
